import { aiService } from '../modules/ai/ai.service';

describe('AiService Unit & Fallback Tests', () => {
  describe('parseGeminiResponse', () => {
    it('successfully parses valid Gemini JSON response with markdown code block formatting', () => {
      const rawText = `
        \`\`\`json
        {
          "confidenceScore": 0.92,
          "consistencyResult": true,
          "detectedAnomalies": [],
          "explanation": "Image matches flood category.",
          "verificationPriority": "EXPEDITED",
          "advisorySeverity": "HIGH"
        }
        \`\`\`
      `;

      const result = aiService.parseGeminiResponse(rawText);

      expect(result.confidenceScore).toBe(0.92);
      expect(result.consistencyResult).toBe(true);
      expect(result.verificationPriority).toBe('EXPEDITED');
      expect(result.advisorySeverity).toBe('HIGH');
      expect(result.detectedAnomalies).toEqual([]);
    });

    it('returns AI_UNAVAILABLE fallback when JSON is malformed or invalid schema', () => {
      const invalidJson = 'Not valid JSON format from model';

      const result = aiService.parseGeminiResponse(invalidJson);

      expect(result.verificationPriority).toBe('AI_UNAVAILABLE');
      expect(result.advisorySeverity).toBeNull();
      expect(result.confidenceScore).toBe(0.0);
      expect(result.detectedAnomalies).toContain('AI_SERVICE_UNAVAILABLE');
    });
  });

  describe('evaluateIncident fallback behavior', () => {
    it('returns AI_UNAVAILABLE fallback when Gemini API key is unconfigured or call throws', async () => {
      const result = await aiService.evaluateIncident(
        'FLOOD',
        'Water on streets',
        Buffer.from('fake_image_data'),
        'image/jpeg'
      );

      expect(result.verificationPriority).toBe('AI_UNAVAILABLE');
      expect(result.advisorySeverity).toBeNull();
      expect(result.consistencyResult).toBe(false);
    });
  });
});
