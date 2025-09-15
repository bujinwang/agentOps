const express = require('express');
const router = express.Router();
const commissionService = require('../services/commissionService');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateCommissionStructure, validateCommissionCalculation } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');

// Rate limiting for commission endpoints
const commissionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many commission requests from this IP, please try again later.'
});

// Apply authentication to all routes
router.use(authenticateToken);

// Commission Structures
router.get('/structures', async (req, res) => {
    try {
        const { isActive, structureType } = req.query;
        const structures = await commissionService.getCommissionStructures({
            isActive: isActive === 'true',
            structureType
        });
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

router.post('/structures', requireRole(['admin', 'manager']), validateCommissionStructure, async (req, res) => {
    try {
        const structure = await commissionService.createCommissionStructure({
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

router.put('/structures/:id', requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const structure = await commissionService.updateCommissionStructure(
            req.params.id,
            req.body,
            req.user.id
        );

        if (!structure) {
            return res.status(404).json({
                success: false,
                error: 'Commission structure not found'
            });
        }

        res.json({
            success: true,
            data: structure
        });
    } catch (error) {
        console.error('Error updating commission structure:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update commission structure'
        });
    }
});

// Commission Calculations
router.post('/calculate', commissionLimiter, validateCommissionCalculation, async (req, res) => {
    try {
        const { transactionId, agentId, commissionStructureId } = req.body;

        const commission = await commissionService.calculateCommission({
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

// Commission Records
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            startDate,
            endDate,
            agentId,
            status
        } = req.query;

        // This would use the existing revenue service getAgentCommissions method
        // For now, return a placeholder response
        res.json({
            success: true,
            data: [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: 0,
                pages: 0
            },
            message: 'Commission records endpoint - integration with revenue service pending'
        });
    } catch (error) {
        console.error('Error fetching commission records:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch commission records'
        });
    }
});

router.get('/:id', async (req, res) => {
    try {
        // This would fetch a specific commission record
        // For now, return a placeholder response
        res.json({
            success: true,
            data: null,
            message: 'Individual commission record endpoint - implementation pending'
        });
    } catch (error) {
        console.error('Error fetching commission record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch commission record'
        });
    }
});

// Commission Payments
router.post('/payments/process', requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const { agentId, paymentPeriodStart, paymentPeriodEnd } = req.body;

        const result = await commissionService.processCommissionPayments({
            agentId,
            paymentPeriodStart,
            paymentPeriodEnd,
            processedBy: req.user.id
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error processing commission payments:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process commission payments'
        });
    }
});

router.get('/payments', async (req, res) => {
    try {
        const { agentId, status, page = 1, limit = 50 } = req.query;

        // This would fetch commission payments
        // For now, return a placeholder response
        res.json({
            success: true,
            data: [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: 0,
                pages: 0
            },
            message: 'Commission payments endpoint - implementation pending'
        });
    } catch (error) {
        console.error('Error fetching commission payments:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch commission payments'
        });
    }
});

// Commission Analytics
router.get('/analytics/summary', async (req, res) => {
    try {
        const { agentId, startDate, endDate } = req.query;

        const analytics = await commissionService.getCommissionAnalytics({
            agentId: agentId || req.user.id,
            startDate,
            endDate,
            userRole: req.user.role
        });

        res.json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error('Error fetching commission analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch commission analytics'
        });
    }
});

// Commission Disputes
router.post('/disputes', async (req, res) => {
    try {
        const { commissionId, reason, description } = req.body;

        const dispute = await commissionService.createCommissionDispute({
            commissionId,
            raisedBy: req.user.id,
            reason,
            description
        });

        res.status(201).json({
            success: true,
            data: dispute
        });
    } catch (error) {
        console.error('Error creating commission dispute:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create commission dispute'
        });
    }
});

router.put('/disputes/:id/resolve', requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const { resolution, adjustmentAmount } = req.body;

        await commissionService.resolveCommissionDispute({
            disputeId: req.params.id,
            resolvedBy: req.user.id,
            resolution,
            adjustmentAmount
        });

        res.json({
            success: true,
            message: 'Commission dispute resolved successfully'
        });
    } catch (error) {
        console.error('Error resolving commission dispute:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to resolve commission dispute'
        });
    }
});

router.get('/disputes', async (req, res) => {
    try {
        const { status = 'open', page = 1, limit = 50 } = req.query;

        // This would fetch commission disputes
        // For now, return a placeholder response
        res.json({
            success: true,
            data: [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: 0,
                pages: 0
            },
            message: 'Commission disputes endpoint - implementation pending'
        });
    } catch (error) {
        console.error('Error fetching commission disputes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch commission disputes'
        });
    }
});

// Audit Trail
router.get('/:id/audit-trail', async (req, res) => {
    try {
        const auditTrail = await commissionService.getCommissionAuditTrail(req.params.id);

        res.json({
            success: true,
            data: auditTrail
        });
    } catch (error) {
        console.error('Error fetching commission audit trail:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch commission audit trail'
        });
    }
});

// Bulk Operations
router.post('/bulk-calculate', requireRole(['admin', 'manager']), commissionLimiter, async (req, res) => {
    try {
        const { transactionIds, agentId, commissionStructureId } = req.body;

        if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Transaction IDs array is required'
            });
        }

        const results = [];

        for (const transactionId of transactionIds) {
            try {
                const commission = await commissionService.calculateCommission({
                    transactionId,
                    agentId: agentId || req.user.id,
                    commissionStructureId,
                    calculatedBy: req.user.id
                });
                results.push({ transactionId, success: true, commission });
            } catch (error) {
                results.push({
                    transactionId,
                    success: false,
                    error: error.message
                });
            }
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        res.json({
            success: true,
            data: {
                results,
                summary: {
                    total: transactionIds.length,
                    successful,
                    failed
                }
            },
            message: `Bulk commission calculation completed: ${successful} successful, ${failed} failed`
        });
    } catch (error) {
        console.error('Error in bulk commission calculation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to perform bulk commission calculation'
        });
    }
});

// Commission Structure Templates
router.get('/structures/templates', async (req, res) => {
    try {
        const templates = [
            {
                name: 'Standard Agent Commission',
                structureType: 'percentage',
                basePercentage: 3.00,
                description: 'Standard 3% commission on all transactions'
            },
            {
                name: 'Tiered Commission Structure',
                structureType: 'tiered',
                tierRules: [
                    { percentage: 2.0, maxAmount: 100000 },
                    { percentage: 2.5, maxAmount: 500000 },
                    { percentage: 3.0 }
                ],
                description: 'Tiered commission based on transaction volume'
            },
            {
                name: 'Flat Fee + Percentage',
                structureType: 'percentage',
                basePercentage: 2.50,
                flatAmount: 500.00,
                description: 'Flat fee of $500 + 2.5% commission'
            },
            {
                name: 'Team Split Commission',
                structureType: 'split',
                splitRules: [
                    { agentId: 'agent-1', percentage: 60 },
                    { agentId: 'agent-2', percentage: 40 }
                ],
                description: 'Split commission between team members'
            }
        ];

        res.json({
            success: true,
            data: templates
        });
    } catch (error) {
        console.error('Error fetching commission structure templates:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch commission structure templates'
        });
    }
});

// Export Endpoints
router.get('/export/commissions', async (req, res) => {
    try {
        const { format = 'csv', startDate, endDate } = req.query;

        // This would use the revenue service export functionality
        // For now, return a placeholder response
        res.json({
            success: true,
            message: 'Commission export endpoint - integration with revenue service pending'
        });
    } catch (error) {
        console.error('Error exporting commissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export commissions'
        });
    }
});

router.get('/export/payments', async (req, res) => {
    try {
        const { format = 'csv', startDate, endDate } = req.query;

        // This would export commission payment data
        // For now, return a placeholder response
        res.json({
            success: true,
            message: 'Commission payments export endpoint - implementation pending'
        });
    } catch (error) {
        console.error('Error exporting commission payments:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export commission payments'
        });
    }
});

module.exports = router;