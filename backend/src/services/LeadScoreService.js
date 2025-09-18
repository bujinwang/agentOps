const pool = require('../config/database');
const { sendResponse, sendError } = require('../utils/responseHelper');

class LeadScoreService {
  /**
   * Get lead score data
   */
  async getLeadScore(leadId) {
    try {
      const query = `
        SELECT
          lead_id,
          score,
          score_category,
          score_breakdown,
          score_last_calculated,
          score_history,
          manual_score_override,
          manual_score_reason,
          created_at,
          updated_at
        FROM leads
        WHERE lead_id = $1
      `;

      const result = await pool.query(query, [leadId]);

      if (result.rows.length === 0) {
        return { success: false, error: 'Lead not found', statusCode: 404 };
      }

      return {
        success: true,
        data: result.rows[0],
        message: 'Lead score retrieved successfully'
      };
    } catch (error) {
      console.error('Error getting lead score:', error);
      return { success: false, error: 'Failed to retrieve lead score', statusCode: 500 };
    }
  }

  /**
   * Update lead score with manual override
   */
  async updateLeadScore(leadId, scoreData, userId) {
    try {
      const { score, reason } = scoreData;

      const query = `
        UPDATE leads SET
          manual_score_override = $1,
          manual_score_reason = $2,
          score_last_calculated = NOW(),
          score_history = COALESCE(score_history, '[]'::jsonb) || jsonb_build_object(
            'timestamp', NOW(),
            'manual_override', $1,
            'reason', $2,
            'user_id', $3
          ),
          updated_at = NOW()
        WHERE lead_id = $4
        RETURNING lead_id, score, score_category, manual_score_override, manual_score_reason, score_last_calculated
      `;

      const result = await pool.query(query, [score, reason, userId || 1, leadId]);

      if (result.rows.length === 0) {
        return { success: false, error: 'Lead not found', statusCode: 404 };
      }

      return {
        success: true,
        data: result.rows[0],
        message: 'Lead score updated successfully'
      };
    } catch (error) {
      console.error('Error updating lead score:', error);
      return { success: false, error: 'Failed to update lead score', statusCode: 500 };
    }
  }

  /**
   * Get score history for lead
   */
  async getScoreHistory(leadId) {
    try {
      const query = `
        SELECT
          score_history,
          score_last_calculated
        FROM leads
        WHERE lead_id = $1
      `;

      const result = await pool.query(query, [leadId]);

      if (result.rows.length === 0) {
        return { success: false, error: 'Lead not found', statusCode: 404 };
      }

      return {
        success: true,
        data: {
          history: result.rows[0].score_history,
          lastCalculated: result.rows[0].score_last_calculated
        },
        message: 'Score history retrieved successfully'
      };
    } catch (error) {
      console.error('Error getting score history:', error);
      return { success: false, error: 'Failed to retrieve score history', statusCode: 500 };
    }
  }

  /**
   * Calculate enhanced lead score
   */
  async calculateLeadScore(leadId, leadData) {
    try {
      // Enhanced scoring algorithm with multiple factors
      let totalScore = 0;
      let breakdown = {
        budget: 0,
        timeline: 0,
        propertyType: 0,
        location: 0,
        engagement: 0,
        qualification: 0
      };

      // Budget scoring (30% weight)
      if (leadData.budget_max) {
        if (leadData.budget_max >= 1000000) breakdown.budget = 100;
        else if (leadData.budget_max >= 750000) breakdown.budget = 85;
        else if (leadData.budget_max >= 500000) breakdown.budget = 70;
        else if (leadData.budget_max >= 300000) breakdown.budget = 55;
        else breakdown.budget = 40;
      }
      totalScore += breakdown.budget * 0.3;

      // Timeline scoring (25% weight)
      if (leadData.timeline) {
        const timeline = leadData.timeline.toLowerCase();
        if (timeline.includes('asap') || timeline.includes('immediately')) breakdown.timeline = 100;
        else if (timeline.includes('this month') || timeline.includes('within 30 days')) breakdown.timeline = 85;
        else if (timeline.includes('1-2 months') || timeline.includes('within 60 days')) breakdown.timeline = 70;
        else if (timeline.includes('3-6 months')) breakdown.timeline = 55;
        else breakdown.timeline = 40;
      }
      totalScore += breakdown.timeline * 0.25;

      // Property type scoring (20% weight)
      if (leadData.property_type) {
        const type = leadData.property_type.toLowerCase();
        if (type.includes('house') || type.includes('single-family')) breakdown.propertyType = 90;
        else if (type.includes('condo') || type.includes('apartment')) breakdown.propertyType = 80;
        else if (type.includes('townhouse')) breakdown.propertyType = 75;
        else if (type.includes('land')) breakdown.propertyType = 60;
        else breakdown.propertyType = 70;
      }
      totalScore += breakdown.propertyType * 0.2;

      // Location scoring (15% weight)
      if (leadData.desired_location) {
        const location = leadData.desired_location.toLowerCase();
        if (location.includes('downtown') || location.includes('uptown')) breakdown.location = 90;
        else if (location.includes('west end') || location.includes('kitsilano')) breakdown.location = 80;
        else if (location.includes('commercial drive') || location.includes('mount pleasant')) breakdown.location = 70;
        else breakdown.location = 60;
      }
      totalScore += breakdown.location * 0.15;

      // Engagement scoring (10% weight)
      let engagementScore = 50;
      if (leadData.source) {
        const source = leadData.source.toLowerCase();
        if (source.includes('referral')) engagementScore = 95;
        else if (source.includes('website') || source.includes('organic')) engagementScore = 80;
        else if (source.includes('facebook') || source.includes('google')) engagementScore = 70;
        else if (source.includes('cold call')) engagementScore = 40;
      }
      if (leadData.phone_number) engagementScore += 10;
      if (leadData.notes && leadData.notes.length > 100) engagementScore += 10;
      breakdown.engagement = Math.min(100, engagementScore);
      totalScore += breakdown.engagement * 0.1;

      // Qualification scoring (weighted by existing qualification)
      if (leadData.qualification_status) {
        const qual = leadData.qualification_status.toLowerCase();
        if (qual.includes('pre-qualified') || qual.includes('qualified')) breakdown.qualification = 90;
        else if (qual.includes('needs qualification')) breakdown.qualification = 60;
        else breakdown.qualification = 70;
      }
      totalScore += breakdown.qualification * 0.1;

      // Determine category
      const category = totalScore >= 80 ? 'High' : totalScore >= 60 ? 'Medium' : 'Low';

      // Generate insights
      const insights = [];
      if (breakdown.budget >= 80) insights.push('Strong budget position');
      if (breakdown.timeline >= 80) insights.push('Urgent timeline - prioritize');
      if (breakdown.engagement >= 80) insights.push('Highly engaged lead');
      if (breakdown.qualification >= 80) insights.push('Well-qualified prospect');

      const scoreResult = {
        leadId: parseInt(leadId),
        totalScore: Math.round(totalScore),
        category,
        breakdown,
        insights,
        calculatedAt: new Date().toISOString(),
        confidence: Math.min(100, Math.max(60, totalScore - 10))
      };

      // Save calculated score to database
      const saveQuery = `
        UPDATE leads SET
          score = $1,
          score_category = $2,
          score_breakdown = $3,
          score_last_calculated = NOW(),
          score_history = COALESCE(score_history, '[]'::jsonb) || jsonb_build_object(
            'timestamp', NOW(),
            'score', $1,
            'category', $2,
            'breakdown', $3,
            'insights', $4,
            'confidence', $5,
            'calculation_type', 'api_calculated'
          ),
          updated_at = NOW()
        WHERE lead_id = $6
        RETURNING *
      `;

      const saveResult = await pool.query(saveQuery, [
        scoreResult.totalScore,
        scoreResult.category,
        JSON.stringify(scoreResult.breakdown),
        JSON.stringify(scoreResult.insights),
        scoreResult.confidence,
        leadId
      ]);

      if (saveResult.rows.length === 0) {
        return { success: false, error: 'Lead not found', statusCode: 404 };
      }

      return {
        success: true,
        data: scoreResult,
        message: 'Lead score calculated and saved successfully'
      };
    } catch (error) {
      console.error('Error calculating lead score:', error);
      return { success: false, error: 'Failed to calculate lead score', statusCode: 500 };
    }
  }
}

module.exports = new LeadScoreService();