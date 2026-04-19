"use client";
import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
} from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence, Reorder } from "motion/react";
import {
    IconStack2,
    IconPlus,
    IconTrash,
    IconLoader2,
    IconCheck,
    IconArrowLeft,
    IconFileTypePdf,
    IconPhoto,
    IconRotateClockwise,
    IconGripVertical,
    IconFile,
    IconChevronUp,
    IconChevronDown,
    IconDownload,
    IconAlertCircle,
} from "@tabler/icons-react";
import { downloadBlob } from "@/lib/pdf-utils";
import FileStore from "@/lib/file-store";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SourceFile {
    id: string;
    file: File;
    label: string; // "A", "B", "C", …
    color: string;
    size: string;
    order: number;
}

interface PageItem {
    id: string;
    sourceFileId: string;
    sourceLabel: string; // "A", "B", etc.
    pageIndexInSource: number; // 0-based page index in the source PDF/image
    rotation: number; // 0, 90, 180, 270
    thumbnail: string | null; // data URL
    isBlankPage: boolean;
    label: string; // "A1", "B2", or "Blank"
    color: string; // inherited from source
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FILE_COLORS = [
    { bg: "#e6f4ef", border: "#047C58", text: "#047C58", badge: "#047C58" },
    { bg: "#eef2ff", border: "#4f46e5", text: "#4f46e5", badge: "#4f46e5" },
    { bg: "#fef3c7", border: "#d97706", text: "#d97706", badge: "#d97706" },
    { bg: "#fce7f3", border: "#db2777", text: "#db2777", badge: "#db2777" },
    { bg: "#f0fdf4", border: "#16a34a", text: "#16a34a", badge: "#16a34a" },
    { bg: "#fff7ed", border: "#ea580c", text: "#ea580c", badge: "#ea580c" },
    { bg: "#f0f9ff", border: "#0284c7", text: "#0284c7", badge: "#0284c7" },
    { bg: "#fdf4ff", border: "#9333ea", text: "#9333ea", badge: "#9333ea" },
];

// Generate file label: A, B, C, ... Z, AA, AB, ...
function getFileLabel(index: number): string {
    if (index < 26) return String.fromCharCode(65 + index);
    // For >= 26, use double letters: AA, AB, ...
    const first = Math.floor(index / 26) - 1;
    const second = index % 26;
    return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
}

function uid() {
    return Math.random().toString(36).slice(2, 10);
}

function formatBytes(bytes: number) {
    if (!+bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function isImageFile(file: File) {
    return file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);
}

// ─── PDF rendering ────────────────────────────────────────────────────────────

async function renderPdfThumbnails(file: File, scale = 1.2): Promise<string[]> {
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
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport } as any).promise;
        results.push(canvas.toDataURL("image/jpeg", 0.85));
    }

    return results;
}

async function renderImageThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const maxSide = 400;
            const scale = Math.min(maxSide / img.naturalWidth, maxSide / img.naturalHeight, 1);
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth * scale;
            canvas.height = img.naturalHeight * scale;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load fail")); };
        img.src = url;
    });
}

// ─── Build final PDF via pdf-lib ──────────────────────────────────────────────

async function buildOrganisedPdf(pages: PageItem[], sourceFiles: SourceFile[]): Promise<Uint8Array> {
    const { PDFDocument, degrees } = await import("pdf-lib");
    const finalDoc = await PDFDocument.create();

    // Cache loaded source PDFs
    const loadedPdfs = new Map<string, any>();
    const loadedImages = new Map<string, any>();

    for (const page of pages) {
        if (page.isBlankPage) {
            finalDoc.addPage([595, 842]); // A4
            continue;
        }

        const src = sourceFiles.find((s) => s.id === page.sourceFileId);
        if (!src) continue;

        if (isImageFile(src.file)) {
            // Embed image as a page
            if (!loadedImages.has(src.id)) {
                const ab = await src.file.arrayBuffer();
                const mimeType = src.file.type || "image/jpeg";
                let embedded;
                if (mimeType === "image/png") {
                    embedded = await finalDoc.embedPng(ab);
                } else {
                    // JPEG and others → try JPEG first, fallback to rasterize
                    try {
                        embedded = await finalDoc.embedJpg(ab);
                    } catch {
                        // rasterize
                        const blob = await rasteriseToPng(src.file);
                        const pngAb = await blob.arrayBuffer();
                        embedded = await finalDoc.embedPng(pngAb);
                    }
                }
                loadedImages.set(src.id, embedded);
            }
            const img = loadedImages.get(src.id)!;
            const newPage = finalDoc.addPage([img.width, img.height]);
            newPage.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
            if (page.rotation !== 0) {
                newPage.setRotation(degrees(page.rotation));
            }
        } else {
            // PDF source
            if (!loadedPdfs.has(src.id)) {
                const ab = await src.file.arrayBuffer();
                const srcPdf = await PDFDocument.load(ab);
                loadedPdfs.set(src.id, srcPdf);
            }
            const srcPdf = loadedPdfs.get(src.id)!;
            const [copiedPage] = await finalDoc.copyPages(srcPdf, [page.pageIndexInSource]);
            const currentRotation = copiedPage.getRotation().angle;
            copiedPage.setRotation(degrees((currentRotation + page.rotation) % 360));
            finalDoc.addPage(copiedPage);
        }
    }

    return finalDoc.save();
}

async function rasteriseToPng(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("Canvas context unavailable"));
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Canvas toBlob failed"));
            }, "image/png");
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
        img.src = url;
    });
}



function PageCard({
    page,
    index,
    totalPages,
    onDelete,
    onRotate,
    onMoveLeft,
    onMoveRight,
    isDragging,
    onDragStart,
    onDragEnd,
    onDragOver,
    onAddBeforeBlank,
    onAddBeforeFiles,
    onAddAfterBlank,
    onAddAfterFiles,
}: {
    page: PageItem;
    index: number;
    totalPages: number;
    onDelete: () => void;
    onRotate: () => void;
    onMoveLeft: () => void;
    onMoveRight: () => void;
    isDragging: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onAddBeforeBlank: () => void;
    onAddBeforeFiles: () => void;
    onAddAfterBlank: () => void;
    onAddAfterFiles: () => void;
}) {
    const [hovered, setHovered] = useState(false);
    const colorScheme = FILE_COLORS.find((_, i) => {
        // Match by color string
        return page.color === FILE_COLORS[i].badge;
    }) || FILE_COLORS[0];

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            style={{ width: 140 }}
        >
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: isDragging ? 0.4 : 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.2 }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className={`relative flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing select-none group`}
                style={{ width: 140 }}
            >
                {/* Add Buttons (Left) */}
                <AnimatePresence>
                    {hovered && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-[35%] -left-3 -translate-y-1/2 -translate-x-1/2 z-20 flex flex-col gap-1.5 items-center"
                        >
                            <button
                                onClick={(e) => { e.stopPropagation(); onAddBeforeBlank(); }}
                                title="Insert blank page here"
                                className="flex items-center justify-center w-7 h-7 rounded-full bg-white border-2 border-[#047C58] text-[#047C58] hover:bg-[#047C58] hover:text-white transition-all shadow-md cursor-pointer"
                            >
                                <IconPlus size={14} stroke={2.5} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onAddBeforeFiles(); }}
                                title="Insert pages from file here"
                                className="flex items-center justify-center w-6 h-6 rounded-full bg-white border-2 border-[#8C886B] text-[#8C886B] hover:bg-[#8C886B] hover:text-white transition-all shadow-sm cursor-pointer"
                            >
                                <IconFile size={11} stroke={2.5} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Add Buttons (Right) */}
                <AnimatePresence>
                    {hovered && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-[35%] -right-3 -translate-y-1/2 translate-x-1/2 z-20 flex flex-col gap-1.5 items-center"
                        >
                            <button
                                onClick={(e) => { e.stopPropagation(); onAddAfterBlank(); }}
                                title="Insert blank page here"
                                className="flex items-center justify-center w-7 h-7 rounded-full bg-white border-2 border-[#047C58] text-[#047C58] hover:bg-[#047C58] hover:text-white transition-all shadow-md cursor-pointer"
                            >
                                <IconPlus size={14} stroke={2.5} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onAddAfterFiles(); }}
                                title="Insert pages from file here"
                                className="flex items-center justify-center w-6 h-6 rounded-full bg-white border-2 border-[#8C886B] text-[#8C886B] hover:bg-[#8C886B] hover:text-white transition-all shadow-sm cursor-pointer"
                            >
                                <IconFile size={11} stroke={2.5} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Thumbnail container */}
                <div
                    className={`relative w-full rounded-xl overflow-hidden border-2 transition-all duration-200 shadow-sm ${hovered ? "shadow-xl" : ""
                        }`}
                    style={{
                        borderColor: hovered ? page.color : "#E0DED9",
                        aspectRatio: page.isBlankPage ? "0.707" : "0.707",
                        background: page.isBlankPage ? "#fafaf9" : "#f3f3f3",
                    }}
                >
                    {/* Thumbnail image */}
                    {page.thumbnail ? (
                        <img
                            src={page.thumbnail}
                            alt={`Page ${index + 1}`}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                                transform: `rotate(${page.rotation}deg)`,
                                transition: "transform 0.3s ease",
                            }}
                            draggable={false}
                        />
                    ) : page.isBlankPage ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-border">
                            <IconFile size={28} stroke={1.5} />
                            <span className="text-[10px] font-medium text-brand-sage">Blank</span>
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <IconLoader2 size={20} className="animate-spin text-brand-sage" />
                        </div>
                    )}

                    {/* Rotation indicator */}
                    {page.rotation !== 0 && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white/90 flex items-center justify-center text-[#047C58]">
                            <IconRotateClockwise size={10} />
                        </div>
                    )}

                    {/* Action overlay on hover */}
                    <AnimatePresence>
                        {hovered && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.12 }}
                                className="absolute inset-0 bg-black/30 flex items-center justify-center gap-2"
                            >
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRotate(); }}
                                    title="Rotate 90°"
                                    className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-brand-dark hover:bg-[#047C58] hover:text-white transition-all shadow-md cursor-pointer"
                                >
                                    <IconRotateClockwise size={16} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                    title="Delete page"
                                    className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-brand-dark hover:bg-red-500 hover:text-white transition-all shadow-md cursor-pointer"
                                >
                                    <IconTrash size={16} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Drag handle */}
                    <div className="absolute bottom-1 right-1 text-white/60">
                        <IconGripVertical size={12} />
                    </div>
                </div>

                {/* Page label below */}
                <div
                    className="text-[11px] font-bold px-3 py-1 rounded-full text-white shadow-sm mt-1"
                    style={{ background: page.color }}
                >
                    {page.label}
                </div>

                {/* Move arrows (always take up space to prevent layout jump, but fade in on hover) */}
                <div
                    className={`flex gap-1 mt-1 transition-all duration-200 ${hovered ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none translate-y-1"
                        }`}
                >
                    <button
                        onClick={onMoveLeft}
                        disabled={index === 0}
                        title="Move left"
                        className="flex items-center justify-center w-6 h-6 rounded-lg bg-white border border-border text-brand-sage hover:border-[#047C58] hover:text-[#047C58] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
                    >
                        <IconChevronUp size={12} style={{ transform: "rotate(-90deg)" }} />
                    </button>
                    <button
                        onClick={onMoveRight}
                        disabled={index === totalPages - 1}
                        title="Move right"
                        className="flex items-center justify-center w-6 h-6 rounded-lg bg-white border border-border text-brand-sage hover:border-[#047C58] hover:text-[#047C58] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
                    >
                        <IconChevronDown size={12} style={{ transform: "rotate(-90deg)" }} />
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Source File Row ──────────────────────────────────────────────────────────

function SourceFileRow({
    src,
    index,
    total,
    onRemove,
}: {
    src: SourceFile;
    index: number;
    total: number;
    onRemove: () => void;
}) {

    return (
        <div className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-white hover:border-[#047C58]/40 transition-all group active:cursor-grabbing cursor-grab w-full">
            <div
                className="flex items-center justify-center w-7 h-7 rounded-lg text-white text-[11px] font-bold shrink-0 shadow-sm"
                style={{ background: src.color }}
            >
                {src.label}
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
                <p
                    className="text-xs font-semibold text-brand-dark truncate"
                    title={src.file.name}
                >
                    {src.file.name}
                </p>
                <p className="text-[10px] text-brand-sage">{src.size}</p>
            </div>

            {/* Drag Handle */}
            <div className="text-brand-sage opacity-50 group-hover:opacity-100 transition-opacity flex items-center justify-center w-5 h-5 shrink-0">
                <IconGripVertical size={14} />
            </div>

            {/* Delete */}
            <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="flex items-center justify-center w-6 h-6 rounded-lg text-brand-sage hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 shrink-0"
            >
                <IconTrash size={13} />
            </button>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrganisePdfConvertPage() {
    const router = useRouter();
    const hasInitialized = useRef(false);
    const addAtIndexRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
    const [pages, setPages] = useState<PageItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);

    // Drag state for Pages
    const dragPageId = useRef<string | null>(null);
    const dragOverPageId = useRef<string | null>(null);
    const canvasScrollRef = useRef<HTMLDivElement>(null);
    const dragScrollRaf = useRef<number | null>(null);

    const stopDragScroll = () => {
        if (dragScrollRaf.current !== null) {
            cancelAnimationFrame(dragScrollRaf.current);
            dragScrollRaf.current = null;
        }
    };

    const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const el = canvasScrollRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const distTop = e.clientY - rect.top;
        const distBottom = rect.bottom - e.clientY;
        const threshold = 80;
        const speed = 12;
        stopDragScroll();
        if (distTop < threshold || distBottom < threshold) {
            const tick = () => {
                if (!canvasScrollRef.current) return;
                if (distTop < threshold) {
                    canvasScrollRef.current.scrollTop -= speed * (1 - distTop / threshold);
                } else {
                    canvasScrollRef.current.scrollTop += speed * (1 - distBottom / threshold);
                }
                dragScrollRaf.current = requestAnimationFrame(tick);
            };
            dragScrollRaf.current = requestAnimationFrame(tick);
        }
    }, []);

    // ── Load files from FileStore ────────────────────────────
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const rawFiles: File[] = [];
        for (let i = 0; i < 200; i++) {
            const f = FileStore.getFile(`organise_${i}`);
            if (!f) break;
            rawFiles.push(f);
            FileStore.clearFile(`organise_${i}`);
        }

        if (rawFiles.length === 0) {
            router.replace("/organise-pdf");
            return;
        }

        processFiles(rawFiles, 0);
    }, [router]);

    // ── Process and render files ─────────────────────────────
    const processFiles = useCallback(async (
        rawFiles: File[],
        insertAfterPageIndex: number | null = null
    ) => {
        setIsLoading(true);
        setLoadingProgress(0);

        const newSources: SourceFile[] = [];
        const newPages: PageItem[] = [];

        const existingCount = sourceFiles.length;

        for (let fi = 0; fi < rawFiles.length; fi++) {
            const file = rawFiles[fi];
            const globalIndex = existingCount + fi;
            const label = getFileLabel(globalIndex);
            const color = FILE_COLORS[globalIndex % FILE_COLORS.length].badge;

            const src: SourceFile = {
                id: uid(),
                file,
                label,
                color,
                size: formatBytes(file.size),
                order: globalIndex,
            };
            newSources.push(src);

            // Generate pages
            if (isImageFile(file)) {
                const thumb = await renderImageThumbnail(file);
                newPages.push({
                    id: uid(),
                    sourceFileId: src.id,
                    sourceLabel: label,
                    pageIndexInSource: 0,
                    rotation: 0,
                    thumbnail: thumb,
                    isBlankPage: false,
                    label: `${label}1`,
                    color,
                });
            } else {
                // PDF
                try {
                    const thumbs = await renderPdfThumbnails(file);
                    thumbs.forEach((thumb, pi) => {
                        newPages.push({
                            id: uid(),
                            sourceFileId: src.id,
                            sourceLabel: label,
                            pageIndexInSource: pi,
                            rotation: 0,
                            thumbnail: thumb,
                            isBlankPage: false,
                            label: `${label}${pi + 1}`,
                            color,
                        });
                    });
                } catch (e) {
                    console.error("Failed to render PDF:", e);
                }
            }

            setLoadingProgress(Math.round(((fi + 1) / rawFiles.length) * 100));
        }

        setSourceFiles((prev) => [...prev, ...newSources]);

        if (insertAfterPageIndex !== null) {
            // Insert pages at a specific index
            setPages((prev) => {
                const copy = [...prev];
                copy.splice(insertAfterPageIndex + 1, 0, ...newPages);
                return copy;
            });
        } else {
            setPages((prev) => [...prev, ...newPages]);
        }

        setIsLoading(false);
    }, [sourceFiles]);

    // ── Add files from file picker ───────────────────────────
    const handleAddFiles = useCallback((fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return;
        const files = Array.from(fileList).filter(
            (f) => f.type === "application/pdf" || isImageFile(f)
        );
        if (files.length === 0) return;
        processFiles(files, addAtIndexRef.current);
        addAtIndexRef.current = null;
        setError(null);
    }, [processFiles]);

    // ── Page operations ───────────────────────────────────────
    const deletePage = useCallback((id: string) => {
        setPages((prev) => prev.filter((p) => p.id !== id));
    }, []);

    const rotatePage = useCallback((id: string) => {
        setPages((prev) =>
            prev.map((p) =>
                p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p
            )
        );
    }, []);

    const movePage = useCallback((fromIndex: number, toIndex: number) => {
        setPages((prev) => {
            const arr = [...prev];
            const [moved] = arr.splice(fromIndex, 1);
            arr.splice(toIndex, 0, moved);
            return arr;
        });
    }, []);

    const insertBlankPage = useCallback((afterIndex: number) => {
        const blankPage: PageItem = {
            id: uid(),
            sourceFileId: "blank",
            sourceLabel: "—",
            pageIndexInSource: 0,
            rotation: 0,
            thumbnail: null,
            isBlankPage: true,
            label: "Blank",
            color: "#8C886B",
        };
        setPages((prev) => {
            const arr = [...prev];
            arr.splice(afterIndex + 1, 0, blankPage);
            return arr;
        });
    }, []);

    // ── Source file operations ────────────────────────────────
    const removeSourceFile = useCallback((srcId: string) => {
        setSourceFiles((prev) => prev.filter((s) => s.id !== srcId));
        setPages((prev) => prev.filter((p) => p.sourceFileId !== srcId));
    }, []);

    const moveSourceFile = useCallback((fromIndex: number, toIndex: number) => {
        setSourceFiles((prev) => {
            const arr = [...prev];
            const [moved] = arr.splice(fromIndex, 1);
            arr.splice(toIndex, 0, moved);
            return arr;
        });
    }, []);

    const handleDragStart = useCallback((e: React.DragEvent, pageId: string) => {
        dragPageId.current = pageId;
        e.dataTransfer.effectAllowed = "move";
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, pageId: string) => {
        e.preventDefault();
        dragOverPageId.current = pageId;
    }, []);

    const handleDragEnd = useCallback(() => {
        stopDragScroll();
        if (!dragPageId.current || !dragOverPageId.current) return;
        if (dragPageId.current === dragOverPageId.current) return;

        setPages((prev) => {
            const fromIdx = prev.findIndex((p) => p.id === dragPageId.current);
            const toIdx = prev.findIndex((p) => p.id === dragOverPageId.current);
            if (fromIdx === -1 || toIdx === -1) return prev;
            const arr = [...prev];
            const [moved] = arr.splice(fromIdx, 1);
            arr.splice(toIdx, 0, moved);
            return arr;
        });
        dragPageId.current = null;
        dragOverPageId.current = null;
    }, []);

    // ── Source File Drag and drop (Reorder) ─────────────────────────
    const handleSourceFilesReorder = (newOrder: SourceFile[]) => {
        setSourceFiles(newOrder);

        // Synchronize pages array in real-time
        setPages((prevPages) => {
            const attached = prevPages.map((p, originalIndex) => {
                let sId = p.sourceFileId;
                // For blank pages, link them to the non-blank page immediately preceding them
                if (sId === "blank") {
                    for (let j = originalIndex - 1; j >= 0; j--) {
                        if (prevPages[j].sourceFileId !== "blank") {
                            sId = prevPages[j].sourceFileId;
                            break;
                        }
                    }
                }
                return { p, sId, originalIndex };
            });

            attached.sort((a, b) => {
                const iA = newOrder.findIndex(s => s.id === a.sId);
                const iB = newOrder.findIndex(s => s.id === b.sId);

                if (iA === -1 && iB !== -1) return -1;
                if (iB === -1 && iA !== -1) return 1;

                if (iA !== iB) return iA - iB;

                // Fallback to stable sub-sort to preserve internal file page order and blank associations
                return a.originalIndex - b.originalIndex;
            });

            return attached.map(x => x.p);
        });
    };


    // ── Export ────────────────────────────────────────────────
    const handleExport = async () => {
        if (pages.length === 0) {
            setError("No pages to export. Please add at least one page.");
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const bytes = await buildOrganisedPdf(pages, sourceFiles);
            const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
            downloadBlob(blob, "organised.pdf");
            setSuccess(true);
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Export failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    // ── Loading screen ────────────────────────────────────────
    if (isLoading && pages.length === 0) {
        return (
            <div className="min-h-screen flex flex-col" style={{ background: "var(--brand-white)" }}>
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <IconLoader2 size={36} className="animate-spin text-[#047C58]" />
                        <p className="text-brand-sage text-sm font-medium">Reading PDF pages…</p>
                    </div>
                </main>
            </div>
        );
    }

    // ── Success screen ────────────────────────────────────────
    if (success) {
        return (
            <div className="min-h-screen flex flex-col" style={{ background: "var(--brand-white)" }}>
                <Navbar />
                <main className="flex-1 flex items-center justify-center pt-16 py-24">
                    <div className="flex flex-col items-center text-center gap-5">
                        <span className="flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-600">
                            <IconCheck size={40} stroke={2} />
                        </span>
                        <h1 className="text-2xl font-bold text-brand-dark">PDF Downloaded!</h1>
                        <p className="text-brand-sage max-w-sm">
                            Your organised PDF with {pages.length} page{pages.length !== 1 ? "s" : ""} has been downloaded.
                        </p>
                        <div className="flex gap-3 mt-2">
                            <button
                                onClick={() => { setSuccess(false); setPages([]); setSourceFiles([]); router.push("/organise-pdf"); }}
                                className="px-6 py-3 rounded-xl bg-white text-brand-dark font-semibold border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
                            >
                                Start over
                            </button>
                            <button
                                onClick={() => setSuccess(false)}
                                className="px-6 py-3 rounded-xl bg-[#047C58] text-white font-semibold hover:bg-[#036245] transition-all cursor-pointer shadow-md"
                            >
                                Continue editing
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // ── Main editor ───────────────────────────────────────────
    return (
        <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--brand-white)" }}>
            <Navbar />

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                className="hidden"
                onChange={(e) => handleAddFiles(e.target.files)}
                onClick={(e) => (e.currentTarget.value = "")}
            />

            {/* Dot background */}
            <div aria-hidden className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage: "radial-gradient(circle, #047C58 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                    opacity: 0.05,
                }}
            />

            <main className="flex-1 max-w-7xl mx-auto px-4 md:px-8 w-full pt-24 pb-6 relative z-10 flex flex-col lg:flex-row gap-6 min-h-0">

                {/* ── Header details (Visible small mostly, but part of structural flow) ── */}
                <div className="w-full lg:hidden flex items-center gap-2 mb-2 shrink-0">
                    <button
                        onClick={() => router.push("/organise-pdf")}
                        aria-label="Back"
                        className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg text-brand-sage hover:text-brand-dark hover:bg-slate-100 transition-colors cursor-pointer active:scale-[0.97]"
                    >
                        <IconArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg text-white shrink-0 bg-[#047C58]">
                            <IconStack2 size={16} stroke={1.5} />
                        </span>
                        <div className="min-w-0">
                            <h1 className="text-sm font-bold text-brand-dark leading-tight truncate">Organise PDF</h1>
                            <p className="text-[10px] text-brand-sage leading-tight truncate">{pages.length} pages</p>
                        </div>
                    </div>
                </div>

                {/* ── Page canvas area ─────────────────────── */}
                <div className="flex-1 min-w-0 bg-white border border-border rounded-2xl flex flex-col shadow-sm overflow-hidden">
                    <div className="hidden lg:flex items-center gap-4 px-5 py-4 border-b border-slate-100 bg-white z-10 shrink-0">
                        <button onClick={() => router.push("/organise-pdf")} className="flex items-center justify-center w-10 h-10 rounded-xl text-brand-sage hover:text-brand-dark hover:bg-slate-100 transition-colors cursor-pointer">
                            <IconArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-brand-dark">Organise PDF</h1>
                            <p className="text-xs text-brand-sage">{pages.length} pages • Drag to reorder</p>
                        </div>
                    </div>

                    <div
                        ref={canvasScrollRef}
                        className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 relative"
                        onDragOver={handleCanvasDragOver}
                        onDragLeave={stopDragScroll}
                        onDrop={stopDragScroll}
                    >
                        {/* Error bar embedded temporarily at top inside canvas */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="absolute top-0 left-0 right-0 shrink-0 bg-red-50 border-b border-red-100 px-6 py-2.5 flex items-center gap-2 text-sm text-red-600 z-20"
                                >
                                    <IconAlertCircle size={16} />
                                    {error}
                                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 font-bold cursor-pointer">×</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {pages.length === 0 && !isLoading ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-brand-sage">
                                    <IconStack2 size={32} stroke={1.5} />
                                </div>
                                <p className="text-brand-dark font-semibold">No pages yet</p>
                                <p className="text-brand-sage text-sm max-w-xs">Add a PDF or image using "Add Files" to get started.</p>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#047C58] text-white font-semibold hover:bg-[#036245] transition-all cursor-pointer shadow-md"
                                >
                                    <IconPlus size={16} />
                                    Add Files
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-8 items-start justify-center">
                                {pages.map((page, index) => (
                                    <div key={page.id} className="py-2">
                                        <PageCard
                                            page={page}
                                            index={index}
                                            totalPages={pages.length}
                                            onDelete={() => deletePage(page.id)}
                                            onRotate={() => rotatePage(page.id)}
                                            onMoveLeft={() => movePage(index, index - 1)}
                                            onMoveRight={() => movePage(index, index + 1)}
                                            isDragging={dragPageId.current === page.id}
                                            onDragStart={(e) => handleDragStart(e, page.id)}
                                            onDragEnd={handleDragEnd}
                                            onDragOver={(e) => handleDragOver(e, page.id)}
                                            onAddBeforeBlank={() => insertBlankPage(index - 1)}
                                            onAddBeforeFiles={() => {
                                                addAtIndexRef.current = index - 1;
                                                fileInputRef.current?.click();
                                            }}
                                            onAddAfterBlank={() => insertBlankPage(index)}
                                            onAddAfterFiles={() => {
                                                addAtIndexRef.current = index;
                                                fileInputRef.current?.click();
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right sidebar: source files ──────────── */}
                <div className="w-full lg:w-80 shrink-0 lg:overflow-y-auto custom-scrollbar lg:pr-2 lg:pb-0 pb-10">
                    <div className="bg-white rounded-2xl border border-border flex flex-col gap-0 shadow-sm min-h-[400px]">
                        <div className="p-4 border-b border-border shrink-0">
                            <h2 className="text-sm font-bold text-brand-dark">Source Files</h2>
                            <p className="text-[11px] text-brand-sage mt-0.5">
                                {sourceFiles.length} file{sourceFiles.length !== 1 ? "s" : ""} · Drag to reorder
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-2">
                            <Reorder.Group
                                axis="y"
                                values={sourceFiles}
                                onReorder={handleSourceFilesReorder}
                                as="div"
                                className="flex flex-col gap-2"
                            >
                                <AnimatePresence>
                                    {sourceFiles.map((src, index) => (
                                        <Reorder.Item key={src.id} value={src} as="div">
                                            <SourceFileRow
                                                src={src}
                                                index={index}
                                                total={sourceFiles.length}
                                                onRemove={() => removeSourceFile(src.id)}
                                            />
                                        </Reorder.Item>
                                    ))}
                                </AnimatePresence>
                            </Reorder.Group>

                            {sourceFiles.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                                    <IconFileTypePdf size={24} className="text-border" />
                                    <p className="text-xs text-brand-sage">No files added yet</p>
                                </div>
                            )}
                        </div>

                        {/* Buttons at bottom of sidebar */}
                        <div className="p-3 border-t border-border flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    addAtIndexRef.current = null;
                                    fileInputRef.current?.click();
                                }}
                                className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl border border-dashed border-[#8C886B] text-[#8C886B] text-sm font-medium hover:border-[#047C58] hover:text-[#047C58] hover:bg-[#047C58]/5 transition-all cursor-pointer"
                            >
                                <IconPlus size={16} />
                                Add PDF or Image
                            </button>

                            <button
                                onClick={handleExport}
                                disabled={pages.length === 0 || isProcessing}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-[15px] font-bold text-white transition-all cursor-pointer shadow-md active:scale-[0.98] ${pages.length === 0 || isProcessing
                                    ? "bg-[#047C58]/40 cursor-not-allowed"
                                    : "bg-[#047C58] hover:bg-[#036245] shadow-[#047C58]/20"
                                    }`}
                            >
                                {isProcessing ? (
                                    <IconLoader2 size={20} className="animate-spin" />
                                ) : (
                                    <IconDownload size={20} />
                                )}
                                <span>{isProcessing ? "Exporting…" : "Export PDF"}</span>
                            </button>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
