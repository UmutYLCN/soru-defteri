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

    const detectionPrompt = `Analyze this physics/engineering problem image. 
    Find the primary diagram, circuit schematic, graph, or illustration.
    Return ONLY a JSON object with the bounding box coordinates [ymin, xmin, ymax, xmax] normalized from 0 to 1000.
    
    Format: {"boundingBox": [ymin, xmin, ymax, xmax]}
    If no diagram is present, return {"boundingBox": [0, 0, 1000, 1000]}`;

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

    if (!metadata.width || !metadata.height) return image;

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

    return image;
  } catch (error) {
    console.error("OpenAI Extraction Error:", error);
    return image;
  }
}

/**
 * Verifies and fixes a question using GPT-4o-mini.
 */
export async function verifyAndFixQuestion(q: any): Promise<any> {
  try {
    const verifyPrompt = `You are a strict academic auditor. Review the following multiple-choice question for logical consistency and mathematical accuracy.
    QUESTION DATA:
    ${JSON.stringify(q, null, 2)}
    YOUR TASKS:
    1. Re-calculate everything from scratch based on the question text.
    2. Check if the "correctAnswer" actually corresponds to the result.
    3. REMOVE ALL "INNER MONOLOGUE".
    4. Provide Step-by-step professional solution using STEP_START/STEP_END.
    5. CRITICAL LaTeX formatting rules:
       - Every single math expression, variable, number with units, or formula MUST be wrapped in dollar signs.
       - Use $...$ for inline math. Example: "The force is $F = 5$ N" NOT "The force is \\vec{F} = 5 N"
       - Use $$...$$ for standalone formulas. Example: "$$F = \\frac{kq_1q_2}{r^2}$$"
       - NEVER use LaTeX commands like \\frac, \\vec, \\sqrt outside of $ delimiters.
       - Plain text should remain plain, only math/formulas/variables go inside $.
       - Example correct: "Net kuvvet $\\vec{F}_{net}$ hesaplanır: $$F_{net} = \\frac{kq_1 q_2}{r^2} = 2.5$ N"
       - Example WRONG: "Net kuvvet \\vec{F}_{net} hesaplanır: \\frac{kq_1 q_2}{r^2} = 2.5 N"
    Return corrected question data in same JSON format.`;

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

    // Merge AI result with defaults, ensuring required fields are never undefined
    return {
      questionText: fixMath(aiResult.questionText || q.questionText || "Soru metni eksik."),
      optionA: fixMath(aiResult.optionA || q.optionA || "A) Seçenek eksik"),
      optionB: fixMath(aiResult.optionB || q.optionB || "B) Seçenek eksik"),
      optionC: fixMath(aiResult.optionC || q.optionC || "C) Seçenek eksik"),
      optionD: fixMath(aiResult.optionD || q.optionD || "D) Seçenek eksik"),
      correctAnswer: aiResult.correctAnswer || q.correctAnswer || "A",
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

export async function generate(
  prompt: string,
  image?: string,
  questionType: string = "Karışık",
  count: number = 5,
  originalImage?: string // New: original context
) {
  const basePrompt = `Create ${count} ${questionType} multiple choice questions in Turkish and English.`;
  const systemPrompt = `You are an elite academic professor and an expert exam question writer. ${basePrompt}
  
  CRITICAL INSTRUCTIONS:
  1. DIFFICULTY MATCHING: The generated questions MUST be at the EXACT SAME intellectual and academic difficulty level as the provided prompt or context image. Treat the inputs as a benchmark. Do NOT generate simple or basic questions if the input is advanced.
  2. MULTI-STEP COMPLEXITY: If the provided example requires a multi-step, complex analytical solution, your generated questions MUST also require a deep, multi-step solution.
  3. STRICT FIGURE INTEGRATION: If a specific image, diagram, graph, or schematic is provided, EVERY generated question MUST be STRICTLY coupled to that specific figure. Ensure the questions absolutely CANNOT be solved without analyzing the provided visual data. Maintain absolute contextual integrity with the image.
  4. JSON FORMAT: Return ONLY a JSON array of objects with fields: questionText, optionA, optionB, optionC, optionD, correctAnswer, solution, questionTextEN, optionAEN, optionBEN, optionCEN, optionDEN, solutionEN.
  5. MATH FORMATTING: Use LaTeX for ALL math. Wrap inline math/variables in single dollar signs like $x$. Wrap complex formulas in double dollar signs like $$\\frac{a}{b}$$.
  6. Use STEP_START/STEP_END format for solutions to clearly break down the multi-step analytical process.`;

  try {
    const userContent: any[] = [
      { type: "text", text: `Topic/Prompt: ${prompt || "Generate questions based on the context."}` }
    ];

    if (originalImage) {
      userContent.push({
        type: "text",
        text: "CONTEXT IMAGE (Original): This image contains the full problem description and text context. Use this TO UNDERSTAND the problem."
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
          ? "CRITICAL DIAGRAM IMAGE (Selected): This is the specific diagram/figure. YOU MUST strictly base ALL questions on this exact diagram. The questions MUST be impossible to solve without analyzing this specific visual."
          : "CRITICAL IMAGE: Analyze the text and diagram in this image. YOU MUST strictly base ALL questions on the exact data and visuals provided here."
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
  originalImage?: string // New: original context
) {
  const basePrompt = `Create a group of ${subQuestionCount} interconnected Turkish and English questions (like a scenario with shared diagram/stem).`;
  const systemPrompt = `You are an elite academic professor and an expert exam question writer.
  ${basePrompt}
  
  CRITICAL INSTRUCTIONS:
  1. DIFFICULTY MATCHING: The generated scenario MUST be at the EXACT SAME intellectual and academic difficulty level as the provided prompt or context image. Treat the inputs as a benchmark. Do NOT generate simple or basic scenarios if the input is advanced.
  2. MULTI-STEP COMPLEXITY: If the provided example requires a multi-step, complex analytical solution, your generated scenario MUST also require a deep, multi-step solution encompassing multiple interconnected steps.
  3. STRICT FIGURE INTEGRATION: If a specific image, diagram, graph, or schematic is provided, the ENTIRE scenario and EVERY generated question MUST be STRICTLY coupled to that specific figure. Ensure the questions absolutely CANNOT be solved without analyzing the provided visual data. Maintain absolute contextual integrity.
  4. JSON FORMAT: Return ONLY a JSON object with exactly this structure:
  {
    "stemText": "Turkish stem text",
    "stemTextEN": "English stem text",
    "questions": [
      {
        "questionText": "...",
        "optionA": "...",
        "optionB": "...",
        "optionC": "...",
        "optionD": "...",
        "correctAnswer": "A",
        "solution": "...",
        "questionTextEN": "...",
        "optionAEN": "...",
        "optionBEN": "...",
        "optionCEN": "...",
        "optionDEN": "...",
        "solutionEN": "..."
      }
    ]
  }

  5. MATH FORMATTING: Use LaTeX for ALL math/formulas. 
  - Inline: Wrap in single $ (e.g., $R_1$).
  - Block: Wrap in double $$ (e.g., $$\\sum X$$).
  - Inside the solution, use STEP_START/STEP_END format to clearly break down the multi-step analytical process.`;

  try {
    const userContent: any[] = [
      { type: "text", text: `Topic/Prompt: ${prompt || "Generate grouped questions based on the context."}` }
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
        // Robust normalization to prevent Prisma errors
        return {
          questionText: fixed.questionText || q.questionText || "Soru metni bulunamadı.",
          optionA: fixed.optionA || q.optionA || "A) Seçenek eksik",
          optionB: fixed.optionB || q.optionB || "B) Seçenek eksik",
          optionC: fixed.optionC || q.optionC || "C) Seçenek eksik",
          optionD: fixed.optionD || q.optionD || "D) Seçenek eksik",
          correctAnswer: fixed.correctAnswer || q.correctAnswer || "A",
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
  const prompt = `Convert to professional university-level question: 
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
    const prompt = `Analyze this image. Does it contain a diagram, circuit schematic, graph, or any technical illustration? 
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

export async function generateVariants(originalQuestion: any, count: number) {
  const systemPrompt = `Generate ${count} variations of this question:
  ${JSON.stringify(originalQuestion)}
  Return JSON array of question objects.`;

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
