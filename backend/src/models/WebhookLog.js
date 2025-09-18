const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WebhookLog = sequelize.define('WebhookLog', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  leadId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Leads',
      key: 'id',
    },
  },
  webhookId: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  eventType: {
    type: DataTypes.ENUM(
      'enrichment_completed',
      'enrichment_failed',
      'consent_changed',
      'data_deleted',
      'test'
    ),
    allowNull: false,
  },
  success: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  attempt: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  statusCode: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  error: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  responseTime: {
    type: DataTypes.INTEGER, // in milliseconds
    allowNull: true,
  },
  payload: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'webhook_logs',
  timestamps: false,
  indexes: [
    {
      fields: ['leadId'],
    },
    {
      fields: ['webhookId'],
    },
    {
      fields: ['eventType'],
    },
    {
      fields: ['success'],
    },
    {
      fields: ['sentAt'],
    },
    {
      fields: ['leadId', 'eventType'],
    },
    {
      fields: ['webhookId', 'sentAt'],
    },
  ],
});

// Define associations
WebhookLog.associate = (models) => {
  WebhookLog.belongsTo(models.Lead, {
    foreignKey: 'leadId',
    as: 'lead',
  });
};

module.exports = WebhookLog;