import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite-preview-09-2025",
  generationConfig: {
    responseMimeType: "application/json",
  },
});



export async function generateQuestions(prompt: string, count: number, level: string, language: string) {
  const systemPrompt = `You are an expert educational content creator. Generate ${count} multiple-choice questions based on the following context/topic: "${prompt}".
  
  DIVERSITY & VARIETY RULES:
  1. Each question must be UNIQUE. Do not repeat the exact same question.
  2. NUMERICAL VARIETY: For math/physics problems, use DIFFERENT numerical values for each question.
  3. SIMILARITY LIMIT: No more than 2 questions should have similar logic or scenarios. Ensure a broad coverage of the topic.
  4. SCENARIO VARIATION: Vary the context (e.g., if one question is about a block on a slope, the next could be about a flat surface or a different physical setup).

  Requirements:
  1. Difficulty Level: ${level}
  2. Language: ${language}
  3. Format: Return a valid JSON array of objects.
  4. Each object must have these field names: questionText, optionA, optionB, optionC, optionD, correctAnswer, solution.
  5. Strictly provide exactly 4 options (A, B, C, D). Do NOT provide more or fewer options.
  6. The "solution" field MUST be CONCISE and STEP-BY-STEP. 
     - NO long paragraphs.
     - Each step must be short and direct.
     - Format: STEP_START Adım [No]: [Kısa Başlık] STEP_END [Short Explanation & Calculation]
     - Example: "solution": "STEP_START Adım 1: Formül STEP_END $F=m \\\\cdot a$ kullanılır. STEP_START Adım 2: Hesap STEP_END $F=2 \\\\cdot 5 = 10N$."
     - Use $...$ for ALL math with double backslashes for LaTeX (e.g., \\\\frac{a}{b}).
  
  IMPORTANT: Return ONLY the JSON array. Do not include any text outside the JSON array.`;

  const result = await geminiModel.generateContent(systemPrompt);
  const response = await result.response;
  let text = response.text();

  try {
    // Clean up potential markdown formatting just in case
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("JSON Parse Error. Raw text:", text);
    // Fallback: try to fix common escaping issues and potential multiple 'solution' keys if possible
    // But primarily handle the backslash issue
    const fixedText = text.replace(/(?<!\\)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\");
    try {
      return JSON.parse(fixedText);
    } catch (innerError) {
      throw new Error("Model generated invalid JSON structure. Please try again.");
    }
  }
}
