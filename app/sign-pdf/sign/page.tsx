"use client";
import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
} from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "motion/react";
import {
    IconWriting,
    IconArrowLeft,
    IconLoader2,
    IconDownload,
    IconFileTypePdf,
    IconAlertTriangle,
    IconX,
    IconPencil,
    IconTypography,
    IconUpload,
    IconCheck,
    IconPlus,
    IconTrash,
    IconGripVertical,
    IconCalendar,
    IconSignature,
    IconChevronUp,
    IconChevronDown,
} from "@tabler/icons-react";
import { FileUpload } from "@/components/ui/file-upload";
import FileStore from "@/lib/file-store";
import { downloadBlob } from "@/lib/pdf-utils";
import toast from "react-hot-toast";
// ─── Types ────────────────────────────────────────────────────────────────────

type SignatureType = "typed" | "drawn" | "image";

interface SavedSignature {
    id: string;
    type: SignatureType;
    dataUrl: string; // cropped canvas data URL used for placing on PDF
    rawDataUrl?: string; // full 480x180 canvas, only for drawn type — used when re-editing
    label: string;
    fontIndex?: number;
    color?: string;
    isInitials?: boolean;
}

interface PlacedSignature {
    id: string;
    signatureId: string;
    pageIndex: number; // 0-based
    x: number; // % of page width
    y: number; // % of page height
    width: number; // % of page width
    height: number; // % of page height
    dataUrl: string;
    isField?: boolean;
    fieldType?: "Name" | "Date" | "Text";
    content?: string;
}

type ModalTab = "typed" | "drawn" | "image";

// ─── Signature fonts (cursive/handwriting Google Fonts) ──────────────────────

const SIG_FONTS = [
    { name: "Inter", url: "https://fonts.googleapis.com/css2?family=Inter:wght@500&display=swap", label: "Normal (Inter)" },
    { name: "Dancing Script", url: "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap" },
    { name: "Pacifico", url: "https://fonts.googleapis.com/css2?family=Pacifico&display=swap" },
    { name: "Great Vibes", url: "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap" },
    { name: "Satisfy", url: "https://fonts.googleapis.com/css2?family=Satisfy&display=swap" },
    { name: "Caveat", url: "https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap" },
    { name: "Sacramento", url: "https://fonts.googleapis.com/css2?family=Sacramento&display=swap" },
    { name: "Parisienne", url: "https://fonts.googleapis.com/css2?family=Parisienne&display=swap" },
    { name: "Allura", url: "https://fonts.googleapis.com/css2?family=Allura&display=swap" },
    { name: "Alex Brush", url: "https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap" },
    { name: "Kaushan Script", url: "https://fonts.googleapis.com/css2?family=Kaushan+Script&display=swap" },
    { name: "Yellowtail", url: "https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" },
    { name: "Pinyon Script", url: "https://fonts.googleapis.com/css2?family=Pinyon+Script&display=swap" },
];

const SIG_COLORS = [
    { name: "Dark", value: "#1a1a2e" },
    { name: "Blue", value: "#1a3a6b" },
    { name: "Teal", value: "#047C58" },
    { name: "Navy", value: "#0d2137" },
    { name: "Red", value: "#ef4444" },
    { name: "Gray", value: "#6b7280" },
    { name: "Purple", value: "#4a1a8b" },
];

function uid() {
    return Math.random().toString(36).slice(2, 10);
}

// ─── Load Google Fonts ────────────────────────────────────────────────────────

function loadFonts() {
    if (typeof document === "undefined") return;
    SIG_FONTS.forEach((f) => {
        const id = `font-${f.name.replace(/\s/g, "-")}`;
        if (!document.getElementById(id)) {
            const link = document.createElement("link");
            link.id = id;
            link.rel = "stylesheet";
            link.href = f.url;
            document.head.appendChild(link);
        }
    });
}

// ─── Render text signature to canvas data URL ─────────────────────────────────

function renderTextSignature(text: string, fontName: string, color: string, size = 64): string {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    // Set font first to measure properly
    const fontStack = fontName.includes(",") ? fontName : `'${fontName}', cursive`;
    ctx.font = `${size}px ${fontStack}`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = size * 1.1;

    canvas.width = Math.max(1, textWidth + 8);
    canvas.height = Math.max(1, textHeight);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.font = `${size}px ${fontStack}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL("image/png");
}

// ─── PDF Rendering ────────────────────────────────────────────────────────────

async function renderPdfPages(file: File, scale = 1.5): Promise<{ dataUrl: string; width: number; height: number }[]> {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
    ).toString();
    const ab = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    const results: { dataUrl: string; width: number; height: number }[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport: vp } as any).promise;
        results.push({ dataUrl: canvas.toDataURL("image/jpeg", 0.92), width: vp.width, height: vp.height });
    }
    return results;
}

// ─── Embed signatures into PDF using pdf-lib ──────────────────────────────────

async function embedSignaturesIntoPdf(
    file: File,
    placedSignatures: PlacedSignature[],
    pageDimensions: { width: number; height: number }[]
): Promise<Uint8Array> {
    const { PDFDocument } = await import("pdf-lib");
    const ab = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(ab);
    const pages = pdfDoc.getPages();

    for (const placed of placedSignatures) {
        const page = pages[placed.pageIndex];
        if (!page) continue;

        // Convert base64 PNG to bytes
        const base64 = placed.dataUrl.split(",")[1];
        const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const img = await pdfDoc.embedPng(imgBytes);

        const pdfPageWidth = page.getWidth();
        const pdfPageHeight = page.getHeight();

        // Placed coords are as % of rendered page pixel size
        const renderedW = pageDimensions[placed.pageIndex]?.width ?? 800;
        const renderedH = pageDimensions[placed.pageIndex]?.height ?? 1130;

        const xFrac = placed.x / 100;
        const yFrac = placed.y / 100;
        const wFrac = placed.width / 100;
        const hFrac = placed.height / 100;

        const x = xFrac * pdfPageWidth;
        const boxW = wFrac * pdfPageWidth;
        const boxH = hFrac * pdfPageHeight;

        // Apply object-contain logic to prevent stretching
        const scale = Math.min(boxW / img.width, boxH / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;

        const offsetX = (boxW - drawW) / 2;
        const offsetY = (boxH - drawH) / 2;

        const drawX = x + offsetX;
        // PDF coords: y from bottom, so flip
        const drawY = pdfPageHeight - (yFrac * pdfPageHeight) - boxH + offsetY;

        page.drawImage(img, {
            x: drawX,
            y: drawY,
            width: drawW,
            height: drawH,
        });
    }

    return pdfDoc.save();
}

// ─── Draw Canvas Component ────────────────────────────────────────────────────

function DrawCanvas({ onSave, color, initialDataUrl }: { onSave: (dataUrl: string, rawDataUrl: string) => void; color: string; initialDataUrl?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);
    const [hasDrawn, setHasDrawn] = useState(false);

    // Pre-load existing raw drawing when editing (1:1, no scaling)
    useEffect(() => {
        if (!initialDataUrl || !canvasRef.current) return;
        const img = new Image();
        img.onload = () => {
            const canvas = canvasRef.current!;
            const ctx = canvas.getContext("2d")!;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            setHasDrawn(true);
        };
        img.src = initialDataUrl;
    }, [initialDataUrl]);

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if ("touches" in e) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY,
            };
        }
        return {
            x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
            y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
        };
    };

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
        drawing.current = true;
        const pos = getPos(e);
        lastPos.current = pos;
        const ctx = canvasRef.current!.getContext("2d")!;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        setHasDrawn(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!drawing.current || !lastPos.current) return;
        e.preventDefault();
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        const pos = getPos(e);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastPos.current = pos;
    };

    const endDraw = () => {
        drawing.current = false;
        lastPos.current = null;
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
    };

    const handleSave = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;

        // Find drawn bounds
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
        let hasPixels = false;

        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const alpha = data[(y * canvas.width + x) * 4 + 3];
                if (alpha > 0) {
                    hasPixels = true;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (!hasPixels) {
            const rawDataUrl = canvas.toDataURL("image/png");
            onSave(rawDataUrl, rawDataUrl);
            return;
        }

        // Add a tiny bit of padding
        const padding = 10;
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = Math.min(canvas.width, maxX + padding);
        maxY = Math.min(canvas.height, maxY + padding);

        const width = maxX - minX;
        const height = maxY - minY;

        const croppedCanvas = document.createElement("canvas");
        croppedCanvas.width = width;
        croppedCanvas.height = height;
        const croppedCtx = croppedCanvas.getContext("2d")!;
        croppedCtx.putImageData(ctx.getImageData(minX, minY, width, height), 0, 0);

        // rawDataUrl = full 480x180 canvas (for re-editing later)
        const rawDataUrl = canvas.toDataURL("image/png");
        onSave(croppedCanvas.toDataURL("image/png"), rawDataUrl);
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="relative rounded-xl border-2 border-dashed border-[#E0DED9] bg-[#fafaf9] overflow-hidden">
                <canvas
                    ref={canvasRef}
                    width={480}
                    height={180}
                    className="w-full touch-none cursor-crosshair"
                    style={{ display: "block" }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                />
                {!hasDrawn && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-brand-sage text-sm">Draw your signature here</p>
                    </div>
                )}
            </div>
            <div className="flex gap-2 justify-end">
                <button
                    onClick={clearCanvas}
                    className="px-4 py-2 text-sm font-medium text-brand-sage hover:text-brand-dark border border-[#E0DED9] rounded-lg transition-colors cursor-pointer"
                >
                    Clear
                </button>
                <button
                    onClick={handleSave}
                    disabled={!hasDrawn}
                    className="px-4 py-2 text-sm font-bold bg-[#047C58] text-white rounded-lg hover:bg-[#036649] disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                    Use Signature
                </button>
            </div>
        </div>
    );
}

// ─── Signature Creation Modal ─────────────────────────────────────────────────

function SignatureModal({
    onClose,
    onSave,
    initialData,
}: {
    onClose: () => void;
    onSave: (sig: SavedSignature) => void;
    initialData?: SavedSignature;
}) {
    const [tab, setTab] = useState<ModalTab>(initialData?.type ?? "typed");
    const [fullName, setFullName] = useState(initialData?.type === "typed" ? initialData.label : "");
    const [initials, setInitials] = useState(initialData?.isInitials ? initialData.label : "");
    const [selectedFont, setSelectedFont] = useState(initialData?.fontIndex ?? 0);
    const [selectedColor, setSelectedColor] = useState(initialData?.color ?? SIG_COLORS[0].value);
    const [activePreview, setActivePreview] = useState<"signature" | "initials">(initialData?.isInitials ? "initials" : "signature");
    const [uploadedImage, setUploadedImage] = useState<string | null>(initialData?.type === "image" ? initialData.dataUrl : null);
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);

    useEffect(() => {
        loadFonts();
    }, []);

    const handleImageFileChange = (files: File[]) => {
        if (files.length === 0) {
            setUploadedImage(null);
            return;
        }
        const file = files[0];
        const reader = new FileReader();
        reader.onload = (ev) => setUploadedImage(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    // Auto-generate initials
    useEffect(() => {
        if (fullName.trim()) {
            const parts = fullName.trim().split(/\s+/);
            const auto = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
            setInitials(auto.slice(0, 3));
        }
    }, [fullName]);

    const displayText = activePreview === "signature" ? fullName : initials;


    const handleTypedSave = () => {
        if (!displayText.trim()) return;
        const dataUrl = renderTextSignature(displayText, SIG_FONTS[selectedFont].name, selectedColor);
        onSave({
            id: initialData?.id ?? uid(),
            type: "typed",
            dataUrl,
            label: displayText,
            fontIndex: selectedFont,
            color: selectedColor,
            isInitials: activePreview === "initials",
        });
    };

    const handleImageSave = () => {
        if (!uploadedImage) return;
        onSave({
            id: initialData?.id ?? uid(),
            type: "image",
            dataUrl: uploadedImage,
            label: "Uploaded signature",
        });
    };

    const handleDrawSave = (dataUrl: string, rawDataUrl: string) => {
        onSave({
            id: initialData?.id ?? uid(),
            type: "drawn",
            dataUrl,
            rawDataUrl,
            label: "Drawn signature",
        });
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-[#E0DED9]">
                        <div>
                            <h2 className="text-xl font-bold text-brand-dark">Set your signature details</h2>
                            <p className="text-sm text-brand-sage mt-0.5">Choose how you'd like your signature to appear</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-full flex items-center justify-center text-brand-sage hover:bg-[#f0ede4] hover:text-brand-dark transition-all cursor-pointer"
                        >
                            <IconX size={18} />
                        </button>
                    </div>

                    <div className="p-6">
                        {/* Name + Initials row */}
                        <div className="grid grid-cols-2 gap-4 mb-5">
                            <div>
                                <label className="block text-xs font-semibold text-brand-sage mb-1.5 uppercase tracking-wide">Full name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Your full name"
                                    className="w-full px-3.5 py-2.5 border border-[#E0DED9] rounded-xl text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-[#047C58]/30 focus:border-[#047C58] transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-brand-sage mb-1.5 uppercase tracking-wide">Initials</label>
                                <input
                                    type="text"
                                    value={initials}
                                    onChange={(e) => setInitials(e.target.value)}
                                    placeholder="AB"
                                    maxLength={4}
                                    className="w-full px-3.5 py-2.5 border border-[#E0DED9] rounded-xl text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-[#047C58]/30 focus:border-[#047C58] transition-all"
                                />
                            </div>
                        </div>

                        {/* Method tabs */}
                        <div className="flex gap-1 p-1 bg-[#f5f4f0] rounded-xl mb-5">
                            {([
                                { key: "typed", label: "Signature", icon: <IconTypography size={14} /> },
                                { key: "drawn", label: "Draw", icon: <IconPencil size={14} /> },
                                { key: "image", label: "Upload Image", icon: <IconUpload size={14} /> },
                            ] as { key: ModalTab; label: string; icon: React.ReactNode }[]).map((t) => (
                                <button
                                    key={t.key}
                                    onClick={() => setTab(t.key)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-semibold rounded-lg transition-all cursor-pointer ${tab === t.key
                                        ? "bg-white text-brand-dark shadow-sm"
                                        : "text-brand-sage hover:text-brand-dark"
                                        }`}
                                >
                                    {t.icon}
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Typed tab */}
                        {tab === "typed" && (
                            <div className="flex flex-col gap-4">
                                {/* Signature / Initials sub-tabs */}
                                <div className="flex gap-3 text-sm font-semibold border-b border-[#E0DED9]">
                                    <button
                                        onClick={() => setActivePreview("signature")}
                                        className={`pb-2 px-1 border-b-2 transition-colors cursor-pointer ${activePreview === "signature" ? "border-[#047C58] text-[#047C58]" : "border-transparent text-brand-sage hover:text-brand-dark"}`}
                                    >
                                        Signature
                                    </button>
                                    <button
                                        onClick={() => setActivePreview("initials")}
                                        className={`pb-2 px-1 border-b-2 transition-colors cursor-pointer ${activePreview === "initials" ? "border-[#047C58] text-[#047C58]" : "border-transparent text-brand-sage hover:text-brand-dark"}`}
                                    >
                                        Initials
                                    </button>
                                </div>

                                {/* Font styles list */}
                                <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                                    {SIG_FONTS.map((font, i) => (
                                        <button
                                            key={font.name}
                                            onClick={() => setSelectedFont(i)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${selectedFont === i
                                                ? "border-[#047C58] bg-[#e6f4ef]"
                                                : "border-transparent bg-[#f9f9f8] hover:border-[#E0DED9]"
                                                }`}
                                        >
                                            <span
                                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedFont === i ? "border-[#047C58] bg-[#047C58]" : "border-[#C0BEB6]"}`}
                                            >
                                                {selectedFont === i && <IconCheck size={10} color="white" stroke={3} />}
                                            </span>
                                            <div className="flex flex-col items-start gap-0.5">
                                                {font.label && (
                                                    <span className="text-[10px] font-semibold text-brand-sage uppercase tracking-wider">{font.label}</span>
                                                )}
                                                <span
                                                    style={{
                                                        fontFamily: i === 0 ? `'Inter', sans-serif` : `'${font.name}', cursive`,
                                                        fontSize: "1.35rem",
                                                        color: selectedColor,
                                                        lineHeight: 1,
                                                    }}
                                                >
                                                    {displayText || (activePreview === "signature" ? "Your Name" : "YN")}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {/* Color picker */}
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-semibold text-brand-sage uppercase tracking-wide">Color:</span>
                                    <div className="flex gap-2">
                                        {SIG_COLORS.map((c) => (
                                            <button
                                                key={c.value}
                                                onClick={() => setSelectedColor(c.value)}
                                                title={c.name}
                                                className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${selectedColor === c.value ? "border-[#047C58] scale-110" : "border-transparent hover:scale-105"}`}
                                                style={{ background: c.value }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-3 justify-end pt-2">
                                    <button
                                        onClick={onClose}
                                        className="px-5 py-2.5 text-sm font-semibold text-brand-sage hover:text-brand-dark border border-[#E0DED9] rounded-xl transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleTypedSave}
                                        disabled={!displayText.trim()}
                                        className="px-6 py-2.5 text-sm font-bold bg-[#047C58] text-white rounded-xl hover:bg-[#036649] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Draw tab */}
                        {tab === "drawn" && (
                            <DrawCanvas
                                onSave={handleDrawSave}
                                color={selectedColor}
                                initialDataUrl={initialData?.type === "drawn" ? initialData.rawDataUrl : undefined}
                            />
                        )}

                        {/* Image upload tab */}
                        {tab === "image" && (
                            <div className="flex flex-col gap-4">
                                {uploadedImage ? (
                                    <div className="flex flex-col gap-3">
                                        <div className="relative rounded-xl border-2 border-[#E0DED9] bg-[#f9f9f8] p-4 flex items-center justify-center min-h-[160px] cursor-pointer hover:border-[#047C58] transition-all group"
                                            onClick={() => { setUploadedImage(null); setUploadFiles([]); }}>
                                            <img src={uploadedImage} alt="Signature preview" className="max-h-40 object-contain" />
                                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                                <p className="bg-white px-3 py-1.5 rounded-lg text-xs font-bold text-brand-dark shadow-sm">Remove and change</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                onClick={handleImageSave}
                                                className="px-8 py-2.5 text-sm font-bold bg-[#047C58] text-white rounded-xl hover:bg-[#036649] transition-all cursor-pointer shadow-md shadow-[#047C58]/20"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-[#fcfbf9] rounded-xl border border-[#E0DED9]">
                                        <FileUpload
                                            accept={{ "image/*": [".png", ".jpg", ".jpeg", ".svg"] }}
                                            multiple={false}
                                            files={uploadFiles}
                                            setFiles={setUploadFiles}
                                            onChange={handleImageFileChange}
                                            title="Upload signature image"
                                            description="SVG, PNG or JPG (recommended: transparent background)"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ─── Page Thumbnail Sidebar ───────────────────────────────────────────────────

function PageSidebar({
    pages,
    currentPage,
    onSelectPage,
}: {
    pages: { dataUrl: string }[];
    currentPage: number;
    onSelectPage: (i: number) => void;
}) {
    return (
        <div className="flex flex-col h-full bg-white border-r border-[#E0DED9] shrink-0" style={{ width: 140 }}>
            {/* Pages list only */}
            <div id="sidebar-scroll-container" className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6 bg-[#fdfdfb]">
                {pages.map((pg, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                        <button
                            id={`thumb-page-${i}`}
                            onClick={() => {
                                onSelectPage(i);
                                const el = document.getElementById(`pdf-page-${i}`);
                                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                            }}
                            className={`relative w-full rounded-md overflow-hidden border-2 transition-all cursor-pointer group shrink-0 ${currentPage === i
                                ? "border-[#047C58] shadow-lg shadow-[#047C58]/10 bg-white"
                                : "border-transparent bg-white hover:border-[#E0DED9]"
                                }`}
                        >
                            <div className="p-1">
                                <img
                                    src={pg.dataUrl}
                                    alt={`Page ${i + 1}`}
                                    className="w-full object-contain"
                                    draggable={false}
                                />
                            </div>
                        </button>

                        {/* Page number below page */}
                        <div className={`text-[11px] font-bold transition-all px-2.5 py-0.5 rounded-full ${currentPage === i ? "bg-[#047C58] text-white" : "text-brand-sage group-hover:text-brand-dark"}`}>
                            {i + 1}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Placed Signature Overlay ─────────────────────────────────────────────────

function PlacedSigOverlay({
    placed,
    onDelete,
    onResize,
    onMove,
    onUpdateText,
}: {
    placed: PlacedSignature;
    onDelete: () => void;
    onResize: (dx: number, dy: number) => void;
    onMove: (dx: number, dy: number) => void;
    onUpdateText?: (newText: string) => void;
}) {
    const [hovered, setHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(placed.content || "");
    const inputRef = useRef<HTMLInputElement>(null);
    const dragStart = useRef<{ x: number; y: number } | null>(null);
    const resizeStart = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleInputBlur = () => {
        setIsEditing(false);
        if (editValue !== placed.content) {
            onUpdateText?.(editValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleInputBlur();
        } else if (e.key === "Escape") {
            setEditValue(placed.content || "");
            setIsEditing(false);
        }
    };

    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (isEditing) return;
        e.stopPropagation();
        const isTouch = "touches" in e;
        const startX = isTouch ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const startY = isTouch ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        dragStart.current = { x: startX, y: startY };
        let moved = false;

        const onMove_ = (ev: MouseEvent | TouchEvent) => {
            if (!dragStart.current) return;
            if (ev.cancelable) ev.preventDefault();
            const clientX = "touches" in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX;
            const clientY = "touches" in ev ? ev.touches[0].clientY : (ev as MouseEvent).clientY;
            const dx = clientX - dragStart.current.x;
            const dy = clientY - dragStart.current.y;
            if (Math.abs(clientX - startX) > 3 || Math.abs(clientY - startY) > 3) {
                moved = true;
            }
            dragStart.current = { x: clientX, y: clientY };
            onMove(dx, dy);
        };
        const onUp = () => {
            if (!moved && placed.isField) {
                setIsEditing(true);
            }
            dragStart.current = null;
            window.removeEventListener("mousemove", onMove_ as EventListener);
            window.removeEventListener("mouseup", onUp);
            window.removeEventListener("touchmove", onMove_ as EventListener);
            window.removeEventListener("touchend", onUp);
            window.removeEventListener("touchcancel", onUp);
        };
        window.addEventListener("mousemove", onMove_ as EventListener);
        window.addEventListener("mouseup", onUp);
        window.addEventListener("touchmove", onMove_ as EventListener, { passive: false });
        window.addEventListener("touchend", onUp);
        window.addEventListener("touchcancel", onUp);
    };

    const handleResizeDown = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        const isTouch = "touches" in e;
        const startX = isTouch ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const startY = isTouch ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        resizeStart.current = { x: startX, y: startY };
        const onResize_ = (ev: MouseEvent | TouchEvent) => {
            if (!resizeStart.current) return;
            if (ev.cancelable) ev.preventDefault();
            const clientX = "touches" in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX;
            const clientY = "touches" in ev ? ev.touches[0].clientY : (ev as MouseEvent).clientY;
            const dx = clientX - resizeStart.current.x;
            const dy = clientY - resizeStart.current.y;
            resizeStart.current = { x: clientX, y: clientY };
            onResize(dx, dy);
        };
        const onUp = () => {
            resizeStart.current = null;
            window.removeEventListener("mousemove", onResize_ as EventListener);
            window.removeEventListener("mouseup", onUp);
            window.removeEventListener("touchmove", onResize_ as EventListener);
            window.removeEventListener("touchend", onUp);
            window.removeEventListener("touchcancel", onUp);
        };
        window.addEventListener("mousemove", onResize_ as EventListener);
        window.addEventListener("mouseup", onUp);
        window.addEventListener("touchmove", onResize_ as EventListener, { passive: false });
        window.addEventListener("touchend", onUp);
        window.addEventListener("touchcancel", onUp);
    };

    return (
        <motion.div
            initial={{ scale: 1.2, opacity: 0, boxShadow: "0 0 20px rgba(4, 124, 88, 0.3)" }}
            animate={{ scale: 1, opacity: 1, boxShadow: "0 0 0px rgba(4, 124, 88, 0)" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`absolute group ${isEditing ? "" : "select-none"} ${placed.isField && hovered ? "cursor-pointer" : "cursor-move"}`}
            style={{
                left: `${placed.x}%`,
                top: `${placed.y}%`,
                width: `${placed.width}%`,
                height: `${placed.height}%`,
                cursor: "move",
                touchAction: "none",
            }}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div
                className={`w-full h-full border-2 border-dashed rounded-lg transition-colors overflow-hidden ${isEditing ? "border-blue-500 bg-blue-50/30" : hovered ? "border-[#047C58] bg-[#047C58]/5" : "border-transparent lg:border-transparent max-lg:border-[#047C58] max-lg:bg-[#047C58]/5"}`}
            >
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleInputBlur}
                        onKeyDown={handleKeyDown}
                        className="w-full h-full bg-transparent px-2 outline-none text-black font-['Inter',_sans-serif] text-[15px]"
                        style={{
                            fontSize: `${placed.height * 2.5}px` // Scale font by box height
                        }}
                    />
                ) : (
                    <img
                        src={placed.dataUrl}
                        alt="Signature"
                        className="w-full h-full object-contain"
                        draggable={false}
                    />
                )}
            </div>

            {/* Action Buttons at Top-Right */}
            <div className={`absolute -top-3 -right-3 flex gap-1 z-50 transition-opacity duration-200 ${hovered ? "opacity-100 pointer-events-auto" : "opacity-100 pointer-events-auto lg:opacity-0 lg:pointer-events-none max-lg:opacity-100 max-lg:pointer-events-auto"}`}>
                {placed.isField && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(true);
                        }}
                        className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:bg-blue-600 transition-colors"
                        title="Edit text"
                    >
                        <IconPencil size={12} stroke={3} />
                    </button>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:bg-red-600 transition-colors"
                    title="Remove"
                >
                    <IconX size={12} stroke={3} />
                </button>
            </div>

            {/* Single Resize handle (Professional circular look) */}
            <div
                className={`absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-[#047C58] rounded-full cursor-se-resize z-40 shadow-sm transition-opacity duration-200 ${hovered ? "opacity-100 pointer-events-auto" : "opacity-100 pointer-events-auto lg:opacity-0 lg:pointer-events-none max-lg:opacity-100 max-lg:pointer-events-auto"}`}
                onMouseDown={handleResizeDown}
                onTouchStart={handleResizeDown}
            />
        </motion.div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SignPdfSignPage() {
    const router = useRouter();
    const hasInit = useRef(false);
    const pageCanvasRef = useRef<HTMLDivElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<{ dataUrl: string; width: number; height: number }[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageJump, setPageJump] = useState("1"); // Added pageJump state
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
    const [editingSignature, setEditingSignature] = useState<SavedSignature | null>(null);
    const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([]);
    const [placedSignatures, setPlacedSignatures] = useState<PlacedSignature[]>([]);
    const [isExporting, setIsExporting] = useState(false);

    // Load file
    useEffect(() => {
        if (hasInit.current) return;
        hasInit.current = true;
        const f = FileStore.getFile("sign_pdf_main");
        if (!f) { router.replace("/sign-pdf"); return; }
        setFile(f);
        renderPdfPages(f).then((pgData) => {
            setPages(pgData);
            setIsLoading(false);
        }).catch(() => {
            toast.error("Failed to render PDF");
            setIsLoading(false);
        });
    }, [router]);

    // Sync sidebar scroll and input when current page changes via viewer scroll
    useEffect(() => {
        if (!pages.length) return;
        setPageJump((currentPage + 1).toString());
        const thumb = document.getElementById(`thumb-page-${currentPage}`);
        if (thumb) {
            thumb.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    }, [currentPage, pages.length]);



    const handleSaveSignature = (sig: SavedSignature) => {
        const isEdit = !!editingSignature;
        setSavedSignatures((prev) => {
            const exists = prev.find((p) => p.id === sig.id);
            if (exists) {
                return prev.map((p) => (p.id === sig.id ? sig : p));
            }
            return [...prev, sig];
        });

        // Also update data in already placed signatures if it was an edit
        setPlacedSignatures((prev) =>
            prev.map((p) => (p.signatureId === sig.id ? { ...p, dataUrl: sig.dataUrl } : p))
        );

        setShowModal(false);
        setEditingSignature(null);
        if (isEdit) {
            toast.success("Signature updated!");
        } else {
            toast.success("Signature added! Drag it onto the PDF or click to place it.", { duration: 4000, icon: "✍️" });
        }
    };

    const handleDeleteSignature = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setSavedSignatures((prev) => prev.filter((s) => s.id !== id));
        setPlacedSignatures((prev) => prev.filter((p) => p.signatureId !== id));
        toast.success("Signature deleted");
    };

    const handleEditSignature = (e: React.MouseEvent, sig: SavedSignature) => {
        e.stopPropagation();
        setEditingSignature(sig);
        setShowModal(true);
    };

    const placeSignature = (
        sig: SavedSignature | { dataUrl: string },
        pageIndex: number,
        xPct: number,
        yPct: number,
        isField?: boolean,
        fieldType?: "Name" | "Date" | "Text",
        content?: string
    ) => {
        const w = 18; // % width (Tightened for better fit)
        const h = 6;  // % height
        const placed: PlacedSignature = {
            id: uid(),
            signatureId: (sig as SavedSignature).id || uid(),
            pageIndex: pageIndex,
            x: Math.max(0, Math.min(xPct - w / 2, 100 - w)),
            y: Math.max(0, Math.min(yPct - h / 2, 100 - h)),
            width: w,
            height: h,
            dataUrl: sig.dataUrl,
            isField,
            fieldType,
            content,
        };
        setPlacedSignatures((prev) => [...prev, placed]);
    };

    // Helper to place signature in the currently visible part of the page
    const placeSignatureInView = (
        sig: SavedSignature | { dataUrl: string },
        isField?: boolean,
        fieldType?: "Name" | "Date" | "Text",
        content?: string
    ) => {
        const pageIdx = currentPage;
        const pageEl = document.getElementById(`pdf-page-${pageIdx}`);
        const containerEl = document.getElementById("pdf-scroll-container");

        if (!pageEl || !containerEl) {
            placeSignature(sig, pageIdx, 50, 50, isField, fieldType, content);
            return;
        }

        const pageRect = pageEl.getBoundingClientRect();
        const containerRect = containerEl.getBoundingClientRect();

        // Find intersection of page and viewport
        const visibleTop = Math.max(containerRect.top, pageRect.top);
        const visibleBottom = Math.min(containerRect.bottom, pageRect.bottom);
        const visibleLeft = Math.max(containerRect.left, pageRect.left);
        const visibleRight = Math.min(containerRect.right, pageRect.right);

        // Calculate center of visible area
        const centerX = (visibleLeft + visibleRight) / 2;
        const centerY = (visibleTop + visibleBottom) / 2;

        // Convert to percentage of page dimensions
        const xPct = ((centerX - pageRect.left) / pageRect.width) * 100;
        const yPct = ((centerY - pageRect.top) / pageRect.height) * 100;

        placeSignature(sig, pageIdx, xPct, yPct);
    };

    const handleDrop = (e: React.DragEvent, pageIndex: number) => {
        e.preventDefault();
        const data = e.dataTransfer.getData("application/json");
        if (!data) return;

        try {
            const { type, content } = JSON.parse(data);
            const rect = e.currentTarget.getBoundingClientRect();
            const xPct = ((e.clientX - rect.left) / rect.width) * 100;
            const yPct = ((e.clientY - rect.top) / rect.height) * 100;

            if (type === "signature") {
                placeSignature(content as SavedSignature, pageIndex, xPct, yPct);
            } else if (type === "field") {
                let dataUrl = "";
                let actualContent = "";
                if (content === "Date") {
                    actualContent = new Date().toLocaleDateString("en-US");
                    dataUrl = renderTextSignature(actualContent, "Inter, sans-serif", "#000000", 32);
                } else if (content === "Name") {
                    if (savedSignatures.length === 0) {
                        toast.error("Add the signature first");
                        return;
                    }
                    const nameSig = savedSignatures[0];
                    if (nameSig && nameSig.type === "typed") {
                        actualContent = nameSig.label;
                        dataUrl = nameSig.dataUrl;
                    } else {
                        actualContent = "Full Name";
                        dataUrl = renderTextSignature(actualContent, "Inter, sans-serif", "#000000", 40);
                    }
                } else if (content === "Text") {
                    actualContent = "Enter text";
                    dataUrl = renderTextSignature(actualContent, "Inter, sans-serif", "#000000", 32);
                }

                if (dataUrl) {
                    placeSignature({ dataUrl }, pageIndex, xPct, yPct, true, content as any, actualContent);
                }
            }
        } catch (err) {
            console.error("Drop failed", err);
        }
    };

    const handleEditField = (id: string, currentContent: string, fieldType: "Name" | "Text" | "Date") => {
        const newText = window.prompt(`Edit ${fieldType}:`, currentContent);
        if (newText === null) return;

        const dataUrl = renderTextSignature(newText, "Inter, sans-serif", "#000000", fieldType === "Name" ? 40 : 32);
        setPlacedSignatures((prev) =>
            prev.map((p) => (p.id === id ? { ...p, content: newText, dataUrl } : p))
        );
    };

    const handleMovePlaced = (id: string, pageIndex: number, dx: number, dy: number) => {
        const pageEl = document.getElementById(`pdf-page-${pageIndex}`);
        if (!pageEl) return;
        const rect = pageEl.getBoundingClientRect();
        const dxPct = (dx / rect.width) * 100;
        const dyPct = (dy / rect.height) * 100;
        setPlacedSignatures((prev) =>
            prev.map((p) =>
                p.id === id
                    ? {
                        ...p,
                        x: Math.max(0, Math.min(p.x + dxPct, 100 - p.width)),
                        y: Math.max(0, Math.min(p.y + dyPct, 100 - p.height)),
                    }
                    : p
            )
        );
    };

    const handleResizePlaced = (id: string, pageIndex: number, dx: number, dy: number) => {
        const pageEl = document.getElementById(`pdf-page-${pageIndex}`);
        if (!pageEl) return;
        const rect = pageEl.getBoundingClientRect();
        const dxPct = (dx / rect.width) * 100;
        const dyPct = (dy / rect.height) * 100;
        setPlacedSignatures((prev) =>
            prev.map((p) =>
                p.id === id
                    ? {
                        ...p,
                        width: Math.max(5, p.width + dxPct),
                        height: Math.max(3, p.height + dyPct),
                    }
                    : p
            )
        );
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (!pages.length) return;
        const container = e.currentTarget;
        const containerCenter = container.getBoundingClientRect().top + container.getBoundingClientRect().height / 2;
        let closest = currentPage;
        let minDist = Infinity;
        for (let i = 0; i < pages.length; i++) {
            const el = document.getElementById(`pdf-page-${i}`);
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            const dist = Math.abs(rect.top + rect.height / 2 - containerCenter);
            if (dist < minDist) {
                minDist = dist;
                closest = i;
            }
        }
        if (closest !== currentPage) setCurrentPage(closest);
    };

    const handleExport = async () => {
        if (!file || placedSignatures.length === 0) {
            toast.error("Please place at least one signature before downloading.");
            return;
        }
        setIsExporting(true);
        (async () => {
            const toastId = toast.loading("Embedding signatures into PDF…");
            try {
                const bytes = await embedSignaturesIntoPdf(file, placedSignatures, pages);
                const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
                const fname = file.name.replace(/\.pdf$/i, "_signed.pdf");
                downloadBlob(blob, fname);
                toast.success("PDF signed and downloaded!", { id: toastId });
            } catch (err: any) {
                toast.error(err?.message || "Export failed", { id: toastId });
            } finally {
                setIsExporting(false);
            }
        })();
    };

    // Loading screen
    if (isLoading || !file) {
        return (
            <div className="min-h-screen flex flex-col" style={{ background: "var(--brand-white)" }}>
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <IconLoader2 size={36} className="animate-spin text-[#047C58]" />
                        <p className="text-brand-sage text-sm font-medium">Rendering PDF pages…</p>
                    </div>
                </main>
            </div>
        );
    }

    const currentPageData = pages[currentPage];
    const currentPageSigs = placedSignatures.filter((p) => p.pageIndex === currentPage);

    return (
        <div className="h-screen flex flex-col pt-16" style={{ background: "#fdfdfb" }}>
            <Navbar />

            {/* ── Secondary Full-Width Header ── */}
            <div className="sticky top-0 z-40 w-full bg-white border-b border-[#E0DED9] flex flex-col md:flex-row md:items-center md:justify-between shadow-sm shrink-0">
                {/* Left: Back + File Name */}
                <div className="flex items-center gap-3 px-4 py-2 border-b border-[#E0DED9]/60 md:border-b-0 md:flex-1 min-w-0">
                    <button
                        onClick={() => router.push("/sign-pdf")}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-brand-sage cursor-pointer hover:bg-[#f5f4f0] hover:text-brand-dark transition-all shrink-0"
                        title="Back to upload"
                    >
                        <IconArrowLeft size={16} />
                        Back
                    </button>
                    <div className="w-px h-4 bg-[#E0DED9] shrink-0" />
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="bg-[#e6f4ef] p-1.5 rounded-lg shrink-0">
                            <IconFileTypePdf size={16} className="text-[#047C58]" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-brand-dark truncate leading-tight max-w-[180px] sm:max-w-[250px] md:max-w-[350px] lg:max-w-[500px]" title={file.name}>{file.name}</p>
                            <p className="text-[10px] text-brand-sage font-medium">{pages.length} pages</p>
                        </div>
                    </div>
                </div>

                {/* Center / Bottom: Page Navigation */}
                <div className="flex items-center justify-center gap-3 px-4 py-2 bg-[#fdfdfb] md:bg-transparent shrink-0">
                    {/* Prev / Next */}
                    <div className="flex items-center gap-1 bg-[#f5f4f0] p-1 rounded-xl border border-[#E0DED9]">
                        <button
                            onClick={() => {
                                const prev = Math.max(0, currentPage - 1);
                                const container = document.getElementById("pdf-scroll-container");
                                const pageEl = document.getElementById(`pdf-page-${prev}`) as HTMLElement | null;
                                if (container && pageEl) container.scrollTo({ top: pageEl.offsetTop - 32, behavior: "smooth" });
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-sage hover:bg-white hover:text-brand-dark hover:shadow-sm disabled:opacity-20 transition-all cursor-pointer"
                            disabled={currentPage === 0}
                        >
                            <IconChevronUp size={16} />
                        </button>
                        <button
                            onClick={() => {
                                const next = Math.min(pages.length - 1, currentPage + 1);
                                const container = document.getElementById("pdf-scroll-container");
                                const pageEl = document.getElementById(`pdf-page-${next}`) as HTMLElement | null;
                                if (container && pageEl) container.scrollTo({ top: pageEl.offsetTop - 32, behavior: "smooth" });
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-sage hover:bg-white hover:text-brand-dark hover:shadow-sm disabled:opacity-20 transition-all cursor-pointer"
                            disabled={currentPage === pages.length - 1}
                        >
                            <IconChevronDown size={16} />
                        </button>
                    </div>

                    {/* Page jump input */}
                    <div className="flex items-center gap-2">
                        <div className="bg-[#f5f4f0]/60 hover:bg-[#f5f4f0] border-2 border-transparent focus-within:border-brand-dark focus-within:bg-white rounded-xl px-2 py-1 transition-all">
                            <input
                                type="text"
                                inputMode="numeric"
                                className="w-8 text-center font-bold text-sm bg-transparent focus:outline-none text-brand-dark"
                                value={pageJump}
                                onChange={(e) => setPageJump(e.target.value.replace(/\D/g, ""))}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        const val = parseInt(pageJump);
                                        if (!isNaN(val) && val >= 1 && val <= pages.length) {
                                            const targetIdx = val - 1;
                                            setCurrentPage(targetIdx);
                                            const container = document.getElementById("pdf-scroll-container");
                                            const pageEl = document.getElementById(`pdf-page-${targetIdx}`) as HTMLElement | null;
                                            if (container && pageEl) container.scrollTo({ top: pageEl.offsetTop - 32, behavior: "smooth" });
                                            (e.target as HTMLInputElement).blur();
                                        } else {
                                            setPageJump((currentPage + 1).toString());
                                        }
                                    }
                                }}
                                onBlur={() => setPageJump((currentPage + 1).toString())}
                            />
                        </div>
                        <span className="text-xs font-bold text-brand-sage">/ {pages.length}</span>
                    </div>
                </div>

                {/* Right: Balancer for Desktop */}
                <div className="hidden md:block flex-1" />
            </div>

            {/* Main layout: sidebar | pdf canvas | signing panel */}
            <div className="flex-1 flex overflow-hidden">

                {/* ── Left: Page Thumbnail Sidebar ── */}
                {pages.length > 0 && (
                    <div className="hidden md:flex shrink-0 h-full overflow-hidden">
                        <PageSidebar
                            pages={pages}
                            currentPage={currentPage}
                            onSelectPage={setCurrentPage}
                        />
                    </div>
                )}

                {/* ── Center: PDF Canvas ── */}
                <div
                    id="pdf-scroll-container"
                    className="flex-1 overflow-auto flex flex-col items-center custom-scrollbar relative bg-[#f0f0f0]"
                    onScroll={handleScroll}
                >
                    <div className="py-8 w-full flex flex-col items-center gap-8">
                        {/* PDF Pages Loop */}
                        <div className="w-full max-w-3xl flex flex-col gap-10 px-4 pb-20">
                            {pages.map((pg, i) => {
                                const pageSigs = placedSignatures.filter((p) => p.pageIndex === i);
                                return (
                                    <div
                                        key={i}
                                        id={`pdf-page-${i}`}
                                        className="relative bg-white shadow-lg border border-[#E0DED9] transition-transform duration-300"
                                        style={{ aspectRatio: `${pg.width} / ${pg.height}` }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.dataTransfer.dropEffect = "copy";
                                        }}
                                        onDrop={(e) => handleDrop(e, i)}
                                    >
                                        <img
                                            src={pg.dataUrl}
                                            alt={`Page ${i + 1}`}
                                            className="w-full h-full object-contain select-none shadow-sm"
                                            draggable={false}
                                        />

                                        {/* Placed signatures on this page */}
                                        {pageSigs.map((placed) => (
                                            <PlacedSigOverlay
                                                key={placed.id}
                                                placed={placed}
                                                onDelete={() => setPlacedSignatures((prev) => prev.filter((p) => p.id !== placed.id))}
                                                onMove={(dx, dy) => handleMovePlaced(placed.id, i, dx, dy)}
                                                onResize={(dx, dy) => handleResizePlaced(placed.id, i, dx, dy)}
                                                onUpdateText={(newText) => {
                                                    const dataUrl = renderTextSignature(
                                                        newText,
                                                        "Inter, sans-serif",
                                                        "#000000",
                                                        placed.fieldType === "Name" ? 40 : 32
                                                    );
                                                    setPlacedSignatures((prev) =>
                                                        prev.map((p) => (p.id === placed.id ? { ...p, content: newText, dataUrl } : p))
                                                    );
                                                }}
                                            />
                                        ))}


                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── Mobile FAB ── */}
                <button
                    onClick={() => setIsMobileDrawerOpen(true)}
                    className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#047C58] text-white rounded-full shadow-2xl flex items-center justify-center z-40 hover:bg-[#036649] transition-all border-2 border-white active:scale-95"
                    aria-label="Signing Options"
                >
                    <IconSignature size={28} stroke={1.5} />
                </button>

                {/* ── Mobile Backdrop ── */}
                <AnimatePresence>
                    {isMobileDrawerOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileDrawerOpen(false)}
                            className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
                        />
                    )}
                </AnimatePresence>

                {/* ── Right Options Sidebar (Desktop) & Bottom Drawer (Mobile) ── */}
                <div className={`
                    fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                    lg:static lg:bg-white lg:border-l lg:border-[#E0DED9] lg:shadow-none lg:rounded-none lg:translate-y-0 lg:z-auto lg:shrink-0 lg:flex lg:overflow-y-auto lg:pr-0 lg:pb-0 custom-scrollbar
                    w-full lg:w-[320px] lg:min-w-[300px] lg:max-w-[360px]
                    ${isMobileDrawerOpen ? "translate-y-0 max-h-[85vh]" : "translate-y-full lg:max-h-full"}
                `}>
                    {/* Drawer drag handle for mobile */}
                    <div className="lg:hidden flex items-center justify-center pt-4 pb-2 shrink-0 cursor-pointer" onClick={() => setIsMobileDrawerOpen(false)}>
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                    </div>

                    {/* Panel header (hidden on mobile since drawer is obvious, or keep for consistency) */}
                    <div className="hidden lg:flex px-4 py-4 border-b border-[#E0DED9]">
                        <h3 className="text-base font-bold text-brand-dark flex items-center gap-2">
                            <IconSignature size={18} className="text-[#047C58]" />
                            Signing Options
                        </h3>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0">
                        {/* Legal Warning Banner */}
                        <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex gap-2">
                            <IconAlertTriangle size={14} className="shrink-0 text-amber-500 mt-0.5" />
                            <p className="text-[10px] leading-relaxed text-amber-900 font-medium">
                                Visual signatures from this tool are not guaranteed to be legally binding. For legally enforceable signatures, Certified digital signature service can be used.
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                            {/* Add signature button */}
                            <button
                                onClick={() => setShowModal(true)}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-[#047C58]/40 rounded-xl text-[#047C58] text-sm font-semibold hover:border-[#047C58] hover:bg-[#e6f4ef]/50 transition-all cursor-pointer"
                            >
                                <IconPlus size={16} stroke={2.5} />
                                Add Signature
                            </button>

                            {/* Saved signatures */}
                            {savedSignatures.length > 0 && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-brand-sage mb-3">My Signatures</p>
                                    <div className="space-y-2.5">
                                        {savedSignatures.map((sig) => (
                                            <div
                                                key={sig.id}
                                                draggable
                                                onDragStart={(e) => {
                                                    setIsMobileDrawerOpen(false);
                                                    e.dataTransfer.setData("application/json", JSON.stringify({ type: "signature", content: sig }));
                                                    e.dataTransfer.effectAllowed = "copy";
                                                }}
                                                className="group flex items-center gap-2 p-2 border border-[#E0DED9] rounded-xl bg-white hover:border-[#047C58]/50 transition-all shadow-sm hover:shadow-md cursor-move active:scale-[0.98]"
                                                onClick={() => {
                                                    placeSignatureInView(sig);
                                                    setIsMobileDrawerOpen(false);
                                                    toast.success("Signature placed! Tap it on the page to move or delete.", { duration: 3000, position: "top-center" });
                                                }}
                                            >
                                                {/* Drag handle */}
                                                <div className="text-brand-sage/40 group-hover:text-brand-sage transition-colors">
                                                    <IconGripVertical size={18} />
                                                </div>

                                                {/* Signature preview */}
                                                <div className="flex-1 min-w-0 h-14 bg-[#fcfbf9] rounded-lg flex items-center px-3 border border-[#E0DED9] overflow-hidden group-hover:bg-white transition-colors">
                                                    <img src={sig.dataUrl} alt={sig.label} className="max-h-10 object-contain mx-auto" />
                                                </div>

                                                {/* Actions (Vertical stacked on right) */}
                                                <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => handleEditSignature(e, sig)}
                                                        className="w-8 h-8 flex items-center justify-center bg-white border border-[#E0DED9] text-brand-sage hover:text-[#047C58] hover:border-[#047C58] rounded-lg transition-all cursor-pointer shadow-sm hover:shadow-md"
                                                        title="Edit signature"
                                                    >
                                                        <IconPencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteSignature(e, sig.id)}
                                                        className="w-8 h-8 flex items-center justify-center bg-white border border-[#E0DED9] text-brand-sage hover:text-red-500 hover:border-red-200 rounded-lg transition-all cursor-pointer shadow-sm hover:shadow-md"
                                                        title="Delete signature"
                                                    >
                                                        <IconTrash size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quick add fields — Date only */}
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-brand-sage mb-3">Quick Add Fields</p>
                                <button
                                    draggable
                                    onDragStart={(e) => {
                                        setIsMobileDrawerOpen(false);
                                        e.dataTransfer.setData("application/json", JSON.stringify({ type: "field", content: "Date" }));
                                        e.dataTransfer.effectAllowed = "copy";
                                    }}
                                    onClick={() => {
                                        const actualContent = new Date().toLocaleDateString("en-US");
                                        const dataUrl = renderTextSignature(actualContent, "Inter, sans-serif", "#000000", 32);
                                        const tempSig = { id: uid(), type: "typed" as const, dataUrl, label: "Date" };
                                        placeSignatureInView(tempSig, true, "Date", actualContent);
                                        setIsMobileDrawerOpen(false);
                                        toast.success("Date field placed! Tap it on the page to move or delete.", { duration: 3000, position: "top-center" });
                                    }}
                                    className="w-full flex items-center gap-2 p-2 rounded-xl border border-[#E0DED9] bg-white hover:border-[#047C58]/40 hover:bg-[#e6f4ef]/20 transition-all cursor-move group shadow-sm hover:shadow-md"
                                >
                                    <div className="text-brand-sage/40 group-hover:text-brand-sage transition-colors px-1">
                                        <IconGripVertical size={16} />
                                    </div>
                                    <span className="w-10 h-10 rounded-xl bg-[#f5f4f0] group-hover:bg-[#dcf2ec] flex items-center justify-center text-brand-sage group-hover:text-[#047C58] transition-all shrink-0">
                                        <IconCalendar size={16} />
                                    </span>
                                    <div className="flex-1 flex flex-col text-left items-start">
                                        <p className="text-[13px] font-bold text-brand-dark">Date</p>
                                        <p className="text-[11px] text-brand-sage font-medium -mt-0.5">Drag or click to add today's date</p>
                                    </div>
                                </button>
                            </div>

                            {/* Drag & Drop hint */}
                            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#f5f4f0] border border-[#E0DED9]">
                                <span className="text-lg shrink-0 mt-0.5">💡</span>
                                <p className="text-[11px] text-brand-sage leading-relaxed">
                                    <span className="font-bold text-brand-dark">Click or drag &amp; drop</span> any signature or field from above directly onto the page to place it exactly where you need it.
                                </p>
                            </div>
                        </div>

                        {/* Export / Download Action (Pinned to bottom of sidebar) */}
                        <div className="p-4 bg-white border-t border-[#E0DED9] mt-auto shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                            <button
                                onClick={handleExport}
                                disabled={isExporting || placedSignatures.length === 0}
                                className="w-full py-4 rounded-xl bg-[#047C58] text-white text-[15px] font-bold hover:bg-[#036649] disabled:opacity-50 flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg shadow-[#047C58]/25 active:scale-[0.98]"
                            >
                                {isExporting ? <IconLoader2 size={18} className="animate-spin" /> : <IconWriting size={18} />}
                                {isExporting ? "Signing PDF..." : "Sign PDF"}
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* Modal */ }
    {
        showModal && (
            <SignatureModal
                onClose={() => {
                    setShowModal(false);
                    setEditingSignature(null);
                }}
                onSave={handleSaveSignature}
                initialData={editingSignature ?? undefined}
            />
        )
    }
        </div >
    );
}
