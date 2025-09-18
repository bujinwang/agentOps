const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EnrichmentAudit = sequelize.define('EnrichmentAudit', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
  },
  leadId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Leads',
      key: 'id',
    },
  },
  eventType: {
    type: DataTypes.ENUM(
      'enrichment_started',
      'enrichment_completed',
      'enrichment_failed',
      'cache_hit',
      'data_deleted',
      'consent_granted',
      'consent_withdrawn',
      'consent_expired',
      'compliance_consent_granted',
      'compliance_consent_withdrawn',
      'compliance_data_exported',
      'compliance_data_deleted',
      'compliance_deletion_requested',
      'compliance_deletion_without_consent'
    ),
    allowNull: false,
  },
  data: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'enrichment_audits',
  timestamps: false,
  indexes: [
    {
      fields: ['leadId'],
    },
    {
      fields: ['eventType'],
    },
    {
      fields: ['timestamp'],
    },
    {
      fields: ['leadId', 'eventType'],
    },
    {
      fields: ['leadId', 'timestamp'],
    },
  ],
});

// Define associations
EnrichmentAudit.associate = (models) => {
  EnrichmentAudit.belongsTo(models.Lead, {
    foreignKey: 'leadId',
    as: 'lead',
  });
};

module.exports = EnrichmentAudit;