const { getDatabase } = require('../config/database');

class ConversionService {
  /**
   * Get all conversion stages
   */
  async getConversionStages() {
    const query = `
      SELECT stage_id, stage_name, stage_order, description, is_active
      FROM conversion_stages
      WHERE is_active = true
      ORDER BY stage_order
    `;

    const db = getDatabase();
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Update lead conversion stage
   */
  async updateLeadStage(leadId, stageId, userId, notes = null) {
    const db = getDatabase();
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      // Get current stage
      const currentQuery = `
        SELECT conversion_stage_id, conversion_started_at
        FROM leads
        WHERE lead_id = $1
      `;
      const currentResult = await client.query(currentQuery, [leadId]);
      const currentStage = currentResult.rows[0];

      if (!currentStage) {
        throw new Error('Lead not found');
      }

      // Update lead stage
      const updateQuery = `
        UPDATE leads
        SET
          conversion_stage_id = $1,
          conversion_started_at = COALESCE(conversion_started_at, CURRENT_TIMESTAMP),
          updated_at = CURRENT_TIMESTAMP
        WHERE lead_id = $2
        RETURNING *
      `;
      const updateResult = await client.query(updateQuery, [stageId, leadId]);
      const updatedLead = updateResult.rows[0];

      // Log conversion event
      const eventQuery = `
        INSERT INTO conversion_events (
          lead_id, user_id, from_stage_id, to_stage_id,
          event_type, event_data, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      const eventData = {
        timestamp: new Date().toISOString(),
        previousStage: currentStage.conversion_stage_id,
        newStage: stageId,
        conversionStarted: currentStage.conversion_started_at
      };

      await client.query(eventQuery, [
        leadId,
        userId,
        currentStage.conversion_stage_id,
        stageId,
        'stage_change',
        JSON.stringify(eventData),
        notes
      ]);

      // If moving to final stage, update completion timestamp
      if (stageId === 7 || stageId === 8) { // Closed Won or Closed Lost
        await client.query(`
          UPDATE leads
          SET conversion_completed_at = CURRENT_TIMESTAMP
          WHERE lead_id = $1
        `, [leadId]);
      }

      await client.query('COMMIT');
      return updatedLead;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update lead conversion probability
   */
  async updateConversionProbability(leadId, probability, userId, notes = null) {
    const updateQuery = `
      UPDATE leads
      SET
        conversion_probability = $1,
        conversion_score = $1 * COALESCE(estimated_value, 0),
        updated_at = CURRENT_TIMESTAMP
      WHERE lead_id = $2
      RETURNING *
    `;

    const db = getDatabase();
    const result = await db.query(updateQuery, [probability, leadId]);
    const updatedLead = result.rows[0];

    if (updatedLead) {
      // Log probability update event
      const eventQuery = `
        INSERT INTO conversion_events (
          lead_id, user_id, event_type, event_data, notes
        ) VALUES ($1, $2, $3, $4, $5)
      `;

      const eventData = {
        previousProbability: updatedLead.conversion_probability,
        newProbability: probability,
        timestamp: new Date().toISOString()
      };

      await db.query(eventQuery, [
        leadId,
        userId,
        'probability_update',
        JSON.stringify(eventData),
        notes
      ]);
    }

    return updatedLead;
  }

  /**
   * Get conversion funnel data
   */
  async getConversionFunnel(userId, startDate = null, endDate = null) {
    let dateFilter = '';
    let params = [userId];
    let paramIndex = 2;

    if (startDate && endDate) {
      dateFilter = `AND l.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(startDate, endDate);
    }

    const query = `
      SELECT
        cs.stage_name,
        cs.stage_order,
        COUNT(l.lead_id) as lead_count,
        AVG(l.conversion_probability) as avg_probability,
        SUM(l.estimated_value) as total_value
      FROM conversion_stages cs
      LEFT JOIN leads l ON cs.stage_id = l.conversion_stage_id
        AND l.user_id = $1
        ${dateFilter}
      WHERE cs.is_active = true
      GROUP BY cs.stage_id, cs.stage_name, cs.stage_order
      ORDER BY cs.stage_order
    `;

    const db = getDatabase();
    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get lead conversion history
   */
  async getLeadConversionHistory(leadId) {
    const query = `
      SELECT
        ce.event_id,
        ce.event_type,
        ce.event_data,
        ce.notes,
        ce.created_at,
        cs_from.stage_name as from_stage,
        cs_to.stage_name as to_stage,
        u.first_name,
        u.last_name
      FROM conversion_events ce
      LEFT JOIN conversion_stages cs_from ON ce.from_stage_id = cs_from.stage_id
      LEFT JOIN conversion_stages cs_to ON ce.to_stage_id = cs_to.stage_id
      LEFT JOIN users u ON ce.user_id = u.user_id
      WHERE ce.lead_id = $1
      ORDER BY ce.created_at DESC
    `;

    const db = getDatabase();
    const result = await db.query(query, [leadId]);
    return result.rows;
  }

  /**
   * Calculate and update conversion metrics
   */
  async updateConversionMetrics(userId, date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Calculate metrics
    const metricsQuery = `
      SELECT
        COUNT(*) as total_leads,
        COUNT(CASE WHEN conversion_stage_id IN (1,2,3,4,5,6) THEN 1 END) as leads_in_pipeline,
        COUNT(CASE WHEN conversion_stage_id = 7 THEN 1 END) as leads_won,
        COUNT(CASE WHEN conversion_stage_id = 8 THEN 1 END) as leads_lost,
        AVG(CASE WHEN conversion_stage_id = 7 THEN estimated_value END) as avg_deal_size,
        SUM(CASE WHEN conversion_stage_id IN (1,2,3,4,5,6) THEN estimated_value END) as pipeline_value,
        AVG(EXTRACT(EPOCH FROM (conversion_completed_at - conversion_started_at))/86400) as avg_conversion_time
      FROM leads
      WHERE user_id = $1
        AND DATE(created_at) <= $2
    `;

    const db = getDatabase();
    const metricsResult = await db.query(metricsQuery, [userId, targetDate]);
    const metrics = metricsResult.rows[0];

    // Calculate conversion rate
    const totalClosed = (metrics.leads_won || 0) + (metrics.leads_lost || 0);
    const conversionRate = totalClosed > 0 ? ((metrics.leads_won || 0) / totalClosed) * 100 : 0;

    // Upsert metrics
    const upsertQuery = `
      INSERT INTO conversion_metrics (
        user_id, metric_date, total_leads, leads_in_pipeline,
        conversion_rate, average_deal_size, pipeline_value,
        leads_won, leads_lost, average_conversion_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id, metric_date)
      DO UPDATE SET
        total_leads = EXCLUDED.total_leads,
        leads_in_pipeline = EXCLUDED.leads_in_pipeline,
        conversion_rate = EXCLUDED.conversion_rate,
        average_deal_size = EXCLUDED.average_deal_size,
        pipeline_value = EXCLUDED.pipeline_value,
        leads_won = EXCLUDED.leads_won,
        leads_lost = EXCLUDED.leads_lost,
        average_conversion_time = EXCLUDED.average_conversion_time,
        updated_at = CURRENT_TIMESTAMP
    `;

    await db.query(upsertQuery, [
      userId,
      targetDate,
      metrics.total_leads || 0,
      metrics.leads_in_pipeline || 0,
      conversionRate,
      metrics.avg_deal_size || 0,
      metrics.pipeline_value || 0,
      metrics.leads_won || 0,
      metrics.leads_lost || 0,
      Math.round(metrics.avg_conversion_time || 0)
    ]);

    return {
      ...metrics,
      conversionRate,
      date: targetDate
    };
  }

  /**
   * Get conversion metrics for date range
   */
  async getConversionMetrics(userId, startDate, endDate) {
    const query = `
      SELECT *
      FROM conversion_metrics
      WHERE user_id = $1
        AND metric_date BETWEEN $2 AND $3
      ORDER BY metric_date
    `;

    const db = getDatabase();
    const result = await db.query(query, [userId, startDate, endDate]);
    return result.rows;
  }

  /**
   * Get leads by conversion stage with details
   */
  async getLeadsByStage(userId, stageId = null) {
    let whereClause = 'l.user_id = $1';
    let params = [userId];

    if (stageId) {
      whereClause += ' AND l.conversion_stage_id = $2';
      params.push(stageId);
    }

    const query = `
      SELECT
        l.*,
        cs.stage_name,
        cs.stage_order,
        ce.created_at as last_stage_change
      FROM leads l
      LEFT JOIN conversion_stages cs ON l.conversion_stage_id = cs.stage_id
      LEFT JOIN conversion_events ce ON l.lead_id = ce.lead_id
        AND ce.event_type = 'stage_change'
        AND ce.created_at = (
          SELECT MAX(created_at)
          FROM conversion_events
          WHERE lead_id = l.lead_id AND event_type = 'stage_change'
        )
      WHERE ${whereClause}
      ORDER BY l.updated_at DESC
    `;

    const db = getDatabase();
    const result = await db.query(query, params);
    return result.rows;
  }
}

module.exports = new ConversionService();