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

export async function generateQuestions(prompt: string, count: number, questionType: string) {
  const typeInstructions: Record<string, string> = {
    'Hesaplama': `QUESTION TYPE: Calculation-based problems.
    - Questions MUST require numerical computation, formula application, or multi-step mathematical reasoning.
    - Include realistic physical scenarios with specific numerical values.
    - Ensure answers are clean numbers (avoid overly complex decimals).`,
    'Kavramsal': `QUESTION TYPE: Conceptual understanding questions.
    - Questions should test DEEP understanding of principles, not just memorization.
    - Include "why" and "what happens if" scenarios.
    - Use real-world analogies and thought experiments.
    - At least 2 questions should require comparing/contrasting concepts.`,
    'Grafik/Tablo': `QUESTION TYPE: Graph and Table interpretation questions.
    - Questions should describe a graph, chart, or data table in text form.
    - Ask students to interpret trends, calculate slopes, identify relationships, or predict outcomes.
    - Include specific data points they must analyze.
    - Use formats like "Aşağıdaki tabloya göre..." or "Grafiğe göre...".`,
    'Karışık': `QUESTION TYPE: Mixed variety.
    - Include a balanced mix of calculation, conceptual, and data interpretation questions.
    - Ensure variety in question structure and cognitive demands.
    - At least one question should require multi-step reasoning.`
  };

  const systemPrompt = `You are a world-class exam question writer for Turkish university-level courses (midterm/final exam standard). Generate ${count} multiple-choice questions based on: "${prompt}".

${typeInstructions[questionType] || typeInstructions['Karışık']}

EXAM-LEVEL DIFFICULTY:
- Questions should be at university midterm/final exam standard.
- Include challenging but fair questions that test deep understanding, not just memorization.
- Suitable for undergraduate university students studying the subject.

DISTRACTOR (WRONG OPTION) ENGINEERING:
- CRITICAL: Wrong options must NOT be random numbers. Each wrong option should result from a COMMON STUDENT MISTAKE:
  • Forgetting a sign (e.g., using + instead of −)
  • Using wrong formula (e.g., using v=d/t instead of v²=v₀²+2as)
  • Forgetting unit conversion (e.g., cm vs m)
  • Off-by-one errors or partial calculations
  • Conceptual misconceptions
- This makes the question pedagogically valuable.

DIVERSITY & VARIETY:
1. Each question must be UNIQUE - no repeated logic.
2. Use DIFFERENT numerical values for each question.
3. No more than 2 questions should use similar setups.
4. Vary contexts and scenarios broadly.
5. The correct answer letter MUST vary (don't always use the same letter).

FORMAT REQUIREMENTS:
1. Return a valid JSON array.
2. Each object fields: questionText, optionA, optionB, optionC, optionD, correctAnswer, solution, questionTextEN, optionAEN, optionBEN, optionCEN, optionDEN, solutionEN
3. ALWAYS provide BOTH Turkish AND English versions.
4. Exactly 4 options (A, B, C, D), only ONE correct.

SOLUTION FORMAT:
- Must be CONCISE, STEP-BY-STEP.
- Format: STEP_START Adım [No]: [Kısa Başlık] STEP_END [Explanation & Calculation]
- Use $...$ for ALL math with double backslashes for LaTeX.
- NO apologies, NO unnecessary commentary. Just clean, professional solutions.
- Example: "STEP_START Adım 1: Formül STEP_END $F=m \\\\cdot a$ kullanılır. STEP_START Adım 2: Hesap STEP_END $F=2 \\\\cdot 5 = 10$ N."

QUALITY CHECKLIST (verify before returning):
✓ Each correctAnswer matches the actual solution result
✓ All 4 options are distinct
✓ Wrong options come from realistic mistakes
✓ Solutions are mathematically/logically flawless
✓ Both TR and EN versions are accurate translations

Return ONLY the JSON array. No extra text.`;

  const result = await geminiModel.generateContent(systemPrompt);
  const response = await result.response;
  let text = response.text();

  try {
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const questions = JSON.parse(cleanedText);

    // Step 2: Verification & Correction
    const verifiedQuestions = await Promise.all(
      questions.map((q: any) => verifyAndFixQuestion(q))
    );

    return verifiedQuestions;
  } catch (e) {
    console.error("JSON Parse Error. Raw text:", text);
    const fixedText = text.replace(/(?<!\\)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\");
    try {
      return JSON.parse(fixedText);
    } catch (innerError) {
      throw new Error("Model generated invalid JSON structure. Please try again.");
    }
  }
}


export async function generateGroupedQuestions(prompt: string, subQuestionCount: number) {
  const systemPrompt = `You are a world-class exam question writer for Turkish university-level courses (midterm/final exam standard).

Your task: Create an INTEGRATED/GROUPED question set based on: "${prompt}"

This is the "Soru X-Y" format used in Turkish university exams where:
- There is ONE shared scenario/context (stem text) that describes a physical setup, circuit, diagram, or situation.
- Multiple sub-questions (${subQuestionCount}) are derived from that SAME scenario.
- Each sub-question explores a DIFFERENT aspect of the same problem.
- Sub-questions may build on each other (e.g., Q1 finds current, Q2 uses that to find voltage).

REQUIREMENTS:
1. Create a rich, detailed stem/scenario text that provides enough context for all sub-questions.
2. The stem should describe a specific physical/mathematical setup (like a circuit, a charge distribution, a mechanical system, etc.)
3. Each sub-question should ask about a DIFFERENT quantity, relationship, or condition within the same scenario.
4. Sub-questions should progress in complexity (first easier, last harder).
5. Each sub-question has exactly 4 options (A, B, C, D) and ONE correct answer.

DISTRACTOR ENGINEERING:
- Wrong options should come from common student mistakes (sign errors, wrong formulas, unit errors).

SOLUTION FORMAT:
- STEP_START Adim [No]: [Kisa Baslik] STEP_END [Explanation and Calculation]
- Use $...$ for LaTeX math with double backslashes.

Return a JSON object with this EXACT structure:
{
  "stemText": "Turkish stem/scenario text describing the shared context",
  "stemTextEN": "English translation of the stem",
  "questions": [
    {
      "questionText": "Sub-question 1 in Turkish (just the question, NOT the stem)",
      "optionA": "...", "optionB": "...", "optionC": "...", "optionD": "...",
      "correctAnswer": "A or B or C or D",
      "solution": "Step-by-step solution in Turkish",
      "questionTextEN": "English translation",
      "optionAEN": "...", "optionBEN": "...", "optionCEN": "...", "optionDEN": "...",
      "solutionEN": "English solution"
    }
  ]
}

IMPORTANT:
- The "stemText" contains the SHARED context only.
- Each "questionText" contains ONLY the specific sub-question, NOT the stem.
- Verify all answers are correct. Return ONLY valid JSON.`;

  const result = await geminiModel.generateContent(systemPrompt);
  const response = await result.response;
  let text = response.text();

  try {
    const cleanedText = text.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
    const parsed = JSON.parse(cleanedText);

    const verifiedQuestions = await Promise.all(
      parsed.questions.map((q: any) => verifyAndFixQuestion(q))
    );

    return {
      stemText: parsed.stemText,
      stemTextEN: parsed.stemTextEN,
      questions: verifiedQuestions
    };
  } catch (e) {
    console.error("JSON Parse Error in generateGroupedQuestions. Raw text:", text);
    const fixedText = text.replace(/(?<!\\)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\");
    try {
      const parsed = JSON.parse(fixedText);
      return {
        stemText: parsed.stemText,
        stemTextEN: parsed.stemTextEN,
        questions: parsed.questions
      };
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


export async function generateVariants(question: {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  solution: string | null;
  questionTextEN: string | null;
  optionAEN: string | null;
  optionBEN: string | null;
  optionCEN: string | null;
  optionDEN: string | null;
  solutionEN: string | null;
}, count: number) {
  const systemPrompt = `You are an expert educational content creator. You are given an ORIGINAL multiple-choice question. Your task is to generate ${count} NEW variant questions that are SIMILAR in topic, difficulty, and style, but use DIFFERENT numbers, scenarios, or contexts.

ORIGINAL QUESTION:
Question: ${question.questionText}
A) ${question.optionA}
B) ${question.optionB}
C) ${question.optionC}
D) ${question.optionD}
Correct Answer: ${question.correctAnswer}
Solution: ${question.solution || "N/A"}

RULES:
1. Each variant MUST test the SAME concept/topic as the original.
2. Use DIFFERENT numerical values, names, or scenarios for each variant.
3. Difficulty level should remain the SAME as the original.
4. Each variant must be solvable and logically correct.
5. Provide both Turkish AND English versions.
6. The correct answer letter (A/B/C/D) should VARY across variants - don't always make the same letter correct.
7. Format solutions using: STEP_START Adım [No]: [Kısa Başlık] STEP_END [Explanation & Calculation]
8. Use $...$ for LaTeX math with double backslashes.

Return a JSON array of ${count} objects, each with these fields:
questionText, optionA, optionB, optionC, optionD, correctAnswer, solution,
questionTextEN, optionAEN, optionBEN, optionCEN, optionDEN, solutionEN

IMPORTANT: Double-check that each "correctAnswer" matches the actual solution. Return ONLY the JSON array.`;

  const result = await geminiModel.generateContent(systemPrompt);
  const response = await result.response;
  let text = response.text();

  try {
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const questions = JSON.parse(cleanedText);

    const verifiedQuestions = await Promise.all(
      questions.map((q: any) => verifyAndFixQuestion(q))
    );

    return verifiedQuestions;
  } catch (e) {
    console.error("JSON Parse Error in generateVariants. Raw text:", text);
    const fixedText = text.replace(/(?<!\\)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\");
    try {
      return JSON.parse(fixedText);
    } catch (innerError) {
      throw new Error("Model generated invalid JSON structure. Please try again.");
    }
  }
}
