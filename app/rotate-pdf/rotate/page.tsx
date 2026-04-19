"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "motion/react";
import {
    IconLoader2,
    IconRotateClockwise,
    IconRotate2,
    IconCheck,
    IconArrowLeft,
    IconDownload,
    IconRotateClockwise2,
    IconRefresh,
    IconAlertCircle,
} from "@tabler/icons-react";
import { downloadBlob } from "@/lib/pdf-utils";
import FileStore from "@/lib/file-store";
interface PageItem {
    id: string;
    pageIndex: number;
    rotation: number; // 0, 90, 180, 270
    thumbnail: string | null;
    /** Natural aspect ratio of thumbnail (width/height) — used to compute scale when rotated */
    thumbAspect: number;
}

// ─── PageCard ────────────────────────────────────────────────────────────────

function PageCard({
    page,
    index,
    onRotateCW,
    onRotateCCW,
}: {
    page: PageItem;
    index: number;
    onRotateCW: () => void;
    onRotateCCW: () => void;
}) {
    const [hovered, setHovered] = useState(false);

    /**
     * When a page is rotated 90 or 270 degrees, the image is wider than tall (or
     * vice versa) inside a fixed-aspect-ratio container.  We compensate by scaling
     * the image so its *rotated* bounding box fits inside the container.
     *
     * Container aspect ratio:  0.707  (A4 portrait, width/height)
     * At 90 / 270 degrees the image "spine" becomes the width, so the effective
     * aspect ratio of the rotated image becomes  1 / thumbAspect.
     * Scale-to-fit = container_aspect / rotated_image_aspect  … capped to 1.
     */
    const isRotated90or270 = page.rotation === 90 || page.rotation === 270;
    const containerAspect = 0.707; // fixed card aspect ratio (width ÷ height)
    const imageAspect = page.thumbAspect || containerAspect;
    let imgScale = 1;
    if (isRotated90or270) {
        // Calculate the maximum scale we can apply so the rotated bounding box still fits.
        // Under object-fit: contain, the rendered dimensions depend on whether the image
        // is proportionally wider or taller than the container.
        if (imageAspect > containerAspect) {
            imgScale = Math.min(imageAspect, 1 / containerAspect);
        } else {
            imgScale = Math.min(containerAspect, 1 / imageAspect);
        }
    }

    const rotationLabel =
        page.rotation === 0 ? null :
        page.rotation === 90 ? "90° CW" :
        page.rotation === 180 ? "180°" :
        "90° CCW";

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2 }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="relative flex flex-col items-center gap-2 select-none"
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
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            transform: `rotate(${page.rotation}deg) scale(${imgScale})`,
                            transformOrigin: "center center",
                            transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
                        }}
                        draggable={false}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <IconLoader2 size={24} className="animate-spin text-brand-sage" />
                    </div>
                )}

                {/* Rotation badge */}
                {rotationLabel && (
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-[#059669]/90 text-white text-[9px] font-bold shadow-sm backdrop-blur-sm">
                        {rotationLabel}
                    </div>
                )}

                {/* Hover overlay — rotate buttons */}
                <AnimatePresence>
                    {hovered && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="absolute inset-0 bg-black/35 flex items-center justify-center gap-3"
                        >
                            {/* CCW */}
                            <button
                                onClick={(e) => { e.stopPropagation(); onRotateCCW(); }}
                                title="Rotate 90° Counter-clockwise"
                                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/90 text-brand-dark hover:bg-white hover:text-[#059669] transition-all shadow-lg cursor-pointer"
                            >
                                <IconRotate2 size={20} stroke={2} />
                            </button>
                            {/* CW */}
                            <button
                                onClick={(e) => { e.stopPropagation(); onRotateCW(); }}
                                title="Rotate 90° Clockwise"
                                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/90 text-brand-dark hover:bg-white hover:text-[#059669] transition-all shadow-lg cursor-pointer"
                            >
                                <IconRotateClockwise size={20} stroke={2} />
                            </button>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

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

        const f = FileStore.getFile("rotate_0");
        if (!f) {
            router.replace("/rotate-pdf");
            return;
        }

        setFile(f);
        processFile(f);
    }, [router]);

    const processFile = useCallback(async (f: File) => {
        setIsLoading(true);
        setLoadingProgress(0);

        try {
            const pdfjsLib = await import("pdfjs-dist");
            pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
                "pdfjs-dist/build/pdf.worker.min.mjs",
                import.meta.url
            ).toString();

            const arrayBuffer = await f.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const newPages: PageItem[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.4 });
                const canvas = document.createElement("canvas");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext("2d")!;
                await page.render({ canvasContext: ctx, viewport } as any).promise;
                const thumb = canvas.toDataURL("image/jpeg", 0.85);
                const thumbAspect = viewport.width / viewport.height;

                newPages.push({
                    id: Math.random().toString(36).slice(2, 9),
                    pageIndex: i - 1,
                    rotation: 0,
                    thumbnail: thumb,
                    thumbAspect,
                });

                setLoadingProgress(Math.round((i / pdf.numPages) * 100));
            }

            setPages(newPages);
        } catch (e) {
            console.error("Failed to render PDF:", e);
            setError("Could not read the PDF file. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const rotatePage = useCallback((id: string, direction: "cw" | "ccw") => {
        const offset = direction === "cw" ? 90 : 270;
        setPages((prev) =>
            prev.map((p) =>
                p.id === id ? { ...p, rotation: (p.rotation + offset) % 360 } : p
            )
        );
    }, []);

    const rotateAll = useCallback((direction: "cw" | "ccw") => {
        const offset = direction === "cw" ? 90 : 270;
        setPages((prev) => prev.map((p) => ({ ...p, rotation: (p.rotation + offset) % 360 })));
    }, []);

    const resetAll = useCallback(() => {
        setPages((prev) => prev.map((p) => ({ ...p, rotation: 0 })));
        setShowResetConfirm(false);
    }, []);

    const handleExport = () =>
        (async () => {
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
                    copiedPage.setRotation(degrees((currentRot + p.rotation) % 360));
                    pdfDoc.addPage(copiedPage);
                }

                const bytes = await pdfDoc.save();
                const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
                const originalName = file.name.replace(/\.[^/.]+$/, "");
                downloadBlob(blob, `${originalName}_rotated.pdf`);
                setSuccess(true);
            } catch (err: any) {
                console.error(err);
                setError(err?.message || "Export failed. Please try again.");
            } finally {
                setIsProcessing(false);
            }
        })();

    // ── Loading screen ─────────────────────────────────────────────────────────
    if (isLoading && pages.length === 0) {
        return (
            <div className="min-h-screen flex flex-col" style={{ background: "var(--brand-white)" }}>
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <IconLoader2 size={36} className="animate-spin text-[#059669]" />
                        <p className="text-brand-sage text-sm font-medium">
                            Reading pages… {loadingProgress > 0 ? `${loadingProgress}%` : ""}
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    // ── Success screen ─────────────────────────────────────────────────────────
    if (success) {
        return (
            <div className="min-h-screen flex flex-col" style={{ background: "var(--brand-white)" }}>
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
                        <h1 className="text-2xl font-bold text-brand-dark mb-3">PDF Rotated!</h1>
                        <p className="text-brand-sage mb-8">
                            Your rotated PDF has been downloaded successfully.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setSuccess(false); setPages([]); router.push("/rotate-pdf"); }}
                                className="flex-1 px-6 py-3 rounded-xl bg-white text-brand-dark font-semibold border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
                            >
                                Rotate Another
                            </button>
                            <button
                                onClick={() => setSuccess(false)}
                                className="flex-1 px-6 py-3 rounded-xl bg-[#059669] text-white font-semibold hover:bg-emerald-700 transition-all cursor-pointer shadow-md"
                            >
                                Continue Editing
                            </button>
                        </div>
                    </motion.div>
                </main>
            </div>
        );
    }

    // ── Main editor ────────────────────────────────────────────────────────────
    return (
        <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--brand-white)" }}>

            <Navbar />

            {/* Dot background */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage: "radial-gradient(circle, #059669 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                    opacity: 0.05,
                }}
            />

            <main className="flex-1 max-w-7xl mx-auto px-4 md:px-8 w-full pt-24 pb-6 relative z-10 flex flex-col lg:flex-row gap-6 min-h-0">

                {/* ── Page canvas area ──────────────────────────── */}
                <div className="flex-1 min-w-0 bg-white border border-border rounded-2xl flex flex-col shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 bg-white z-10 shrink-0">
                        <button
                            onClick={() => router.push("/rotate-pdf")}
                            className="flex items-center justify-center w-10 h-10 rounded-xl text-brand-sage hover:text-brand-dark hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            <IconArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-brand-dark">Rotate PDF</h1>
                            <p className="text-xs text-brand-sage">
                                {file?.name} • {pages.length} page{pages.length !== 1 ? "s" : ""} • Hover a page to rotate
                            </p>
                        </div>
                    </div>

                    {/* Error bar */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="shrink-0 bg-red-50 border-b border-red-100 px-6 py-2.5 flex items-center gap-2 text-sm text-red-600"
                            >
                                <IconAlertCircle size={16} />
                                {error}
                                <button
                                    onClick={() => setError(null)}
                                    className="ml-auto text-red-400 hover:text-red-600 font-bold cursor-pointer"
                                >
                                    ×
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Pages grid – scrollable */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                        <div className="flex flex-wrap gap-8 items-start justify-center">
                            <AnimatePresence>
                                {pages.map((page, i) => (
                                    <PageCard
                                        key={page.id}
                                        page={page}
                                        index={i + 1}
                                        onRotateCW={() => rotatePage(page.id, "cw")}
                                        onRotateCCW={() => rotatePage(page.id, "ccw")}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* ── Right sidebar ─────────────────────────────── */}
                <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
                    <div className="bg-white rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-3">
                        <div className="border-b border-border pb-3">
                            <h2 className="text-sm font-bold text-brand-dark">Rotate All Pages</h2>
                            <p className="text-[11px] text-brand-sage mt-0.5">Apply rotation to every page at once</p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => rotateAll("ccw")}
                                disabled={isProcessing}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-border text-brand-dark text-sm font-semibold hover:border-[#059669] hover:text-[#059669] hover:bg-emerald-50 transition-all cursor-pointer disabled:opacity-40"
                                title="Rotate all counter-clockwise"
                            >
                                <IconRotate2 size={16} />
                                CCW
                            </button>
                            <button
                                onClick={() => rotateAll("cw")}
                                disabled={isProcessing}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-border text-brand-dark text-sm font-semibold hover:border-[#059669] hover:text-[#059669] hover:bg-emerald-50 transition-all cursor-pointer disabled:opacity-40"
                                title="Rotate all clockwise"
                            >
                                <IconRotateClockwise size={16} />
                                CW
                            </button>
                        </div>

                        <button
                            onClick={() => setShowResetConfirm(true)}
                            disabled={isProcessing || pages.every((p) => p.rotation === 0)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <IconRefresh size={16} />
                            Reset All Rotations
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
                        <p className="text-[11px] text-brand-sage font-medium mb-2">Summary</p>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-brand-sage">Total pages</span>
                                <span className="font-bold text-brand-dark">{pages.length}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-brand-sage">Rotated pages</span>
                                <span className="font-bold text-[#059669]">
                                    {pages.filter((p) => p.rotation !== 0).length}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-brand-sage">Original pages</span>
                                <span className="font-bold text-brand-dark">
                                    {pages.filter((p) => p.rotation === 0).length}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Export button */}
                    <button
                        onClick={handleExport}
                        disabled={isProcessing || pages.length === 0}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-[15px] font-bold text-white transition-all cursor-pointer shadow-md active:scale-[0.98] ${
                            isProcessing || pages.length === 0
                                ? "bg-[#059669]/40 cursor-not-allowed"
                                : "bg-[#059669] hover:bg-emerald-700 shadow-[#059669]/20"
                        }`}
                    >
                        {isProcessing ? (
                            <IconLoader2 size={20} className="animate-spin" />
                        ) : (
                            <IconDownload size={20} />
                        )}
                        <span>{isProcessing ? "Exporting…" : "Apply & Download"}</span>
                    </button>
                </div>
            </main>

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
                                This will remove all rotations and restore every page to its original orientation.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="px-4 py-2 text-sm font-semibold text-brand-dark border border-border rounded-lg hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={resetAll}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm cursor-pointer"
                                >
                                    Yes, Reset
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}


