const express = require('express');
const router = express.Router();
const revenueService = require('../services/revenueService');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateRevenueTransaction, validateCommissionCalculation } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');

// Rate limiting for revenue endpoints
const revenueLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many revenue requests from this IP, please try again later.'
});

// Apply authentication to all routes
router.use(authenticateToken);

// Revenue Categories
router.get('/categories', async (req, res) => {
    try {
        const categories = await revenueService.getRevenueCategories();
        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Error fetching revenue categories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch revenue categories'
        });
    }
});

router.post('/categories', requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const category = await revenueService.createRevenueCategory(req.body);
        res.status(201).json({
            success: true,
            data: category
        });
    } catch (error) {
        console.error('Error creating revenue category:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create revenue category'
        });
    }
});

// Revenue Transactions
router.get('/transactions', revenueLimiter, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            startDate,
            endDate,
            agentId,
            categoryId,
            status
        } = req.query;

        const result = await revenueService.getRevenueTransactions({
            page: parseInt(page),
            limit: parseInt(limit),
            startDate,
            endDate,
            agentId,
            categoryId,
            status,
            userId: req.user.id,
            userRole: req.user.role
        });

        res.json({
            success: true,
            data: result.transactions,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Error fetching revenue transactions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch revenue transactions'
        });
    }
});

router.get('/transactions/:id', async (req, res) => {
    try {
        const transaction = await revenueService.getRevenueTransactionById(
            req.params.id,
            req.user.id,
            req.user.role
        );

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Revenue transaction not found'
            });
        }

        res.json({
            success: true,
            data: transaction
        });
    } catch (error) {
        console.error('Error fetching revenue transaction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch revenue transaction'
        });
    }
});

router.post('/transactions', revenueLimiter, validateRevenueTransaction, async (req, res) => {
    try {
        const transaction = await revenueService.createRevenueTransaction({
            ...req.body,
            createdBy: req.user.id
        });

        res.status(201).json({
            success: true,
            data: transaction
        });
    } catch (error) {
        console.error('Error creating revenue transaction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create revenue transaction'
        });
    }
});

router.put('/transactions/:id', validateRevenueTransaction, async (req, res) => {
    try {
        const transaction = await revenueService.updateRevenueTransaction(
            req.params.id,
            req.body,
            req.user.id,
            req.user.role
        );

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Revenue transaction not found'
            });
        }

        res.json({
            success: true,
            data: transaction
        });
    } catch (error) {
        console.error('Error updating revenue transaction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update revenue transaction'
        });
    }
});

router.delete('/transactions/:id', requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const result = await revenueService.deleteRevenueTransaction(
            req.params.id,
            req.user.id,
            req.user.role
        );

        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Revenue transaction not found'
            });
        }

        res.json({
            success: true,
            message: 'Revenue transaction deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting revenue transaction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete revenue transaction'
        });
    }
});

// Revenue Analytics
router.get('/analytics/summary', async (req, res) => {
    try {
        const { startDate, endDate, agentId } = req.query;

        const summary = await revenueService.getRevenueSummary({
            startDate,
            endDate,
            agentId: agentId || req.user.id,
            userRole: req.user.role
        });

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Error fetching revenue summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch revenue summary'
        });
    }
});

router.get('/analytics/trends', async (req, res) => {
    try {
        const { period = 'monthly', limit = 12, agentId } = req.query;

        const trends = await revenueService.getRevenueTrends({
            period,
            limit: parseInt(limit),
            agentId: agentId || req.user.id,
            userRole: req.user.role
        });

        res.json({
            success: true,
            data: trends
        });
    } catch (error) {
        console.error('Error fetching revenue trends:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch revenue trends'
        });
    }
});

router.get('/analytics/forecast', async (req, res) => {
    try {
        const { months = 6, agentId } = req.query;

        const forecast = await revenueService.getRevenueForecast({
            months: parseInt(months),
            agentId: agentId || req.user.id,
            userRole: req.user.role
        });

        res.json({
            success: true,
            data: forecast
        });
    } catch (error) {
        console.error('Error fetching revenue forecast:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch revenue forecast'
        });
    }
});

// Commission Management
router.get('/commissions', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            startDate,
            endDate,
            agentId,
            status
        } = req.query;

        const result = await revenueService.getAgentCommissions({
            page: parseInt(page),
            limit: parseInt(limit),
            startDate,
            endDate,
            agentId: agentId || req.user.id,
            status,
            userRole: req.user.role
        });

        res.json({
            success: true,
            data: result.commissions,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Error fetching agent commissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch agent commissions'
        });
    }
});

router.post('/commissions/calculate', validateCommissionCalculation, async (req, res) => {
    try {
        const { transactionId, agentId, commissionStructureId } = req.body;

        const commission = await revenueService.calculateCommission({
            transactionId,
            agentId: agentId || req.user.id,
            commissionStructureId,
            calculatedBy: req.user.id
        });

        res.json({
            success: true,
            data: commission
        });
    } catch (error) {
        console.error('Error calculating commission:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate commission'
        });
    }
});

// Commission Structures
router.get('/commission-structures', async (req, res) => {
    try {
        const structures = await revenueService.getCommissionStructures();
        res.json({
            success: true,
            data: structures
        });
    } catch (error) {
        console.error('Error fetching commission structures:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch commission structures'
        });
    }
});

router.post('/commission-structures', requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const structure = await revenueService.createCommissionStructure({
            ...req.body,
            createdBy: req.user.id
        });

        res.status(201).json({
            success: true,
            data: structure
        });
    } catch (error) {
        console.error('Error creating commission structure:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create commission structure'
        });
    }
});

// Revenue Goals
router.get('/goals', async (req, res) => {
    try {
        const { agentId, status = 'active' } = req.query;

        const goals = await revenueService.getRevenueGoals({
            agentId: agentId || req.user.id,
            status,
            userRole: req.user.role
        });

        res.json({
            success: true,
            data: goals
        });
    } catch (error) {
        console.error('Error fetching revenue goals:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch revenue goals'
        });
    }
});

router.post('/goals', async (req, res) => {
    try {
        const goal = await revenueService.createRevenueGoal({
            ...req.body,
            agentId: req.body.agentId || req.user.id,
            createdBy: req.user.id
        });

        res.status(201).json({
            success: true,
            data: goal
        });
    } catch (error) {
        console.error('Error creating revenue goal:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create revenue goal'
        });
    }
});

// Bulk Operations
router.post('/transactions/bulk', requireRole(['admin', 'manager']), revenueLimiter, async (req, res) => {
    try {
        const { transactions } = req.body;

        if (!Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Transactions array is required'
            });
        }

        const results = await revenueService.bulkCreateRevenueTransactions(
            transactions,
            req.user.id
        );

        res.status(201).json({
            success: true,
            data: results,
            message: `Successfully created ${results.length} revenue transactions`
        });
    } catch (error) {
        console.error('Error bulk creating revenue transactions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to bulk create revenue transactions'
        });
    }
});

// Export Endpoints
router.get('/export/transactions', async (req, res) => {
    try {
        const { format = 'csv', startDate, endDate } = req.query;

        const data = await revenueService.exportRevenueTransactions({
            format,
            startDate,
            endDate,
            agentId: req.user.id,
            userRole: req.user.role
        });

        const filename = `revenue-transactions-${new Date().toISOString().split('T')[0]}.${format}`;

        res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        res.send(data);
    } catch (error) {
        console.error('Error exporting revenue transactions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export revenue transactions'
        });
    }
});

router.get('/export/commissions', async (req, res) => {
    try {
        const { format = 'csv', startDate, endDate } = req.query;

        const data = await revenueService.exportAgentCommissions({
            format,
            startDate,
            endDate,
            agentId: req.user.id,
            userRole: req.user.role
        });

        const filename = `agent-commissions-${new Date().toISOString().split('T')[0]}.${format}`;

        res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        res.send(data);
    } catch (error) {
        console.error('Error exporting agent commissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export agent commissions'
        });
    }
});

module.exports = router;