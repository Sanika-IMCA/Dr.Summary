import React, { useState, useEffect } from "react";
import DocumentUpload from "./components/DocumentUpload";
import ResultsView from "./components/ResultsView";
import ThemeToggle from "./components/ThemeToggle";
import {
  FileText,
  Clock,
  Trash2,
  Plus,
  Compass,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle,
  TrendingUp,
  FolderOpen,
} from "lucide-react";

export default function App() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [globalError, setGlobalError] = useState<string>("");
  const [globalSuccess, setGlobalSuccess] = useState<string>("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [compareReport, setCompareReport] = useState("");
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Fetch document history on load
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleUploadStart = () => {
    setGlobalError("");
    setGlobalSuccess("");
  };

  const handleUploadSuccess = (newDoc: any) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setSelectedDoc(newDoc);
    setGlobalSuccess(`File "${newDoc.fileName}" successfully parsed!`);
    setTimeout(() => setGlobalSuccess(""), 4000);
  };

  const handleUploadError = (err: string) => {
    setGlobalError(err);
  };

  const toggleCompare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const handleCompare = async () => {
    if (compareIds.length !== 2) return;
    setComparing(true);
    setGlobalError("");
    setCompareReport("");
    setShowCompareModal(true);

    try {
      const res = await fetch("/api/documents/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId1: compareIds[0],
          docId2: compareIds[1],
          language: "English",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to compare documents");
      }
      setCompareReport(data.comparisonReport);
    } catch (err: any) {
      setGlobalError(err.message || "Comparison failed");
      setShowCompareModal(false);
    } finally {
      setComparing(false);
    }
  };

  const handleSummarize = async (lang = "English") => {
    if (!selectedDoc) return;
    setSummarizing(true);
    setGlobalError("");

    try {
      const res = await fetch(`/api/documents/${selectedDoc.id}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to generate AI summaries");
      }

      // Update documents list
      setDocuments((prev) =>
        prev.map((d) => (d.id === selectedDoc.id ? data.document : d))
      );
      setSelectedDoc(data.document);

      if (data.isMock) {
        setGlobalSuccess("Analysis completed in Mock Mode (no Gemini API Key set).");
      } else {
        setGlobalSuccess("AI summaries successfully generated!");
      }
      setTimeout(() => setGlobalSuccess(""), 5000);
    } catch (err: any) {
      setGlobalError(err.message || "Could not summarize the document.");
    } finally {
      setSummarizing(false);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this document? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        if (selectedDoc?.id === id) {
          setSelectedDoc(null);
        }
        setGlobalSuccess("Document deleted successfully.");
        setTimeout(() => setGlobalSuccess(""), 3000);
      } else {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete");
      }
    } catch (err: any) {
      setGlobalError(err.message || "Error deleting document");
    }
  };

  const selectDocumentById = async (id: string) => {
    setGlobalError("");
    setGlobalSuccess("");
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDoc(data);
      } else {
        throw new Error("Failed to load details");
      }
    } catch (err: any) {
      setGlobalError("Failed to load document details");
    }
  };

  // Quick stats calculations
  const totalCount = documents.length;
  const pdfCount = documents.filter((d) => d.fileType.includes("pdf")).length;
  const ocrCount = totalCount - pdfCount;

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Floating Action Toasts Overlay */}
      <div className="fixed top-5 right-5 z-[9999] max-w-sm space-y-3 pointer-events-none select-none">
        {globalError && (
          <div className="flex items-start space-x-3 p-4 bg-rose-50 dark:bg-rose-950/90 text-rose-800 dark:text-rose-205 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-2xl pointer-events-auto animate-slide-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-grow pr-2">
              <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-450">Alert / Error</h5>
              <p className="text-xs font-semibold mt-0.5 leading-relaxed">{globalError}</p>
            </div>
            <button onClick={() => setGlobalError("")} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
              <Plus className="w-4 h-4 rotate-45" />
            </button>
          </div>
        )}

        {globalSuccess && (
          <div className="flex items-start space-x-3 p-4 bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-205 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 shadow-2xl pointer-events-auto animate-slide-in">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-500 mt-0.5" />
            <div className="flex-grow pr-2">
              <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-450 font-black">Success</h5>
              <p className="text-xs font-semibold mt-0.5 leading-relaxed">{globalSuccess}</p>
            </div>
            <button onClick={() => setGlobalSuccess("")} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
              <Plus className="w-4 h-4 rotate-45" />
            </button>
          </div>
        )}
      </div>
      {/* Top Navbar */}
      <header className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-brand-600 to-indigo-500 rounded-xl text-white shadow-md shadow-brand-500/20">
            <Compass className="w-6 h-6 animate-pulse-slow" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-brand-600 to-indigo-500 dark:from-brand-400 dark:to-indigo-300 bg-clip-text text-transparent">
              Dr.Summary
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
              AI Document Assistant
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
        {/* Sidebar - History & Stats */}
        <section className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6" aria-label="Dashboard Sidebar">
          {/* Stats Card */}
          <div className="glass p-5 rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800/30">
            <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center">
              <TrendingUp className="w-4 h-4 mr-1.5" /> Workspace Stats
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-100/50 dark:bg-slate-900/50 p-3 rounded-2xl text-center border border-slate-200/10">
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">{totalCount}</div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5">Files</div>
              </div>
              <div className="bg-slate-100/50 dark:bg-slate-900/50 p-3 rounded-2xl text-center border border-slate-200/10">
                <div className="text-xl font-black text-brand-600 dark:text-brand-400">{pdfCount}</div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5">PDFs</div>
              </div>
              <div className="bg-slate-100/50 dark:bg-slate-900/50 p-3 rounded-2xl text-center border border-slate-200/10">
                <div className="text-xl font-black text-indigo-500">{ocrCount}</div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5">Images</div>
              </div>
            </div>
          </div>

          {/* History List */}
          <div className="glass p-5 rounded-3xl shadow-sm flex-grow flex flex-col border border-slate-200/50 dark:border-slate-800/30 overflow-hidden min-h-[250px] lg:min-h-0">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800/50 pb-3">
              <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center">
                <FolderOpen className="w-4 h-4 mr-1.5" /> File History
              </h3>
              {selectedDoc && (
                <button
                  id="new-upload-btn"
                  onClick={() => setSelectedDoc(null)}
                  className="p-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 transition-colors"
                  title="Upload new file"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-grow space-y-2 pr-1">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                  <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-400">Loading history...</span>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-10">
                  <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs text-slate-400">No documents processed yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Compare Action Trigger Header */}
                  {compareIds.length > 0 && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl flex items-center justify-between animate-fade-in">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {compareIds.length} select for comparison
                      </span>
                      {compareIds.length === 2 && (
                        <button
                          onClick={handleCompare}
                          className="text-xs font-bold bg-brand-650 hover:bg-brand-600 text-white px-3 py-1.5 rounded-xl transition-all"
                        >
                          Compare Files
                        </button>
                      )}
                    </div>
                  )}

                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      id={`doc-item-${doc.id}`}
                      onClick={() => selectDocumentById(doc.id)}
                      className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${
                        selectedDoc?.id === doc.id
                          ? "bg-brand-500/10 dark:bg-brand-500/20 border-brand-300 dark:border-brand-500/30 text-brand-700 dark:text-brand-300"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center space-x-2 overflow-hidden pr-2 flex-grow">
                        {/* Compare Selection Checkbox */}
                        <input
                          type="checkbox"
                          checked={compareIds.includes(doc.id)}
                          onChange={(e) => toggleCompare(doc.id, e as any)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                          title="Select for comparison"
                        />
                        <FileText
                          className={`w-4 h-4 flex-shrink-0 ${
                            selectedDoc?.id === doc.id ? "text-brand-500" : "text-slate-400"
                          }`}
                        />
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold truncate">{doc.fileName}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center mt-0.5">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        id={`delete-btn-${doc.id}`}
                        onClick={(e) => handleDelete(doc.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                        title="Delete document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Dynamic Main Dashboard Pane */}
        <section className="flex-grow flex flex-col" aria-label="Document Processing Workspace">

          {/* Work area */}
          {!selectedDoc ? (
            <div className="glass p-8 md:p-12 rounded-3xl shadow-sm text-center border border-slate-200/50 dark:border-slate-800/30 flex-grow flex flex-col justify-center items-center">
              <div className="max-w-md mx-auto space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                    Process a Document
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Upload a PDF or an image of any scanned document. The assistant automatically extracts text content and builds concise summaries using AI.
                  </p>
                </div>

                <DocumentUpload
                  onUploadStart={handleUploadStart}
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={handleUploadError}
                />
              </div>
            </div>
          ) : (
            <ResultsView
              document={selectedDoc}
              onSummarize={handleSummarize}
              summarizing={summarizing}
              onDelete={handleDelete}
              onUploadNew={() => setSelectedDoc(null)}
            />
          )}
        </section>
      </main>

      {/* App Footer */}
      <footer className="py-6 text-center text-xs text-slate-400 dark:text-slate-600 border-t border-slate-100 dark:border-slate-850/80 mt-12 bg-white dark:bg-slate-950">
        <p>© 2026 Dr.Summary. Built with Next-Gen AI.</p>
      </footer>
      {/* Document Comparison Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6 animate-fade-in">
          <div className="bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center">
                  <Compass className="w-5 h-5 mr-2 text-brand-600 animate-pulse" /> Document Comparison Analysis
                </h3>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                  AI-Powered Similarity Detection & Differences
                </p>
              </div>
              <button 
                onClick={() => { setShowCompareModal(false); setCompareIds([]); }}
                className="p-2 text-slate-400 hover:text-slate-650 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-905 transition-colors"
                title="Close modal"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-grow space-y-4">
              {comparing ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-bold text-slate-500 animate-pulse">Running comparison analytics...</span>
                </div>
              ) : compareReport ? (
                <div className="summary-content prose dark:prose-invert max-w-none text-xs leading-relaxed text-slate-600 dark:text-slate-350">
                  <div className="whitespace-pre-wrap leading-relaxed font-sans">{compareReport}</div>
                </div>
              ) : (
                <div className="text-center py-20 text-slate-400">
                  No analysis generated.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-900/60 flex justify-end">
              <button
                onClick={() => { setShowCompareModal(false); setCompareIds([]); }}
                className="text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-750 transition-colors"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
