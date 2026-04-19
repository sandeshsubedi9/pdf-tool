"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "motion/react";
import {
    IconPhotoSearch,
    IconDownload,
    IconLoader2,
    IconArrowLeft,
    IconCheck,
    IconMoodSad,
    IconPackage,
    IconX,
    IconSelectAll,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { downloadZip, downloadDataUrl } from "@/lib/pdf-utils";
import FileStore from "@/lib/file-store";
/* ─── Types ─── */
interface ExtractedImage {
    name: string;
    dataUrl: string;
    mimeType: string;
}

/* ─── Image Card ─── */
function ImageCard({
    item,
    index,
    selected,
    onToggle,
    onDownload,
}: {
    item: ExtractedImage;
    index: number;
    selected: boolean;
    onToggle: () => void;
    onDownload: () => void;
}) {
    const [hovered, setHovered] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.03 }}
            className={`relative group rounded-2xl overflow-hidden border-2 transition-all duration-200 bg-white shadow-sm cursor-pointer select-none
                ${selected
                    ? "border-[#8B5CF6] shadow-purple-200 shadow-md"
                    : "border-slate-100 hover:border-[#8B5CF6]/50"
                }`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onToggle}
        >
            {/* Image preview */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={item.dataUrl}
                alt={item.name}
                className="w-full object-contain bg-slate-50"
                style={{ aspectRatio: "1/1", maxHeight: 200 }}
                draggable={false}
            />

            {/* Hover overlay */}
            <AnimatePresence>
                {(hovered || selected) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="absolute inset-0 bg-black/20 flex-col items-center justify-center gap-3 hidden md:flex"
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDownload();
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-brand-dark text-sm font-semibold shadow hover:bg-purple-50 hover:text-purple-700 transition-colors"
                        >
                            <IconDownload size={16} />
                            Save Image
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Actions: Only shows on sm screens. Desktop relies on hover overlay */}
            <div className="md:hidden flex flex-col items-stretch p-2 border-t border-slate-100 bg-white gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDownload();
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-50 text-purple-700 text-sm font-semibold hover:bg-purple-100 transition-colors"
                >
                    <IconDownload size={16} />
                    Save Image
                </button>
            </div>

            {/* Selection circle - Always show on sm. Hover behavior purely for lg */}
            <button
                className={`absolute top-2.5 left-2.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-150 shadow z-10
                    ${selected
                        ? "bg-[#8B5CF6] border-[#8B5CF6]"
                        : "bg-white/90 border-slate-300 hover:border-[#8B5CF6] opacity-100 md:opacity-0 group-hover:opacity-100"
                    }`}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                title={selected ? "Deselect" : "Select"}
            >
                {selected && <IconCheck size={12} stroke={3} className="text-white" />}
            </button>

            {/* Name label */}
            <div className="px-3 py-2 border-t border-slate-100 bg-white">
                <p className="text-xs font-medium text-brand-sage text-center truncate" title={item.name}>
                    {item.name}
                </p>
            </div>
        </motion.div>
    );
}

/* ─── Main Page ─── */
export default function ExtractImagesPage() {
    const router = useRouter();
    const [images, setImages] = useState<ExtractedImage[]>([]);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [noImages, setNoImages] = useState(false);
    const [fileName, setFileName] = useState("document");

    useEffect(() => {
        const file = FileStore.getFile("current_pdf");

        if (!file) {
            setError("No PDF found. Please go back and upload a file.");
            setLoading(false);
            return;
        }

        setFileName(file.name.replace(/\.pdf$/i, ""));

        const toastId = toast.loading("Searching for embedded images…");

        const formData = new FormData();
        formData.append("file", file, file.name);

        fetch("/api/pdf-extract-images", {
            method: "POST",
            body: formData,
        })
            .then(async (res) => {
                if (!res.ok) {
                    const err = await res.json().catch(() => ({ error: "Unknown error" }));
                    throw new Error(err.error || "Extraction failed");
                }
                return res.json();
            })
            .then((data: { images: ExtractedImage[]; total: number }) => {
                if (data.total === 0) {
                    setNoImages(true);
                    toast("No embedded images found in this PDF.", { id: toastId, icon: "🔍" });
                } else {
                    setImages(data.images);
                    toast.success(`Found ${data.total} image${data.total !== 1 ? "s" : ""}!`, { id: toastId });
                }
            })
            .catch((err) => {
                console.error(err);
                setError(err.message || "Failed to extract images.");
                toast.error(err.message || "Failed to extract images.", { id: toastId });
            })
            .finally(() => setLoading(false));
    }, []);

    const toggleSelect = (index: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const selectAll = () => setSelected(new Set(images.map((_, i) => i)));
    const clearAll = () => setSelected(new Set());
    const allSelected = images.length > 0 && selected.size === images.length;

    const downloadImage = (item: ExtractedImage) => (async () => {
        downloadDataUrl(item.dataUrl, item.name);
        toast.success(`Downloaded ${item.name}`);
    })();

    const downloadSelected = async () => {
        if (selected.size === 0) {
            toast.error("Please select at least one image.");
            return;
        }
        const items = [...selected].map((i) => images[i]);
        if (items.length === 1) {
            downloadImage(items[0]);
            return;
        }
        const toastId = toast.loading(`Packaging ${items.length} images…`);
        setIsDownloading(true);
        try {
            await downloadZip(
                items.map((img) => ({ data: img.dataUrl, name: img.name })),
                `${fileName}-selected-images.zip`
            );
            toast.success(`Downloaded ${items.length} images`, { id: toastId });
        } catch (e: any) {
            toast.error(e.message || "Download failed", { id: toastId });
        } finally {
            setIsDownloading(false);
        }
    };

    const downloadAll = async () => {
        if (images.length === 0) return;
        if (images.length === 1) {
            downloadImage(images[0]);
            return;
        }
        const toastId = toast.loading(`Packaging all ${images.length} images…`);
        setIsDownloading(true);
        try {
            await downloadZip(
                images.map((img) => ({ data: img.dataUrl, name: img.name })),
                `${fileName}-all-images.zip`
            );
            toast.success("All images downloaded!", { id: toastId });
        } catch (e: any) {
            toast.error(e.message || "Download failed", { id: toastId });
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="h-screen flex flex-col relative overflow-hidden" style={{ background: "var(--brand-white)" }}>
            <Navbar />

            <div aria-hidden className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage: "radial-gradient(circle, #8C886B 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                    opacity: 0.05,
                }}
            />

            <main className="flex-1 max-w-7xl mx-auto px-5 md:px-8 w-full pt-24 pb-6 relative z-10 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/pdf-to-jpg")}
                            className="flex items-center gap-1.5 text-sm font-medium text-brand-sage hover:text-brand-dark hover:bg-slate-100 px-3 py-1.5 rounded-lg -ml-3 transition-colors"
                        >
                            <IconArrowLeft size={16} />
                            Back
                        </button>
                        <div className="w-px h-5 bg-slate-200" />
                        <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-10 h-10 rounded-xl text-white" style={{ background: "#8B5CF6" }}>
                                <IconPhotoSearch size={20} stroke={1.5} />
                            </span>
                            <div>
                                <h1 className="text-xl font-bold text-brand-dark leading-tight">Extract Embedded Images</h1>
                                <p className="text-xs text-brand-sage">{fileName}</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    {!loading && !error && images.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={allSelected ? clearAll : selectAll}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-brand-dark hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                            >
                                {allSelected ? <IconX size={15} /> : <IconSelectAll size={15} />}
                                {allSelected ? "Deselect All" : "Select All"}
                            </button>

                            {selected.size > 0 && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={downloadSelected}
                                    disabled={isDownloading}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all shadow-md cursor-pointer active:scale-[0.98] ${isDownloading
                                        ? "opacity-50 cursor-wait"
                                        : "hover:opacity-90"
                                        }`}
                                    style={{ background: "#8B5CF6" }}
                                >
                                    <IconDownload size={15} />
                                    Download Selected ({selected.size})
                                </motion.button>
                            )}

                            <button
                                onClick={downloadAll}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-brand-dark hover:bg-slate-50 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                            >
                                <IconPackage size={15} />
                                Download All
                            </button>
                        </div>
                    )}
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar pb-10">
                    {/* Loading */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-32 gap-4">
                            <IconLoader2 size={40} className="animate-spin text-[#8B5CF6]" />
                            <p className="text-brand-sage font-medium">Scanning PDF for embedded images…</p>
                        </div>
                    )}

                    {/* Error */}
                    {!loading && error && (
                        <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-500 text-3xl">✗</div>
                            <p className="font-semibold text-brand-dark">{error}</p>
                            <button
                                onClick={() => router.push("/pdf-to-jpg")}
                                className="mt-2 px-8 py-3 rounded-xl bg-white text-black font-medium hover:bg-slate-50 transition-all cursor-pointer shadow-md"
                            >
                                Upload Another PDF
                            </button>
                        </div>
                    )}

                    {/* No images found */}
                    {!loading && !error && noImages && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center py-32 gap-5 text-center"
                        >
                            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 text-slate-400">
                                <IconMoodSad size={40} stroke={1.2} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-brand-dark">No Images Found</h2>
                                <p className="text-brand-sage mt-2 max-w-sm">
                                    This PDF doesn&apos;t contain any embedded images. It might be a text-only document.
                                </p>
                            </div>
                            <button
                                onClick={() => router.push("/pdf-to-jpg")}
                                className="mt-2 px-8 py-3 rounded-xl bg-white text-black font-medium hover:bg-slate-50 transition-all cursor-pointer shadow-md"
                            >
                                ← Try another PDF
                            </button>
                        </motion.div>
                    )}

                    {/* Images grid */}
                    {!loading && !error && images.length > 0 && (
                        <>
                            {selected.size > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-50 border border-purple-200 text-sm font-medium text-purple-800"
                                >
                                    <IconCheck size={16} className="text-purple-500" />
                                    {selected.size} image{selected.size !== 1 ? "s" : ""} selected
                                    <button
                                        onClick={clearAll}
                                        className="ml-auto text-purple-500 hover:text-purple-800 underline text-xs"
                                    >
                                        Clear
                                    </button>
                                </motion.div>
                            )}

                            <div className="flex items-center gap-2 mb-6">
                                <span className="text-sm text-brand-sage font-medium">
                                    {images.length} image{images.length !== 1 ? "s" : ""} found
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {images.map((item, i) => (
                                    <ImageCard
                                        key={i}
                                        item={item}
                                        index={i}
                                        selected={selected.has(i)}
                                        onToggle={() => toggleSelect(i)}
                                        onDownload={() => downloadImage(item)}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>

        </div>
    );
}

