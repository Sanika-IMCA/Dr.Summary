import { Router, Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { upload } from "../middleware/upload";
import { extractTextFromPDF } from "../services/parser";
import { extractTextFromImage } from "../services/ocr";
import { generateDocumentSummary, generateCustomSummary, runGeneralPrompt } from "../services/ai";
import { extractTextWithAzure } from "../services/azureOcr";
import path from "path";
import fs from "fs";

const router = Router();

/**
 * GET /api/documents
 * Retrieves a list of all documents with basic metadata.
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documents = await prisma.uploadedDocument.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        status: true,
        createdAt: true,
      },
    });
    res.json(documents);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/documents/:id
 * Retrieves a single document with all summaries, key points, and suggestions.
 */
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const document = await prisma.uploadedDocument.findUnique({
      where: { id },
      include: {
        summaries: true,
        suggestions: true,
        keyPoints: true,
      },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    res.json(document);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/documents/upload
 * Uploads a document and automatically extracts its text (via PDF parsing or OCR).
 */
router.post(
  "/upload",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file was uploaded or file format is invalid" });
        return;
      }

      const file = req.file;

      // Security Input Validation: verify mimetypes
      const allowedMimes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
      if (!allowedMimes.includes(file.mimetype)) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        res.status(400).json({ error: "Invalid file format. Only PDF, PNG, JPG, and JPEG are allowed." });
        return;
      }

      // Security Filename sanitization
      const cleanOriginalName = file.originalname.replace(/[^a-zA-Z0-9.\-_ ]/g, "_");
      const fileExt = path.extname(cleanOriginalName).toLowerCase();
      const isPdf = fileExt === ".pdf";
      const language = typeof req.body.language === "string" ? req.body.language : "eng";

      // 1. Create initial PROCESSING document in DB
      const doc = await prisma.uploadedDocument.create({
        data: {
          fileName: cleanOriginalName,
          fileType: file.mimetype,
          fileSize: file.size,
          filePath: file.path,
          status: "PROCESSING",
          language: language,
        },
      });

      console.log(`Document created with ID: ${doc.id}, starting background text extraction...`);

      // Respond immediately to the client with PROCESSING status (Background Processing)
      res.status(201).json(doc);

      // 2. Perform text extraction asynchronously in the background
      (async () => {
        const startTime = Date.now();
        let extractedText = "";
        let pageCount: number | null = null;
        let ocrConfidence: number | null = null;

        try {
          if (isPdf) {
            const pdfResult = await extractTextFromPDF(file.path);
            extractedText = pdfResult.text;
            pageCount = pdfResult.pageCount;
          } else {
            // It's an image file: Check if Azure OCR key/endpoint is present
            if (process.env.AZURE_OCR_KEY && process.env.AZURE_OCR_ENDPOINT) {
              try {
                console.log("[BACKGROUND] Using Azure Computer Vision OCR...");
                const azureResult = await extractTextWithAzure(file.path);
                extractedText = azureResult.text;
                ocrConfidence = azureResult.confidence;
              } catch (azureErr) {
                console.warn("[BACKGROUND] Azure OCR failed, falling back to local Tesseract:", azureErr);
                const ocrResult = await extractTextFromImage(file.path, language);
                extractedText = ocrResult.text;
                ocrConfidence = ocrResult.confidence;
              }
            } else {
              console.log("[BACKGROUND] Using local Tesseract OCR...");
              const ocrResult = await extractTextFromImage(file.path, language);
              extractedText = ocrResult.text;
              ocrConfidence = ocrResult.confidence;
            }
            pageCount = 1;
          }

          if (!extractedText || extractedText.trim() === "") {
            throw new Error("No text content could be extracted from the document.");
          }

          // Analytics: Calculate wordCount and processingTime duration
          const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
          const processingTimeSec = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));

          // 3. Update document with success status, text, and analytics
          await prisma.uploadedDocument.update({
            where: { id: doc.id },
            data: {
              status: "COMPLETED",
              extractedText: extractedText,
              pageCount: pageCount,
              ocrConfidence: ocrConfidence,
              wordCount: wordCount,
              processingTime: processingTimeSec,
            },
          });
          console.log(`[BACKGROUND] Extraction completed successfully for document: ${doc.id}`);
        } catch (backgroundError: any) {
          console.error(`[BACKGROUND] Extraction failed for document ${doc.id}:`, backgroundError);
          const processingTimeSec = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
          
          await prisma.uploadedDocument.update({
            where: { id: doc.id },
            data: {
              status: "FAILED",
              extractedText: backgroundError.message || "Background text extraction failed.",
              processingTime: processingTimeSec,
            },
          });
        }
      })();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/documents/:id/summarize
 * Runs AI summary and analysis engine on extracted text.
 */
router.post("/:id/summarize", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const document = await prisma.uploadedDocument.findUnique({
      where: { id },
      include: {
        summaries: true,
        keyPoints: true,
        suggestions: true,
      },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    if (document.status !== "COMPLETED" || !document.extractedText) {
      res.status(400).json({
        error: "Document text is not extracted",
        message: `Current document status: ${document.status}`,
      });
      return;
    }

    console.log(`Running AI summary pipeline for document: ${id}`);

    const targetLang = typeof req.body.language === "string" ? req.body.language : "English";

    // Call the AI summarization service
    const aiResult = await generateDocumentSummary(document.extractedText, targetLang);

    // Delete existing summaries/keypoints/suggestions to support clean re-runs if requested
    await prisma.$transaction([
      prisma.summary.deleteMany({ where: { documentId: id } }),
      prisma.keyPoint.deleteMany({ where: { documentId: id } }),
      prisma.suggestion.deleteMany({ where: { documentId: id } }),
    ]);

    // Save newly generated AI assets
    const summariesData = [
      { documentId: id, summaryType: "SHORT", summaryText: aiResult.shortSummary },
      { documentId: id, summaryType: "MEDIUM", summaryText: aiResult.mediumSummary },
      { documentId: id, summaryType: "LONG", summaryText: aiResult.longSummary },
      { documentId: id, summaryType: "EXECUTIVE", summaryText: aiResult.executiveSummary },
      { documentId: id, summaryType: "BULLET", summaryText: aiResult.bulletSummary },
      { documentId: id, summaryType: "PARAGRAPH", summaryText: aiResult.paragraphSummary },
    ];

    const keyPointsData = aiResult.keyPoints.map((kp) => ({
      documentId: id,
      point: kp.point,
      category: kp.category,
    }));

    const suggestionsData = aiResult.suggestions.map((s) => ({
      documentId: id,
      suggestionText: s.suggestion,
      suggestionType: s.category,
    }));

    // Perform database insertions
    await prisma.summary.createMany({ data: summariesData });
    if (keyPointsData.length > 0) {
      await prisma.keyPoint.createMany({ data: keyPointsData });
    }
    if (suggestionsData.length > 0) {
      await prisma.suggestion.createMany({ data: suggestionsData });
    }

    // Update main document stats
    await prisma.uploadedDocument.update({
      where: { id },
      data: {
        category: aiResult.category,
        topics: aiResult.topics.join(", "),
        keywords: aiResult.keywords.join(", "),
        sentiment: aiResult.sentiment,
        complexity: aiResult.complexity,
        readingTime: aiResult.readingTime,
        language: targetLang,
      },
    });

    // Retrieve full updated document
    const updatedDocument = await prisma.uploadedDocument.findUnique({
      where: { id },
      include: {
        summaries: true,
        keyPoints: true,
        suggestions: true,
      },
    });

    res.json({
      success: true,
      isMock: aiResult.isMock || false,
      document: updatedDocument,
    });
  } catch (error: any) {
    console.error("AI Generation pipeline error:", error);
    res.status(500).json({
      error: "AI summarization failed",
      message: error.message || "Failed to generate AI analysis",
    });
  }
});

/**
 * POST /api/documents/:id/summarize/custom
 * Generates a summary of custom word length.
 */
router.post("/:id/summarize/custom", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const targetWords = parseInt(req.body.targetWords);

    if (isNaN(targetWords) || targetWords < 10 || targetWords > 2000) {
      res.status(400).json({ error: "Invalid targetWords parameter. Must be between 10 and 2000." });
      return;
    }

    const document = await prisma.uploadedDocument.findUnique({
      where: { id },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    if (document.status !== "COMPLETED" || !document.extractedText) {
      res.status(400).json({
        error: "Document text is not extracted",
        message: `Current document status: ${document.status}`,
      });
      return;
    }

    const targetLang = typeof req.body.language === "string" ? req.body.language : "English";

    console.log(`Generating custom summary of ${targetWords} words for document: ${id} (lang: ${targetLang})`);
    const summaryText = await generateCustomSummary(document.extractedText, targetWords, targetLang);

    // Delete any existing custom summaries for this document
    await prisma.summary.deleteMany({
      where: {
        documentId: id,
        summaryType: "CUSTOM",
      },
    });

    // Save the new custom summary
    const savedSummary = await prisma.summary.create({
      data: {
        documentId: id,
        summaryType: "CUSTOM",
        summaryText: summaryText,
      },
    });

    res.json({
      success: true,
      summary: savedSummary,
    });
  } catch (error: any) {
    console.error("AI Custom summary pipeline error:", error);
    res.status(500).json({
      error: "AI custom summary failed",
      message: error.message || "Failed to generate custom summary",
    });
  }
});

/**
 * DELETE /api/documents/:id
 * Deletes a document, its database records, and the local file.
 */
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const document = await prisma.uploadedDocument.findUnique({
      where: { id },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    // Delete local file if it exists
    if (fs.existsSync(document.filePath)) {
      try {
        fs.unlinkSync(document.filePath);
      } catch (err) {
        console.error("Failed to delete local file:", err);
      }
    }

    // Delete database records (cascade deletion handled by prisma relations)
    await prisma.uploadedDocument.delete({
      where: { id },
    });

    res.json({ success: true, message: "Document deleted successfully" });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/documents/:id/chat
 * Ask Questions About Document
 */
router.post("/:id/chat", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { message, language } = req.body;

    if (!message || message.trim() === "") {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const document = await prisma.uploadedDocument.findUnique({
      where: { id },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const targetLang = typeof language === "string" ? language : "English";

    const prompt = `
You are an expert document assistant. You are chatting with the user about the document: "${document.fileName}".
Here is the document context:
---
${document.extractedText}
---

User Question: ${message}

CRITICAL INSTRUCTION: Provide the answer in the requested language: "${targetLang}". Keep it highly professional and context-based. If the answer cannot be found or inferred from the text, state that.
`;

    const reply = await runGeneralPrompt(prompt);

    res.json({
      success: true,
      reply: reply.trim(),
    });
  } catch (error: any) {
    console.error("Chat engine failure:", error);
    res.status(500).json({
      error: "Chat failed",
      message: error.message || "Failed to process chat request",
    });
  }
});

/**
 * POST /api/documents/compare
 * Compare Two Documents
 */
router.post("/compare", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { docId1, docId2, language } = req.body;

    if (!docId1 || !docId2) {
      res.status(400).json({ error: "Both docId1 and docId2 are required" });
      return;
    }

    const doc1 = await prisma.uploadedDocument.findUnique({ where: { id: docId1 } });
    const doc2 = await prisma.uploadedDocument.findUnique({ where: { id: docId2 } });

    if (!doc1 || !doc2) {
      res.status(404).json({ error: "One or both documents not found" });
      return;
    }

    const targetLang = typeof language === "string" ? language : "English";

    const prompt = `
You are an expert document analysis assistant. Compare the following two documents:

Document 1: "${doc1.fileName}"
---
${doc1.extractedText?.substring(0, 12000)}
---

Document 2: "${doc2.fileName}"
---
${doc2.extractedText?.substring(0, 12000)}
---

Create a beautiful multi-document comparison report in the target language: "${targetLang}".
Include:
1. Similarity Detection (overlap of core themes, objectives, or shared findings)
2. Difference Analysis (contrasting details, conclusions, methodologies, or numbers)
3. A summary comparison matrix (a brief table comparing the two files).

Write this output using beautiful structured Markdown syntax.
`;

    const report = await runGeneralPrompt(prompt);

    res.json({
      success: true,
      comparisonReport: report.trim(),
    });
  } catch (error: any) {
    console.error("Comparison engine failure:", error);
    res.status(500).json({
      error: "Comparison failed",
      message: error.message || "Failed to analyze document differences",
    });
  }
});

/**
 * GET /api/documents/tts
 * Streams text to speech voice as an MP3 file
 */
router.get("/tts", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const text = req.query.text as string;
    const langCode = req.query.lang as string || "en";

    if (!text || text.trim() === "") {
      res.status(400).json({ error: "Text is required for TTS synthesis" });
      return;
    }

    // Google Translate TTS URL
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(langCode)}&client=tw-ob&q=${encodeURIComponent(text.substring(0, 300))}`;

    const ttsRes = await fetch(ttsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!ttsRes.ok) {
      throw new Error(`Google TTS returned status: ${ttsRes.status}`);
    }

    const arrayBuffer = await ttsRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", "attachment; filename=document-audio-summary.mp3");
    res.send(buffer);
  } catch (error: any) {
    console.error("TTS Stream generation failure:", error);
    res.status(500).json({
      error: "TTS Generation Failed",
      message: error.message || "Failed to synthesize speech audio file",
    });
  }
});

export default router;
