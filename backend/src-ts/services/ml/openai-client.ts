import OpenAI from 'openai';
import { LeadData, LeadScore, ScoringFactor } from '../../types/ml.types';

export class OpenAIClient {
  private client: OpenAI | null;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'sk-test-key-replace-later' || apiKey.startsWith('sk-your')) {
      console.warn('⚠️  Using test mode - OpenAI API key not configured');
      this.client = null; // Will use mock in test mode
    } else {
      this.client = new OpenAI({
        apiKey: apiKey,
      });
    }

    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '1000');
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE || '0.3');
  }

  /**
   * Score a lead using OpenAI
   */
  async scoreLead(leadData: LeadData): Promise<Partial<LeadScore>> {
    // Test mode - return mock score
    if (!this.client) {
      return this.getMockScore(leadData);
    }

    try {
      const prompt = this.buildScoringPrompt(leadData);
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return this.parseResponse(content, leadData);
    } catch (error) {
      console.error('OpenAI scoring error:', error);
      // Fallback to mock on error
      return this.getMockScore(leadData);
    }
  }

  /**
   * Build scoring prompt for OpenAI
   */
  private buildScoringPrompt(lead: LeadData): string {
    return `
Score this real estate lead on a scale of 0-100 based on their likelihood to convert.

Lead Information:
- Name: ${lead.firstName} ${lead.lastName}
- Email: ${lead.email}
- Phone: ${lead.phone || 'Not provided'}
- Budget: ${lead.budget ? `$${lead.budget.toLocaleString()}` : 'Not specified'}
- Property Type: ${lead.propertyType || 'Not specified'}
- Location: ${lead.location || 'Not specified'}
- Timeline: ${lead.timeline || 'Not specified'}
- Source: ${lead.source || 'Unknown'}
- Notes: ${lead.notes || 'None'}
- Account Age: ${this.calculateAccountAge(lead.createdAt)} days

Please provide:
1. Overall score (0-100)
2. Confidence level (0-1)
3. Key factors affecting the score
4. Brief explanation

Respond in JSON format:
{
  "score": 85,
  "confidence": 0.9,
  "factors": [
    {"name": "Budget", "value": 500000, "weight": 0.3, "impact": 20, "explanation": "Strong budget indicated"},
    {"name": "Timeline", "value": "3 months", "weight": 0.2, "impact": 15, "explanation": "Ready to move soon"}
  ],
  "explanation": "This lead scores highly because..."
}
`;
  }

  /**
   * System prompt for lead scoring
   */
  private getSystemPrompt(): string {
    return `You are an expert real estate lead scoring AI. Your job is to analyze leads and predict their likelihood to convert into clients.

Consider these factors:
- Budget (higher is better)
- Timeline (sooner is better)
- Contact completeness (email + phone)
- Property type clarity
- Location specificity
- Source quality
- Engagement level

Score ranges:
- 0-20: Very low quality
- 21-40: Low quality
- 41-60: Medium quality
- 61-80: Good quality
- 81-100: Excellent quality

Be objective and data-driven. Provide actionable insights.`;
  }

  /**
   * Parse OpenAI response
   */
  private parseResponse(content: string, leadData: LeadData): Partial<LeadScore> {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        score: Math.min(100, Math.max(0, parsed.score || 50)),
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
        factors: parsed.factors || [],
        explanation: parsed.explanation || 'Score based on lead data analysis',
        modelVersion: this.model,
        scoredAt: new Date(),
      };
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      // Return fallback score
      return this.getMockScore(leadData);
    }
  }

  /**
   * Generate mock score for testing
   */
  private getMockScore(leadData: LeadData): Partial<LeadScore> {
    let score = 50; // Base score

    // Budget factor
    if (leadData.budget) {
      if (leadData.budget > 500000) score += 20;
      else if (leadData.budget > 300000) score += 15;
      else if (leadData.budget > 100000) score += 10;
    }

    // Contact completeness
    if (leadData.email) score += 10;
    if (leadData.phone) score += 10;

    // Property details
    if (leadData.propertyType) score += 5;
    if (leadData.location) score += 5;

    score = Math.min(100, Math.max(0, score));

    const factors: ScoringFactor[] = [
      {
        name: 'Budget',
        value: leadData.budget,
        weight: 0.3,
        impact: leadData.budget ? 20 : 0,
        explanation: leadData.budget ? 'Strong budget indicated' : 'No budget specified',
      },
      {
        name: 'Contact Info',
        value: { email: !!leadData.email, phone: !!leadData.phone },
        weight: 0.2,
        impact: (leadData.email ? 10 : 0) + (leadData.phone ? 10 : 0),
        explanation: 'Complete contact information available',
      },
    ];

    return {
      score,
      confidence: 0.75,
      factors,
      explanation: '(Mock Score) Lead shows promise based on provided information',
      modelVersion: 'mock-v1',
      scoredAt: new Date(),
    };
  }

  /**
   * Calculate account age in days
   */
  private calculateAccountAge(createdAt: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Test OpenAI connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) {
      console.log('✅ Test mode - OpenAI connection skipped');
      return true;
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'user', content: 'Say "Connection successful" if you can read this.' },
        ],
        max_tokens: 20,
      });

      const content = response.choices[0]?.message?.content || '';
      return content.toLowerCase().includes('success');
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}
