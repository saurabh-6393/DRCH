import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';
import { SYSTEM_INSTRUCTION, constructVerificationPrompt } from './ai.prompts';
import { geminiResponseSchema, AiVerificationResult } from './ai.types';

export class AiService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '') {
      try {
        this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
      } catch (error: any) {
        logger.warn('Failed to initialize GoogleGenAI client', { error: error.message });
        this.ai = null;
      }
    }
  }

  /**
   * Evaluates an incident report using Google Gemini 2.5 Flash model.
   * If Gemini API fails, times out, or returns unparseable JSON,
   * returns the server-side AI_UNAVAILABLE fallback result without throwing.
   */
  async evaluateIncident(
    category: string,
    description: string,
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<AiVerificationResult> {
    if (!this.ai) {
      logger.warn('Gemini API key missing or client uninitialized; applying AI_UNAVAILABLE fallback');
      return this.getFallbackResult();
    }

    try {
      const promptText = constructVerificationPrompt(category, description);
      const base64Image = imageBuffer.toString('base64');

      const response = await this.ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${SYSTEM_INSTRUCTION}\n\n${promptText}` },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
      });

      const responseText = response.text || '';
      return this.parseGeminiResponse(responseText);
    } catch (error: any) {
      logger.error('Gemini API call failed during incident analysis; applying AI_UNAVAILABLE fallback', {
        error: error.message,
      });
      return this.getFallbackResult();
    }
  }

  /**
   * Cleans raw text output (removing triple-backtick markdown blocks) and validates via Zod schema.
   */
  public parseGeminiResponse(rawText: string): AiVerificationResult {
    try {
      let cleaned = rawText.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      }

      const json = JSON.parse(cleaned);
      const parsed = geminiResponseSchema.parse(json);

      return {
        confidenceScore: parsed.confidenceScore,
        consistencyResult: parsed.consistencyResult,
        detectedAnomalies: parsed.detectedAnomalies,
        explanation: parsed.explanation,
        verificationPriority: parsed.verificationPriority,
        advisorySeverity: parsed.advisorySeverity,
      };
    } catch (error: any) {
      logger.error('Failed to parse or validate Gemini structured JSON response', {
        rawText,
        error: error.message,
      });
      return this.getFallbackResult();
    }
  }

  /**
   * Server-side fallback result when Gemini is offline or fails.
   */
  public getFallbackResult(): AiVerificationResult {
    return {
      confidenceScore: 0.0,
      consistencyResult: false,
      detectedAnomalies: ['AI_SERVICE_UNAVAILABLE'],
      explanation: 'Automated AI evaluation was unavailable at time of submission.',
      verificationPriority: 'AI_UNAVAILABLE',
      advisorySeverity: null,
    };
  }
}

export const aiService = new AiService();
