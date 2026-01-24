import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite-preview-09-2025",
  generationConfig: {
    responseMimeType: "application/json",
  },
});




export async function verifyAndFixQuestion(q: any): Promise<any> {
  const verifyPrompt = `You are a strict academic auditor. Review the following multiple-choice question for logical consistency and mathematical accuracy.

QUESTION DATA:
${JSON.stringify(q, null, 2)}

YOUR TASKS:
1. Re-calculate everything from scratch based on the question text.
2. Check if the "correctAnswer" actually corresponds to the correct mathematical result.
3. Check the "solution" steps. If there are apologies like "işaret hatası varsayılır" or "seçeneklerde yok", REMOVE THEM.
4. If the options are wrong, CHANGE THEM to include the correct answer.
5. Ensure the final result is clean, professional, and mathematically perfect.

Return the corrected question data in the EXACT same JSON format as the input. Return ONLY the JSON object.`;

  try {
    const result = await geminiModel.generateContent(verifyPrompt);
    const response = await result.response;
    const text = response.text();
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Verification Error:", error);
    return q; // Fallback to original if verification fails
  }
}

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
  6. **LOGIC & ACCURACY:**
     - You MUST solve the question yourself first.
     - The "correctAnswer" MUST correspond to the mathematically/logically correct option.
     - Ensure all options are distinct and only ONE is correct.
  7. **SOLUTION FORMAT:**
     - The "solution" field MUST be CONCISE and STEP-BY-STEP. 
     - NO long paragraphs or unnecessary apologies.
     - Format: STEP_START Adım [No]: [Kısa Başlık] STEP_END [Short Explanation & Calculation]
     - Example: "solution": "STEP_START Adım 1: Formül STEP_END $F=m \\cdot a$ kullanılır. STEP_START Adım 2: Hesap STEP_END $F=2 \\cdot 5 = 10N$."
     - Use $...$ for ALL math with double backslashes for LaTeX (e.g., \\\\frac{a}{b}).
  
  IMPORTANT: Double-check that your "correctAnswer" (A, B, C, or D) actually matches the result in your "solution". Return ONLY the JSON array. Do not include any text outside the JSON array.`;

  const result = await geminiModel.generateContent(systemPrompt);
  const response = await result.response;
  let text = response.text();

  try {
    // Clean up potential markdown formatting just in case
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const questions = JSON.parse(cleanedText);

    // Step 2: Verification & Correction
    const verifiedQuestions = await Promise.all(
      questions.map((q: any) => verifyAndFixQuestion(q))
    );

    return verifiedQuestions;
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

// Types for NotebookLM import
interface NotebookQuestion {
  question: string;
  answerOptions: {
    text: string;
    isCorrect: boolean;
    rationale: string;
  }[];
  hint: string;
}

interface ProcessedQuestion {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  solution: string;
  questionTextEN: string;
  optionAEN: string;
  optionBEN: string;
  optionCEN: string;
  optionDEN: string;
  solutionEN: string;
}

export async function processNotebookQuestion(q: NotebookQuestion): Promise<ProcessedQuestion> {
  const correctOption = q.answerOptions.find(opt => opt.isCorrect);
  const correctText = correctOption?.text || "";
  const rationale = correctOption?.rationale || "";

  const systemPrompt = `You are an expert physics educator. Process this question for a multiple-choice test.

ORIGINAL QUESTION (Turkish):
${q.question}

CORRECT ANSWER:
${correctText}

EXPLANATION:
${rationale}

HINT:
${q.hint}

YOUR TASKS:
1. Create 3 WRONG but plausible answer options (in Turkish). They should be related to the topic but incorrect.
2. Translate EVERYTHING to English.
3. **LOGIC CHECK:** Solve the question independently. If the ORIGINAL EXPLANATION or HINT is incorrect, fix it in your output. The question, options, and solution MUST be logically consistent.
4. Format the solution as step-by-step.

SOLUTION FORMAT RULES:
- Use: STEP_START Adım [No]: [Kısa Başlık] STEP_END [Short Explanation & Calculation]
- Keep each step SHORT and DIRECT.
- Use $...$ for LaTeX math with double backslashes (e.g., \\\\frac{a}{b}).
- DO NOT add extra explanations or apologies for previous errors. Just provide the correct, clean result.

Return a JSON object with these EXACT fields:
{
  "questionText": "Corrected Turkish question",
  "optionA": "Correct answer (Turkish)",
  "optionB": "Wrong option 1 (Turkish)",
  "optionC": "Wrong option 2 (Turkish)",
  "optionD": "Wrong option 3 (Turkish)",
  "correctAnswer": "A",
  "solution": "Logical step-by-step solution in Turkish using STEP_START format",
  "questionTextEN": "English translation of question",
  "optionAEN": "Correct answer (English)",
  "optionBEN": "Wrong option 1 (English)",
  "optionCEN": "Wrong option 2 (English)",
  "optionDEN": "Wrong option 3 (English)",
  "solutionEN": "Step-by-step solution in English using STEP_START format"
}

IMPORTANT: The correct answer is ALWAYS option A. Ensure the "solution" leads to option A. Return ONLY valid JSON.`;

  const result = await geminiModel.generateContent(systemPrompt);
  const response = await result.response;
  let text = response.text();

  try {
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanedText);

    // Ensure optionA is the correct answer from original
    parsed.optionA = correctText;
    parsed.correctAnswer = "A";

    // Step 2: Verification & Correction
    const verified = await verifyAndFixQuestion(parsed);
    return verified;
  } catch (e) {
    console.error("JSON Parse Error in processNotebookQuestion. Raw text:", text);
    throw new Error("Failed to process question with AI. Please try again.");
  }
}

