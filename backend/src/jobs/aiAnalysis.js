
const OpenAI = require('openai');
const { logger } = require('../config/logger');
const { OPENAI_CONFIG, LEAD_PRIORITY } = require('../config/constants');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Process AI analysis for a lead
 * @param {Object} leadData - Lead data to analyze
 * @returns {Object} - AI analysis result
 */
const processAIAnalysis = async (leadData) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OpenAI API key not configured - using default analysis');
      return {
        summary: 'AI analysis not available - OpenAI API key not configured',
        priority: LEAD_PRIORITY.MEDIUM
      };
    }

    // Build lead summary for AI analysis
    const leadSummary = buildLeadSummary(leadData);
    
    const prompt = `${OPENAI_CONFIG.SYSTEM_PROMPT}

Lead Information:
${leadSummary}

Please provide your analysis in the following format:
1. Summary: [Brief professional summary]
2. Priority: [High/Medium/Low]`;

    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.MODEL,
      messages: [
        {
          role: 'system',
          content: OPENAI_CONFIG.SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: OPENAI_CONFIG.MAX_TOKENS,
      temperature: OPENAI_CONFIG.TEMPERATURE,
    });

    const aiResponse = response.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    // Parse AI response
    const analysis = parseAIResponse(aiResponse);
    
    logger.info(`AI analysis completed for lead`, {
      leadId: leadData.leadId,
      priority: analysis.priority,
      summaryLength: analysis.summary.length
    });

    return analysis;
  } catch (error) {
    logger.error('AI analysis failed:', error);
    
    // Return default analysis on failure
    return {
      summary: 'AI analysis pending - will be updated shortly',
      priority: LEAD_PRIORITY.MEDIUM
    };
  }
};

/**
 * Build a comprehensive summary of lead data for AI analysis
 * @param {Object} leadData - Lead data
 * @returns {String} - Formatted lead summary
 */
const buildLeadSummary = (leadData) => {
  const parts = [];
  
  // Basic info
  parts.push(`Name: ${leadData.firstName} ${leadData.lastName}`);
  if (leadData.email) parts.push(`Email: ${leadData.email}`);
  if (leadData.phoneNumber) parts.push(`Phone: ${leadData.phoneNumber}`);
  
  // Source
  if (leadData.source) parts.push(`Source: ${leadData.source}`);
  
  // Budget
  if (leadData.budgetMin || leadData.budgetMax) {
    const budget = [];
    if (leadData.budgetMin) budget.push(`$${leadData.budgetMin.toLocaleString()}`);
    if (leadData.budgetMax) budget.push(`$${leadData.budgetMax.toLocaleString()}`);
    parts.push(`Budget: ${budget.join(' - ')}`);
  }
  
  // Location
  if (leadData.desiredLocation) parts.push(`Location: ${leadData.desiredLocation}`);
  
  // Property requirements
  const requirements = [];
  if (leadData.propertyType) requirements.push(leadData.propertyType);
  if (leadData.bedroomsMin) requirements.push(`${leadData.bedroomsMin}+ bedrooms`);
  if (leadData.bathroomsMin) requirements.push(`${leadData.bathroomsMin}+ bathrooms`);
  if (requirements.length > 0) {
    parts.push(`Requirements: ${requirements.join(', ')}`);
  }
  
  // Notes
  if (leadData.notes) parts.push(`Notes: ${leadData.notes}`);
  
  return parts.join('\n');
};

/**
 * Parse AI response to extract summary and priority
 * @param {String} aiResponse - Raw AI response
 * @returns {Object} - Parsed analysis
 */
const parseAIResponse = (aiResponse) => {
  let summary = 'AI analysis completed';
  let priority = LEAD_PRIORITY.MEDIUM;
  
  try {
    // Extract summary (look for "Summary:" or first sentence)
    const summaryMatch = aiResponse.match(/Summary:\s*(.+)/i);
    if (summaryMatch) {
      summary = summaryMatch[1].trim();
    } else {
      // Fallback to first sentence or two
      const sentences = aiResponse.split('.').filter(s => s.trim());
      summary = sentences.length > 0 ? sentences[0].trim() : summary;
    }
    
    // Extract priority (look for "Priority:" or priority keywords)
    const priorityMatch = aiResponse.match(/Priority:\s*(High|Medium|Low)/i);
    if (priorityMatch) {
      priority = priorityMatch[1];
    } else {
      // Fallback to keyword detection
      const lowerResponse = aiResponse.toLowerCase();
      if (lowerResponse.includes('high priority') || lowerResponse.includes('urgent')) {
        priority = LEAD_PRIORITY.HIGH;
      } else if (lowerResponse.includes('low priority')) {
        priority = LEAD_PRIORITY.LOW;
      }
    }
    
    return { summary, priority };
  } catch (error) {
    logger.error('Failed to parse AI response:', error);
    return { summary: aiResponse.trim(), priority: LEAD_PRIORITY.MEDIUM };
  }
};

module.exports = {
  processAIAnalysis
};