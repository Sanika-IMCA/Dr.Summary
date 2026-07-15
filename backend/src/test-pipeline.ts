import fs from "fs";
import path from "path";

async function runTestPipeline() {
  console.log("=========================================");
  console.log("DocuSummary Integration Test Pipeline");
  console.log("=========================================\n");

  const pdfPath = path.join(__dirname, "../../test_dummy.pdf");
  if (!fs.existsSync(pdfPath)) {
    console.error(`Error: Sample PDF not found at ${pdfPath}`);
    process.exit(1);
  }

  const backendUrl = "http://localhost:5001";
  console.log(`Backend Server: ${backendUrl}`);
  console.log(`Loading test file: ${path.basename(pdfPath)} (${fs.statSync(pdfPath).size} bytes)\n`);

  try {
    // 1. Upload Document
    console.log("[1/3] Uploading file & extracting text...");
    
    // Construct multi-part form data manually using Blob
    const fileBuffer = fs.readFileSync(pdfPath);
    const fileBlob = new Blob([fileBuffer], { type: "application/pdf" });
    const formData = new FormData();
    formData.append("file", fileBlob, "test_dummy.pdf");

    const uploadRes = await fetch(`${backendUrl}/api/documents/upload`, {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) {
      const errData = await uploadRes.json();
      throw new Error(`Upload failed: ${JSON.stringify(errData)}`);
    }

    let docData = (await uploadRes.json()) as any;
    console.log("✔ Upload successful!");
    console.log(`  Document ID: ${docData.id}`);
    console.log(`  File Name:   ${docData.fileName}`);
    console.log(`  File Type:   ${docData.fileType}`);
    console.log(`  Status:      ${docData.status}`);

    // Wait/poll for background processing to complete
    let attempts = 0;
    while (docData.status === "PROCESSING" || docData.status === "PENDING") {
      attempts += 1;
      if (attempts > 15) {
        throw new Error("Polling timeout waiting for text extraction to complete");
      }
      console.log(`  [POLLING] Document status is "${docData.status}". Waiting 1s... (attempt ${attempts})`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const getRes = await fetch(`${backendUrl}/api/documents/${docData.id}`);
      if (getRes.ok) {
        docData = await getRes.json();
      }
    }

    console.log(`  Final Status: ${docData.status}`);
    console.log(`  Extracted Text Length: ${docData.extractedText?.length || 0} characters`);
    console.log(`  Extracted Text Snippet: "${docData.extractedText?.substring(0, 100).replace(/\n/g, " ")}..."\n`);

    // 2. Generate Summary
    console.log("[2/3] Triggering AI summarization pipeline...");
    const summarizeRes = await fetch(`${backendUrl}/api/documents/${docData.id}/summarize`, {
      method: "POST",
    });

    if (!summarizeRes.ok) {
      const errData = await summarizeRes.json();
      throw new Error(`Summarize failed: ${JSON.stringify(errData)}`);
    }

    const summaryResult = (await summarizeRes.json()) as any;
    console.log(`✔ Summarization completed! (Mode: ${summaryResult.isMock ? "Mock/Fallback" : "Gemini AI Live"})`);
    console.log(`  Short Summary:   "${summaryResult.document.summaries.find((s: any) => s.summaryType === "SHORT")?.summaryText}"`);
    console.log(`  Key Points:      ${summaryResult.document.keyPoints.length} points extracted.`);
    console.log(`  Suggestions:     ${summaryResult.document.suggestions.length} suggestions compiled.\n`);

    // 3. Fetch History List
    console.log("[3/3] Verifying database persistence & listing endpoint...");
    const listRes = await fetch(`${backendUrl}/api/documents`);
    if (!listRes.ok) {
      throw new Error("Failed to fetch documents history list");
    }

    const documentsList = (await listRes.json()) as any[];
    console.log(`✔ History listing retrieved. Total documents in DB: ${documentsList.length}`);
    const foundDoc = documentsList.find((d: any) => d.id === docData.id);
    if (foundDoc) {
      console.log(`  ✔ Verified: Newly created document "${foundDoc.fileName}" is persisted in the history list.`);
    } else {
      throw new Error("Created document not found in history list!");
    }

    console.log("\n=========================================");
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
    console.log("=========================================");
  } catch (error: any) {
    console.error("\n❌ TEST PIPELINE FAILED:");
    console.error(error.message || error);
    process.exit(1);
  }
}

runTestPipeline();
