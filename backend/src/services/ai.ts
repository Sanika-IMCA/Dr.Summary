import { GoogleGenerativeAI, Schema, FunctionDeclarationSchemaType } from "@google/generative-ai";

export interface AISummaryResult {
  shortSummary: string;
  mediumSummary: string;
  longSummary: string;
  executiveSummary: string;
  bulletSummary: string;
  paragraphSummary: string;
  category: string;
  topics: string[];
  keywords: string[];
  sentiment: string;
  complexity: string;
  readingTime: number; // in minutes
  keyPoints: Array<{
    point: string;
    category: "MAIN_IDEA" | "FACT" | "DATE" | "NAME" | "NUMBER" | "ACTION_ITEM" | "KEY_POINT";
  }>;
  suggestions: Array<{
    suggestion: string;
    category: "GRAMMAR" | "READABILITY" | "STRUCTURE" | "MISSING_INFO" | "CONTENT_OPTIMIZATION" | "PROFESSIONAL_WRITING";
  }>;
  isMock?: boolean;
}

// Memory Cache for custom length summaries to optimize duplicate requests
const customSummaryCache = new Map<string, string>();

/**
 * Robust retry helper with exponential backoff to handle rate limits or transient errors.
 */
async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1500): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries <= 0) {
      throw error;
    }
    console.warn(`[RETRY ENGINE] API warning: ${error.message || error}. Retrying in ${delay}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return callWithRetry(fn, retries - 1, delay * 2);
  }
}

/**
 * Unified Multi-Provider LLM Calling Engine
 * Prioritizes: Groq (Llama3) -> OpenAI (GPT-4o-mini) -> Gemini (1.5-flash) -> Fallback Mock
 */
export async function runGeneralPrompt(prompt: string, jsonSchema?: any): Promise<string> {
  const openAiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // 1. Groq Integration
  if (groqKey && groqKey.trim() !== "") {
    try {
      console.log("[LLM ENGINE] Using Groq Llama3...");
      const response = await callWithRetry(async () => {
        const res = await fetch("https://api.groq.com/openapi/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "llama3-8b-8192",
            messages: [{ role: "user", content: prompt }],
            response_format: jsonSchema ? { type: "json_object" } : undefined,
            temperature: 0.2,
          }),
        });
        const data = await res.json() as any;
        if (!res.ok) {
          throw new Error(data.error?.message || "Groq request failed");
        }
        return data.choices[0].message.content;
      });
      return response;
    } catch (e: any) {
      console.error("[LLM ENGINE] Groq failed, trying fallback OpenAI/Gemini...", e.message || e);
    }
  }

  // 2. OpenAI Integration
  if (openAiKey && openAiKey.trim() !== "") {
    try {
      console.log("[LLM ENGINE] Using OpenAI GPT-4o-mini...");
      const response = await callWithRetry(async () => {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: jsonSchema ? { type: "json_object" } : undefined,
            temperature: 0.2,
          }),
        });
        const data = await res.json() as any;
        if (!res.ok) {
          throw new Error(data.error?.message || "OpenAI request failed");
        }
        return data.choices[0].message.content;
      });
      return response;
    } catch (e: any) {
      console.error("[LLM ENGINE] OpenAI failed, trying fallback Gemini...", e.message || e);
    }
  }

  // 3. Gemini Integration
  if (geminiKey && geminiKey.trim() !== "") {
    try {
      console.log("[LLM ENGINE] Using Gemini 1.5 Flash...");
      const response = await callWithRetry(async () => {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: jsonSchema ? "application/json" : undefined,
            responseSchema: jsonSchema || undefined,
            temperature: 0.2,
          },
        });
        const resText = result.response.text();
        if (!resText) throw new Error("Empty response from Gemini");
        return resText;
      });
      return response;
    } catch (e: any) {
      console.error("[LLM ENGINE] Gemini failed:", e.message || e);
    }
  }

  // 4. Default Fallback warning
  throw new Error("No active LLM credentials configured or all providers returned errors.");
}

/**
 * Generates summaries, key points, suggestions, and smart metadata from text using LLM Engine.
 * Falls back to a deterministic mockup generator if the API keys are missing or invalid.
 */
export async function generateDocumentSummary(text: string, targetLang = "English"): Promise<AISummaryResult> {
  const prompt = `
You are an expert document analysis assistant. Analyze the following document text and provide:
1. A short summary (2-3 sentences) capturing the core focus.
2. A medium summary (1-2 paragraphs) summarizing the main topics.
3. A long summary (multi-paragraph) covering the structure, details, methodology, and conclusion.
4. An executive summary (a formal summary designed for decision-makers).
5. A bullet point summary (key takeaways as a list of bullet points).
6. A paragraph summary (a narrative text summary).
7. A single-word or short phrase classifying the document category (e.g. Legal, Technical, Financial, Educational, Correspondence).
8. A list of up to 5 major topics covered in the document.
9. A list of up to 8 keywords representing important terms in the document.
10. The overall emotional sentiment of the text (e.g., Positive, Neutral, Critical, Urgent, Informative).
11. The reading complexity level of the text (e.g., Low / Simple, Medium / Informative, High / Scholarly, High / Technical).
12. An estimated reading time in minutes based on average 200 words-per-minute reading speed (must be an integer >= 1).
13. Key information points extracted from the document, categorized into:
   - MAIN_IDEA (a core argument or central theme)
   - FACT (an objective statement of fact, truth, or statistic)
   - DATE (an important date, deadline, or timeline milestone)
   - NAME (an important name of a person, institution, brand, or location)
   - NUMBER (an important number, percentage, money amount, or metric)
   - ACTION_ITEM (an explicit task, next step, or recommendation)
   - KEY_POINT (any other significant takeaway or general point)
14. Actionable readability/document quality suggestions categorized into:
   - GRAMMAR (typos, punctuation, syntax corrections)
   - READABILITY (vocabulary choice, phrase simplicity, ease of reading)
   - STRUCTURE (headings, paragraph division, layout enhancements)
   - MISSING_INFO (incomplete details, logical gaps, undefined terms)
   - CONTENT_OPTIMIZATION (redundancy removal, conciseness tips, tone consistency)
   - PROFESSIONAL_WRITING (business writing standard recommendations, styling tone)

CRITICAL INSTRUCTION: GENERATE ALL OUTPUT TEXTS, BULLETS, SUGGESTIONS, AND DETAILS IN THE TARGET LANGUAGE: "${targetLang}".

Document text to analyze:
---
${text}
---
`;

  // Define JSON schema for structured output
  const responseSchema: any = {
    type: FunctionDeclarationSchemaType.OBJECT,
    properties: {
      shortSummary: { type: FunctionDeclarationSchemaType.STRING },
      mediumSummary: { type: FunctionDeclarationSchemaType.STRING },
      longSummary: { type: FunctionDeclarationSchemaType.STRING },
      executiveSummary: { type: FunctionDeclarationSchemaType.STRING },
      bulletSummary: { type: FunctionDeclarationSchemaType.STRING },
      paragraphSummary: { type: FunctionDeclarationSchemaType.STRING },
      category: { type: FunctionDeclarationSchemaType.STRING },
      topics: {
        type: FunctionDeclarationSchemaType.ARRAY,
        items: { type: FunctionDeclarationSchemaType.STRING }
      },
      keywords: {
        type: FunctionDeclarationSchemaType.ARRAY,
        items: { type: FunctionDeclarationSchemaType.STRING }
      },
      sentiment: { type: FunctionDeclarationSchemaType.STRING },
      complexity: { type: FunctionDeclarationSchemaType.STRING },
      readingTime: { type: FunctionDeclarationSchemaType.INTEGER },
      keyPoints: {
        type: FunctionDeclarationSchemaType.ARRAY,
        items: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            point: { type: FunctionDeclarationSchemaType.STRING },
            category: { 
              type: FunctionDeclarationSchemaType.STRING, 
              enum: ["MAIN_IDEA", "FACT", "DATE", "NAME", "NUMBER", "ACTION_ITEM", "KEY_POINT"] 
            }
          },
          required: ["point", "category"]
        }
      },
      suggestions: {
        type: FunctionDeclarationSchemaType.ARRAY,
        items: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            suggestion: { type: FunctionDeclarationSchemaType.STRING },
            category: { 
              type: FunctionDeclarationSchemaType.STRING, 
              enum: ["GRAMMAR", "READABILITY", "STRUCTURE", "MISSING_INFO", "CONTENT_OPTIMIZATION", "PROFESSIONAL_WRITING"] 
            }
          },
          required: ["suggestion", "category"]
        }
      }
    },
    required: [
      "shortSummary", 
      "mediumSummary", 
      "longSummary", 
      "executiveSummary", 
      "bulletSummary", 
      "paragraphSummary", 
      "category",
      "topics",
      "keywords",
      "sentiment",
      "complexity",
      "readingTime",
      "keyPoints", 
      "suggestions"
    ]
  };

  try {
    const responseText = await runGeneralPrompt(prompt, responseSchema);
    const summaryData: AISummaryResult = JSON.parse(responseText);
    summaryData.isMock = false;
    return summaryData;
  } catch (error: any) {
    console.error("AI Generation Engine failed, falling back to mock mode:", error.message || error);
    return generateMockSummary(text, true, targetLang);
  }
}

/**
 * Generates a custom summary restricted strictly to a target word count in the requested target language.
 */
export async function generateCustomSummary(text: string, targetWords: number, targetLang = "English"): Promise<string> {
  const cacheKey = `${text.substring(0, 100)}-${text.length}-${targetWords}-${targetLang}`;
  
  if (customSummaryCache.has(cacheKey)) {
    console.log(`[CACHE HIT] Returning cached custom summary of length ${targetWords} in ${targetLang}.`);
    return customSummaryCache.get(cacheKey)!;
  }

  const prompt = `
You are an expert document analysis assistant. Write a summary of the following document text constrained strictly to approximately ${targetWords} words.
Do not exceed or fall significantly short of this target.

CRITICAL INSTRUCTION: GENERATE THE ENTIRE SUMMARY TEXT IN THE TARGET LANGUAGE: "${targetLang}".

Document text to summarize:
---
${text}
---
`;

  try {
    const responseText = await runGeneralPrompt(prompt);
    const trimmed = responseText.trim();
    customSummaryCache.set(cacheKey, trimmed);
    return trimmed;
  } catch (error: any) {
    console.error("Custom summary API failed, using fallback mock:", error.message || error);
    const mockVal = `(MOCK FALLBACK) [In ${targetLang}] Failed to contact AI provider. Here is a simulated custom summary of exactly ${targetWords} words for document details: "${text.substring(0, 80)}...".`;
    return mockVal;
  }
}

/**
 * Generates local mock summaries when no LLM key is configured.
 * Translates labels into target language fallback strings.
 */
function generateMockSummary(text: string, wasFailure = false, targetLang = "English"): AISummaryResult {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const estMinutes = Math.max(1, Math.ceil(words.length / 200));

  let langHeader = `(MOCK SUMMARY - TARGET: ${targetLang})`;
  if (targetLang.toLowerCase() === "hindi") {
    langHeader = "(सिम्युलेटेड दस्तावेज़ सारांश - हिंदी)";
  } else if (targetLang.toLowerCase() === "marathi") {
    langHeader = "(सिम्युलेटेड दस्तऐवज सारांश - मराठी)";
  }

  return {
    isMock: true,
    shortSummary: `${langHeader} This mock text captures the summary for the uploaded document in ${targetLang}. The document has ${words.length} words. To get actual AI-generated content, add your API keys.`,
    mediumSummary: `${langHeader} The document details information regarding system testing. Extracted text starts with: "${words.slice(0, 15).join(" ")}". The pipeline operates in local mock mode fallback since external API credentials are not active.`,
    longSummary: `### ${langHeader} Overview\nThis is a mock structured long summary for the document in target language: ${targetLang}.\n\n### Core Points\n- System is operating correctly.\n- Local SQLite persistence is verified.\n- Audio voice and translation templates are ready.`,
    executiveSummary: `EXECUTIVE SUMMARY (${targetLang}):\n\nThis is a simulated high-level overview of the ${words.length} word document, rendered as a mock fallback inside the ${targetLang} translation request structure.`,
    bulletSummary: `- **Document name**: Sample Test File\n- **Target language**: ${targetLang}\n- **Length**: ${words.length} words`,
    paragraphSummary: `A continuous paragraph summary reflecting the mock state of the system for target language: ${targetLang}. It represents data compiled locally for testing OCR text values.`,
    
    category: "General Text",
    topics: ["Mock Topics", "Target Language Support", "Audio TTS Stream"],
    keywords: ["Mock", "Translation", "Voice", "Speech"],
    sentiment: "Neutral",
    complexity: "Medium",
    readingTime: estMinutes,

    keyPoints: [
      { point: `Mock key takeaway: Document has ${words.length} words.`, category: "MAIN_IDEA" },
      { point: `Language of text analysis: ${targetLang}`, category: "KEY_POINT" },
      { point: `Local processing completed at: ${new Date().toLocaleTimeString()}`, category: "DATE" }
    ],
    suggestions: [
      { suggestion: `Add OpenAI or Gemini keys to get summaries translated into ${targetLang}.`, category: "READABILITY" }
    ]
  };
}
