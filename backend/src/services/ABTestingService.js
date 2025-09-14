const pool = require('../config/database');

class ABTestingService {
    /**
     * Create a new A/B testing experiment
     */
    async createExperiment(userId, experimentData) {
        const {
            templateId,
            name,
            description,
            targetMetric = 'open_rate',
            confidenceThreshold = 0.95
        } = experimentData;

        const query = `
            INSERT INTO ab_experiments
            (template_id, name, description, target_metric, confidence_threshold)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const values = [templateId, userId, name, description, targetMetric, confidenceThreshold];
        const result = await pool.query(query, values);

        // Create variants for the experiment
        await this.createExperimentVariants(result.rows[0].experiment_id, templateId);

        return this.formatExperiment(result.rows[0]);
    }

    /**
     * Create variants for an experiment
     */
    async createExperimentVariants(experimentId, templateId) {
        // Get template variants or create default ones
        const variantsQuery = `
            SELECT * FROM template_variants
            WHERE template_id = $1
            ORDER BY variant_name
        `;
        const variantsResult = await pool.query(variantsQuery, [templateId]);

        if (variantsResult.rows.length === 0) {
            // Create default control and test variants
            const defaultVariants = [
                { name: 'Control', weight: 0.5, isControl: true },
                { name: 'Test A', weight: 0.5, isControl: false }
            ];

            for (const variant of defaultVariants) {
                await pool.query(`
                    INSERT INTO template_variants
                    (template_id, variant_name, weight, is_control)
                    VALUES ($1, $2, $3, $4)
                `, [templateId, variant.name, variant.weight, variant.isControl]);
            }
        }
    }

    /**
     * Get experiments for a user
     */
    async getExperiments(userId, filters = {}) {
        let query = `
            SELECT e.*, t.name as template_name, t.category, t.channel
            FROM ab_experiments e
            JOIN personalized_templates t ON e.template_id = t.template_id
            WHERE t.user_id = $1
        `;
        const values = [userId];
        let paramCount = 1;

        if (filters.status) {
            paramCount++;
            query += ` AND e.status = $${paramCount}`;
            values.push(filters.status);
        }

        if (filters.templateId) {
            paramCount++;
            query += ` AND e.template_id = $${paramCount}`;
            values.push(filters.templateId);
        }

        query += ' ORDER BY e.created_at DESC';

        const result = await pool.query(query, values);
        return result.rows.map(row => this.formatExperiment(row));
    }

    /**
     * Get a specific experiment
     */
    async getExperiment(userId, experimentId) {
        const query = `
            SELECT e.*, t.name as template_name, t.category, t.channel
            FROM ab_experiments e
            JOIN personalized_templates t ON e.template_id = t.template_id
            WHERE e.experiment_id = $1 AND t.user_id = $2
        `;

        const result = await pool.query(query, [experimentId, userId]);

        if (result.rows.length === 0) {
            throw new Error('Experiment not found');
        }

        return this.formatExperiment(result.rows[0]);
    }

    /**
     * Start an experiment
     */
    async startExperiment(userId, experimentId) {
        const experiment = await this.getExperiment(userId, experimentId);

        if (experiment.status !== 'draft') {
            throw new Error('Experiment can only be started from draft status');
        }

        const query = `
            UPDATE ab_experiments
            SET status = 'running', start_date = CURRENT_TIMESTAMP
            WHERE experiment_id = $1
            RETURNING *
        `;

        const result = await pool.query(query, [experimentId]);
        return this.formatExperiment(result.rows[0]);
    }

    /**
     * Stop an experiment
     */
    async stopExperiment(userId, experimentId) {
        const experiment = await this.getExperiment(userId, experimentId);

        if (experiment.status !== 'running') {
            throw new Error('Experiment can only be stopped from running status');
        }

        const query = `
            UPDATE ab_experiments
            SET status = 'completed', end_date = CURRENT_TIMESTAMP
            WHERE experiment_id = $1
            RETURNING *
        `;

        const result = await pool.query(query, [experimentId]);
        return this.formatExperiment(result.rows[0]);
    }

    /**
     * Select a variant for a lead based on experiment
     */
    async selectVariantForLead(experimentId, leadId) {
        // Get experiment and its variants
        const experimentQuery = 'SELECT * FROM ab_experiments WHERE experiment_id = $1';
        const experimentResult = await pool.query(experimentQuery, [experimentId]);

        if (experimentResult.rows.length === 0) {
            throw new Error('Experiment not found');
        }

        const experiment = experimentResult.rows[0];
        if (experiment.status !== 'running') {
            throw new Error('Experiment is not running');
        }

        // Get variants for this experiment's template
        const variantsQuery = `
            SELECT * FROM template_variants
            WHERE template_id = $1
            ORDER BY variant_name
        `;
        const variantsResult = await pool.query(variantsQuery, [experiment.template_id]);

        if (variantsResult.rows.length === 0) {
            throw new Error('No variants found for experiment');
        }

        // Check if lead has already been assigned a variant
        const existingAssignmentQuery = `
            SELECT variant_id FROM experiment_results
            WHERE experiment_id = $1 AND lead_id = $2
            LIMIT 1
        `;
        const existingResult = await pool.query(existingAssignmentQuery, [experimentId, leadId]);

        if (existingResult.rows.length > 0) {
            // Return existing assignment
            const variant = variantsResult.rows.find(v => v.variant_id === existingResult.rows[0].variant_id);
            return variant || variantsResult.rows[0];
        }

        // Select variant based on weights (simple random selection for now)
        const random = Math.random();
        let cumulativeWeight = 0;

        for (const variant of variantsResult.rows) {
            cumulativeWeight += parseFloat(variant.weight);
            if (random <= cumulativeWeight) {
                // Record the assignment
                await pool.query(`
                    INSERT INTO experiment_results
                    (experiment_id, variant_id, lead_id)
                    VALUES ($1, $2, $3)
                `, [experimentId, variant.variant_id, leadId]);

                return variant;
            }
        }

        // Fallback to first variant
        const fallbackVariant = variantsResult.rows[0];
        await pool.query(`
            INSERT INTO experiment_results
            (experiment_id, variant_id, lead_id)
            VALUES ($1, $2, $3)
        `, [experimentId, fallbackVariant.variant_id, leadId]);

        return fallbackVariant;
    }

    /**
     * Record experiment result
     */
    async recordExperimentResult(experimentId, leadId, metricValue, conversionOccurred = false) {
        const query = `
            UPDATE experiment_results
            SET metric_value = $1, conversion_occurred = $2
            WHERE experiment_id = $3 AND lead_id = $4
        `;

        await pool.query(query, [metricValue, conversionOccurred, experimentId, leadId]);
    }

    /**
     * Get experiment results and statistics
     */
    async getExperimentResults(experimentId) {
        const resultsQuery = `
            SELECT
                v.variant_name,
                v.is_control,
                COUNT(er.*) as sample_size,
                AVG(er.metric_value) as avg_metric,
                SUM(CASE WHEN er.conversion_occurred THEN 1 ELSE 0 END) as conversions,
                COUNT(er.*) as total_responses
            FROM experiment_results er
            JOIN template_variants v ON er.variant_id = v.variant_id
            WHERE er.experiment_id = $1
            GROUP BY v.variant_id, v.variant_name, v.is_control
        `;

        const results = await pool.query(resultsQuery, [experimentId]);

        // Calculate statistical significance (simplified)
        const stats = this.calculateStatisticalSignificance(results.rows);

        return {
            experimentId,
            results: results.rows,
            statistics: stats,
            totalResponses: results.rows.reduce((sum, row) => sum + parseInt(row.total_responses), 0)
        };
    }

    /**
     * Calculate statistical significance (simplified version)
     */
    calculateStatisticalSignificance(results) {
        if (results.length < 2) return { significant: false, confidence: 0 };

        const control = results.find(r => r.is_control);
        const test = results.find(r => !r.is_control);

        if (!control || !test) return { significant: false, confidence: 0 };

        // Simplified statistical test (in production, use proper statistical library)
        const controlRate = parseFloat(control.conversions) / parseFloat(control.sample_size);
        const testRate = parseFloat(test.conversions) / parseFloat(test.sample_size);

        const difference = Math.abs(testRate - controlRate);
        const pooledRate = (parseFloat(control.conversions) + parseFloat(test.conversions)) /
                          (parseFloat(control.sample_size) + parseFloat(test.sample_size));

        if (pooledRate === 0) return { significant: false, confidence: 0 };

        // Simplified z-score calculation
        const se = Math.sqrt(pooledRate * (1 - pooledRate) *
                           (1/parseFloat(control.sample_size) + 1/parseFloat(test.sample_size)));
        const zScore = difference / se;

        // Approximate confidence level (simplified)
        const confidence = Math.min(zScore * 0.1, 0.99);

        return {
            significant: confidence > 0.8, // 80% confidence threshold
            confidence: Math.round(confidence * 100) / 100,
            controlRate,
            testRate,
            difference
        };
    }

    /**
     * Format experiment for API response
     */
    formatExperiment(row) {
        return {
            experimentId: row.experiment_id,
            templateId: row.template_id,
            templateName: row.template_name,
            name: row.name,
            description: row.description,
            status: row.status,
            startDate: row.start_date,
            endDate: row.end_date,
            targetMetric: row.target_metric,
            confidenceThreshold: row.confidence_threshold,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}

module.exports = new ABTestingService();