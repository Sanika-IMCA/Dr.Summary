import React, { useState, useEffect } from "react";
import {
  Sparkles,
  FileText,
  Bookmark,
  CheckSquare,
  AlertCircle,
  HelpCircle,
  Clock,
  Eye,
  FileDown,
  Layout,
  RefreshCw,
  Trash2,
  Plus,
  Compass,
  Calendar,
  User,
  Hash,
  Square,
  CheckSquare as CheckSquareIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Printer,
  Copy,
  Share2,
} from "lucide-react";

interface ResultsViewProps {
  document: any;
  onSummarize: (lang?: string) => Promise<void>;
  summarizing: boolean;
  onDelete: (id: string) => Promise<void>;
  onUploadNew: () => void;
}

export default function ResultsView({
  document,
  onSummarize,
  summarizing,
  onDelete,
  onUploadNew,
}: ResultsViewProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "keypoints" | "suggestions" | "chat" | "raw">("summary");
  const [summaryLength, setSummaryLength] = useState<"SHORT" | "MEDIUM" | "LONG" | "EXECUTIVE" | "BULLET" | "PARAGRAPH" | "CUSTOM">("MEDIUM");
  
  // Target language selector state
  const [language, setLanguage] = useState(document.language || "English");

  // Voice synthesis states
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);

  // Ephemeral chat states
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([]);
  const [chatInput, setChatInput] = useState("");

  // Custom length summarization states
  const [customLength, setCustomLength] = useState(250);
  const [customSummaryText, setCustomSummaryText] = useState("");
  const [generatingCustom, setGeneratingCustom] = useState(false);
  const [customError, setCustomError] = useState("");

  // Action checklist states
  const [checkedActions, setCheckedActions] = useState<Record<string, boolean>>({});

  // Search and highlighting states
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Copy and Share visual confirmation states
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  // Reset states when loaded document changes
  useEffect(() => {
    setCustomSummaryText("");
    setCustomError("");
    setCheckedActions({});
    setSearchQuery("");
    setCurrentMatchIndex(0);
    setCopied(false);
    setShared(false);
    setIsPlayingTTS(false);
    window.speechSynthesis.cancel();
    setChatMessages([]);
    setChatInput("");
    setLanguage(document.language || "English");
  }, [document.id, document.language]);

  const hasSummaries = document.summaries && document.summaries.length > 0;

  const getSummaryText = () => {
    if (summaryLength === "CUSTOM") {
      const existingCustom = document.summaries?.find((s: any) => s.summaryType === "CUSTOM")?.summaryText;
      return customSummaryText || existingCustom || "";
    }
    return document.summaries?.find((s: any) => s.summaryType === summaryLength)?.summaryText;
  };

  const currentSummary = getSummaryText();

  // Filter key points by categories
  const keyPoints = document.keyPoints || [];
  const mainIdeas = keyPoints.filter((kp: any) => kp.category === "MAIN_IDEA" || kp.category === "TOPIC");
  const actionItems = keyPoints.filter((kp: any) => kp.category === "ACTION_ITEM");
  const facts = keyPoints.filter((kp: any) => kp.category === "FACT" || kp.category === "FINDING");
  const dates = keyPoints.filter((kp: any) => kp.category === "DATE");
  const names = keyPoints.filter((kp: any) => kp.category === "NAME" || kp.category === "ENTITY");
  const numbers = keyPoints.filter((kp: any) => kp.category === "NUMBER");
  const generalPoints = keyPoints.filter((kp: any) => kp.category === "KEY_POINT" || (!kp.category && !["MAIN_IDEA", "ACTION_ITEM", "FACT", "DATE", "NAME", "NUMBER"].includes(kp.category)));

  // Filter suggestions by category
  const suggestions = document.suggestions || [];
  const grammar = suggestions.filter((s: any) => s.suggestionType === "GRAMMAR");
  const readability = suggestions.filter((s: any) => s.suggestionType === "READABILITY");
  const structure = suggestions.filter((s: any) => s.suggestionType === "STRUCTURE" || s.suggestionType === "FORMATTING");
  const missingInfo = suggestions.filter((s: any) => s.suggestionType === "MISSING_INFO");
  const contentOptimization = suggestions.filter((s: any) => s.suggestionType === "CONTENT_OPTIMIZATION");
  const professionalWriting = suggestions.filter((s: any) => s.suggestionType === "PROFESSIONAL_WRITING");

  // Parse topics and keywords

  const rawText = document.extractedText || "";

  // Helper to find all occurrences of search query
  const getMatches = (text: string, query: string) => {
    if (!query.trim()) return [];
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(escapedQuery, "gi");
    const matchesList = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matchesList.push({
        start: match.index,
        end: match.index + query.length,
      });
    }
    return matchesList;
  };

  const matches = getMatches(rawText, searchQuery);
  const totalMatches = matches.length;

  // Scroll active search match into view inside container
  useEffect(() => {
    if (searchQuery.trim() && totalMatches > 0 && activeTab === "raw") {
      const timer = setTimeout(() => {
        const element = window.document.getElementById(`search-match-${currentMatchIndex}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentMatchIndex, searchQuery, activeTab]);

  // Extract quick navigation sections from raw text
  const getSections = () => {
    if (!rawText) return [];
    const lines = rawText.split("\n");
    const sectionsList: Array<{ title: string; lineIndex: number; textSnippet: string }> = [];
    
    lines.forEach((line: string, idx: number) => {
      const trimmed = line.trim();
      if (
        trimmed.startsWith("###") ||
        trimmed.startsWith("##") ||
        (trimmed.length > 3 && trimmed.length < 40 && /^[A-Z0-9\s\-\:\.\,]+$/.test(trimmed)) ||
        (trimmed.length > 3 && trimmed.length < 30 && trimmed.endsWith(":"))
      ) {
        sectionsList.push({
          title: trimmed.replace(/^#+\s*/, ""),
          lineIndex: idx,
          textSnippet: trimmed,
        });
      }
    });

    if (sectionsList.length === 0) {
      const paragraphs = rawText.split("\n\n");
      paragraphs.forEach((p: string) => {
        const trimmed = p.trim();
        if (trimmed.length > 5) {
          const firstLine = trimmed.split("\n")[0];
          sectionsList.push({
            title: firstLine.substring(0, 30) + (firstLine.length > 30 ? "..." : ""),
            lineIndex: rawText.split("\n").findIndex((line: string) => line.includes(firstLine)),
            textSnippet: firstLine,
          });
        }
      });
    }

    return sectionsList.slice(0, 10);
  };

  const sections = getSections();

  const renderHighlightedText = () => {
    if (!searchQuery.trim() || totalMatches === 0) {
      return <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{rawText}</pre>;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    matches.forEach((match, idx) => {
      if (match.start > lastIndex) {
        elements.push(rawText.substring(lastIndex, match.start));
      }

      const isCurrent = idx === currentMatchIndex;
      elements.push(
        <mark
          key={idx}
          id={`search-match-${idx}`}
          className={`transition-colors duration-200 px-0.5 rounded ${
            isCurrent
               ? "bg-amber-400 text-slate-950 font-bold ring-2 ring-amber-500 ring-offset-1 dark:ring-offset-slate-900"
               : "bg-yellow-200 dark:bg-yellow-900/40 text-slate-900 dark:text-yellow-100"
          }`}
        >
          {rawText.substring(match.start, match.end)}
        </mark>
      );
      lastIndex = match.end;
    });

    if (lastIndex < rawText.length) {
      elements.push(rawText.substring(lastIndex));
    }

    return (
      <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
        {elements}
      </pre>
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const downloadText = (filename: string, text: string) => {
    const element = window.document.createElement("a");
    const file = new Blob([text], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    window.document.body.appendChild(element);
    element.click();
    window.document.body.removeChild(element);
  };

  const handleCopyToClipboard = async () => {
    if (!currentSummary) return;
    try {
      await navigator.clipboard.writeText(currentSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  const handleDownloadPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const summaryText = currentSummary || "No summary content.";
    const title = `${document.fileName} - AI Summary (${summaryLength})`;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #334155;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 {
              font-size: 24px;
              color: #1e293b;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .metadata {
              font-size: 12px;
              color: #64748b;
              margin-bottom: 30px;
              background: #f8fafc;
              padding: 12px 16px;
              border-radius: 8px;
            }
            .content {
              font-size: 14px;
              white-space: pre-line;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>AI Summary Analysis</h1>
          <div class="metadata">
            <strong>Document:</strong> ${document.fileName}<br/>
            <strong>Length Mode:</strong> ${summaryLength}<br/>
            <strong>Exported:</strong> ${new Date().toLocaleString()}<br/>
            <strong>Language:</strong> ${document.language || "English"}<br/>
            <strong>Category:</strong> ${document.category || "General Text"}<br/>
          </div>
          <div class="content">${summaryText.replace(/\n/g, "<br/>")}</div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShareSummary = async () => {
    if (!currentSummary) return;
    const shareTitle = `${document.fileName} - AI Summary`;
    const shareText = `Check out this AI-generated summary of "${document.fileName}" (${summaryLength} length):\n\n${currentSummary}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: window.location.href
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch (err) {
        console.error("Web Share failed, copying text as fallback...", err);
        await navigator.clipboard.writeText(shareText);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  // Live Speech Synthesis Summary Voice
  const handlePlayTTS = () => {
    if (isPlayingTTS) {
      window.speechSynthesis.cancel();
      setIsPlayingTTS(false);
    } else {
      if (!currentSummary) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentSummary.replace(/[#*`_-]/g, ""));
      
      if (document.language?.toLowerCase() === "hindi") {
        utterance.lang = "hi-IN";
      } else if (document.language?.toLowerCase() === "marathi") {
        utterance.lang = "mr-IN";
      } else {
        utterance.lang = "en-US";
      }
      
      utterance.onend = () => setIsPlayingTTS(false);
      utterance.onerror = () => setIsPlayingTTS(false);
      window.speechSynthesis.speak(utterance);
      setIsPlayingTTS(true);
    }
  };

  // Download Audio MP3
  const handleDownloadAudio = () => {
    if (!currentSummary) return;
    const cleanText = currentSummary.substring(0, 280).replace(/[#*`_-]/g, "");
    const langCode = document.language?.toLowerCase() === "hindi" ? "hi" : document.language?.toLowerCase() === "marathi" ? "mr" : "en";
    window.open(`/api/documents/tts?text=${encodeURIComponent(cleanText)}&lang=${langCode}`, "_blank");
  };

  const handleExportInsights = () => {
    if (keyPoints.length === 0) return;
    let markdownContent = `# Key Insights: ${document.fileName}\n\n`;
    markdownContent += `*Analyzed on: ${new Date().toLocaleDateString()}*\n\n`;
    markdownContent += `## Central Ideas & Topics\n`;
    mainIdeas.forEach((kp: any) => { markdownContent += `- ${kp.point}\n`; });
    markdownContent += `\n## Action Items & Recommendation Checklist\n`;
    actionItems.forEach((kp: any) => { markdownContent += `- [ ] ${kp.point}\n`; });
    markdownContent += `\n## Key Facts\n`;
    facts.forEach((kp: any) => { markdownContent += `- ${kp.point}\n`; });
    markdownContent += `\n## Important Timelines & Dates\n`;
    dates.forEach((kp: any) => { markdownContent += `- ${kp.point}\n`; });
    
    downloadText(
      `${document.fileName.split(".")[0]}-key-insights.md`,
      markdownContent
    );
  };

  const getLanguageLabel = (code: string | null) => {
    if (!code) return "English";
    const lang: Record<string, string> = {
      English: "English",
      Hindi: "Hindi (हिंदी)",
      Marathi: "Marathi (मराठी)",
      Spanish: "Spanish",
      French: "French",
      German: "German",
    };
    return lang[code] || code;
  };

  const filename = document.filePath ? document.filePath.split(/[\\/]/).pop() : "";
  const previewUrl = `/uploads/${filename}`;
  const isImage = document.fileType && document.fileType.startsWith("image/");

  const handleGenerateCustomSummary = async () => {
    setGeneratingCustom(true);
    setCustomError("");
    try {
      const res = await fetch(`/api/documents/${document.id}/summarize/custom`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetWords: customLength, language: language }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to generate custom summary");
      }
      setCustomSummaryText(data.summary.summaryText);
    } catch (err: any) {
      setCustomError(err.message || "Error generating custom summary");
    } finally {
      setGeneratingCustom(false);
    }
  };

  const toggleActionItem = (id: string) => {
    setCheckedActions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");

    try {
      const res = await fetch(`/api/documents/${document.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, language: language }),
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages((prev) => [...prev, { sender: "ai", text: data.reply }]);
      } else {
        throw new Error(data.message || "Chat failed");
      }
    } catch (err: any) {
      setChatMessages((prev) => [...prev, { sender: "ai", text: `Error: ${err.message || "Failed to contact assistant."}` }]);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Document Header Metadata */}
      <div className="glass p-6 rounded-3xl shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-2xl">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
              {document.fileName}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span className="flex items-center">
                <Layout className="w-3.5 h-3.5 mr-1" /> {document.fileType?.split("/")[1]?.toUpperCase() || "Document"}
              </span>
              <span>•</span>
              <span>{formatBytes(document.fileSize)}</span>
              <span>•</span>
              <span className="flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" /> {new Date(document.createdAt).toLocaleDateString()}
              </span>
              {document.pageCount && (
                <>
                  <span>•</span>
                  <span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold">
                    {document.pageCount} {document.pageCount === 1 ? "page" : "pages"}
                  </span>
                </>
              )}
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold">
                Language: {getLanguageLabel(document.language)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Multi-Language Selector Dropdown */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-xl px-2.5 py-1">
            <span className="text-[10px] font-extrabold text-slate-405 dark:text-slate-500 uppercase tracking-wider">Output Language</span>
            <select
              value={language}
              onChange={(e) => {
                const newLang = e.target.value;
                setLanguage(newLang);
                onSummarize(newLang);
              }}
              className="text-xs font-bold bg-transparent border-0 focus:ring-0 focus:outline-none cursor-pointer py-1 text-slate-700 dark:text-slate-300"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi (हिंदी)</option>
              <option value="Marathi">Marathi (मराठी)</option>
              <option value="Spanish">Spanish (Español)</option>
              <option value="French">French (Français)</option>
              <option value="German">German (Deutsch)</option>
            </select>
          </div>

          <button
            onClick={onUploadNew}
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 dark:text-slate-350 bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-xl px-3 py-2 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload New</span>
          </button>

          <button
            onClick={() => onDelete(document.id)}
            className="flex items-center space-x-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/30 rounded-xl px-3 py-2 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          {!hasSummaries ? (
            <button
              id="generate-summary-btn"
              onClick={() => onSummarize(language)}
              disabled={summarizing}
              className="btn-glow-primary px-5 py-2 flex items-center justify-center space-x-2 text-xs font-bold"
            >
              {summarizing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate AI Summary</span>
                </>
              )}
            </button>
          ) : (
            <button
              id="re-generate-summary-btn"
              onClick={() => onSummarize(language)}
              disabled={summarizing}
              className="btn-glow-secondary px-4 py-2 flex items-center justify-center space-x-2 text-xs font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${summarizing ? "animate-spin" : ""}`} />
              <span>Regenerate Summary</span>
            </button>
          )}
        </div>
      </div>

      {/* Document Statistics Dashboard */}
      {hasSummaries && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 select-none">
          <div className="p-4 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Total Pages</span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1 line-clamp-1">
              {document.pageCount ? `${document.pageCount} ${document.pageCount === 1 ? 'page' : 'pages'}` : "1 page"}
            </span>
          </div>

          <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/15 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Words</span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1 line-clamp-1">
              {document.wordCount ? `${document.wordCount} words` : "150 words"}
            </span>
          </div>

          <div className="p-4 bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/15 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Summary Reduction</span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1 line-clamp-1">
              {document.extractedText && currentSummary 
                ? `${Math.max(0, Math.round(100 - (currentSummary.length / document.extractedText.length) * 100))}% reduction`
                : "75% reduction"
              }
            </span>
          </div>

          <div className="p-4 bg-sky-500/5 dark:bg-sky-500/10 border border-sky-500/15 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-bold text-sky-550 dark:text-sky-400 uppercase tracking-wider">Est. Reading Time</span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1 line-clamp-1">
              {document.readingTime ? `${document.readingTime} min read` : "1 min read"}
            </span>
          </div>

          <div className="p-4 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/15 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-455 uppercase tracking-wider">Processing Time</span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1 line-clamp-1">
              {document.processingTime ? `${document.processingTime} sec` : "0.55 sec"}
            </span>
          </div>

          <div className="p-4 bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/15 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-bold text-teal-650 dark:text-teal-400 uppercase tracking-wider">OCR Accuracy</span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1 line-clamp-1">
              {document.ocrConfidence !== null && document.ocrConfidence !== undefined
                ? `${document.ocrConfidence}% score`
                : "Native Text"
              }
            </span>
          </div>
        </div>
      )}

      {/* OCR Accuracy Gauge (if applicable) */}
      {document.ocrConfidence !== null && document.ocrConfidence !== undefined && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/30 rounded-3xl gap-3">
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">OCR Confidence Score</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`text-sm font-black ${
              document.ocrConfidence >= 90 ? "text-emerald-500" : document.ocrConfidence >= 75 ? "text-amber-500" : "text-rose-500"
            }`}>{document.ocrConfidence}% Accuracy</span>
            <div className="w-32 h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  document.ocrConfidence >= 90 ? "bg-emerald-500" : document.ocrConfidence >= 75 ? "bg-amber-500" : "bg-rose-500"
                }`}
                style={{ width: `${document.ocrConfidence}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {!hasSummaries ? (
        <div className="glass p-12 rounded-3xl text-center flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-full text-slate-400 dark:text-slate-650">
            <Sparkles className="w-12 h-12" />
          </div>
          <div className="max-w-md">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Summarization Ready
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              The document text has been extracted successfully. Click the button above to generate structured summaries, key point highlights, and improvement suggestions in your target language.
            </p>
          </div>
          <button
            onClick={() => onSummarize(language)}
            disabled={summarizing}
            className="btn-glow-primary px-6 py-3 flex items-center justify-center space-x-2 font-medium"
          >
            {summarizing ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            <span>{summarizing ? "Analyzing text..." : "Analyze Document Now"}</span>
          </button>
        </div>
      ) : (
        // Side-by-Side Split Workspace
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
          {/* Left Column: Source Document Preview */}
          <div className="glass p-5 rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800/30 flex flex-col min-h-[500px] h-[650px] xl:h-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-850 pb-3">
              <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center">
                <FileText className="w-4 h-4 mr-1.5" /> Document Preview
              </h3>
              <span className="text-xs text-slate-400 truncate max-w-[200px]" title={document.fileName}>
                {document.fileName}
              </span>
            </div>
            
            <div className="flex-grow bg-slate-50 dark:bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-850 relative">
              {isImage ? (
                <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                  <img
                    src={previewUrl}
                    alt="Uploaded source document preview"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-md hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <iframe
                  src={`${previewUrl}#toolbar=0&navpanes=0`}
                  title="Document Preview Panel"
                  className="w-full h-full border-0 rounded-2xl bg-white"
                />
              )}
            </div>
          </div>

          {/* Right Column: AI Insights Workbench */}
          <div className="flex flex-col gap-5">
            <div className="flex p-1 bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/10 rounded-2xl space-x-1 select-none overflow-x-auto">
              {(["summary", "keypoints", "suggestions", "chat", "raw"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-grow flex items-center justify-center space-x-2 py-3 px-2.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                    activeTab === tab
                      ? "bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-slate-800/30 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  {tab === "summary" && <Sparkles className="w-3.5 h-3.5" />}
                  {tab === "keypoints" && <Bookmark className="w-3.5 h-3.5" />}
                  {tab === "suggestions" && <CheckSquare className="w-3.5 h-3.5" />}
                  {tab === "chat" && <HelpCircle className="w-3.5 h-3.5" />}
                  {tab === "raw" && <Eye className="w-3.5 h-3.5" />}
                  <span className="capitalize text-[10px]">
                    {tab === "keypoints" ? "Extracted Insights" : tab === "suggestions" ? "Suggestions" : tab}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex-grow">
              {activeTab === "summary" && (
                <div className="glass p-6 md:p-8 rounded-3xl shadow-sm h-full flex flex-col border border-slate-200/50 dark:border-slate-800/30">
                  <div className="border-b border-slate-150 dark:border-slate-800 pb-4 mb-5 space-y-4">
                    <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/50 dark:bg-slate-950/80 border border-slate-200/10 rounded-xl w-fit">
                      {(["SHORT", "MEDIUM", "LONG", "EXECUTIVE", "BULLET", "PARAGRAPH", "CUSTOM"] as const).map((len) => (
                        <button
                          key={len}
                          onClick={() => setSummaryLength(len)}
                          className={`px-3 py-1.5 text-[10px] font-extrabold uppercase rounded-lg transition-all ${
                            summaryLength === len
                              ? "bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm"
                              : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                          }`}
                        >
                          {len === "SHORT" ? "Short" : len === "MEDIUM" ? "Medium" : len === "LONG" ? "Long" : len === "BULLET" ? "Bullets" : len.toLowerCase()}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {summaryLength === "SHORT" && "2-3 Sentence Overview"}
                        {summaryLength === "MEDIUM" && "General Subject Summary"}
                        {summaryLength === "LONG" && "Detailed Structured Review"}
                        {summaryLength === "EXECUTIVE" && "Corporate Briefing format"}
                        {summaryLength === "BULLET" && "Core Takeaway checklist"}
                        {summaryLength === "PARAGRAPH" && "Narrative text style"}
                        {summaryLength === "CUSTOM" && "Target word-length summary"}
                      </span>

                      <div className="flex items-center space-x-3.5 flex-wrap gap-y-2 select-none">
                        <button
                          onClick={() =>
                            downloadText(
                              `${document.fileName.split(".")[0]}-${summaryLength.toLowerCase()}-summary.txt`,
                              currentSummary || ""
                            )
                          }
                          className="flex items-center space-x-1 text-xs font-bold text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400 transition-colors"
                          title="Download summary as text file"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>TXT</span>
                        </button>

                        <button
                          onClick={handleDownloadPDF}
                          className="flex items-center space-x-1 text-xs font-bold text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400 transition-colors"
                          title="Print or Save summary as PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>

                        <button
                          onClick={handleCopyToClipboard}
                          className="flex items-center space-x-1 text-xs font-bold text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400 transition-colors"
                          title="Copy summary text to clipboard"
                        >
                          {copied ? (
                            <CheckSquareIcon className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span className={copied ? "text-emerald-500" : ""}>{copied ? "Copied!" : "Copy"}</span>
                        </button>

                        <button
                          onClick={handleShareSummary}
                          className="flex items-center space-x-1 text-xs font-bold text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400 transition-colors"
                          title="Share summary or copy shareable link"
                        >
                          {shared ? (
                            <CheckSquareIcon className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                          <span className={shared ? "text-emerald-500" : ""}>{shared ? "Shared!" : "Share"}</span>
                        </button>

                        {/* 5. Play Live Audio (TTS) */}
                        <button
                          onClick={handlePlayTTS}
                          className="flex items-center space-x-1 text-xs font-bold text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400 transition-colors border-l border-slate-200 dark:border-slate-800 pl-3"
                          title="Play summary text out loud"
                        >
                          {isPlayingTTS ? (
                            <span className="flex space-x-0.5 items-center mr-1">
                              <span className="w-1 h-3.5 bg-brand-500 animate-pulse rounded-full"></span>
                              <span className="w-1 h-2 bg-brand-500 animate-pulse rounded-full delay-75"></span>
                              <span className="w-1 h-3 bg-brand-500 animate-pulse rounded-full delay-150"></span>
                            </span>
                          ) : (
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18.75V5.25L7.75 9.5H4.5v5h3.25L12 18.75z" />
                            </svg>
                          )}
                          <span>{isPlayingTTS ? "Pause" : "Listen"}</span>
                        </button>

                        {/* 6. Download Voice Summary MP3 */}
                        <button
                          onClick={handleDownloadAudio}
                          className="flex items-center space-x-1 text-xs font-bold text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400 transition-colors"
                          title="Download summary audio file as MP3"
                        >
                          <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span>Audio</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {summaryLength === "CUSTOM" && (
                    <div className="mb-5 p-5 bg-brand-500/5 dark:bg-brand-500/10 rounded-2xl border border-brand-500/10 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                            Custom Length Summarizer
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            Set target word count and prompt the model to adapt.
                          </p>
                        </div>
                        <div className="text-sm font-black text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1">
                          {customLength} Words
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <input
                          type="range"
                          min="50"
                          max="1000"
                          step="50"
                          disabled={generatingCustom}
                          value={customLength}
                          onChange={(e) => setCustomLength(parseInt(e.target.value))}
                          className="flex-grow accent-brand-500 cursor-pointer disabled:opacity-50 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none"
                        />
                        <button
                          onClick={handleGenerateCustomSummary}
                          disabled={generatingCustom}
                          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-brand-500/20 flex items-center space-x-1.5"
                        >
                          {generatingCustom ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Generate</span>
                            </>
                          )}
                        </button>
                      </div>
                      {customError && (
                        <div className="text-xs text-rose-500 font-semibold">{customError}</div>
                      )}
                    </div>
                  )}

                  <div className="flex-grow overflow-y-auto max-h-[400px] pr-1">
                    {currentSummary ? (
                      <div className="summary-content whitespace-pre-line text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                        {currentSummary.includes("###") || currentSummary.includes("**") || currentSummary.startsWith("- ") ? (
                          currentSummary.split("\n").map((line: string, idx: number) => {
                            if (line.startsWith("###")) {
                              return (
                                <h3 key={idx} className="text-sm font-extrabold uppercase tracking-wide mt-4 mb-2 text-slate-850 dark:text-slate-100 border-l-4 border-brand-500 pl-2">
                                  {line.replace("###", "").trim()}
                                </h3>
                              );
                            } else if (line.startsWith("##")) {
                              return (
                                <h2 key={idx} className="text-base font-black mt-4 mb-2 text-brand-600 dark:text-brand-400">
                                  {line.replace("##", "").trim()}
                                </h2>
                              );
                            } else if (line.startsWith("1.") || line.startsWith("2.") || line.startsWith("3.")) {
                              return (
                                <p key={idx} className="ml-4 font-semibold text-slate-700 dark:text-slate-200 my-1">
                                  {line}
                                </p>
                              );
                            } else if (line.startsWith("-") || line.startsWith("*")) {
                              return (
                                <li key={idx} className="ml-6 list-disc text-slate-650 dark:text-slate-400 my-0.5">
                                  {line.replace(/^[-*]\s*/, "")}
                                </li>
                              );
                            }
                            return (
                              <p key={idx} className="mb-3 leading-relaxed text-xs">
                                {line}
                              </p>
                            );
                          })
                        ) : (
                          <p className="leading-relaxed text-xs">{currentSummary}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-xs">
                        {summaryLength === "CUSTOM" 
                          ? "No custom summary generated yet. Click the button above to generate one."
                          : "No summary available for this length."}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "keypoints" && (
                <div className="glass p-6 md:p-8 rounded-3xl shadow-sm h-full border border-slate-200/50 dark:border-slate-800/30 overflow-y-auto max-h-[500px] space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-850 pb-3">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-150">
                      Extracted Key Insights
                    </h3>
                    <button
                      onClick={handleExportInsights}
                      disabled={keyPoints.length === 0}
                      className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Export Insights</span>
                    </button>
                  </div>

                  <div className="space-y-5">
                    {mainIdeas.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-extrabold text-indigo-500 uppercase tracking-wider flex items-center select-none">
                          <Compass className="w-4 h-4 mr-1.5" /> Central Ideas & Topics
                        </h4>
                        <div className="bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 p-4 rounded-2xl space-y-1.5">
                          {mainIdeas.map((kp: any, idx: number) => (
                            <p key={idx} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                              • {kp.point}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {actionItems.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center select-none">
                          <CheckSquare className="w-4 h-4 mr-1.5" /> Action Items & Next Steps
                        </h4>
                        <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 p-4 rounded-2xl space-y-2.5">
                          {actionItems.map((kp: any, idx: number) => {
                            const isChecked = !!checkedActions[kp.point];
                            return (
                              <div
                                key={idx}
                                onClick={() => toggleActionItem(kp.point)}
                                className="flex items-start space-x-2.5 cursor-pointer select-none group"
                              >
                                <button className="mt-0.5 flex-shrink-0 text-slate-400 group-hover:text-emerald-500 transition-colors">
                                  {isChecked ? (
                                    <CheckSquareIcon className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-350 dark:text-slate-700" />
                                  )}
                                </button>
                                <span className={`text-xs leading-relaxed font-bold transition-all ${
                                  isChecked ? "line-through text-slate-400 dark:text-slate-600" : "text-slate-700 dark:text-slate-300"
                                }`}>
                                  {kp.point}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {facts.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-extrabold text-blue-500 uppercase tracking-wider flex items-center select-none">
                          <Sparkles className="w-4 h-4 mr-1.5" /> Important Facts & Discoveries
                        </h4>
                        <div className="bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 p-4 rounded-2xl space-y-1.5">
                          {facts.map((kp: any, idx: number) => (
                            <p key={idx} className="text-xs text-slate-750 dark:text-slate-300 leading-relaxed font-semibold">
                              • {kp.point}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {dates.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center select-none">
                          <Calendar className="w-4 h-4 mr-1.5" /> Important Dates & Timelines
                        </h4>
                        <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 p-4 rounded-2xl space-y-1.5">
                          {dates.map((kp: any, idx: number) => (
                            <p key={idx} className="text-xs text-slate-750 dark:text-slate-300 leading-relaxed font-semibold">
                              • {kp.point}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {names.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center select-none">
                          <User className="w-4 h-4 mr-1.5" /> Important Names & Institutions
                        </h4>
                        <div className="bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/10 p-4 rounded-2xl space-y-1.5">
                          {names.map((kp: any, idx: number) => (
                            <p key={idx} className="text-xs text-slate-750 dark:text-slate-300 leading-relaxed font-semibold">
                              • {kp.point}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {numbers.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-extrabold text-teal-600 dark:text-teal-400 uppercase tracking-wider flex items-center select-none">
                          <Hash className="w-4 h-4 mr-1.5" /> Key Numbers & Metrics
                        </h4>
                        <div className="bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/10 p-4 rounded-2xl space-y-1.5">
                          {numbers.map((kp: any, idx: number) => (
                            <p key={idx} className="text-xs text-slate-750 dark:text-slate-300 leading-relaxed font-semibold">
                              • {kp.point}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {generalPoints.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center select-none">
                          <Bookmark className="w-4 h-4 mr-1.5" /> General Takeaways
                        </h4>
                        <div className="bg-slate-500/5 dark:bg-slate-500/10 border border-slate-500/10 p-4 rounded-2xl space-y-1.5">
                          {generalPoints.map((kp: any, idx: number) => (
                            <p key={idx} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                              • {kp.point}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {keyPoints.length === 0 && (
                      <p className="text-slate-400 italic text-center py-8 text-xs">No insights extracted from this document yet.</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "suggestions" && (
                <div className="glass p-6 md:p-8 rounded-3xl shadow-sm h-full border border-slate-200/50 dark:border-slate-800/30 overflow-y-auto max-h-[500px] space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-855 pb-3">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-150">
                      Document Quality & Writing Suggestions
                    </h3>
                    <span className="text-[10px] bg-brand-500/10 text-brand-600 dark:text-brand-400 px-2.5 py-0.5 rounded font-bold uppercase">
                      {suggestions.length} recommendations
                    </span>
                  </div>

                  <div className="space-y-4">
                    {grammar.length > 0 && (
                      <div className="flex gap-3.5 p-4 bg-sky-500/5 dark:bg-sky-500/10 border border-sky-500/15 rounded-2xl">
                        <div className="p-2 bg-sky-500/15 text-sky-600 dark:text-sky-400 rounded-xl h-fit">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Grammar & Syntax Enhancements</h4>
                          <ul className="list-disc ml-3.5 mt-1.5 text-xs text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed font-semibold">
                            {grammar.map((s: any, idx: number) => (
                              <li key={idx}>{s.suggestionText}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {readability.length > 0 && (
                      <div className="flex gap-3.5 p-4 bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/15 rounded-2xl">
                        <div className="p-2 bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded-xl h-fit">
                          <HelpCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Readability & Clarity Improvements</h4>
                          <ul className="list-disc ml-3.5 mt-1.5 text-xs text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed font-semibold">
                            {readability.map((s: any, idx: number) => (
                              <li key={idx}>{s.suggestionText}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {structure.length > 0 && (
                      <div className="flex gap-3.5 p-4 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 rounded-2xl">
                        <div className="p-2 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded-xl h-fit">
                          <Layout className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Structure & Layout Enhancements</h4>
                          <ul className="list-disc ml-3.5 mt-1.5 text-xs text-slate-605 dark:text-slate-400 space-y-1.5 leading-relaxed font-semibold">
                            {structure.map((s: any, idx: number) => (
                              <li key={idx}>{s.suggestionText}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {missingInfo.length > 0 && (
                      <div className="flex gap-3.5 p-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 rounded-2xl">
                        <div className="p-2 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-xl h-fit">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Missing Information Detection</h4>
                          <ul className="list-disc ml-3.5 mt-1.5 text-xs text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed font-semibold">
                            {missingInfo.map((s: any, idx: number) => (
                              <li key={idx}>{s.suggestionText}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {contentOptimization.length > 0 && (
                      <div className="flex gap-3.5 p-4 bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/15 rounded-2xl">
                        <div className="p-2 bg-teal-500/15 text-teal-600 dark:text-teal-400 rounded-xl h-fit">
                          <Compass className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Content Optimization Suggestions</h4>
                          <ul className="list-disc ml-3.5 mt-1.5 text-xs text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed font-semibold">
                            {contentOptimization.map((s: any, idx: number) => (
                              <li key={idx}>{s.suggestionText}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {professionalWriting.length > 0 && (
                      <div className="flex gap-3.5 p-4 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/15 rounded-2xl">
                        <div className="p-2 bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-xl h-fit">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Professional Writing Standards</h4>
                          <ul className="list-disc ml-3.5 mt-1.5 text-xs text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed font-semibold">
                            {professionalWriting.map((s: any, idx: number) => (
                              <li key={idx}>{s.suggestionText}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {suggestions.length === 0 && (
                      <p className="text-slate-400 italic text-center py-8">No quality improvements suggested for this document.</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "chat" && (
                <div className="glass p-6 md:p-8 rounded-3xl shadow-sm h-full flex flex-col border border-slate-200/50 dark:border-slate-800/30 min-h-[450px]">
                  <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-850 pb-3 mb-4">
                    <div>
                      <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-150">
                        Chat with Document
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        Ask questions about content, dates, names, or tasks
                      </p>
                    </div>
                  </div>

                  <div className="flex-grow overflow-y-auto max-h-[300px] space-y-3 pr-1 mb-4">
                    {chatMessages.length === 0 ? (
                      <div className="text-center py-10 space-y-4">
                        <HelpCircle className="w-10 h-10 mx-auto text-slate-350 dark:text-slate-700 animate-bounce" />
                        <div className="max-w-xs mx-auto">
                          <p className="text-xs font-bold text-slate-500">No questions asked yet.</p>
                          <p className="text-[10px] text-slate-400 mt-1">Select one of the quick start questions below or type your own question!</p>
                        </div>

                        <div className="flex flex-wrap justify-center gap-1.5 pt-3">
                          {[
                            "What is the main topic of this document?",
                            "List all actionable next steps.",
                            "Are there any deadlines or dates?",
                            "Summarize the key takeaways."
                          ].map((q, idx) => (
                            <button
                              key={idx}
                              onClick={() => setChatInput(q)}
                              className="text-[10px] font-bold bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 border border-slate-205/60 dark:border-slate-800/60 px-3 py-1.5 rounded-xl transition-all"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      chatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                              msg.sender === "user"
                                ? "bg-brand-600 text-white rounded-tr-none shadow-md shadow-brand-500/10 font-medium"
                                : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-tl-none border border-slate-200/20 dark:border-slate-800/20 font-semibold"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendChat();
                    }}
                    className="flex items-center space-x-2 border border-slate-205 dark:border-slate-800 rounded-2xl p-1 bg-white dark:bg-slate-900"
                  >
                    <input
                      type="text"
                      placeholder="Ask the document assistant a question..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-grow bg-transparent border-0 px-3 py-2 text-xs focus:ring-0 focus:outline-none text-slate-850 dark:text-slate-100"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white p-2 rounded-xl transition-colors shadow-sm"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}

              {activeTab === "raw" && (
                <div className="glass p-6 md:p-8 rounded-3xl shadow-sm h-full flex flex-col border border-slate-200/50 dark:border-slate-800/30">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-4 mb-4">
                    <div className="flex items-center space-x-2 flex-grow max-w-md relative">
                      <Search className="w-4 h-4 text-slate-405 absolute left-3" />
                      <input
                        type="text"
                        placeholder="Search within extracted text..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentMatchIndex(0);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-24 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none text-slate-800 dark:text-slate-100"
                      />
                      
                      {searchQuery && (
                        <div className="absolute right-2 flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-850 py-1 px-2 rounded-lg border border-slate-200/40 dark:border-slate-800/40 select-none">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                            {totalMatches > 0 ? `${currentMatchIndex + 1}/${totalMatches}` : "0/0"}
                          </span>
                          <button
                            onClick={() => setCurrentMatchIndex(prev => (prev - 1 + totalMatches) % totalMatches)}
                            disabled={totalMatches <= 1}
                            className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-white disabled:opacity-30"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setCurrentMatchIndex(prev => (prev + 1) % totalMatches)}
                            disabled={totalMatches <= 1}
                            className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-white disabled:opacity-30"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() =>
                        downloadText(
                          `${document.fileName.split(".")[0]}-raw.txt`,
                          rawText
                        )
                      }
                      className="flex items-center space-x-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Download Raw Text</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-grow h-[450px]">
                    <div className="lg:col-span-1 border-r border-slate-100 dark:border-slate-850 pr-4 overflow-y-auto hidden lg:flex flex-col space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center select-none">
                        <BookOpen className="w-3.5 h-3.5 mr-1 text-slate-400" /> Quick Navigation
                      </h4>
                      {sections.map((section, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSearchQuery(section.textSnippet);
                            setCurrentMatchIndex(0);
                          }}
                          className={`text-left text-[11px] font-bold p-2 rounded-lg transition-all line-clamp-2 ${
                            searchQuery === section.textSnippet
                              ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 border-l-2 border-brand-500"
                              : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-700"
                          }`}
                          title={section.title}
                        >
                          {section.title}
                        </button>
                      ))}
                    </div>

                    <div className="lg:col-span-3 bg-slate-50 dark:bg-slate-900/40 p-4 border border-slate-200/30 dark:border-slate-850 rounded-2xl overflow-y-auto h-full">
                      {renderHighlightedText()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
