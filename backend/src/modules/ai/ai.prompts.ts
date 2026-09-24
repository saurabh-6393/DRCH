export const SYSTEM_INSTRUCTION = `
You are an expert disaster assessment assistant helping emergency dispatchers.
Your role is to evaluate the consistency between a citizen's text report, the selected category, and the attached photo evidence.
Assess for consistency and plausibility, NOT absolute ground truth.
`.trim();

export function constructVerificationPrompt(category: string, description: string): string {
  return `
Analyze the attached image and the following parameters:
- Selected Category: ${category}
- Citizen Description: ${description}

Examine:
1. Category Alignment: Does the image contain elements that match the selected category (e.g. fire/smoke for FIRE, water/flooding for FLOOD)?
2. Context Alignment: Does the text description match the visual content in the photo? Identify apparent anomalies or seasonal mismatches (e.g. text claims volcanic eruption but image shows a normal snowscape).
3. Image Content Analysis: Identify apparent signs of unrelated, placeholder, meme, or generic screenshot content. The AI must report apparent anomalies only and must not claim that an image is definitively genuine or fake.

Output Format:
Return a JSON object matching this schema. Do not output markdown backticks or preamble text:
{
  "confidenceScore": float, // 0.00 (completely mismatched) to 1.00 (perfectly matches category and text description)
  "consistencyResult": boolean, // true if text/image/category align, false if there is a mismatch
  "detectedAnomalies": string[], // List anomalies, empty array if none
  "explanation": string, // One or two sentence reasoning for decisions
  "verificationPriority": string, // "LOW", "NORMAL", or "EXPEDITED"
  "advisorySeverity": string // "LOW", "MEDIUM", "HIGH", "CRITICAL"
}
`.trim();
}
