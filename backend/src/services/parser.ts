import fs from "fs";
import pdfParse from "pdf-parse";

/**
 * Extracts raw text from a PDF document.
 * @param filePath The local file path to the PDF document.
 * @returns Promise resolving to the extracted text.
 */
export interface PDFParseResult {
  text: string;
  pageCount: number;
}

export async function extractTextFromPDF(filePath: string): Promise<PDFParseResult> {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    const dataBuffer = fs.readFileSync(filePath);
    
    // Parse the PDF
    const data = await pdfParse(dataBuffer);
    
    const text = data.text ? data.text.trim() : "";
    const pageCount = typeof data.numpages === "number" ? data.numpages : 1;
    
    return { text, pageCount };
  } catch (error: any) {
    console.error("PDF Parsing Error:", error);
    throw new Error(`Failed to parse PDF: ${error.message || error}`);
  }
}
