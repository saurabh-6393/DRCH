# AI Prompt Design

> Documentation for the server-side Gemini AI Multimodal verification prompt architecture.

---

## 1. AI Model Configuration
* **[Confirmed Requirement]** The system will integrate with the **Google Gemini API** using `gemini-2.5-flash` as the initial default model.
* **[Confirmed Requirement]** The selected model must remain configurable via server-side environment variables (`GEMINI_MODEL`).
* **[Confirmed Requirement]** Gemini API credentials must be kept strictly server-side and never exposed to the client browser.

---

## 2. Human-in-the-Loop & Verification Principles
* **[Confirmed Requirement]** The AI consistency check is advisory only. The AI must never autonomously verify or reject incidents.
* **[Confirmed Requirement]** AI confidence scores must not be treated as proof of ground truth. An incident is only verified after an authorized human dispatcher (Authority) submits a verify transaction.
* **[Confirmed Requirement]** Do not hardcode research paper experimental accuracy percentages inside the system validation logic. Any AI confidence or priority thresholds used for queue prioritization must remain configurable. They must never be treated as proof of incident authenticity or used to autonomously verify/reject an incident.

---

## 3. Multimodal Analysis Prompt
The backend calls the Gemini API passing the user-submitted image, text description, and classified category.

### 3.1 System Instruction
```
You are an expert disaster assessment assistant helping emergency dispatchers.
Your role is to evaluate the consistency between a citizen's text report, the selected category, and the attached photo evidence.
Assess for consistency and plausibility, NOT absolute ground truth.
```

### 3.2 Verification Prompt
```
Analyze the attached image and the following parameters:
- Selected Category: {category}
- Citizen Description: {description}

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
```

---

## 4. Expected Structured JSON Output & Schema Validation
* **[Confirmed Requirement]** The backend must validate the JSON string returned by Gemini.
* **Schema definitions:**
  * `confidenceScore`: Range `0.00` to `1.00`.
  * `consistencyResult`: True if category and description align with the image; false otherwise.
  * `detectedAnomalies`: String array listing anomalies (e.g. "image depicts desktop screenshot").
  * `verificationPriority`:
    * `EXPEDITED`: High confidence + Critical/High advisory severity.
    * `NORMAL`: Moderate consistency.
    * `LOW`: Significant anomalies or mismatch.
  * `advisorySeverity`: Low, Medium, High, Critical suggestion based on visual analysis.

---

## 5. AI Limitations
* The AI cannot confirm if an incident is happening *right now*. AI evaluates the submitted image, selected category, and citizen description for consistency. Geographic coordinates and spatial calculations are handled by the backend/PostGIS layer. AI must not be treated as a verifier of geographic ground truth.
* The AI may return errors during outages, which must be handled by defaulting the report to human review with priority `AI_UNAVAILABLE`.

---

## 6. Prompt Versioning & Revision History

### Version 1.0.0 (Current)
* Initial configuration setup using `gemini-2.5-flash`.
* Enforces structured JSON output schema containing `advisorySeverity` and `verificationPriority` keys.
