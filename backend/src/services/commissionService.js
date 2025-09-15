const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class CommissionService {
    // Commission Structure Management
    async createCommissionStructure(structureData) {
        const {
            name,
            description,
            structureType,
            basePercentage,
            flatAmount,
            tierRules,
            splitRules,
            minAmount,
            maxAmount,
            effectiveDate,
            expiryDate,
            createdBy
        } = structureData;

        // Validate tier rules if provided
        if (tierRules && structureType === 'tiered') {
            this.validateTierRules(tierRules);
        }

        // Validate split rules if provided
        if (splitRules && structureType === 'split') {
            this.validateSplitRules(splitRules);
        }

        const query = `
            INSERT INTO commission_structures (
                name, description, structure_type, base_percentage, flat_amount,
                tier_rules, split_rules, min_amount, max_amount,
                effective_date, expiry_date, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;

        const result = await pool.query(query, [
            name, description, structureType, basePercentage, flatAmount,
            tierRules, splitRules, minAmount, maxAmount,
            effectiveDate, expiryDate, createdBy
        ]);

        return result.rows[0];
    }

    async getCommissionStructures(filters = {}) {
        const { isActive = true, structureType } = filters;

        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (isActive !== undefined) {
            whereConditions.push(`is_active = $${paramIndex}`);
            queryParams.push(isActive);
            paramIndex++;
        }

        if (structureType) {
            whereConditions.push(`structure_type = $${paramIndex}`);
            queryParams.push(structureType);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const query = `
            SELECT * FROM commission_structures
            ${whereClause}
            ORDER BY created_at DESC
        `;

        const result = await pool.query(query, queryParams);
        return result.rows;
    }

    async updateCommissionStructure(id, updateData, updatedBy) {
        const {
            name,
            description,
            basePercentage,
            flatAmount,
            tierRules,
            splitRules,
            minAmount,
            maxAmount,
            isActive
        } = updateData;

        // Validate rules if provided
        if (tierRules) {
            this.validateTierRules(tierRules);
        }

        if (splitRules) {
            this.validateSplitRules(splitRules);
        }

        const query = `
            UPDATE commission_structures
            SET name = COALESCE($1, name),
                description = COALESCE($2, description),
                base_percentage = COALESCE($3, base_percentage),
                flat_amount = COALESCE($4, flat_amount),
                tier_rules = COALESCE($5, tier_rules),
                split_rules = COALESCE($6, split_rules),
                min_amount = COALESCE($7, min_amount),
                max_amount = COALESCE($8, max_amount),
                is_active = COALESCE($9, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
            RETURNING *
        `;

        const result = await pool.query(query, [
            name, description, basePercentage, flatAmount,
            tierRules, splitRules, minAmount, maxAmount, isActive, id
        ]);

        return result.rows[0];
    }

    // Commission Calculation Engine
    async calculateCommission({ transactionId, agentId, commissionStructureId, calculatedBy }) {
        // Get transaction details
        const transactionQuery = `
            SELECT rt.*, rc.category_type
            FROM revenue_transactions rt
            LEFT JOIN revenue_categories rc ON rt.category_id = rc.id
            WHERE rt.id = $1
        `;
        const transactionResult = await pool.query(transactionQuery, [transactionId]);
        const transaction = transactionResult.rows[0];

        if (!transaction) {
            throw new Error('Transaction not found');
        }

        if (transaction.transaction_type !== 'income') {
            throw new Error('Commissions can only be calculated on income transactions');
        }

        // Get or determine commission structure
        let structure;
        if (commissionStructureId) {
            const structureQuery = 'SELECT * FROM commission_structures WHERE id = $1 AND is_active = true';
            const structureResult = await pool.query(structureQuery, [commissionStructureId]);
            structure = structureResult.rows[0];
        } else {
            // Use default or agent-specific structure
            structure = await this.getApplicableCommissionStructure(agentId, transaction);
        }

        if (!structure) {
            throw new Error('No applicable commission structure found');
        }

        // Calculate base commission
        const grossAmount = transaction.amount;
        let commissionAmount = 0;

        switch (structure.structure_type) {
            case 'percentage':
                commissionAmount = grossAmount * (structure.base_percentage / 100);
                break;
            case 'flat_fee':
                commissionAmount = structure.flat_amount;
                break;
            case 'tiered':
                commissionAmount = this.calculateTieredCommission(grossAmount, structure.tier_rules);
                break;
            case 'split':
                commissionAmount = this.calculateSplitCommission(grossAmount, structure.split_rules, agentId);
                break;
            default:
                commissionAmount = grossAmount * 0.03; // Default 3%
        }

        // Apply min/max constraints
        if (structure.min_amount && commissionAmount < structure.min_amount) {
            commissionAmount = structure.min_amount;
        }
        if (structure.max_amount && commissionAmount > structure.max_amount) {
            commissionAmount = structure.max_amount;
        }

        // Calculate adjustments, bonuses, and taxes
        const adjustments = await this.calculateAdjustments(transactionId, agentId);
        const bonuses = await this.calculateBonuses(transactionId, agentId);
        const penalties = await this.calculatePenalties(transactionId, agentId);

        // Apply adjustments
        commissionAmount += adjustments + bonuses - penalties;

        // Calculate taxes (simplified - in production, this would be more complex)
        const taxRate = await this.getTaxRate(agentId);
        const taxes = Math.max(0, commissionAmount * taxRate);

        // Calculate final amounts
        const netAmount = commissionAmount - taxes;

        // Create commission record
        const commissionQuery = `
            INSERT INTO agent_commissions (
                transaction_id, agent_id, commission_structure_id,
                gross_amount, commission_rate, commission_amount,
                adjustments, bonuses, penalties, taxes, net_amount,
                processed_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;

        const result = await pool.query(commissionQuery, [
            transactionId,
            agentId,
            structure.id,
            grossAmount,
            structure.base_percentage || 0,
            commissionAmount,
            adjustments,
            bonuses,
            penalties,
            taxes,
            netAmount,
            calculatedBy
        ]);

        const commission = result.rows[0];

        // Create audit trail
        await this.createCommissionAuditTrail(commission.id, 'calculated', calculatedBy, {
            structure: structure.name,
            calculation: {
                grossAmount,
                commissionAmount,
                adjustments,
                bonuses,
                penalties,
                taxes,
                netAmount
            }
        });

        return commission;
    }

    calculateTieredCommission(amount, tierRules) {
        // Parse tier rules from JSON
        const tiers = typeof tierRules === 'string' ? JSON.parse(tierRules) : tierRules;

        let commissionAmount = 0;
        let remainingAmount = amount;

        for (const tier of tiers) {
            if (remainingAmount <= 0) break;

            const tierAmount = Math.min(remainingAmount, tier.maxAmount || remainingAmount);
            commissionAmount += tierAmount * (tier.percentage / 100);
            remainingAmount -= tierAmount;
        }

        return commissionAmount;
    }

    calculateSplitCommission(amount, splitRules, agentId) {
        // Parse split rules from JSON
        const splits = typeof splitRules === 'string' ? JSON.parse(splitRules) : splitRules;

        // Find agent's split percentage
        const agentSplit = splits.find(split => split.agentId === agentId);
        if (!agentSplit) {
            throw new Error('Agent not found in split configuration');
        }

        return amount * (agentSplit.percentage / 100);
    }

    async getApplicableCommissionStructure(agentId, transaction) {
        // Check for agent-specific structures first
        const agentQuery = `
            SELECT cs.* FROM commission_structures cs
            JOIN agent_commission_structures acs ON cs.id = acs.commission_structure_id
            WHERE acs.agent_id = $1
            AND cs.is_active = true
            AND cs.effective_date <= $2
            AND (cs.expiry_date IS NULL OR cs.expiry_date >= $2)
            ORDER BY cs.created_at DESC
            LIMIT 1
        `;

        const agentResult = await pool.query(agentQuery, [agentId, transaction.transaction_date]);

        if (agentResult.rows.length > 0) {
            return agentResult.rows[0];
        }

        // Fall back to default structure
        const defaultQuery = `
            SELECT * FROM commission_structures
            WHERE is_active = true
            AND structure_type = 'percentage'
            AND base_percentage = 3.00
            ORDER BY created_at DESC
            LIMIT 1
        `;

        const defaultResult = await pool.query(defaultQuery);
        return defaultResult.rows[0];
    }

    async calculateAdjustments(transactionId, agentId) {
        // Calculate adjustments based on various factors
        let adjustments = 0;

        // Example: Volume discounts for high-performing agents
        const volumeQuery = `
            SELECT COUNT(*) as transaction_count,
                   SUM(amount) as total_volume
            FROM revenue_transactions
            WHERE agent_id = $1
            AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'
            AND transaction_type = 'income'
            AND status = 'completed'
        `;

        const volumeResult = await pool.query(volumeQuery, [agentId]);
        const { transaction_count, total_volume } = volumeResult.rows[0];

        // Apply volume-based adjustments
        if (transaction_count >= 10) {
            adjustments += Math.min(total_volume * 0.001, 500); // 0.1% bonus, max $500
        }

        return adjustments;
    }

    async calculateBonuses(transactionId, agentId) {
        // Calculate performance-based bonuses
        let bonuses = 0;

        // Example: Closing bonus for large transactions
        const transactionQuery = `
            SELECT amount FROM revenue_transactions
            WHERE id = $1
        `;

        const transactionResult = await pool.query(transactionQuery, [transactionId]);
        const transactionAmount = transactionResult.rows[0]?.amount || 0;

        // Large transaction bonus
        if (transactionAmount >= 500000) {
            bonuses += transactionAmount * 0.001; // 0.1% bonus
        }

        return bonuses;
    }

    async calculatePenalties(transactionId, agentId) {
        // Calculate penalties for various issues
        let penalties = 0;

        // Example: Late payment penalty
        const paymentQuery = `
            SELECT
                CASE WHEN payment_date > due_date THEN 50 ELSE 0 END as late_penalty
            FROM revenue_transactions
            WHERE id = $1
        `;

        const paymentResult = await pool.query(paymentQuery, [transactionId]);
        penalties += paymentResult.rows[0]?.late_penalty || 0;

        return penalties;
    }

    async getTaxRate(agentId) {
        // In production, this would integrate with tax calculation services
        // For now, return a default rate
        return 0.20; // 20% tax rate
    }

    // Commission Payments
    async processCommissionPayments({ agentId, paymentPeriodStart, paymentPeriodEnd, processedBy }) {
        // Get all unpaid commissions for the period
        const commissionsQuery = `
            SELECT ac.*, rt.transaction_date, u.name as agent_name
            FROM agent_commissions ac
            JOIN revenue_transactions rt ON ac.transaction_id = rt.id
            JOIN users u ON ac.agent_id = u.id
            WHERE ac.agent_id = $1
            AND ac.payment_status = 'pending'
            AND rt.transaction_date BETWEEN $2 AND $3
            ORDER BY rt.transaction_date
        `;

        const commissionsResult = await pool.query(commissionsQuery, [
            agentId, paymentPeriodStart, paymentPeriodEnd
        ]);

        const commissions = commissionsResult.rows;

        if (commissions.length === 0) {
            throw new Error('No eligible commissions found for payment processing');
        }

        // Calculate total payment amount
        const totalAmount = commissions.reduce((sum, commission) => sum + parseFloat(commission.net_amount), 0);

        // Create payment record
        const paymentQuery = `
            INSERT INTO commission_payments (
                agent_id, payment_date, payment_period_start, payment_period_end,
                total_amount, processed_by
            ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5)
            RETURNING *
        `;

        const paymentResult = await pool.query(paymentQuery, [
            agentId, paymentPeriodStart, paymentPeriodEnd, totalAmount, processedBy
        ]);

        const payment = paymentResult.rows[0];

        // Link commissions to payment
        for (const commission of commissions) {
            await pool.query(`
                INSERT INTO commission_payment_details (payment_id, commission_id, amount_paid)
                VALUES ($1, $2, $3)
            `, [payment.id, commission.id, commission.net_amount]);

            // Update commission status
            await pool.query(`
                UPDATE agent_commissions
                SET payment_status = 'paid',
                    payment_date = CURRENT_DATE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [commission.id]);
        }

        return {
            payment,
            commissionsProcessed: commissions.length,
            totalAmount
        };
    }

    // Commission Analytics
    async getCommissionAnalytics({ agentId, startDate, endDate, userRole }) {
        let roleFilter = '';
        let queryParams = [];

        if (userRole !== 'admin' && userRole !== 'manager') {
            roleFilter = ' AND ac.agent_id = $1';
            queryParams.push(agentId);
        } else if (agentId) {
            roleFilter = ' AND ac.agent_id = $1';
            queryParams.push(agentId);
        }

        const dateFilter = startDate && endDate ?
            ' AND rt.transaction_date BETWEEN $' + (queryParams.length + 1) + ' AND $' + (queryParams.length + 2) :
            '';

        if (dateFilter) {
            queryParams.push(startDate, endDate);
        }

        const query = `
            SELECT
                COUNT(*) as total_commissions,
                SUM(ac.gross_amount) as total_gross_amount,
                SUM(ac.commission_amount) as total_commission_amount,
                SUM(ac.net_amount) as total_net_amount,
                SUM(ac.taxes) as total_taxes,
                AVG(ac.commission_rate) as avg_commission_rate,
                COUNT(CASE WHEN ac.payment_status = 'paid' THEN 1 END) as paid_commissions,
                COUNT(CASE WHEN ac.payment_status = 'pending' THEN 1 END) as pending_commissions
            FROM agent_commissions ac
            JOIN revenue_transactions rt ON ac.transaction_id = rt.id
            WHERE 1=1 ${roleFilter} ${dateFilter}
        `;

        const result = await pool.query(query, queryParams);
        return result.rows[0];
    }

    // Commission Disputes
    async createCommissionDispute({ commissionId, raisedBy, reason, description }) {
        const query = `
            INSERT INTO commission_disputes (
                commission_id, raised_by, reason, description
            ) VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const result = await pool.query(query, [commissionId, raisedBy, reason, description]);
        return result.rows[0];
    }

    async resolveCommissionDispute({ disputeId, resolvedBy, resolution, adjustmentAmount }) {
        // Update dispute status
        await pool.query(`
            UPDATE commission_disputes
            SET status = 'resolved',
                resolved_by = $2,
                resolution = $3,
                resolved_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [disputeId, resolvedBy, resolution]);

        // Apply adjustment if specified
        if (adjustmentAmount !== undefined) {
            const disputeQuery = 'SELECT commission_id FROM commission_disputes WHERE id = $1';
            const disputeResult = await pool.query(disputeQuery, [disputeId]);
            const commissionId = disputeResult.rows[0].commission_id;

            await pool.query(`
                UPDATE agent_commissions
                SET adjustments = adjustments + $2,
                    net_amount = commission_amount + adjustments + bonuses - penalties - taxes,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [commissionId, adjustmentAmount]);
        }
    }

    // Validation Methods
    validateTierRules(tierRules) {
        const tiers = typeof tierRules === 'string' ? JSON.parse(tierRules) : tierRules;

        if (!Array.isArray(tiers)) {
            throw new Error('Tier rules must be an array');
        }

        for (const tier of tiers) {
            if (typeof tier.percentage !== 'number' || tier.percentage < 0 || tier.percentage > 100) {
                throw new Error('Tier percentage must be a number between 0 and 100');
            }
            if (tier.maxAmount && typeof tier.maxAmount !== 'number') {
                throw new Error('Tier maxAmount must be a number');
            }
        }
    }

    validateSplitRules(splitRules) {
        const splits = typeof splitRules === 'string' ? JSON.parse(splitRules) : splitRules;

        if (!Array.isArray(splits)) {
            throw new Error('Split rules must be an array');
        }

        const totalPercentage = splits.reduce((sum, split) => sum + (split.percentage || 0), 0);

        if (Math.abs(totalPercentage - 100) > 0.01) {
            throw new Error('Split percentages must total 100%');
        }

        for (const split of splits) {
            if (!split.agentId) {
                throw new Error('Each split must have an agentId');
            }
            if (typeof split.percentage !== 'number' || split.percentage < 0 || split.percentage > 100) {
                throw new Error('Split percentage must be a number between 0 and 100');
            }
        }
    }

    // Audit Trail
    async createCommissionAuditTrail(commissionId, action, performedBy, details) {
        const query = `
            INSERT INTO commission_audit_trail (
                commission_id, action, performed_by, details
            ) VALUES ($1, $2, $3, $4)
        `;

        await pool.query(query, [commissionId, action, performedBy, JSON.stringify(details)]);
    }

    async getCommissionAuditTrail(commissionId) {
        const query = `
            SELECT cat.*, u.name as performed_by_name
            FROM commission_audit_trail cat
            LEFT JOIN users u ON cat.performed_by = u.id
            WHERE cat.commission_id = $1
            ORDER BY cat.created_at DESC
        `;

        const result = await pool.query(query, [commissionId]);
        return result.rows;
    }
}

module.exports = new CommissionService();