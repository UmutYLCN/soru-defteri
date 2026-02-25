import OpenAI from "openai";
import sharp from "sharp";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

/**
 * Extracts a diagram/graphic from a base64 image using OpenAI GPT-4o-mini vision.
 */
async function extractDiagramFromImage(image: string): Promise<string | null> {
  try {
    const base64Data = image.split(',')[1];
    const mimeType = image.split(',')[0].split(':')[1].split(';')[0];

    const detectionPrompt = `Analyze this academic problem image. 
    Identify the primary technical diagram, circuit schematic, graph, table, or illustration that is essential for understanding or solving the problem. 
    CRITICAL: DO NOT return a bounding box for text, sentences, or mathematical formulas. 
    If the image consists ONLY of text (printed or handwritten) without any actual graphics, drawings, or technical illustrations, return {"boundingBox": null}.
    A successful bounding box MUST enclose a visual aid, NOT a block of text.
    Return JSON object: {"boundingBox": [ymin, xmin, ymax, xmax]}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: detectionPrompt },
            { type: "image_url", image_url: { url: image } }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });

    const text = response.choices[0].message.content || "{}";
    console.log("OpenAI Vision detection response:", text);

    const parsed = JSON.parse(text);

    const buffer = Buffer.from(base64Data, 'base64');
    const img = sharp(buffer);
    const metadata = await img.metadata();

    if (!metadata.width || !metadata.height) return null;

    if (parsed.boundingBox && Array.isArray(parsed.boundingBox) && parsed.boundingBox.length === 4) {
      let [ymin, xmin, ymax, xmax] = parsed.boundingBox;

      // Full image check
      if (ymin === 0 && xmin === 0 && ymax === 1000 && xmax === 1000) {
        if (metadata.width > 1200) {
          const resized = await img.resize(1200).toBuffer();
          return `data:${mimeType};base64,${resized.toString('base64')}`;
        }
        return image;
      }

      // Crop with padding
      const padding = 30;
      const left = Math.max(0, Math.round((xmin / 1000) * metadata.width) - padding);
      const top = Math.max(0, Math.round((ymin / 1000) * metadata.height) - padding);
      let width = Math.round(((xmax - xmin) / 1000) * metadata.width) + (padding * 2);
      let height = Math.round(((ymax - ymin) / 1000) * metadata.height) + (padding * 2);

      if (left + width > metadata.width) width = metadata.width - left;
      if (top + height > metadata.height) height = metadata.height - top;

      const croppedBuffer = await img
        .extract({ left, top, width, height })
        .resize(1000, null, { withoutEnlargement: true })
        .toBuffer();

      console.log("Successfully extracted diagram via OpenAI + Sharp.");
      return `data:${mimeType};base64,${croppedBuffer.toString('base64')}`;
    }

    return null;
  } catch (error) {
    console.error("OpenAI Extraction Error:", error);
    return null;
  }
}

/**
 * Verifies and fixes a question using GPT-4o-mini.
 */
export async function verifyAndFixQuestion(q: any): Promise<any> {
  try {
    const verifyPrompt = `You are a strict academic auditor and subject matter expert. Review the following multiple-choice question.
    QUESTION DATA:
    ${JSON.stringify(q, null, 2)}
    YOUR TASKS:
    1. RE-CALCULATION: Re-calculate everything from scratch. If it's a multi-step problem, verify EVERY intermediate value.
    2. CORRECTNESS: Ensure the "correctAnswer" is mathematically and logically sound. 
       CRITICAL: The "correctAnswer" MUST be ONLY a single uppercase letter: "A", "B", "C", or "D".
    3. RIGOR: Ensure the difficulty of the answer and solution matches or exceeds the question's level. Never simplify a complex problem.
    4. MANDATORY SOLUTION FORMAT: You MUST provide a professional, detailed, pedagogical breakdown using STEP_START/STEP_END tags for each phase. If the question is multi-step, the solution MUST show all those steps.
    5. REMOVE INNER MONOLOGUE: Return only the corrected JSON.
    6. CRITICAL LaTeX formatting rules:
       - Every single math expression, variable, number with units, or formula MUST be wrapped in dollar signs.
       - Use $...$ for inline math. Example: "The force is $F = 5$ N"
       - Use $$...$$ for standalone formulas.
       - Plain text should remain plain, only math/formulas/variables go inside $.
    7. MULTILINGUAL PRESERVATION: You MUST preserve and verify both "questionText" (Turkish) and "questionTextEN" (English) fields, along with their respective options and solutions. If one is missing or incorrect, translate/fix it.
    Return corrected question data in the exact same JSON format.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: verifyPrompt }],
      response_format: { type: "json_object" }
    });

    const aiResult = JSON.parse(response.choices[0].message.content || "{}");

    const fixMath = (text: string | null) => {
      if (!text) return text;

      // If the text already has proper $ delimiters, leave it alone
      if (text.includes('$')) return text;

      // Common LaTeX command pattern (e.g. \frac{a}{b}, \vec{F}, \sqrt{x}, etc.)
      const latexCommandPattern = /\\(?:frac|sqrt|sum|prod|int|lim|vec|hat|bar|dot|ddot|overline|underline|widetilde|mathbf|mathrm|text|left|right|cdot|times|div|pm|mp|leq|geq|neq|approx|equiv|sim|propto|infty|partial|nabla|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)\b/;

      // If the text contains LaTeX commands without $ delimiters, we need to wrap them
      if (latexCommandPattern.test(text)) {
        // Strategy: find contiguous LaTeX expressions and wrap each in $...$
        // A LaTeX expression starts with \ and may include {}, ^, _, etc.
        const result = text.replace(
          /((?:\\[a-zA-Z]+(?:\{[^}]*\})*(?:\s*[_^]\s*(?:\{[^}]*\}|[a-zA-Z0-9]))*(?:\s*(?:[_^]\s*(?:\{[^}]*\}|[a-zA-Z0-9])|\\[a-zA-Z]+(?:\{[^}]*\})*|[+\-*/=<>]|\{[^}]*\}))*)+)/g,
          (match) => {
            // Don't wrap if it's already inside $ or is a STEP marker
            if (match.includes('STEP_START') || match.includes('STEP_END')) return match;
            return `$${match.trim()}$`;
          }
        );
        return result;
      }

      // Also handle standalone superscript/subscript patterns like "R_1", "x^2"
      if (/[a-zA-Z][_^]\{?[^}\s]+\}?/.test(text) && !text.includes('$')) {
        return text.replace(
          /([a-zA-Z](?:[_^](?:\{[^}]+\}|[a-zA-Z0-9]))+)/g,
          (match) => `$${match}$`
        );
      }

      return text;
    };

    const sanitizeCorrectAnswer = (ans: any) => {
      if (typeof ans !== 'string') return "A";
      const match = ans.match(/[A-D]/i);
      return match ? match[0].toUpperCase() : "A";
    };

    // Merge AI result with defaults, ensuring required fields are never undefined
    return {
      questionText: fixMath(aiResult.questionText || q.questionText || "Soru metni eksik."),
      optionA: fixMath(aiResult.optionA || q.optionA || "A) Seçenek eksik"),
      optionB: fixMath(aiResult.optionB || q.optionB || "B) Seçenek eksik"),
      optionC: fixMath(aiResult.optionC || q.optionC || "C) Seçenek eksik"),
      optionD: fixMath(aiResult.optionD || q.optionD || "D) Seçenek eksik"),
      correctAnswer: sanitizeCorrectAnswer(aiResult.correctAnswer || q.correctAnswer),
      solution: fixMath(aiResult.solution || q.solution || null),
      questionTextEN: fixMath(aiResult.questionTextEN || q.questionTextEN || null),
      optionAEN: fixMath(aiResult.optionAEN || q.optionAEN || null),
      optionBEN: fixMath(aiResult.optionBEN || q.optionBEN || null),
      optionCEN: fixMath(aiResult.optionCEN || q.optionCEN || null),
      optionDEN: fixMath(aiResult.optionDEN || q.optionDEN || null),
      solutionEN: fixMath(aiResult.solutionEN || q.solutionEN || null)
    };
  } catch (error) {
    console.error("Verification Error:", error);
    return q;
  }
}

/**
 * Fetches existing questions for a user in a specific category to ensure uniqueness.
 */
async function getCategoryQuestions(userId: string, categoryId?: number): Promise<string[]> {
  try {
    const { createClient } = await import("./supabase-server");
    const supabase = await createClient();
    let query = supabase
      .from("Question")
      .select("questionText")
      .eq("userId", userId);

    if (categoryId) {
      query = query.eq("categoryId", categoryId);
    }

    const { data } = await query
      .order("createdAt", { ascending: false })
      .limit(50); // increased limit for better coverage

    return (data || []).map((q: any) => q.questionText);
  } catch (error) {
    console.error("Error fetching category questions:", error);
    return [];
  }
}

export async function generate(
  prompt: string,
  image?: string,
  questionType: string = "Karışık",
  count: number = 5,
  originalImage?: string,
  userId?: string,
  categoryId?: number
) {
  const existingQuestions = userId ? await getCategoryQuestions(userId, categoryId) : [];
  const uniquenessConstraint = existingQuestions.length > 0
    ? `\nSTRICT UNIQUENESS: The user already has these questions in this category: [${existingQuestions.join(' | ')}]. YOU MUST NOT repeat any of these. Ensure entirely new scenarios, variables, and logical paths.`
    : "";

  const basePrompt = (image || originalImage)
    ? `You MUST first transcribe the ORIGINAL question exactly as it appears in the image in BOTH Turkish and English. AND THEN create ${count} additional NEW ${questionType} multiple choice questions in BOTH Turkish and English based on the same context and difficulty. Thus, you will return a total of ${count + 1} questions (each with TR and EN versions). ${uniquenessConstraint}`
    : `Create ${count} ${questionType} multiple choice questions in BOTH Turkish and English. ${uniquenessConstraint}`;

  const systemPrompt = `You are an elite academic professor and an expert exam question writer. ${basePrompt}
  
  CRITICAL INSTRUCTIONS:
  1. TRANSCRIPTION: If an image is provided, your first generated question MUST be an exact transcription and academic formulation of the question explicitly shown in that image.
  2. DEEP ANALYSIS: Analyze the input (text or image) thoroughly. Identify the academic level (e.g., Undergraduate Physics, Graduate Math).
  3. DIFFICULTY MATCHING & PRESERVATION: The generated questions MUST match or exceed the intellectual rigor and complexity of the input. NEVER downgrade the difficulty.
  4. MANDATORY MULTI-STEP COMPLEXITY: If the original problem requires a multi-step analytical solution, your generated questions MUST also require a deep, multi-step process to solve.
  5. STRICT FIGURE INTEGRATION: If a diagram, graph, or schematic is provided, EVERY question MUST be strictly coupled to it. Analyzing the visual data must be mandatory for solving.
  6. JSON FORMAT: Return ONLY a JSON array of objects with fields: questionText (TR), optionA (TR), optionB (TR), optionC (TR), optionD (TR), correctAnswer (ONLY 'A', 'B', 'C', or 'D'), solution (TR), questionTextEN (EN), optionAEN (EN), optionBEN (EN), optionCEN (EN), optionDEN (EN), solutionEN (EN).
  7. MULTILINGUAL REQUIREMENT: Every single question MUST have high-quality content in both Turkish (main fields) and English (EN fields).
  8. MATH FORMATTING: Use LaTeX for ALL math. Wrap inline math/variables in single dollar signs like $x$. Wrap complex formulas in double dollar signs.
  9. SOLUTION STRUCTURE: Every solution MUST be a professional, detailed pedagogical breakdown using STEP_START and STEP_END for each logical phase.
  10. VARIABLE VARIATION: Ensure that each generated question uses different numerical values, constants, and variables to ensure variety across the set. All questions must be distinct from one another.`;

  try {
    const userContent: any[] = [
      { type: "text", text: `Topic/Prompt: ${prompt || "Generate questions based on the context."}` }
    ];

    if (originalImage) {
      userContent.push({
        type: "text",
        text: "CONTEXT IMAGE (Original): This image contains the full problem description and text context. Use this TO UNDERSTAND the problem and transcribe the original question."
      });
      userContent.push({
        type: "image_url",
        image_url: { url: originalImage }
      });
    }

    if (image) {
      userContent.push({
        type: "text",
        text: originalImage
          ? "CRITICAL DIAGRAM IMAGE (Selected): This is the specific diagram/figure. YOU MUST strictly base ALL questions on this exact diagram. The questions MUST be impossible to solve without analyzing this specific visual. ALSO TRANSCRIBE THE ORIGINAL QUESTION FROM HERE IF PRESENT."
          : "CRITICAL IMAGE: Analyze the text and diagram in this image. YOU MUST transcribe the original question exactly AND then generate the variations."
      });
      userContent.push({
        type: "image_url",
        image_url: { url: image }
      });
    }

    const [genResponse, extractedDiagram] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        response_format: { type: "json_object" },
      }),
      image ? extractDiagramFromImage(image) : Promise.resolve(null)
    ]);

    let text = genResponse.choices[0].message.content || "[]";
    let parsed = JSON.parse(text);
    const questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);

    const verifiedQuestions = await Promise.all(
      questions.map(async (q: any) => {
        const fixed = await verifyAndFixQuestion(q);
        return { ...fixed, imageUrl: extractedDiagram };
      })
    );

    return verifiedQuestions;
  } catch (e) {
    console.error("Question Generation Error:", e);
    throw e;
  }
}

export async function generateGroupedQuestions(
  prompt: string,
  image?: string,
  subQuestionCount: number = 3,
  originalImage?: string,
  userId?: string,
  categoryId?: number
) {
  const existingQuestions = userId ? await getCategoryQuestions(userId, categoryId) : [];
  const uniquenessConstraint = existingQuestions.length > 0
    ? `\nSTRICT UNIQUENESS: Ensure this new scenario and its questions are completely distinct from these existing ones: [${existingQuestions.slice(0, 15).join(' | ')}].`
    : "";

  const basePrompt = (image || originalImage)
    ? `Create a group of ${subQuestionCount} interconnected Turkish and English questions (like a scenario with shared diagram/stem) BASED ON THE PROVIDED IMAGE. ${uniquenessConstraint}`
    : `Create a group of ${subQuestionCount} interconnected Turkish and English questions (like a scenario with shared diagram/stem). ${uniquenessConstraint}`;
  const systemPrompt = `You are an elite academic professor and an expert exam question writer.
  ${basePrompt}
  
  CRITICAL INSTRUCTIONS:
  1. DEEP SCENARIO ANALYSIS: Analyze the input context deeply. Identify the core concepts (e.g., thermodynamic cycles, structural analysis).
  2. RIGOR MATCHING: The generated scenario and its sub-questions MUST match or exceed the academic difficulty of the input. Do not simplify.
  3. MANDATORY MULTI-STEP INTERCONNECTION: The sub-questions must form a cohesive, complex scenario. If the input is multi-step, the scenario MUST require a chain of complex logical/mathematical steps.
  4. STRICT FIGURE INTEGRATION: The entire scenario MUST be built around the provided diagram/figure. It must be impossible to answer the questions without detailed visual analysis.
  5. JSON FORMAT: Return ONLY a JSON object with fields: stemText (TR), stemTextEN (EN), questions (array of question objects with fields: questionText (TR), optionA (TR), optionB (TR), optionC (TR), optionD (TR), correctAnswer (ONLY 'A', 'B', 'C', or 'D'), solution (TR), questionTextEN (EN), optionAEN (EN), optionBEN (EN), optionCEN (EN), optionDEN (EN), solutionEN (EN)).
  6. MATH FORMATTING: Use LaTeX for ALL math. Inline: $...$, Block: $$...$$.
  7. SOLUTION STRUCTURE: For every question, the solution MUST be a detailed, pedagogical breakdown using STEP_START and STEP_END tags for each logical phase. Multi-step problems MUST have multi-step solutions.
  8. VARIABLE VARIATION: Ensure that the questions use different numerical data points and variables where applicable, ensuring each question provides a unique challenge within the scenario.`;

  try {
    const userContent: any[] = [
      { type: "text", text: `Topic / Prompt: ${prompt || "Generate grouped questions based on the context."} ` }
    ];

    if (originalImage) {
      userContent.push({
        type: "text",
        text: "CONTEXT IMAGE (Original): This image contains the full problem description and context. Use this TO UNDERSTAND the scenario."
      });
      userContent.push({
        type: "image_url",
        image_url: { url: originalImage }
      });
    }

    if (image) {
      userContent.push({
        type: "text",
        text: originalImage
          ? "CRITICAL DIAGRAM IMAGE (Selected): This is the specific diagram/figure. YOU MUST strictly base the ENTIRE scenario on this exact diagram. The questions MUST be impossible to solve without analyzing this specific visual."
          : "CRITICAL IMAGE: Analyze the text and diagram in this image. YOU MUST strictly base the ENTIRE scenario on the exact data and visuals provided here."
      });
      userContent.push({
        type: "image_url",
        image_url: { url: image }
      });
    }

    const [genResponse, extractedDiagram] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
      image ? extractDiagramFromImage(image) : Promise.resolve(null),
    ]);

    const parsed = JSON.parse(genResponse.choices[0].message.content || "{}");

    const verifiedQuestions = await Promise.all(
      (parsed.questions || []).map(async (q: any) => {
        const fixed = await verifyAndFixQuestion(q);
        const sanitizeCorrectAnswer = (ans: any) => {
          if (typeof ans !== 'string') return "A";
          const match = ans.match(/[A-D]/i);
          return match ? match[0].toUpperCase() : "A";
        };

        // Robust normalization to prevent Prisma errors
        return {
          questionText: fixed.questionText || q.questionText || "Soru metni bulunamadı.",
          optionA: fixed.optionA || q.optionA || "A) Seçenek eksik",
          optionB: fixed.optionB || q.optionB || "B) Seçenek eksik",
          optionC: fixed.optionC || q.optionC || "C) Seçenek eksik",
          optionD: fixed.optionD || q.optionD || "D) Seçenek eksik",
          correctAnswer: sanitizeCorrectAnswer(fixed.correctAnswer || q.correctAnswer),
          solution: fixed.solution || q.solution || null,
          questionTextEN: fixed.questionTextEN || q.questionTextEN || null,
          optionAEN: fixed.optionAEN || q.optionAEN || null,
          optionBEN: fixed.optionBEN || q.optionBEN || null,
          optionCEN: fixed.optionCEN || q.optionCEN || null,
          optionDEN: fixed.optionDEN || q.optionDEN || null,
          solutionEN: fixed.solutionEN || q.solutionEN || null,
        };
      })
    );

    return {
      stemText: parsed.stemText || "Senaryo metni bulunamadı.",
      stemTextEN: parsed.stemTextEN || null,
      imageUrl: extractedDiagram,
      questions: verifiedQuestions
    };
  } catch (e) {
    console.error("Grouped Generation Error:", e);
    throw e;
  }
}

export async function processNotebookQuestion(q: any) {
  const prompt = `Convert to professional university - level question:
  QUESTION: ${q.question}
  Return JSON fields: questionText, optionA, optionB, optionC, optionD, correctAnswer, solution, questionTextEN, optionAEN, optionBEN, optionCEN, optionDEN, solutionEN`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Notebook processing error:", error);
    return null;
  }
}

/**
 * Detects if an image contains a diagram, circuit, or graph.
 */
export async function detectDiagram(image: string): Promise<boolean> {
  try {
    const prompt = `Analyze this image. Does it contain a diagram, circuit schematic, graph, table, or any technical illustration that is essential for understanding or solving the problem?
    IMPORTANT: If the image is ONLY text (printed or handwritten) or is blank, return {"hasDiagram": false}.
    Return ONLY a JSON object: {"hasDiagram": true} or {"hasDiagram": false}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: image } }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    return !!parsed.hasDiagram;
  } catch (error) {
    console.error("Detection Error:", error);
    return false;
  }
}

export async function generateVariants(originalQuestion: any, count: number, userId?: string) {
  const existingQuestions = userId ? await getCategoryQuestions(userId, originalQuestion.categoryId) : [];
  const uniquenessConstraint = existingQuestions.length > 0
    ? `\nSTRICT VARIANT UNIQUENESS: While creating variants, ensure they don't overlap with these other existing questions: [${existingQuestions.slice(0, 10).join(' | ')}].`
    : "";

  const systemPrompt = `Generate ${count} variations of this question:
  ${JSON.stringify(originalQuestion)}
  ${uniquenessConstraint}
  CRITICAL INSTRUCTIONS:
  1. CORRECT ANSWER: The "correctAnswer" field MUST be ONLY a single uppercase letter: "A", "B", "C", or "D".
  2. MULTILINGUAL: You MUST generate each variation in BOTH Turkish and English, filling all TR and EN fields.
  3. JSON FORMAT: Return a JSON object like {"questions": [...]}. Each object in the array MUST have all fields: questionText, optionA, optionB, optionC, optionD, correctAnswer, solution, questionTextEN, optionAEN, optionBEN, optionCEN, optionDEN, solutionEN.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: systemPrompt }],
      response_format: { type: "json_object" }
    });

    let parsed = JSON.parse(response.choices[0].message.content || "[]");
    const variants = Array.isArray(parsed) ? parsed : (parsed.questions || []);

    return await Promise.all(variants.map((v: any) => verifyAndFixQuestion(v)));
  } catch (e) {
    console.error("Variant Generation Error:", e);
    throw e;
  }
}

export async function generateSubtopics(category: string, topic?: string): Promise<string[]> {
  const prompt = topic
    ? `Sen kıdemli bir ${category} profesörüsün. "${topic}" konusu için 6 ile 8 arasında spesifik, akademik ve analitik alt başlık üret. Bu başlıklar soru oluşturmak için birer zemin olmalı. YALNIZCA "subtopics" adında bir string dizisi (array) içeren JSON döndür.`
    : `Sen kıdemli bir ${category} profesörüsün. Bu kategori için 6 ile 8 arasında spesifik ve temel akademik alt başlık üret. Bu başlıklar soru oluşturmak için birer zemin olmalı. YALNIZCA "subtopics" adında bir string dizisi (array) içeren JSON döndür.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(response.choices[0].message.content || '{"subtopics": []}');
    return Array.isArray(parsed.subtopics) ? parsed.subtopics : [];
  } catch (error) {
    console.error("Subtopic Generation Error:", error);
    return [];
  }
}
