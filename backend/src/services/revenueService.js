const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class RevenueService {
    // Revenue Categories
    async getRevenueCategories() {
        const query = `
            SELECT id, name, description, category_type, is_active, created_at, updated_at
            FROM revenue_categories
            WHERE is_active = true
            ORDER BY name
        `;

        const result = await pool.query(query);
        return result.rows;
    }

    async createRevenueCategory(categoryData) {
        const { name, description, categoryType } = categoryData;

        const query = `
            INSERT INTO revenue_categories (name, description, category_type)
            VALUES ($1, $2, $3)
            RETURNING *
        `;

        const result = await pool.query(query, [name, description, categoryType]);
        return result.rows[0];
    }

    // Revenue Transactions
    async getRevenueTransactions(filters) {
        const {
            page = 1,
            limit = 50,
            startDate,
            endDate,
            agentId,
            categoryId,
            status,
            userId,
            userRole
        } = filters;

        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        // Build WHERE conditions
        if (startDate) {
            whereConditions.push(`rt.transaction_date >= $${paramIndex}`);
            queryParams.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            whereConditions.push(`rt.transaction_date <= $${paramIndex}`);
            queryParams.push(endDate);
            paramIndex++;
        }

        if (agentId) {
            whereConditions.push(`rt.agent_id = $${paramIndex}`);
            queryParams.push(agentId);
            paramIndex++;
        }

        if (categoryId) {
            whereConditions.push(`rt.category_id = $${paramIndex}`);
            queryParams.push(categoryId);
            paramIndex++;
        }

        if (status) {
            whereConditions.push(`rt.status = $${paramIndex}`);
            queryParams.push(status);
            paramIndex++;
        }

        // Role-based access control
        if (userRole !== 'admin' && userRole !== 'manager') {
            whereConditions.push(`rt.agent_id = $${paramIndex}`);
            queryParams.push(userId);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM revenue_transactions rt
            ${whereClause}
        `;

        const countResult = await pool.query(countQuery, queryParams);
        const totalCount = parseInt(countResult.rows[0].total);

        // Get paginated results
        const offset = (page - 1) * limit;
        const dataQuery = `
            SELECT
                rt.*,
                rc.name as category_name,
                rc.category_type,
                u.name as agent_name,
                uc.name as client_name
            FROM revenue_transactions rt
            LEFT JOIN revenue_categories rc ON rt.category_id = rc.id
            LEFT JOIN users u ON rt.agent_id = u.id
            LEFT JOIN users uc ON rt.client_id = uc.id
            ${whereClause}
            ORDER BY rt.transaction_date DESC, rt.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(limit, offset);
        const dataResult = await pool.query(dataQuery, queryParams);

        return {
            transactions: dataResult.rows,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit)
            }
        };
    }

    async getRevenueTransactionById(id, userId, userRole) {
        let query = `
            SELECT
                rt.*,
                rc.name as category_name,
                rc.category_type,
                u.name as agent_name,
                uc.name as client_name
            FROM revenue_transactions rt
            LEFT JOIN revenue_categories rc ON rt.category_id = rc.id
            LEFT JOIN users u ON rt.agent_id = u.id
            LEFT JOIN users uc ON rt.client_id = uc.id
            WHERE rt.id = $1
        `;

        const queryParams = [id];

        // Role-based access control
        if (userRole !== 'admin' && userRole !== 'manager') {
            query += ' AND rt.agent_id = $2';
            queryParams.push(userId);
        }

        const result = await pool.query(query, queryParams);
        return result.rows[0];
    }

    async createRevenueTransaction(transactionData) {
        const {
            transactionId,
            propertyId,
            leadId,
            agentId,
            clientId,
            amount,
            currency = 'USD',
            categoryId,
            transactionType,
            transactionDate,
            dueDate,
            paymentMethod,
            description,
            notes,
            externalReference,
            createdBy
        } = transactionData;

        // Generate unique transaction ID if not provided
        const finalTransactionId = transactionId || `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const query = `
            INSERT INTO revenue_transactions (
                transaction_id, property_id, lead_id, agent_id, client_id,
                amount, currency, category_id, transaction_type, transaction_date,
                due_date, payment_method, description, notes, external_reference, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
        `;

        const result = await pool.query(query, [
            finalTransactionId, propertyId, leadId, agentId, clientId,
            amount, currency, categoryId, transactionType, transactionDate,
            dueDate, paymentMethod, description, notes, externalReference, createdBy
        ]);

        const transaction = result.rows[0];

        // Trigger commission calculation for income transactions
        if (transactionType === 'income') {
            await this.calculateCommission({
                transactionId: transaction.id,
                agentId,
                calculatedBy: createdBy
            });
        }

        // Update analytics aggregates
        await this.updateRevenueAnalytics(transaction);

        return transaction;
    }

    async updateRevenueTransaction(id, updateData, userId, userRole) {
        // Check permissions
        const existingTransaction = await this.getRevenueTransactionById(id, userId, userRole);
        if (!existingTransaction) {
            return null;
        }

        const {
            amount,
            status,
            paymentDate,
            notes,
            processedAt = new Date()
        } = updateData;

        const query = `
            UPDATE revenue_transactions
            SET amount = COALESCE($1, amount),
                status = COALESCE($2, status),
                payment_date = COALESCE($3, payment_date),
                notes = COALESCE($4, notes),
                processed_at = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `;

        const result = await pool.query(query, [amount, status, paymentDate, notes, processedAt, id]);
        const updatedTransaction = result.rows[0];

        // Update analytics if amount or status changed
        if (amount !== existingTransaction.amount || status !== existingTransaction.status) {
            await this.updateRevenueAnalytics(updatedTransaction);
        }

        return updatedTransaction;
    }

    async deleteRevenueTransaction(id, userId, userRole) {
        // Check permissions
        const transaction = await this.getRevenueTransactionById(id, userId, userRole);
        if (!transaction) {
            return null;
        }

        const query = 'DELETE FROM revenue_transactions WHERE id = $1';
        await pool.query(query, [id]);

        // Update analytics aggregates
        await this.updateRevenueAnalytics(transaction, true); // true for deletion

        return true;
    }

    // Commission Management
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

        // Get commission structure
        let structure;
        if (commissionStructureId) {
            const structureQuery = 'SELECT * FROM commission_structures WHERE id = $1 AND is_active = true';
            const structureResult = await pool.query(structureQuery, [commissionStructureId]);
            structure = structureResult.rows[0];
        } else {
            // Use default structure
            const defaultQuery = 'SELECT * FROM commission_structures WHERE is_active = true ORDER BY created_at DESC LIMIT 1';
            const defaultResult = await pool.query(defaultQuery);
            structure = defaultResult.rows[0];
        }

        if (!structure) {
            throw new Error('No active commission structure found');
        }

        // Calculate commission based on structure type
        let commissionAmount = 0;
        const grossAmount = transaction.amount;

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

        // Calculate net amount (after taxes - simplified)
        const taxRate = 0.20; // 20% tax rate (adjustable)
        const taxes = commissionAmount * taxRate;
        const netAmount = commissionAmount - taxes;

        // Create commission record
        const commissionQuery = `
            INSERT INTO agent_commissions (
                transaction_id, agent_id, commission_structure_id,
                gross_amount, commission_rate, commission_amount,
                taxes, net_amount, processed_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const result = await pool.query(commissionQuery, [
            transactionId,
            agentId,
            structure.id,
            grossAmount,
            structure.base_percentage || 0,
            commissionAmount,
            taxes,
            netAmount,
            calculatedBy
        ]);

        return result.rows[0];
    }

    calculateTieredCommission(amount, tierRules) {
        // Simplified tiered calculation
        // In production, this would parse complex tier rules from JSON
        if (amount <= 100000) return amount * 0.02; // 2% for <= $100k
        if (amount <= 500000) return amount * 0.025; // 2.5% for <= $500k
        return amount * 0.03; // 3% for > $500k
    }

    async getAgentCommissions(filters) {
        const {
            page = 1,
            limit = 50,
            startDate,
            endDate,
            agentId,
            status,
            userRole
        } = filters;

        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        // Build WHERE conditions
        if (startDate) {
            whereConditions.push(`rt.transaction_date >= $${paramIndex}`);
            queryParams.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            whereConditions.push(`rt.transaction_date <= $${paramIndex}`);
            queryParams.push(endDate);
            paramIndex++;
        }

        if (agentId) {
            whereConditions.push(`ac.agent_id = $${paramIndex}`);
            queryParams.push(agentId);
            paramIndex++;
        }

        if (status) {
            whereConditions.push(`ac.payment_status = $${paramIndex}`);
            queryParams.push(status);
            paramIndex++;
        }

        // Role-based access control
        if (userRole !== 'admin' && userRole !== 'manager') {
            whereConditions.push(`ac.agent_id = $${paramIndex}`);
            queryParams.push(filters.userId);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM agent_commissions ac
            JOIN revenue_transactions rt ON ac.transaction_id = rt.id
            ${whereClause}
        `;

        const countResult = await pool.query(countQuery, queryParams);
        const totalCount = parseInt(countResult.rows[0].total);

        // Get paginated results
        const offset = (page - 1) * limit;
        const dataQuery = `
            SELECT
                ac.*,
                rt.transaction_id,
                rt.amount as transaction_amount,
                rt.transaction_date,
                rc.name as category_name,
                u.name as agent_name
            FROM agent_commissions ac
            JOIN revenue_transactions rt ON ac.transaction_id = rt.id
            LEFT JOIN revenue_categories rc ON rt.category_id = rc.id
            LEFT JOIN users u ON ac.agent_id = u.id
            ${whereClause}
            ORDER BY rt.transaction_date DESC, ac.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(limit, offset);
        const dataResult = await pool.query(dataQuery, queryParams);

        return {
            commissions: dataResult.rows,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit)
            }
        };
    }

    // Analytics Methods
    async getRevenueSummary({ startDate, endDate, agentId, userRole }) {
        let dateFilter = '';
        let queryParams = [agentId];
        let paramIndex = 2;

        if (startDate) {
            dateFilter += ` AND rt.transaction_date >= $${paramIndex}`;
            queryParams.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            dateFilter += ` AND rt.transaction_date <= $${paramIndex}`;
            queryParams.push(endDate);
            paramIndex++;
        }

        // Role-based filtering
        let roleFilter = '';
        if (userRole !== 'admin' && userRole !== 'manager') {
            roleFilter = ' AND rt.agent_id = $1';
            queryParams[0] = agentId;
        } else {
            roleFilter = ' AND ($1::uuid IS NULL OR rt.agent_id = $1)';
        }

        const query = `
            SELECT
                COUNT(*) as total_transactions,
                SUM(CASE WHEN rt.transaction_type = 'income' THEN rt.amount ELSE 0 END) as total_revenue,
                SUM(CASE WHEN rt.transaction_type = 'expense' THEN rt.amount ELSE 0 END) as total_expenses,
                SUM(CASE WHEN rt.transaction_type = 'commission' THEN rt.amount ELSE 0 END) as total_commissions,
                AVG(CASE WHEN rt.transaction_type = 'income' THEN rt.amount ELSE NULL END) as avg_transaction_value,
                COUNT(DISTINCT rt.agent_id) as active_agents,
                COUNT(DISTINCT DATE(rt.transaction_date)) as active_days
            FROM revenue_transactions rt
            WHERE rt.status = 'completed' ${roleFilter} ${dateFilter}
        `;

        const result = await pool.query(query, queryParams);
        const data = result.rows[0];

        return {
            totalTransactions: parseInt(data.total_transactions) || 0,
            totalRevenue: parseFloat(data.total_revenue) || 0,
            totalExpenses: parseFloat(data.total_expenses) || 0,
            totalCommissions: parseFloat(data.total_commissions) || 0,
            netIncome: (parseFloat(data.total_revenue) || 0) - (parseFloat(data.total_expenses) || 0),
            avgTransactionValue: parseFloat(data.avg_transaction_value) || 0,
            activeAgents: parseInt(data.active_agents) || 0,
            activeDays: parseInt(data.active_days) || 0
        };
    }

    async getRevenueTrends({ period = 'monthly', limit = 12, agentId, userRole }) {
        let dateTrunc;
        switch (period) {
            case 'daily':
                dateTrunc = 'day';
                break;
            case 'weekly':
                dateTrunc = 'week';
                break;
            case 'monthly':
                dateTrunc = 'month';
                break;
            case 'quarterly':
                dateTrunc = 'quarter';
                break;
            case 'yearly':
                dateTrunc = 'year';
                break;
            default:
                dateTrunc = 'month';
        }

        let roleFilter = '';
        let queryParams = [limit];

        if (userRole !== 'admin' && userRole !== 'manager') {
            roleFilter = ' AND rt.agent_id = $2';
            queryParams.push(agentId);
        } else {
            roleFilter = ' AND ($2::uuid IS NULL OR rt.agent_id = $2)';
            queryParams.push(agentId);
        }

        const query = `
            SELECT
                DATE_TRUNC('${dateTrunc}', rt.transaction_date) as period,
                COUNT(*) as transaction_count,
                SUM(CASE WHEN rt.transaction_type = 'income' THEN rt.amount ELSE 0 END) as revenue,
                SUM(CASE WHEN rt.transaction_type = 'expense' THEN rt.amount ELSE 0 END) as expenses,
                SUM(CASE WHEN rt.transaction_type = 'commission' THEN rt.amount ELSE 0 END) as commissions
            FROM revenue_transactions rt
            WHERE rt.status = 'completed' ${roleFilter}
            GROUP BY DATE_TRUNC('${dateTrunc}', rt.transaction_date)
            ORDER BY period DESC
            LIMIT $1
        `;

        const result = await pool.query(query, queryParams);

        return result.rows.map(row => ({
            period: row.period.toISOString().split('T')[0],
            transactionCount: parseInt(row.transaction_count),
            revenue: parseFloat(row.revenue) || 0,
            expenses: parseFloat(row.expenses) || 0,
            commissions: parseFloat(row.commissions) || 0,
            netIncome: (parseFloat(row.revenue) || 0) - (parseFloat(row.expenses) || 0)
        })).reverse(); // Return in chronological order
    }

    async getRevenueForecast({ months = 6, agentId, userRole }) {
        // Get historical data for forecasting
        const historicalData = await this.getRevenueTrends({
            period: 'monthly',
            limit: 12,
            agentId,
            userRole
        });

        if (historicalData.length < 3) {
            return {
                forecast: [],
                confidence: 'low',
                note: 'Insufficient historical data for accurate forecasting'
            };
        }

        // Simple linear regression for forecasting
        const forecast = this.calculateLinearForecast(historicalData, months);

        return {
            forecast,
            confidence: historicalData.length >= 6 ? 'medium' : 'low',
            note: 'Forecast based on historical revenue trends'
        };
    }

    calculateLinearForecast(historicalData, months) {
        const revenues = historicalData.map(d => d.revenue);
        const n = revenues.length;

        // Calculate linear regression
        const sumX = (n * (n - 1)) / 2;
        const sumY = revenues.reduce((sum, val) => sum + val, 0);
        const sumXY = revenues.reduce((sum, val, index) => sum + val * index, 0);
        const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Generate forecast
        const forecast = [];
        const lastDate = new Date(historicalData[historicalData.length - 1].period);

        for (let i = 1; i <= months; i++) {
            const forecastDate = new Date(lastDate);
            forecastDate.setMonth(forecastDate.getMonth() + i);

            const predictedValue = intercept + slope * (n + i - 1);

            forecast.push({
                period: forecastDate.toISOString().split('T')[0],
                predictedRevenue: Math.max(0, predictedValue), // Ensure non-negative
                confidence: 'medium'
            });
        }

        return forecast;
    }

    // Commission Structures
    async getCommissionStructures() {
        const query = `
            SELECT * FROM commission_structures
            WHERE is_active = true
            ORDER BY created_at DESC
        `;

        const result = await pool.query(query);
        return result.rows;
    }

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

    // Revenue Goals
    async getRevenueGoals({ agentId, status, userRole }) {
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (agentId) {
            whereConditions.push(`agent_id = $${paramIndex}`);
            queryParams.push(agentId);
            paramIndex++;
        }

        if (status) {
            whereConditions.push(`status = $${paramIndex}`);
            queryParams.push(status);
            paramIndex++;
        }

        // Role-based access control
        if (userRole !== 'admin' && userRole !== 'manager') {
            whereConditions.push(`agent_id = $${paramIndex}`);
            queryParams.push(agentId);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const query = `
            SELECT rg.*, u.name as agent_name
            FROM revenue_goals rg
            LEFT JOIN users u ON rg.agent_id = u.id
            ${whereClause}
            ORDER BY rg.target_date DESC, rg.created_at DESC
        `;

        const result = await pool.query(query, queryParams);
        return result.rows;
    }

    async createRevenueGoal(goalData) {
        const {
            agentId,
            categoryId,
            goalType,
            targetAmount,
            targetDate,
            createdBy
        } = goalData;

        const query = `
            INSERT INTO revenue_goals (
                agent_id, category_id, goal_type, target_amount, target_date, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await pool.query(query, [
            agentId, categoryId, goalType, targetAmount, targetDate, createdBy
        ]);

        return result.rows[0];
    }

    // Bulk Operations
    async bulkCreateRevenueTransactions(transactions, createdBy) {
        const results = [];

        for (const transaction of transactions) {
            try {
                const result = await this.createRevenueTransaction({
                    ...transaction,
                    createdBy
                });
                results.push(result);
            } catch (error) {
                console.error(`Failed to create transaction:`, error);
                results.push({
                    error: error.message,
                    transaction: transaction
                });
            }
        }

        return results;
    }

    // Export Functions
    async exportRevenueTransactions({ format = 'csv', startDate, endDate, agentId, userRole }) {
        const transactions = await this.getRevenueTransactions({
            startDate,
            endDate,
            agentId,
            userId: agentId,
            userRole,
            page: 1,
            limit: 10000 // Large limit for export
        });

        if (format === 'csv') {
            return this.convertToCSV(transactions.transactions);
        } else {
            return JSON.stringify(transactions.transactions, null, 2);
        }
    }

    async exportAgentCommissions({ format = 'csv', startDate, endDate, agentId, userRole }) {
        const commissions = await this.getAgentCommissions({
            startDate,
            endDate,
            agentId,
            userId: agentId,
            userRole,
            page: 1,
            limit: 10000
        });

        if (format === 'csv') {
            return this.convertToCSV(commissions.commissions);
        } else {
            return JSON.stringify(commissions.commissions, null, 2);
        }
    }

    convertToCSV(data) {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvRows = [];

        // Add headers
        csvRows.push(headers.join(','));

        // Add data rows
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                // Escape commas and quotes in CSV
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value || '';
            });
            csvRows.push(values.join(','));
        }

        return csvRows.join('\n');
    }

    // Analytics Aggregation Updates
    async updateRevenueAnalytics(transaction, isDeletion = false) {
        const date = transaction.transaction_date;
        const agentId = transaction.agent_id;
        const categoryId = transaction.category_id;
        const amount = isDeletion ? -transaction.amount : transaction.amount;
        const transactionType = transaction.transaction_type;

        // Update or insert daily analytics
        const query = `
            INSERT INTO revenue_analytics_daily (
                date, agent_id, category_id,
                total_revenue, total_commissions, total_expenses, net_income,
                transaction_count, commission_count
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (date, agent_id, category_id)
            DO UPDATE SET
                total_revenue = revenue_analytics_daily.total_revenue + $4,
                total_commissions = revenue_analytics_daily.total_commissions + $5,
                total_expenses = revenue_analytics_daily.total_expenses + $6,
                net_income = revenue_analytics_daily.net_income + $7,
                transaction_count = revenue_analytics_daily.transaction_count + $8,
                commission_count = revenue_analytics_daily.commission_count + $9,
                updated_at = CURRENT_TIMESTAMP
        `;

        const revenueAmount = transactionType === 'income' ? amount : 0;
        const expenseAmount = transactionType === 'expense' ? amount : 0;
        const commissionAmount = transactionType === 'commission' ? amount : 0;
        const netIncome = revenueAmount - expenseAmount;

        await pool.query(query, [
            date, agentId, categoryId,
            revenueAmount, commissionAmount, expenseAmount, netIncome,
            1, transactionType === 'commission' ? 1 : 0
        ]);
    }
}

module.exports = new RevenueService();