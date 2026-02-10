import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
const geminiModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
  }
});

// Initialize OpenAI
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

/**
 * Verifies and fixes a question using either GPT-4o-mini (preferred) or Gemini.
 * Strictly prevents inner monologues about corrections in the solution text.
 */
export async function verifyAndFixQuestion(q: any): Promise<any> {
  const verifyPrompt = `You are a strict academic auditor. Review the following multiple-choice question for logical consistency and mathematical accuracy.

    QUESTION DATA:
    ${JSON.stringify(q, null, 2)}

    YOUR TASKS:
    1. Re-calculate everything from scratch based on the question text.
    2. Check if the "correctAnswer" actually corresponds to the correct mathematical result.
    3. REMOVE ALL "INNER MONOLOGUE": No "I noticed a mistake", "Updated to match options", "Oops", or "Correction".
    4. The "solution" must ONLY contain step-by-step instructions.
    5. If there is a mistake, FIX IT SILENTLY in the options and solution.
    6. Ensure the final result is clean, professional, and mathematically perfect.
    7. Return NO apologies, NO metadata, NO comments.

    Return the corrected question data in the EXACT same JSON format as the input. Return ONLY the JSON object.`;

  try {
    if (openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: verifyPrompt }],
        response_format: { type: "json_object" }
      });
      const content = response.choices[0].message.content;
      return JSON.parse(content || "{}");
    } else {
      const result = await geminiModel.generateContent(verifyPrompt);
      const response = await result.response;
      const text = response.text();
      const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanedText);
    }
  } catch (error) {
    console.error("Verification Error:", error);
    return q;
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
5. NO INNER MONOLOGUE: Do not include phrases like "I simplified the values" or "Correct answer updated".

SOLUTION FORMAT:
- Must be CONCISE, STEP-BY-STEP.
- Format: STEP_START Adım [No]: [Kısa Başlık] STEP_END [Explanation & Calculation]
- Use $...$ for ALL math with double backslashes for LaTeX.
- NO apologies, NO unnecessary commentary. Just clean, professional solutions.
- Example: "STEP_START Adım 1: Formül STEP_END $F=m \\\\\\\\cdot a$ kullanılır. STEP_START Adım 2: Hesap STEP_END $F=2 \\\\\\\\cdot 5 = 10$ N."

Return ONLY the JSON array. No extra text.`;

  let text = "";
  try {
    if (openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: systemPrompt }],
        response_format: { type: "json_object" }
      });
      text = response.choices[0].message.content || "[]";
      if (text.startsWith("{") && !text.includes("[")) {
        // Extract array if GPT wraps it in an object
        const parsed = JSON.parse(text);
        text = JSON.stringify(Object.values(parsed)[0]);
      }
    } else {
      const result = await geminiModel.generateContent(systemPrompt);
      text = result.response.text();
    }

    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const questions = JSON.parse(cleanedText);
    const arrayQuestions = Array.isArray(questions) ? questions : (questions.questions || []);

    const verifiedQuestions = await Promise.all(
      arrayQuestions.map((q: any) => verifyAndFixQuestion(q))
    );

    return verifiedQuestions;
  } catch (e) {
    console.error("Question Generation Error:", e);
    throw e;
  }
}

export async function generateGroupedQuestions(prompt: string, subQuestionCount: number) {
  const systemPrompt = `You are a world-class exam question writer for Turkish university-level courses (midterm/final exam standard).

YOUR TASK: Create an INTEGRATED/GROUPED question set based on: "${prompt}"

This is the "Soru X-Y" format used in Turkish university exams where:
- There is ONE shared scenario/context (stem text) that describes a physical setup, circuit, diagram, or situation.
- Multiple sub-questions (${subQuestionCount}) are derived from that SAME scenario.
- Sub-questions may build on each other.

REQUIREMENTS:
1. Create a rich, detailed stem/scenario text (stemText and stemTextEN).
2. Create ${subQuestionCount} sub-questions (questions array).
3. Each sub-question has 4 options and ONE correct answer.
4. NO INNER MONOLOGUE in solution or text.

Return a JSON object:
{
  "stemText": "...",
  "stemTextEN": "...",
  "questions": [
    {
      "questionText": "...", "optionA": "...", ..., "correctAnswer": "A", "solution": "...",
      "questionTextEN": "...", ...
    }
  ]
}`;

  try {
    let text = "";
    if (openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: systemPrompt }],
        response_format: { type: "json_object" }
      });
      text = response.choices[0].message.content || "";
    } else {
      const result = await geminiModel.generateContent(systemPrompt);
      text = result.response.text();
    }

    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
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
    console.error("Grouped Generation Error:", e);
    throw e;
  }
}

// Types for NotebookLM import
interface NotebookQuestion {
  question: string;
  answerOptions: {
    text: string;
    isCorrect: boolean;
  }[];
}

export async function processNotebookQuestion(q: NotebookQuestion) {
  const prompt = `Convert the following question and answer options into a professional university-level multiple-choice question format.
  
  QUESTION: ${q.question}
  OPTIONS: ${q.answerOptions.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt.text} ${opt.isCorrect ? '(CORRECT)' : ''}`).join('\n')}
  
  TASK:
  1. Refine the question text to be more formal and academic.
  2. Create a step-by-step professional solution.
  3. Ensure BOTH Turkish AND English versions are provided.
  4. Format the solution using: STEP_START Adım [No]: [Kısa Başlık] STEP_END [Açıklama]
  5. Use LaTeX for math.
  
  Return ONLY a JSON object with fields: questionText, optionA, optionB, optionC, optionD, correctAnswer, solution, questionTextEN, optionAEN, optionBEN, optionCEN, optionDEN, solutionEN`;

  try {
    let text = "";
    if (openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });
      text = response.choices[0].message.content || "";
    } else {
      const result = await geminiModel.generateContent(prompt);
      text = result.response.text();
    }
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Error processing notebook question:", error);
    return null;
  }
}
