import Tesseract from "tesseract.js";
import fs from "fs";

/**
 * Extracts text from an image (PNG, JPEG, etc.) using Tesseract OCR.
 * @param filePath The local file path to the image.
 * @param onProgress Callback function to track OCR progress.
 * @returns Promise resolving to the extracted text.
 */
export interface OCRResult {
  text: string;
  confidence: number;
}

export async function extractTextFromImage(
  filePath: string,
  language = "eng",
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    console.log(`Starting OCR parsing on file: ${filePath} using language: ${language}`);

    const result = await Tesseract.recognize(
      filePath,
      language,
      {
        logger: (m) => {
          if (m.status === "recognizing text" && onProgress) {
            onProgress(Math.round(m.progress * 100));
          }
        },
      }
    );

    const text = result.data.text ? result.data.text.trim() : "";
    const confidence = typeof result.data.confidence === "number" ? result.data.confidence : 100;
    
    console.log(`OCR parsing completed. Extracted ${text.length} characters with confidence ${confidence}%.`);
    return { text, confidence };
  } catch (error: any) {
    console.error("OCR Extraction Error:", error);
    throw new Error(`Failed to extract text using OCR: ${error.message || error}`);
  }
}
