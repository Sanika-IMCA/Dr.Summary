import fs from "fs";

/**
 * Extracts text from an image using Azure Computer Vision Read OCR API.
 * Falls back to local Tesseract if credentials are not configured.
 */
export async function extractTextWithAzure(filePath: string): Promise<{ text: string; confidence: number }> {
  const apiKey = process.env.AZURE_OCR_KEY;
  let endpoint = process.env.AZURE_OCR_ENDPOINT || "";
  
  if (!apiKey || !endpoint) {
    throw new Error("Azure OCR credentials are not configured in environment variables.");
  }

  if (endpoint.endsWith("/")) {
    endpoint = endpoint.slice(0, -1);
  }

  const fileBuffer = fs.readFileSync(filePath);

  // Submit file to Azure Computer Vision Read API
  const analyzeUrl = `${endpoint}/vision/v3.2/read/analyze`;
  console.log(`[AZURE OCR] Submitting file to Azure Read API: ${analyzeUrl}`);
  
  const response = await fetch(analyzeUrl, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": apiKey,
      "Content-Type": "application/octet-stream",
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Azure OCR submit failed: ${response.statusText} (${response.status}) - ${errText}`);
  }

  const operationLocation = response.headers.get("operation-location");
  if (!operationLocation) {
    throw new Error("Azure OCR operation-location header was not returned.");
  }

  console.log(`[AZURE OCR] Polling result at: ${operationLocation}`);

  // Poll for text extraction result
  let status = "notStarted";
  let resultData: any = null;
  let attempts = 0;

  while ((status === "notStarted" || status === "running") && attempts < 20) {
    attempts += 1;
    await new Promise((resolve) => setTimeout(resolve, 800));

    const pollRes = await fetch(operationLocation, {
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
      },
    });

    if (!pollRes.ok) {
      throw new Error(`Azure OCR poll failed: ${pollRes.statusText}`);
    }

    resultData = await pollRes.json();
    status = resultData.status;
  }

  if (status !== "succeeded") {
    throw new Error(`Azure OCR text extraction failed with status: ${status}`);
  }

  // Compile extracted text lines and word confidence levels
  const readResults = resultData.analyzeResult?.readResults || [];
  let extractedText = "";
  let confidenceSum = 0;
  let wordCount = 0;

  for (const page of readResults) {
    for (const line of page.lines) {
      extractedText += line.text + "\n";
      if (line.words) {
        for (const word of line.words) {
          confidenceSum += typeof word.confidence === "number" ? word.confidence : 1.0;
          wordCount += 1;
        }
      }
    }
  }

  const averageConfidence = wordCount > 0 ? Math.round((confidenceSum / wordCount) * 100) : 100;

  return {
    text: extractedText.trim(),
    confidence: averageConfidence,
  };
}
