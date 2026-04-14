// utils/ai-service.js - AI service utility for communicating with AI providers

/**
 * AIService - Handles communication with OpenAI and Gemini APIs
 */
class AIService {
  constructor() {
    this.apiKey = null;
    this.provider = 'openai';
    this.model = 'gpt-4o-mini';
  }
  
  /**
   * Configure the service
   */
  configure(settings) {
    this.apiKey = settings.apiKey;
    this.provider = settings.aiProvider || 'openai';
    this.model = settings.model || 'gpt-4o-mini';
  }
  
  /**
   * Validate API key
   */
  hasApiKey() {
    return !!this.apiKey;
  }
  
  /**
   * Solve a quiz question
   */
  async solveQuestion(question, options = [], questionType = 'multiple_choice') {
    if (!this.hasApiKey()) {
      throw new Error('API key not configured');
    }
    
    const prompt = this.buildPrompt(question, options, questionType);
    
    if (this.provider === 'gemini') {
      return this.callGemini(prompt);
    }
    
    return this.callOpenAI(prompt);
  }
  
  /**
   * Test API connection
   */
  async testConnection() {
    try {
      return await this.solveQuestion('What is 2 + 2?', ['3', '4', '5', '6']);
    } catch (err) {
      throw new Error(`Connection test failed: ${err.message}`);
    }
  }
  
  /**
   * Build prompt for AI
   */
  buildPrompt(question, options, questionType) {
    let prompt = `You are a quiz assistant. Answer the following question correctly.\n\n`;
    prompt += `Question Type: ${questionType}\n`;
    prompt += `Question: ${question}\n\n`;
    
    if (options && options.length > 0) {
      prompt += `Options:\n`;
      options.forEach((option, index) => {
        prompt += `${String.fromCharCode(65 + index)}. ${option}\n`;
      });
      prompt += '\n';
      
      if (questionType === 'multiple_select') {
        prompt += `Note: There may be MULTIPLE correct answers. Include all correct letters in the answer field (e.g., "A, C").\n\n`;
      }
    }
    
    prompt += `Respond in this exact JSON format:
{
  "answer": "The letter(s) of the correct answer(s) (A, B, C, D, etc.)",
  "answerText": "The full text of the correct answer(s)",
  "explanation": "A clear, concise explanation of why this/these is/are the correct answer(s)"
}

Do not include any other text. Only return valid JSON.`;
    
    return prompt;
  }
  
  /**
   * Call OpenAI API
   */
  async callOpenAI(prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a helpful quiz assistant. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    return this.parseResponse(content);
  }
  
  /**
   * Call Gemini API
   */
  async callGemini(prompt) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a helpful quiz assistant. Always respond with valid JSON.\n\n${prompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500
        }
      })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!content) {
      throw new Error('Empty response from Gemini API');
    }
    
    return this.parseResponse(content);
  }
  
  /**
   * Parse AI response
   */
  parseResponse(content) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          answer: parsed.answer?.toUpperCase() || '',
          answerText: parsed.answerText || '',
          explanation: parsed.explanation || ''
        };
      }
      throw new Error('No JSON found in response');
    } catch (e) {
      // Fallback: return raw text
      return {
        answer: '',
        answerText: content,
        explanation: 'Could not parse structured response. Raw AI output shown above.'
      };
    }
  }
}

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIService;
}
