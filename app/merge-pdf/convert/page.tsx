"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence, Reorder } from "motion/react";
import {
    IconArrowsJoin2,
    IconPlus,
    IconTrash,
    IconLoader2,
    IconCheck,
    IconArrowLeft,
    IconFileTypePdf,
    IconGripVertical,
} from "@tabler/icons-react";
import { downloadBlob, mergePdfs } from "@/lib/pdf-utils";
import FileStore from "@/lib/file-store";
import { FileUpload } from "@/components/ui/file-upload";
// ─── Types ───────────────────────────────────────────────────────────────────

interface PdfItem {
    id: string;
    file: File;
    size: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
    return Math.random().toString(36).slice(2, 10);
}

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// ─── Pdf Card ──────────────────────────────────────────────────────────────

function PdfCard({
    item,
    onDelete,
    dragControls
}: {
    item: PdfItem;
    onDelete: () => void;
    dragControls?: any;
}) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            className="group relative flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-[#047C58]/60 hover:shadow-md transition-all duration-200"
        >
            <div className="flex items-center gap-4 min-w-0">
                <div
                    className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors p-1"
                    title="Drag to reorder"
                >
                    <IconGripVertical size={20} />
                </div>

                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-50 text-red-500 shrink-0">
                    <IconFileTypePdf size={24} stroke={1.5} />
                </div>

                <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-dark truncate" title={item.file.name}>
                        {item.file.name}
                    </p>
                    <p className="text-[11px] text-brand-sage font-medium mt-0.5">
                        {item.size}
                    </p>
                </div>
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="Remove"
                className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-50 text-brand-sage hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer shrink-0"
            >
                <IconTrash size={18} />
            </button>
        </motion.div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MergePdfConvertPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const hasInitialized = useRef(false);

    const [pdfs, setPdfs] = useState<PdfItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const items: PdfItem[] = [];
        for (let i = 0; i < 200; i++) {
            const f = FileStore.getFile(`pdf_${i}`);
            if (!f) break;
            items.push({ id: uid(), file: f, size: formatBytes(f.size) });
        }

        if (items.length === 0) {
            router.replace("/merge-pdf");
            return;
        }

        for (let i = 0; i < items.length; i++) FileStore.clearFile(`pdf_${i}`);

        setPdfs(items);
        setIsLoading(false);
    }, [router]);

    const handleFileArray = useCallback((newFiles: File[]) => {
        if (!newFiles || newFiles.length === 0) return;
        const items: PdfItem[] = [];
        for (const f of newFiles) {
            if (f.type === "application/pdf" || f.name.endsWith(".pdf")) {
                items.push({ id: uid(), file: f, size: formatBytes(f.size) });
            }
        }
        setPdfs((prev) => [...prev, ...items]);
        setError(null);
    }, []);

    const addFiles = useCallback((newFiles: FileList | null) => {
        if (!newFiles) return;
        handleFileArray(Array.from(newFiles));
    }, [handleFileArray]);

    const deletePdf = (id: string) => {
        setPdfs((prev) => prev.filter((i) => i.id !== id));
    };

    const handleMerge = async () => {
        if (pdfs.length < 2) {
            setError("Please add at least 2 PDFs to merge.");
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const allFiles = pdfs.map(p => p.file);
            const mergedBytes = await mergePdfs(allFiles);

            const blob = new Blob([mergedBytes as any], { type: "application/pdf" });
            downloadBlob(blob, "merged.pdf");

            setSuccess(true);
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Merge failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col pt-16" style={{ background: "var(--brand-white)" }}>
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <IconLoader2 size={36} className="animate-spin text-[#047C58]" />
                        <p className="text-brand-sage text-sm font-medium">Loading your PDFs…</p>
                    </div>
                </main>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex flex-col pt-16" style={{ background: "var(--brand-white)" }}>
                <Navbar />
                <main className="flex-1 flex items-center justify-center py-24">
                    <div className="flex flex-col items-center text-center gap-5 animate-in fade-in zoom-in duration-300">
                        <span className="flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-600">
                            <IconCheck size={40} stroke={2} />
                        </span>
                        <h1 className="text-2xl font-bold text-brand-dark">PDFs Merged!</h1>
                        <p className="text-brand-sage max-w-sm">Your documents have been successfully merged into a single PDF.</p>
                        <div className="flex gap-3 mt-2">
                            <button
                                onClick={() => { setSuccess(false); setPdfs([]); router.push("/merge-pdf"); }}
                                className="px-6 py-3 rounded-xl bg-white text-brand-dark font-semibold border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
                            >
                                Start over
                            </button>
                            <button
                                onClick={() => setSuccess(false)}
                                className="px-6 py-3 rounded-xl bg-[#047C58] text-white font-semibold hover:bg-[#036245] transition-all cursor-pointer shadow-md"
                            >
                                Back to editing
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col relative overflow-hidden pt-16" style={{ background: "var(--brand-white)" }}>
            <Navbar />

            <div aria-hidden className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage: "radial-gradient(circle, #047C58 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                    opacity: 0.03,
                }}
            />

            <main className="flex-1 max-w-3xl mx-auto px-4 w-full pt-16 md:pt-24 pb-6 relative z-10 flex flex-col overflow-hidden">
                <div className="mb-8 shrink-0">
                    <div className="flex md:hidden items-center gap-2">
                        <button
                            onClick={() => router.push("/merge-pdf")}
                            aria-label="Back"
                            className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg text-brand-sage hover:text-brand-dark hover:bg-slate-100 transition-colors cursor-pointer active:scale-[0.97]"
                        >
                            <IconArrowLeft size={18} />
                        </button>

                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg text-white shrink-0" style={{ background: "#047C58" }}>
                                <IconArrowsJoin2 size={16} stroke={1.5} />
                            </span>
                            <div className="min-w-0">
                                <h1 className="text-sm font-bold text-brand-dark leading-tight truncate">Merge PDF</h1>
                                <p className="text-[10px] text-brand-sage leading-tight">{pdfs.length} file{pdfs.length !== 1 ? "s" : ""} loaded</p>
                            </div>
                        </div>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1 px-2.5 py-2 rounded-lg border border-[#047C58] text-[#047C58] text-xs font-semibold hover:bg-[#047C58] hover:text-white transition-all cursor-pointer shadow-sm active:scale-[0.97] shrink-0"
                        >
                            <IconPlus size={13} /> Add
                        </button>
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        <button
                            onClick={() => router.push("/merge-pdf")}
                            className="flex items-center gap-1.5 text-sm font-medium text-brand-sage hover:text-brand-dark hover:bg-slate-100 px-3 py-1.5 rounded-lg -ml-2 transition-colors cursor-pointer"
                        >
                            <IconArrowLeft size={16} /> Back
                        </button>
                        <div className="w-px h-5 bg-slate-200" />
                        <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-10 h-10 rounded-xl text-white" style={{ background: "#047C58" }}>
                                <IconArrowsJoin2 size={20} stroke={1.5} />
                            </span>
                            <div>
                                <h1 className="text-xl font-bold text-brand-dark">Merge PDF</h1>
                                <p className="text-xs text-brand-sage">{pdfs.length} document{pdfs.length !== 1 ? "s" : ""} loaded</p>
                            </div>
                        </div>
                        <div className="ml-auto">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#047C58] text-[#047C58] text-sm font-semibold hover:bg-[#047C58] hover:text-white transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                            >
                                <IconPlus size={16} /> Add More PDFs
                            </button>
                        </div>
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                />

                <div className="bg-white rounded-3xl border border-border shadow-sm p-6 md:p-8 flex flex-col flex-1 min-h-0">
                    <p className="text-sm text-brand-sage mb-6 shrink-0">
                        Drag and drop the files to rearrange their order. The top file will be the first in the merged document.
                    </p>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 pb-4">
                        {pdfs.length === 0 ? (
                            <div className="bg-white rounded-2xl">
                                <FileUpload
                                    multiple
                                    accept={{ "application/pdf": [".pdf"] }}
                                    files={[]}
                                    setFiles={() => { }}
                                    onChange={handleFileArray}
                                />
                            </div>
                        ) : (
                            <Reorder.Group
                                axis="y"
                                values={pdfs}
                                onReorder={setPdfs}
                                className="flex flex-col gap-3"
                                as="div"
                            >
                                <AnimatePresence>
                                    {pdfs.map((pdf) => (
                                        <Reorder.Item key={pdf.id} value={pdf} as="div">
                                            <PdfCard
                                                item={pdf}
                                                onDelete={() => deletePdf(pdf.id)}
                                            />
                                        </Reorder.Item>
                                    ))}
                                </AnimatePresence>
                            </Reorder.Group>
                        )}
                    </div>

                    <div className="shrink-0 mt-4">
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl flex items-start gap-2 border border-red-100">
                                <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-red-500 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                onClick={handleMerge}
                                disabled={pdfs.length < 2 || isProcessing}
                                className={`w-full md:w-auto md:ml-auto md:px-12 py-4 rounded-xl font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-md active:scale-[0.98] text-[15px] ${pdfs.length < 2
                                    ? "bg-[#047C58]/30 cursor-not-allowed shadow-none"
                                    : isProcessing
                                        ? "bg-[#047C58] opacity-50 cursor-wait"
                                        : "bg-[#047C58] hover:bg-[#036245] cursor-pointer"
                                    }`}
                            >
                                {isProcessing && <IconLoader2 className="animate-spin" size={20} />}
                                {isProcessing ? "Merging PDFs…" : `Merge ${pdfs.length} PDF${pdfs.length !== 1 ? 's' : ''}`}
                            </button>
                        </div>
                    </div>
                </div>
            </main>

        </div>
    );
}

