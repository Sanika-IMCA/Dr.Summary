import React, { useState, useRef } from "react";
import axios from "axios";
import { UploadCloud, FileText, FileImage, Globe, CheckCircle } from "lucide-react";

interface DocumentUploadProps {
  onUploadSuccess: (doc: any) => void;
  onUploadStart: () => void;
  onUploadError: (err: string) => void;
}

const OCR_LANGUAGES = [
  { code: "eng", label: "English" },
  { code: "spa", label: "Spanish (Español)" },
  { code: "fra", label: "French (Français)" },
  { code: "deu", label: "German (Deutsch)" },
  { code: "chi_sim", label: "Chinese Simplified (简体中文)" },
];

export default function DocumentUpload({
  onUploadSuccess,
  onUploadStart,
  onUploadError,
}: DocumentUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successMsg, setSuccessMsg] = useState("");
  const [ocrLanguage, setOcrLanguage] = useState("eng");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedExtensions = [".pdf", ".png", ".jpg", ".jpeg"];
  const maxBytes = 25 * 1024 * 1024; // 25 MB

  const validateFile = (file: File): boolean => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      onUploadError("Unsupported file type. Please upload a PDF, PNG, JPG, or JPEG file.");
      return false;
    }
    if (file.size > maxBytes) {
      onUploadError("File too large. Maximum size allowed is 25 MB.");
      return false;
    }
    return true;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    if (!validateFile(file)) return;

    setUploading(true);
    setProgress(0);
    setSuccessMsg("");
    onUploadStart();

    // Use FormData for file upload
    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", ocrLanguage);

    try {
      // Perform upload using Axios to track actual progress
      const response = await axios.post("/api/documents/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const uploadPercentage = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            // Reserve 0-80% for file upload progress
            setProgress(Math.round(uploadPercentage * 0.8));
          }
        },
      });

      let doc = response.data;

      // Start background polling if the document status is PROCESSING
      if (doc.status === "PROCESSING") {
        setProgress(85);
        let attempts = 0;
        const maxAttempts = 120; // Poll for up to 2 minutes
        
        const pollStatus = async (): Promise<any> => {
          return new Promise((resolve, reject) => {
            const interval = setInterval(async () => {
              attempts += 1;
              
              // Increment progress smoothly towards 98%
              setProgress((prev) => Math.min(98, prev + 1));
              
              try {
                const pollRes = await axios.get(`/api/documents/${doc.id}`);
                const polledDoc = pollRes.data;
                
                if (polledDoc.status === "COMPLETED") {
                  clearInterval(interval);
                  resolve(polledDoc);
                } else if (polledDoc.status === "FAILED") {
                  clearInterval(interval);
                  reject(new Error(polledDoc.extractedText || "Background text extraction failed."));
                }
              } catch (err) {
                // Ignore transient network errors during polling
                console.warn("Polling status error:", err);
              }
              
              if (attempts >= maxAttempts) {
                clearInterval(interval);
                reject(new Error("Document parsing timed out. Please try again."));
              }
            }, 1000); // Poll every 1 second
          });
        };
        
        doc = await pollStatus();
      }

      setProgress(100);
      setSuccessMsg(`"${file.name}" uploaded and parsed successfully!`);
      setTimeout(() => {
        onUploadSuccess(doc);
        setUploading(false);
        setProgress(0);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || "An error occurred during upload.";
      onUploadError(errorMsg);
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* OCR Language Dropdown */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl gap-3">
        <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-350">
          <Globe className="w-4 h-4 text-brand-500" />
          <span className="text-xs font-bold uppercase tracking-wider">OCR Language Support</span>
        </div>
        <select
          id="ocr-language-select"
          disabled={uploading}
          value={ocrLanguage}
          onChange={(e) => setOcrLanguage(e.target.value)}
          className="text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/50 cursor-pointer"
        >
          {OCR_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {/* Upload Drop Zone */}
      <div
        id="drop-zone"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center w-full h-72 border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300 ${
          isDragActive
            ? "border-brand-500 bg-brand-50/40 dark:bg-brand-950/20 scale-[1.01] shadow-lg shadow-brand-500/10"
            : "border-slate-300 dark:border-slate-800 hover:border-brand-400 dark:hover:border-brand-500/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/20"
        } ${uploading ? "pointer-events-none opacity-80" : ""}`}
      >
        <input
          id="file-browse-input"
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />

        <div className="flex flex-col items-center justify-center pt-5 pb-6 px-6 text-center">
          <div className={`relative mb-4 p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 transition-transform duration-300 ${isDragActive ? "scale-110" : ""}`}>
            <UploadCloud className="w-10 h-10 animate-float" />
          </div>

          <p className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-200">
            <span className="text-brand-600 dark:text-brand-400 hover:underline">Click to upload</span> or drag and drop
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            PDF, PNG, JPG or JPEG (Max. 25MB)
          </p>

          <div className="flex items-center space-x-6 text-xs text-slate-400 dark:text-slate-500">
            <div className="flex items-center">
              <FileText className="w-4 h-4 mr-1.5 text-indigo-400" /> PDF text extractor
            </div>
            <div className="flex items-center">
              <FileImage className="w-4 h-4 mr-1.5 text-emerald-400" /> Scanned OCR support
            </div>
          </div>
        </div>

        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-950/95 rounded-3xl px-12">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mb-3 relative shadow-inner">
              <div
                className="bg-gradient-to-r from-brand-500 to-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {progress < 80 
                ? `Uploading file... (${progress}%)` 
                : progress < 100 
                  ? "Extracting document contents (OCR / PDF processing)..." 
                  : "Finalizing parse results..."}
            </p>
          </div>
        )}

        {successMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-slate-950 rounded-3xl px-12 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mb-3 animate-bounce" />
            <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
              {successMsg}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
