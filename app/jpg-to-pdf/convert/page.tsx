"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence, Reorder } from "motion/react";
import {
    IconPhoto,
    IconPlus,
    IconTrash,
    IconRotateClockwise,
    IconLoader2,
    IconCheck,
    IconArrowLeft,
    IconFileTypePdf,
    IconChevronDown,
} from "@tabler/icons-react";
import { imagesToPdf, downloadBlob } from "@/lib/pdf-utils";
import FileStore from "@/lib/file-store";
import { useRateLimitedAction } from "@/lib/use-rate-limited-action";
import { RateLimitModal } from "@/components/RateLimitModal";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ImageItem {
    id: string;
    file: File;
    preview: string;
    rotation: number; // 0, 90, 180, 270
}

// ─── Page size presets ───────────────────────────────────────────────────────

const PAGE_SIZES = [
    { label: "Fit to image", value: "fit" },
    { label: "A4 (8.27 × 11.69 in)", value: "a4" },
    { label: "A5 (5.83 × 8.27 in)", value: "a5" },
    { label: "A3 (11.69 × 16.54 in)", value: "a3" },
    { label: "Letter (8.5 × 11 in)", value: "letter" },
    { label: "Legal (8.5 × 14 in)", value: "legal" },
    { label: "Ledger (11 × 17 in)", value: "ledger" },
];

const MARGIN_OPTIONS = [
    { label: "None", value: "none", sub: "0\"" },
    { label: "Small", value: "small", sub: "0.5\"" },
    { label: "Large", value: "large", sub: "1\"" },
];

// Page dimensions in pts (portrait width × height) — used for live preview
const PAGE_SIZE_DIMS: Record<string, [number, number]> = {
    a5: [419, 595],
    a4: [595, 842],
    a3: [842, 1191],
    letter: [612, 792],
    legal: [612, 1008],
    ledger: [792, 1224],
};

// How much padding (%) to show inside the white page as a margin preview
const MARGIN_PREVIEW_PCT: Record<string, number> = {
    none: 0,
    small: 6,
    large: 13,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
    return Math.random().toString(36).slice(2, 10);
}

function rotateObjectURL(file: File, rotation: number): Promise<Blob> {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const isOdd = rotation === 90 || rotation === 270;
            const canvas = document.createElement("canvas");
            canvas.width = isOdd ? img.height : img.width;
            canvas.height = isOdd ? img.width : img.height;
            const ctx = canvas.getContext("2d")!;
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            URL.revokeObjectURL(url);
            canvas.toBlob((blob) => resolve(blob!), file.type || "image/png");
        };
        img.src = url;
    });
}

// ─── Image Card ──────────────────────────────────────────────────────────────

function ImageCard({
    item,
    onRotate,
    onDelete,
    pageSize,
    orientation,
    margin,
}: {
    item: ImageItem;
    onRotate: () => void;
    onDelete: () => void;
    pageSize: string;
    orientation: "portrait" | "landscape";
    margin: string;
}) {
    // Track natural image dimensions for "fit" mode
    const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number } | null>(null);

    // ── Compute page preview geometry ──────────────────────────────────────
    const isFit = pageSize === "fit";

    let pw: number, ph: number;
    if (isFit) {
        // Use the actual image dimensions (or square fallback before load)
        const nw = imgNaturalSize?.w ?? 1;
        const nh = imgNaturalSize?.h ?? 1;
        // Apply orientation: if landscape, the page is wider than tall
        if (orientation === "landscape") {
            pw = Math.max(nw, nh);
            ph = Math.min(nw, nh);
        } else {
            pw = Math.min(nw, nh);
            ph = Math.max(nw, nh);
        }
    } else {
        [pw, ph] = PAGE_SIZE_DIMS[pageSize] ?? [595, 842];
        if (orientation === "landscape") [pw, ph] = [ph, pw];
    }

    // The card outer area has aspect-ratio 3/4 (portrait rectangle).
    const CARD_ASPECT = 3 / 4;   // card width / card height
    const pageAspect = pw / ph;  // page width / page height
    // If page is thinner than the card, height is the constraint; otherwise width.
    const fitByHeight = pageAspect <= CARD_ASPECT;

    const marginPct = MARGIN_PREVIEW_PCT[margin] ?? 0;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.22 }}
            className="group relative flex flex-col rounded-2xl overflow-hidden border-2 border-slate-100 bg-white shadow-sm hover:border-[#EAB308]/60 hover:shadow-md transition-all duration-200 select-none cursor-grab active:cursor-grabbing"
        >
            {/* ── Preview area ── */}
            <div
                className="relative overflow-hidden bg-[#e8e6e3] flex items-center justify-center"
                style={{ aspectRatio: "3/4" }}
            >
                {/* Always show a white "paper" frame */}
                <div
                    className="relative bg-white shadow-md border border-black/10 flex items-center justify-center overflow-hidden transition-all duration-200"
                    style={{
                        aspectRatio: `${pw} / ${ph}`,
                        ...(fitByHeight
                            ? { height: "86%", width: "auto" }
                            : { width: "86%", height: "auto" }),
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={item.preview}
                        alt={item.file.name}
                        onLoad={(e) => {
                            const el = e.currentTarget;
                            setImgNaturalSize({ w: el.naturalWidth, h: el.naturalHeight });
                        }}
                        className="w-full h-full object-contain transition-all duration-200"
                        style={{
                            padding: `${marginPct}%`,
                            transform: `rotate(${item.rotation}deg)`,
                        }}
                        draggable={false}
                    />
                </div>

                {/* Desktop hover overlay */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center gap-3">
                    <button
                        onClick={(e) => { e.stopPropagation(); onRotate(); }}
                        title="Rotate 90°"
                        className="flex items-center justify-center w-9 h-9 rounded-full bg-white/90 text-brand-dark hover:bg-[#EAB308] hover:text-white transition-colors shadow cursor-pointer"
                    >
                        <IconRotateClockwise size={17} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        title="Remove"
                        className="flex items-center justify-center w-9 h-9 rounded-full bg-white/90 text-brand-dark hover:bg-red-500 hover:text-white transition-colors shadow cursor-pointer"
                    >
                        <IconTrash size={17} />
                    </button>
                </div>
            </div>

            {/* File name */}
            <div className="px-2 py-1.5 bg-white border-t border-slate-100">
                <p className="text-[11px] text-brand-sage font-medium truncate" title={item.file.name}>
                    {item.file.name}
                </p>
            </div>

            {/* Mobile action row — always visible */}
            <div className="md:hidden flex items-center gap-1 px-2 pb-2 bg-white">
                <button
                    onClick={onRotate}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-50 text-brand-sage hover:bg-[#EAB308]/10 hover:text-[#EAB308] text-xs font-medium transition-colors cursor-pointer"
                >
                    <IconRotateClockwise size={13} /> Rotate
                </button>
                <button
                    onClick={onDelete}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-50 text-brand-sage hover:bg-red-50 hover:text-red-500 text-xs font-medium transition-colors cursor-pointer"
                >
                    <IconTrash size={13} /> Remove
                </button>
            </div>
        </motion.div>
    );
}


// ─── Custom Select ────────────────────────────────────────────────────────────

function CustomSelect<T extends string>({
    options,
    value,
    onChange,
    label,
}: {
    options: { label: string; value: T }[];
    value: T;
    onChange: (v: T) => void;
    label: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const current = options.find((o) => o.value === value);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <label className="block text-xs font-bold text-brand-sage uppercase tracking-widest mb-1.5">{label}</label>
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-brand-dark hover:border-[#EAB308] transition-colors shadow-sm cursor-pointer"
            >
                <span className="truncate">{current?.label}</span>
                <IconChevronDown size={14} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.14 }}
                        className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                    >
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setOpen(false); }}
                                className={`w-full text-left px-3 py-2.5 text-sm transition-colors cursor-pointer ${value === opt.value
                                    ? "bg-[#EAB308]/10 text-[#EAB308] font-semibold"
                                    : "text-brand-dark hover:bg-slate-50"
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ImageToPdfConvertPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const hasInitialized = useRef(false);  // guard against React Strict Mode double-invoke

    const [images, setImages] = useState<ImageItem[]>([]);
    const [pageSize, setPageSize] = useState<string>("a4");
    const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
    const [margin, setMargin] = useState<string>("none");
    const [mergeAll, setMergeAll] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { execute, limitResult, clearLimitResult } = useRateLimitedAction();

    const [isLoading, setIsLoading] = useState(true);  // true until we finish reading FileStore

    // Load initial files from FileStore.
    // IMPORTANT: guard with hasInitialized so React Strict Mode's double-invoke
    // doesn't clear the store on the first call and redirect on the second.
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const items: ImageItem[] = [];
        for (let i = 0; i < 200; i++) {
            const f = FileStore.getFile(`img_${i}`);
            if (!f) break;
            items.push({ id: uid(), file: f, preview: URL.createObjectURL(f), rotation: 0 });
        }

        if (items.length === 0) {
            // No files were staged — send back to upload page
            router.replace("/jpg-to-pdf");
            return;
        }

        // Clear store only AFTER we've confirmed we have files
        for (let i = 0; i < items.length; i++) FileStore.clearFile(`img_${i}`);

        setImages(items);
        setIsLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally empty — should only run once on mount

    // Cleanup object URLs on unmount
    useEffect(() => {
        return () => {
            images.forEach((img) => URL.revokeObjectURL(img.preview));
        };
    }, []);

    const addFiles = useCallback((newFiles: FileList | null) => {
        if (!newFiles) return;
        const items: ImageItem[] = [];
        for (const f of Array.from(newFiles)) {
            items.push({ id: uid(), file: f, preview: URL.createObjectURL(f), rotation: 0 });
        }
        setImages((prev) => [...prev, ...items]);
        setError(null);
    }, []);

    const rotateImage = (id: string) => {
        setImages((prev) =>
            prev.map((img) => img.id === id ? { ...img, rotation: (img.rotation + 90) % 360 } : img)
        );
    };

    const deleteImage = (id: string) => {
        setImages((prev) => {
            const img = prev.find((i) => i.id === id);
            if (img) URL.revokeObjectURL(img.preview);
            return prev.filter((i) => i.id !== id);
        });
    };

    const handleConvert = () => execute(async () => {
        if (images.length === 0) return;
        setIsProcessing(true);
        setError(null);

        try {
            // Apply rotations: for non-0 rotation, we draw on canvas first
            const processedFiles: File[] = [];
            for (const img of images) {
                if (img.rotation === 0) {
                    processedFiles.push(img.file);
                } else {
                    const blob = await rotateObjectURL(img.file, img.rotation);
                    processedFiles.push(new File([blob], img.file.name, { type: blob.type }));
                }
            }

            const pdfOutput = await imagesToPdf(processedFiles, {
                pageSize,
                orientation,
                margin,
                mergeAll,
            });

            if (mergeAll || images.length === 1) {
                const pdfBytes = Array.isArray(pdfOutput) ? pdfOutput[0] : pdfOutput;
                const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
                const name = images.length === 1
                    ? images[0].file.name.replace(/\.[^/.]+$/, ".pdf")
                    : "images.pdf";
                downloadBlob(blob, name);
            } else {
                const JSZip = (await import("jszip")).default;
                const zip = new JSZip();

                (pdfOutput as Uint8Array[]).forEach((bytes, i) => {
                    const originalName = images[i].file.name.replace(/\.[^/.]+$/, "");
                    zip.file(`${originalName}.pdf`, bytes);
                });

                const zipBlob = await zip.generateAsync({ type: "blob" });
                downloadBlob(zipBlob, "converted-images.zip");
            }

            setSuccess(true);
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Conversion failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    });

    // ── Loading screen (while reading FileStore on mount) ──
    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col" style={{ background: "var(--brand-white)" }}>
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <IconLoader2 size={36} className="animate-spin text-[#EAB308]" />
                        <p className="text-brand-sage text-sm font-medium">Loading your images…</p>
                    </div>
                </main>
            </div>
        );
    }

    // ── Success screen ──
    if (success) {
        return (
            <div className="min-h-screen flex flex-col" style={{ background: "var(--brand-white)" }}>
                <Navbar />
                <main className="flex-1 flex items-center justify-center py-24">
                    <div className="flex flex-col items-center text-center gap-5 animate-in fade-in zoom-in duration-300">
                        <span className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600">
                            <IconCheck size={40} stroke={2} />
                        </span>
                        <h1 className="text-2xl font-bold text-brand-dark">PDF Created!</h1>
                        <p className="text-brand-sage max-w-sm">Your images have been merged into a PDF and are downloading.</p>
                        <div className="flex gap-3 mt-2">
                            <button
                                onClick={() => { setSuccess(false); setImages([]); router.push("/jpg-to-pdf"); }}
                                className="px-6 py-3 rounded-xl bg-white text-brand-dark font-semibold border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
                            >
                                Start over
                            </button>
                            <button
                                onClick={() => setSuccess(false)}
                                className="px-6 py-3 rounded-xl bg-[#EAB308] text-white font-semibold hover:bg-[#ca9a04] transition-all cursor-pointer shadow-md"
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
        <div className="h-screen flex flex-col relative overflow-hidden" style={{ background: "var(--brand-white)" }}>
            <RateLimitModal
                open={!!limitResult && !limitResult.allowed}
                resetAt={limitResult?.resetAt ?? 0}
                onClose={clearLimitResult}
            />
            <Navbar />

            {/* Dot background */}
            <div aria-hidden className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage: "radial-gradient(circle, #8C886B 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                    opacity: 0.05,
                }}
            />

            <main className="flex-1 max-w-7xl mx-auto px-4 md:px-8 w-full pt-24 pb-6 relative z-10 flex flex-col overflow-hidden">
                {/* ── Header ── Mobile: 1 row  |  Desktop: 1 row ── */}
                <div className="mb-8 shrink-0">

                    {/* ── Mobile: single row — [←] | title+count | [+ Add Images] ── */}
                    <div className="flex md:hidden items-center gap-2">
                        {/* Arrow only */}
                        <button
                            onClick={() => router.push("/jpg-to-pdf")}
                            aria-label="Back"
                            className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg text-brand-sage hover:text-brand-dark hover:bg-slate-100 transition-colors cursor-pointer active:scale-[0.97]"
                        >
                            <IconArrowLeft size={18} />
                        </button>

                        {/* Title + count — grows to fill space */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg text-white shrink-0" style={{ background: "#EAB308" }}>
                                <IconPhoto size={16} stroke={1.5} />
                            </span>
                            <div className="min-w-0">
                                <h1 className="text-sm font-bold text-brand-dark leading-tight truncate">Image to PDF</h1>
                                <p className="text-[10px] text-brand-sage leading-tight">{images.length} image{images.length !== 1 ? "s" : ""} loaded</p>
                            </div>
                        </div>

                        {/* + Add Images */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1 px-2.5 py-2 rounded-lg border border-[#EAB308] text-[#EAB308] text-xs font-semibold hover:bg-[#EAB308] hover:text-white transition-all cursor-pointer shadow-sm active:scale-[0.97] shrink-0"
                        >
                            <IconPlus size={13} /> Add Images
                        </button>
                    </div>

                    {/* ── Desktop: single row (unchanged) ── */}
                    <div className="hidden md:flex items-center gap-4">
                        <button
                            onClick={() => router.push("/jpg-to-pdf")}
                            className="flex items-center gap-1.5 text-sm font-medium text-brand-sage hover:text-brand-dark hover:bg-slate-100 px-3 py-1.5 rounded-lg -ml-2 transition-colors cursor-pointer"
                        >
                            <IconArrowLeft size={16} /> Back
                        </button>
                        <div className="w-px h-5 bg-slate-200" />
                        <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-10 h-10 rounded-xl text-white" style={{ background: "#EAB308" }}>
                                <IconPhoto size={20} stroke={1.5} />
                            </span>
                            <div>
                                <h1 className="text-xl font-bold text-brand-dark">Image to PDF</h1>
                                <p className="text-xs text-brand-sage">{images.length} image{images.length !== 1 ? "s" : ""} loaded</p>
                            </div>
                        </div>
                        <div className="ml-auto">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#EAB308] text-[#EAB308] text-sm font-semibold hover:bg-[#EAB308] hover:text-white transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                            >
                                <IconPlus size={16} /> Add More Images
                            </button>
                        </div>
                    </div>
                </div>


                {/* Hidden file input (shared between both Add More buttons) */}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                />

                <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden custom-scrollbar">

                    {/* ── Images Grid ── */}
                    <div className="flex-1 min-w-0 lg:overflow-y-auto custom-scrollbar lg:pr-2 pb-6 lg:pb-10">
                        {images.length === 0 ? (
                            <div
                                className="flex flex-col items-center justify-center min-h-[300px] rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 text-brand-sage cursor-pointer hover:border-[#EAB308]/60 hover:bg-yellow-50/30 transition-all group"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <IconPlus size={36} className="mb-3 opacity-40 group-hover:opacity-60 group-hover:text-[#EAB308] transition-all" />
                                <p className="font-medium text-sm">Add images to get started</p>
                            </div>
                        ) : (
                            <Reorder.Group
                                axis="y"
                                values={images}
                                onReorder={setImages}
                                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                                as="div"
                            >
                                <AnimatePresence>
                                    {images.map((img) => (
                                        <Reorder.Item key={img.id} value={img} as="div">
                                            <ImageCard
                                                item={img}
                                                onRotate={() => rotateImage(img.id)}
                                                onDelete={() => deleteImage(img.id)}
                                                pageSize={pageSize}
                                                orientation={orientation}
                                                margin={margin}
                                            />
                                        </Reorder.Item>
                                    ))}
                                </AnimatePresence>
                            </Reorder.Group>
                        )}
                    </div>

                    {/* ── Options Sidebar ── */}
                    <div className="w-full lg:w-72 xl:w-80 shrink-0 lg:overflow-y-auto custom-scrollbar lg:pr-2 pb-10 lg:pb-0">
                        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-5">
                            <h2 className="text-sm font-bold text-brand-dark flex items-center gap-2">
                                <IconFileTypePdf size={18} className="text-[#EAB308]" />
                                PDF Options
                            </h2>

                            {/* Page size */}
                            <CustomSelect
                                label="Page Size"
                                options={PAGE_SIZES}
                                value={pageSize}
                                onChange={setPageSize}
                            />

                            {/* Orientation */}
                            <div>
                                <p className="text-xs font-bold text-brand-sage uppercase tracking-widest mb-2">Orientation</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {(["portrait", "landscape"] as const).map((o) => (
                                        <button
                                            key={o}
                                            onClick={() => setOrientation(o)}
                                            className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all cursor-pointer ${orientation === o
                                                ? "border-[#EAB308] bg-[#EAB308]/8 text-[#ca9a04]"
                                                : "border-slate-200 text-brand-sage hover:border-slate-300"
                                                }`}
                                        >
                                            <span className={`border-2 rounded-sm ${o === "portrait" ? "w-6 h-8" : "w-8 h-6"} ${orientation === o ? "border-[#EAB308]" : "border-slate-300"}`} />
                                            {o.charAt(0).toUpperCase() + o.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Margin */}
                            <div>
                                <p className="text-xs font-bold text-brand-sage uppercase tracking-widest mb-2">Margin</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {MARGIN_OPTIONS.map((m) => (
                                        <button
                                            key={m.value}
                                            onClick={() => setMargin(m.value)}
                                            className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 text-xs font-semibold transition-all cursor-pointer ${margin === m.value
                                                ? "border-[#EAB308] bg-[#EAB308]/8 text-[#ca9a04]"
                                                : "border-slate-200 text-brand-sage hover:border-slate-300"
                                                }`}
                                        >
                                            <span
                                                className={`w-8 h-6 border-2 rounded-sm flex items-center justify-center ${margin === m.value ? "border-[#EAB308]" : "border-slate-300"}`}
                                                style={{ padding: m.value === "none" ? "0" : m.value === "small" ? "2px" : "4px" }}
                                            >
                                                <span className={`flex-1 rounded-[2px] ${margin === m.value ? "bg-[#EAB308]/30" : "bg-slate-200"}`} style={{ minHeight: "100%" }} />
                                            </span>
                                            <span>{m.label}</span>
                                            <span className="text-[9px] opacity-60">{m.sub}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Merge toggle */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div
                                    className={`relative rounded-full transition-colors duration-200 border-2 ${mergeAll ? "bg-[#EAB308] border-[#EAB308]" : "bg-slate-200 border-slate-200"}`}
                                    onClick={() => setMergeAll((v) => !v)}
                                    style={{ height: "22px", width: "40px", flexShrink: 0 }}
                                >
                                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${mergeAll ? "translate-x-5" : "translate-x-0.5"}`} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-brand-dark">Merge into one PDF</span>
                                    <span className="text-[11px] text-brand-sage">All images in a single file</span>
                                </div>
                            </label>

                            {/* Error */}
                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 mt-1 rounded-full bg-red-500 shrink-0" />
                                    {error}
                                </div>
                            )}

                            {/* Convert button */}
                            <button
                                onClick={handleConvert}
                                disabled={images.length === 0 || isProcessing}
                                className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-md active:scale-[0.98] text-sm ${images.length === 0
                                    ? "bg-[#EAB308]/30 cursor-not-allowed shadow-none"
                                    : isProcessing
                                        ? "bg-[#EAB308] opacity-50 cursor-wait"
                                        : "bg-[#EAB308] hover:bg-[#ca9a04] cursor-pointer"
                                    }`}
                            >
                                {isProcessing && <IconLoader2 className="animate-spin" size={18} />}
                                {isProcessing ? "Converting…" : `Convert ${images.length > 0 ? images.length + " image" + (images.length > 1 ? "s" : "") + " " : ""}to PDF`}
                            </button>
                        </div>
                    </div>
                </div>
            </main>

        </div>
    );
}

