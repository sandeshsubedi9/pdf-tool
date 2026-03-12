"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "motion/react";
import {
    IconLoader2,
    IconRotateClockwise,
    IconCheck,
    IconArrowLeft,
    IconDownload,
    IconRotateDot,
    IconRefresh,
    IconRotateClockwise2
} from "@tabler/icons-react";
import { downloadBlob } from "@/lib/pdf-utils";
import FileStore from "@/lib/file-store";

interface PageItem {
    id: string;
    pageIndex: number;
    rotation: number; // 0, 90, 180, 270
    thumbnail: string | null;
}

export default function RotatePdfToolPage() {
    const router = useRouter();
    const hasInitialized = useRef(false);

    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<PageItem[]>([]);
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);

    const [showResetConfirm, setShowResetConfirm] = useState(false);

    // Load file from FileStore
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const f = FileStore.getFile(`rotate_0`);
        if (!f) {
            router.replace("/rotate-pdf");
            return;
        }

        setFile(f);
        processFile(f);
    }, [router]);

    const renderPdfThumbnails = async (file: File): Promise<string[]> => {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url
        ).toString();

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const results: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.2 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d")!;
            await page.render({ canvasContext: ctx, viewport } as any).promise;
            results.push(canvas.toDataURL("image/jpeg", 0.85));
            setLoadingProgress(Math.round((i / pdf.numPages) * 100));
        }

        return results;
    };

    const processFile = useCallback(async (f: File) => {
        setIsLoading(true);
        setLoadingProgress(0);

        try {
            const thumbs = await renderPdfThumbnails(f);
            const newPages: PageItem[] = thumbs.map((thumb, i) => ({
                id: Math.random().toString(36).slice(2, 9),
                pageIndex: i,
                rotation: 0,
                thumbnail: thumb,
            }));
            setPages((prev) => [...prev, ...newPages]);
        } catch (e) {
            console.error("Failed to render PDF:", e);
            setError("Could not read PDF file.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const rotatePage = useCallback((id: string) => {
        setPages((prev) =>
            prev.map((p) =>
                p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p
            )
        );
    }, []);

    const rotateAll = useCallback((dir: "cw" | "ccw" = "cw") => {
        const offset = dir === "cw" ? 90 : 270;
        setPages((prev) => prev.map((p) => ({ ...p, rotation: (p.rotation + offset) % 360 })));
    }, []);

    const resetAll = useCallback(() => {
        setPages((prev) => prev.map((p) => ({ ...p, rotation: 0 })));
        setShowResetConfirm(false);
    }, []);

    const handleExport = async () => {
        if (!file || pages.length === 0) return;

        setIsProcessing(true);
        setError(null);

        try {
            const { PDFDocument, degrees } = await import("pdf-lib");
            
            const ab = await file.arrayBuffer();
            const sourceDoc = await PDFDocument.load(ab);
            const pdfDoc = await PDFDocument.create();

            for (const p of pages) {
                const [copiedPage] = await pdfDoc.copyPages(sourceDoc, [p.pageIndex]);
                const currentRot = copiedPage.getRotation().angle;
                // Add the user rotation to the existing page rotation
                copiedPage.setRotation(degrees((currentRot + p.rotation) % 360));
                pdfDoc.addPage(copiedPage);
            }

            const bytes = await pdfDoc.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
            
            // Name format: original_name_rotated.pdf
            const originalName = file.name.replace(/\.[^/.]+$/, "");
            downloadBlob(blob, `${originalName}_rotated.pdf`);
            
            setSuccess(true);
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Export failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading && pages.length === 0) {
        return (
            <div className="min-h-screen flex flex-col bg-[#F7F6F3]">
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <IconLoader2 size={36} className="animate-spin text-[#059669]" />
                        <p className="text-brand-sage text-sm font-medium">Read pages ({loadingProgress}%)...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex flex-col bg-[#F7F6F3]">
                <Navbar />
                <main className="flex-1 flex items-center justify-center p-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-border max-w-lg w-full text-center"
                    >
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <IconCheck size={40} className="text-emerald-500" stroke={2} />
                        </div>
                        <h2 className="text-2xl font-bold text-brand-dark mb-4">
                            PDF Rotated Successfully!
                        </h2>
                        <p className="text-brand-sage mb-8">
                            Your rotated PDF has been downloaded.
                        </p>
                        <button
                            onClick={() => router.push("/rotate-pdf")}
                            className="bg-brand-dark text-white px-8 py-3.5 rounded-full font-semibold hover:bg-black transition-all shadow-md hover:shadow-lg w-full"
                        >
                            Rotate Another File
                        </button>
                    </motion.div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#F7F6F3]">
            <Navbar />

            {/* Header Toolbar */}
            <div className="bg-white border-b border-border sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/rotate-pdf")}
                        className="p-2 -ml-2 hover:bg-brand-gray/50 rounded-full transition-colors text-brand-dark"
                        title="Back"
                    >
                        <IconArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-base font-bold text-brand-dark leading-tight flex items-center gap-2">
                            <IconRotateClockwise2 size={18} className="text-[#059669]" /> Rotate PDF Pages
                        </h1>
                        <p className="text-xs text-brand-sage truncate max-w-[200px] md:max-w-md mt-0.5">
                            {file?.name} • {pages.length} pages
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => rotateAll("cw")}
                        disabled={isProcessing}
                        className="text-sm font-semibold flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-brand-dark hover:bg-gray-50 transition-colors"
                        title="Rotate all pages clockwise"
                    >
                        <IconRotateClockwise size={16} /> All
                    </button>

                    <button
                        onClick={() => setShowResetConfirm(true)}
                        disabled={isProcessing}
                        className="text-sm font-semibold flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                        <IconRefresh size={16} /> Reset
                    </button>
                    
                    <button
                        onClick={handleExport}
                        disabled={isProcessing}
                        className="bg-[#059669] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? (
                            <>
                                <IconLoader2 size={18} className="animate-spin" /> Saving...
                            </>
                        ) : (
                            <>
                                <IconDownload size={18} /> Apply Changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* ERROR DISPLAY */}
            {error && (
                <div className="bg-red-50 text-red-600 p-4 flex items-center justify-center text-sm font-medium border-b border-red-100">
                    {error}
                </div>
            )}

            {/* Reset Confirmation Modal */}
            <AnimatePresence>
                {showResetConfirm && (
                    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                        >
                            <h3 className="text-lg font-bold text-brand-dark mb-2">Reset All Pages?</h3>
                            <p className="text-brand-sage text-sm mb-6">
                                Are you sure you want to reset all rotations back to their original state? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="px-4 py-2 text-sm font-semibold text-brand-dark border border-border rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={resetAll}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm"
                                >
                                    Yes, Reset
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Grid Area */}
            <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-6 pb-24">
                    <AnimatePresence>
                        {pages.map((page, i) => (
                            <PageCard
                                key={page.id}
                                page={page}
                                index={i + 1}
                                onRotate={() => rotatePage(page.id)}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}

function PageCard({
    page,
    index,
    onRotate,
}: {
    page: PageItem;
    index: number;
    onRotate: () => void;
}) {
    const [hovered, setHovered] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2 }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="relative flex flex-col items-center gap-2 group"
            style={{ width: 160 }}
        >
            {/* Thumbnail container */}
            <div
                className={`relative w-full rounded-xl overflow-hidden border-2 transition-all duration-200 shadow-sm ${
                    hovered ? "shadow-xl border-[#059669]" : "border-[#E0DED9]"
                }`}
                style={{ aspectRatio: "0.707", background: "#f3f3f3" }}
            >
                {page.thumbnail ? (
                    <img
                        src={page.thumbnail}
                        alt={`Page ${index}`}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            transform: `rotate(${page.rotation}deg)`,
                            transition: "transform 0.3s ease",
                        }}
                        draggable={false}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <IconLoader2 size={24} className="animate-spin text-brand-sage" />
                    </div>
                )}

                {/* Status Indicator */}
                {page.rotation !== 0 && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white/95 flex items-center justify-center text-[#059669] shadow-sm">
                        <IconRotateClockwise2 size={12} stroke={2.5} />
                    </div>
                )}

                {/* Action overlay on hover */}
                <AnimatePresence>
                    {hovered && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="absolute inset-0 bg-black/30 flex items-center justify-center cursor-pointer"
                            onClick={onRotate}
                            title="Rotate Page Click"
                        >
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white text-brand-dark hover:bg-[#059669] hover:text-white transition-all shadow-lg">
                                <IconRotateClockwise size={26} stroke={2} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Page label */}
            <div className="text-[12px] font-bold px-3 py-1 rounded-full text-white bg-[#8C886B] shadow-sm">
                Page {index}
            </div>
        </motion.div>
    );
}
