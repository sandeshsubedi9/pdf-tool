"use client";

import React, {
    useState,
    useRef,
    useEffect,
    ChangeEvent,
    useCallback,
} from "react";
import {
    IconTypography,
    IconPhoto,
    IconPencil,
    IconHighlight,
    IconTrash,
    IconDownload,
    IconChevronUp,
    IconChevronDown,
    IconMinus,
    IconPlus,
    IconCursorText,
    IconEraser,
    IconArrowLeft,
    IconLoader2,
    IconBold,
    IconItalic,
    IconUnderline,
    IconFileText,
    IconForms,
    IconFileTypePdf,
    IconX,
    IconCopy,
    IconSearch,
} from "@tabler/icons-react";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { Rnd } from "react-rnd";
import { motion, AnimatePresence } from "motion/react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Tool = "select" | "text" | "image" | "draw" | "highlight" | "eraser";

interface TextAnnotation {
    id: string;
    type: "text";
    page: number; // 1-indexed
    x: number;   // % of page width
    y: number;   // % of page height
    w: number;   // px
    h: number;   // px
    text: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    align: "left" | "center" | "right";
    editing: boolean;
    isNew?: boolean;
}

interface ImageAnnotation {
    id: string;
    type: "image";
    page: number;
    x: number; // % of page width
    y: number; // % of page height
    w: number; // px
    h: number; // px
    dataUrl: string;
}

interface DrawAnnotation {
    id: string;
    type: "draw";
    page: number;
    paths: { x: number; y: number }[][]; // coords are % of page
    color: string;
    lineWidth: number;
    isHighlight?: boolean;
}

type Annotation = TextAnnotation | ImageAnnotation | DrawAnnotation;

interface PageData {
    dataUrl: string;
    width: number;
    height: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const COLORS = ["#1E1702", "#047C58", "#EF4444", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899", "#ffffff"];

const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const ZOOM_LABELS: Record<number, string> = {
    0.5: "50%", 0.75: "75%", 1.0: "100%",
    1.25: "125%", 1.5: "150%", 2.0: "200%",
};

const GOOGLE_FONTS = [
    "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Raleway",
    "Source Sans Pro", "Nunito", "Ubuntu", "Oswald", "Playfair Display",
    "Merriweather", "Libre Baskerville", "Josefin Sans", "Work Sans",
    "Fira Sans", "Quicksand", "Cabin", "Mulish", "Rubik", "DM Sans",
    "Space Grotesk", "Sora", "Plus Jakarta Sans", "Outfit",
    "Helvetica", "Arial", "Georgia", "Times New Roman", "Courier New",
];

const HANDLE_STYLE: React.CSSProperties = {
    width: 10, height: 10,
    background: "#2563eb",
    border: "2px solid white",
    borderRadius: "50%",
    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
};
const HANDLE_STYLES = {
    topLeft:     { ...HANDLE_STYLE, cursor: "nw-resize" },
    top:         { ...HANDLE_STYLE, cursor: "n-resize" },
    topRight:    { ...HANDLE_STYLE, cursor: "ne-resize" },
    right:       { ...HANDLE_STYLE, cursor: "e-resize" },
    bottomRight: { ...HANDLE_STYLE, cursor: "se-resize" },
    bottom:      { ...HANDLE_STYLE, cursor: "s-resize" },
    bottomLeft:  { ...HANDLE_STYLE, cursor: "sw-resize" },
    left:        { ...HANDLE_STYLE, cursor: "w-resize" },
};

function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── Draw overlay canvas per page ───────────────────────────────────────────

function DrawCanvas({
    page,
    annotations,
    tool,
    drawColor,
    drawWidth,
    onDrawEnd,
}: {
    page: number;
    annotations: DrawAnnotation[];
    tool: Tool;
    drawColor: string;
    drawWidth: number;
    onDrawEnd: (ann: DrawAnnotation) => void;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const currentPath = useRef<{ x: number; y: number }[]>([]);

    // Redraw saved annotations
    useEffect(() => {
        const c = ref.current;
        if (!c) return;
        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, c.width, c.height);
        for (const ann of annotations) {
            for (const path of ann.paths) {
                if (path.length < 2) continue;
                ctx.beginPath();
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                if (ann.isHighlight) {
                    ctx.globalAlpha = 0.35;
                    ctx.strokeStyle = ann.color;
                    ctx.lineWidth = ann.lineWidth * 4;
                } else {
                    ctx.globalAlpha = 1;
                    ctx.strokeStyle = ann.color;
                    ctx.lineWidth = ann.lineWidth;
                }
                ctx.moveTo(path[0].x * c.width, path[0].y * c.height);
                for (let i = 1; i < path.length; i++) {
                    ctx.lineTo(path[i].x * c.width, path[i].y * c.height);
                }
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
    }, [annotations]);

    function getPos(e: React.MouseEvent) {
        const c = ref.current!;
        const r = c.getBoundingClientRect();
        return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    }

    function down(e: React.MouseEvent) {
        if (!["draw", "highlight", "eraser"].includes(tool)) return;
        e.stopPropagation();
        isDrawing.current = true;
        currentPath.current = [getPos(e)];
    }

    function move(e: React.MouseEvent) {
        if (!isDrawing.current) return;
        const pos = getPos(e);
        currentPath.current.push(pos);
        const c = ref.current!;
        const ctx = c.getContext("2d")!;
        const path = currentPath.current;
        if (path.length < 2) return;
        const prev = path[path.length - 2];
        const cur = path[path.length - 1];
        ctx.beginPath();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (tool === "highlight") {
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = drawColor;
            ctx.lineWidth = drawWidth * 4;
        } else if (tool === "eraser") {
            ctx.globalCompositeOperation = "destination-out";
            ctx.strokeStyle = "rgba(0,0,0,1)";
            ctx.lineWidth = drawWidth * 6;
        } else {
            ctx.globalAlpha = 1;
            ctx.strokeStyle = drawColor;
            ctx.lineWidth = drawWidth;
        }
        ctx.moveTo(prev.x * c.width, prev.y * c.height);
        ctx.lineTo(cur.x * c.width, cur.y * c.height);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
    }

    function up() {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        const path = currentPath.current;
        if (path.length >= 2) {
            onDrawEnd({
                id: uid(),
                type: "draw",
                page,
                paths: [path],
                color: tool === "eraser" ? "#ffffff" : drawColor,
                lineWidth: drawWidth,
                isHighlight: tool === "highlight",
            });
        }
        currentPath.current = [];
    }

    const isActive = ["draw", "highlight", "eraser"].includes(tool);

    return (
        <canvas
            ref={ref}
            className="absolute inset-0 z-10"
            style={{
                width: "100%",
                height: "100%",
                pointerEvents: isActive ? "auto" : "none",
                cursor: isActive ? "crosshair" : "default",
            }}
            onMouseDown={down}
            onMouseMove={move}
            onMouseUp={up}
            onMouseLeave={up}
        />
    );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function PdfEditor({ file, setFile }: { file: File; setFile: (f: File | null) => void }) {

    const [pages, setPages] = useState<PageData[]>([]);
    const [pdfArrayBuffer, setPdfArrayBuffer] = useState<ArrayBuffer | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [pageJump, setPageJump] = useState("1");

    const [tool, setTool] = useState<Tool>("select");
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [zoom, setZoom] = useState(1.0);
    const [showZoomMenu, setShowZoomMenu] = useState(false);

    const [drawColor, setDrawColor] = useState("#1E1702");
    const [drawWidth, setDrawWidth] = useState(3);
    const [textColor, setTextColor] = useState("#1E1702");
    const [textFontSize, setTextFontSize] = useState(24);
    const [textFont, setTextFont] = useState("Helvetica");
    const [textBold, setTextBold] = useState(false);
    const [textItalic, setTextItalic] = useState(false);
    const [textUnderline, setTextUnderline] = useState(false);
    const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");
    const [fontSearch, setFontSearch] = useState("Helvetica");
    const [showFontList, setShowFontList] = useState(false);

    const imgInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const canZoomIn = ZOOM_LEVELS.indexOf(zoom) < ZOOM_LEVELS.length - 1;
    const canZoomOut = ZOOM_LEVELS.indexOf(zoom) > 0;
    const zoomIn = () => { const i = ZOOM_LEVELS.indexOf(zoom); if (i < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[i + 1]); };
    const zoomOut = () => { const i = ZOOM_LEVELS.indexOf(zoom); if (i > 0) setZoom(ZOOM_LEVELS[i - 1]); };

    // ─── Load Google Fonts ──────────────────────────────────────────────────
    useEffect(() => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${GOOGLE_FONTS.map(f => f.replace(/ /g, "+")).join("&family=")}&display=swap`;
        document.head.appendChild(link);
        return () => { document.head.removeChild(link); };
    }, []);

    // ─── Load PDF and render all pages ──────────────────────────────────────

    useEffect(() => {
        if (!file) return;
        setIsLoading(true);
        setPages([]);
        setAnnotations([]);
        setSelectedId(null);
        setCurrentPage(1);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const ab = e.target!.result as ArrayBuffer;
            setPdfArrayBuffer(ab.slice(0));
            try {
                const pdfjsLib = await import("pdfjs-dist");
                pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
                    "pdfjs-dist/build/pdf.worker.min.mjs",
                    import.meta.url
                ).toString();
                const doc = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
                setNumPages(doc.numPages);

                const results: PageData[] = [];
                for (let i = 1; i <= doc.numPages; i++) {
                    const page = await doc.getPage(i);
                    const vp = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement("canvas");
                    canvas.width = vp.width;
                    canvas.height = vp.height;
                    const ctx = canvas.getContext("2d")!;
                    await page.render({ canvasContext: ctx, viewport: vp } as any).promise;
                    results.push({ dataUrl: canvas.toDataURL("image/jpeg", 0.92), width: vp.width, height: vp.height });
                }
                setPages(results);
            } catch (err) {
                console.error("PDF load error:", err);
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    }, [file]);

    // ─── Sync page jump input ────────────────────────────────────────────────
    useEffect(() => {
        setPageJump(currentPage.toString());
        const thumb = document.getElementById(`edit-thumb-${currentPage}`);
        if (thumb) thumb.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [currentPage]);

    // ─── Scroll → detect current page ────────────────────────────────────────
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (!pages.length) return;
        const container = e.currentTarget;
        const center = container.getBoundingClientRect().top + container.getBoundingClientRect().height / 2;
        let closest = currentPage;
        let minDist = Infinity;
        for (let i = 0; i < pages.length; i++) {
            const el = document.getElementById(`edit-page-${i}`);
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            const dist = Math.abs(rect.top + rect.height / 2 - center);
            if (dist < minDist) { minDist = dist; closest = i + 1; }
        }
        if (closest !== currentPage) setCurrentPage(closest);
    };

    // ─── Scroll to page when nav buttons clicked ─────────────────────────────
    function scrollToPage(pageNum: number) {
        const el = document.getElementById(`edit-page-${pageNum - 1}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        setCurrentPage(pageNum);
    }

    // ─── Annotation helpers ──────────────────────────────────────────────────
    const updateAnnotation = (id: string, patch: Partial<Annotation>) => {
        setAnnotations(prev => prev.map(a => a.id === id ? { ...a, ...patch } as Annotation : a));
    };
    const deleteAnnotation = (id: string) => {
        setAnnotations(prev => prev.filter(a => a.id !== id));
        setSelectedId(null);
    };
    const duplicateAnnotation = (id: string) => {
        const ann = annotations.find(a => a.id === id);
        if (!ann) return;
        let copy: Annotation;
        if (ann.type === "draw") {
            copy = {
                ...ann,
                id: uid(),
                paths: ann.paths.map(p => p.map(pt => ({ x: pt.x + 2, y: pt.y + 2 })))
            } as DrawAnnotation;
        } else {
            copy = {
                ...ann,
                id: uid(),
                x: (ann as any).x + 3,
                y: (ann as any).y + 3,
                isNew: ann.type === "text" ? true : undefined
            } as Annotation;
        }
        setAnnotations(prev => [...prev, copy]);
        setSelectedId(copy.id);
    };

    const addDraw = (ann: DrawAnnotation) => setAnnotations(prev => [...prev, ann]);

    const selectedAnn = annotations.find(a => a.id === selectedId);

    // ─── Click on page: add text ─────────────────────────────────────────────
    function onPageClick(e: React.MouseEvent<HTMLDivElement>, pageIndex: number) {
        if (tool !== "text") return;
        if ((e.target as HTMLElement).closest("[data-annotation]")) return;
        const el = e.currentTarget;
        const rect = el.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        const newText: TextAnnotation = {
            id: uid(), type: "text", page: pageIndex + 1,
            x, y,
            w: 20,  // 20% of page width
            h: 5,   // 5% of page height
            text: "New Text Box",
            fontSize: textFontSize, fontFamily: textFont, color: textColor,
            bold: textBold, italic: textItalic, underline: textUnderline,
            align: textAlign, editing: true, isNew: true,
        };
        setAnnotations(prev => [...prev, newText]);
        setSelectedId(newText.id);
        setTool("select");
    }

    function onImageFileChange(e: ChangeEvent<HTMLInputElement>) {
        const imgFile = e.target.files?.[0];
        if (!imgFile) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target!.result as string;
            const newAnn: ImageAnnotation = {
                id: uid(), type: "image", page: currentPage,
                x: 10, y: 10, w: 30, h: 25, dataUrl, // w/h as % of page
            };
            setAnnotations(prev => [...prev, newAnn]);
            setSelectedId(newAnn.id);
            setTool("select");
        };
        reader.readAsDataURL(imgFile);
        e.target.value = "";
    }

    // ─── Save PDF ─────────────────────────────────────────────────────────────
    async function savePdf() {
        if (!pdfArrayBuffer || !file) return;
        setIsSaving(true);
        try {
            const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
            const pdfDoc = await PDFDocument.load(pdfArrayBuffer.slice(0));
            const pdfPages = pdfDoc.getPages();

            const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
            const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

            for (const ann of annotations) {
                const pdfPage = pdfPages[ann.page - 1];
                if (!pdfPage) continue;
                const { width: pw, height: ph } = pdfPage.getSize();

                if (ann.type === "text") {
                    const ta = ann as TextAnnotation;
                    const xPt = (ta.x / 100) * pw;
                    const yPt = ph - ((ta.y / 100) * ph) - ta.fontSize;
                    let font = helvetica;
                    if (ta.bold && ta.italic) font = helveticaBoldOblique;
                    else if (ta.bold) font = helveticaBold;
                    else if (ta.italic) font = helveticaOblique;
                    const hexToRgb = (hex: string) => {
                        const r = parseInt(hex.slice(1, 3), 16) / 255;
                        const g = parseInt(hex.slice(3, 5), 16) / 255;
                        const b = parseInt(hex.slice(5, 7), 16) / 255;
                        return rgb(r, g, b);
                    };
                    pdfPage.drawText(ta.text, { x: xPt, y: yPt, size: ta.fontSize, font, color: hexToRgb(ta.color) });
                } else if (ann.type === "image") {
                    const ia = ann as ImageAnnotation;
                    // ia.w and ia.h are now percentages of page dimensions
                    const xPt = (ia.x / 100) * pw;
                    const wPt = (ia.w / 100) * pw;
                    const hPt = (ia.h / 100) * ph;
                    const yPt = ph - ((ia.y / 100) * ph) - hPt;
                    const base64 = ia.dataUrl.split(",")[1];
                    const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
                    const embeddedImg = ia.dataUrl.startsWith("data:image/png")
                        ? await pdfDoc.embedPng(imgBytes)
                        : await pdfDoc.embedJpg(imgBytes);
                    pdfPage.drawImage(embeddedImg, { x: xPt, y: yPt, width: wPt, height: hPt });
                }
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `edited_${file.name}`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
        } catch (err) {
            console.error("Save Error:", err);
            alert("Failed to save PDF.");
        } finally {
            setIsSaving(false);
        }
    }

    // ─── Upload screen ────────────────────────────────────────────────────────
    if (!file || (!isLoading && pages.length === 0 && numPages === 0)) {
        return (
            <ToolLayout
                title="Edit PDF"
                description="Add text, images, drawings and highlights to your PDF."
                icon={<IconPencil size={28} />}
                accentColor="#047C58"
            >
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-border">
                    <FileUpload
                        accept={{ "application/pdf": [".pdf"] }}
                        multiple={false}
                        files={[]}
                        setFiles={(files) => {
                            if (Array.isArray(files) && files.length > 0) setFile(files[0]);
                            else if (typeof files === "function") {
                                const result = files([]);
                                if (result.length > 0) setFile(result[0]);
                            }
                        }}
                    />
                </div>
            </ToolLayout>
        );
    }

    // ─── Loading screen ───────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-[#fdfdfb]">
                <div className="flex flex-col items-center gap-4">
                    <IconLoader2 size={36} className="animate-spin text-black" />
                    <p className="text-brand-sage text-sm font-medium">Rendering PDF pages…</p>
                </div>
            </div>
        );
    }

    // ─── Editor ───────────────────────────────────────────────────────────────
    return (
        <div
            className="h-[calc(100vh-64px)] flex flex-col bg-[#fdfdfb] overflow-hidden"
            onClick={() => {
                setShowZoomMenu(false);
                setShowFontList(false);
            }}
        >
            {/* ── SECONDARY NAVBAR ── */}
            <div className="h-14 shrink-0 bg-white border-b border-[#E0DED9] px-4 flex items-center justify-between z-40 gap-2 shadow-sm">

                {/* LEFT: Back + file info */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="pr-4 border-r border-[#E0DED9] shrink-0">
                        <button
                            onClick={() => setFile(null)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-sage hover:bg-[#f5f4f0] hover:text-brand-dark transition-all"
                        >
                            <IconArrowLeft size={16} />
                            Back
                        </button>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="bg-[#f0f0f0] p-1.5 rounded-lg shrink-0">
                            <IconFileTypePdf size={18} className="text-black" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-brand-dark max-w-[150px] truncate leading-tight">{file.name}</span>
                            <span className="text-[10px] text-brand-sage font-medium">
                                {numPages} pages · {file.size ? (file.size / 1024 / 1024).toFixed(2) + " MB" : ""}
                            </span>
                        </div>
                    </div>
                </div>

                {/* CENTER: Tools + Page Nav + Zoom */}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                    {/* Tool buttons */}
                    <div className="flex items-center bg-[#f5f4f0] border border-[#E0DED9] rounded-xl p-1 gap-0.5">
                        {([
                            { id: "select", icon: IconCursorText, label: "Select" },
                            { id: "text", icon: IconTypography, label: "Text" },
                            { id: "image", icon: IconPhoto, label: "Image" },
                            { id: "draw", icon: IconPencil, label: "Draw" },
                            { id: "highlight", icon: IconHighlight, label: "Highlight" },
                            { id: "eraser", icon: IconEraser, label: "Eraser" },
                        ] as const).map(btn => (
                            <button
                                key={btn.id}
                                onClick={() => {
                                    setTool(btn.id as Tool);
                                    if (btn.id === "image") imgInputRef.current?.click();
                                }}
                                className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${tool === btn.id ? "bg-white text-brand-dark shadow-sm border border-[#E0DED9]/60" : "text-brand-sage hover:text-brand-dark hover:bg-white/50"}`}
                                title={btn.label}
                            >
                                <btn.icon size={16} />
                                <span className="text-[11px] font-bold hidden xl:block">{btn.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-6 bg-[#E0DED9]" />

                    {/* Page navigation */}
                    <div className="flex items-center gap-1 bg-[#f5f4f0] p-1 rounded-xl border border-[#E0DED9]">
                        <button
                            onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-sage hover:bg-white hover:text-brand-dark hover:shadow-sm disabled:opacity-30 transition-all"
                        >
                            <IconChevronUp size={14} />
                        </button>
                        <button
                            onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))}
                            disabled={currentPage === numPages}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-sage hover:bg-white hover:text-brand-dark hover:shadow-sm disabled:opacity-30 transition-all"
                        >
                            <IconChevronDown size={14} />
                        </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <div className="bg-[#f5f4f0]/60 hover:bg-[#f5f4f0] border-2 border-transparent focus-within:border-brand-dark focus-within:bg-white rounded-xl px-2 py-1 transition-all">
                            <input
                                type="text"
                                className="w-8 text-center font-bold text-sm bg-transparent focus:outline-none text-brand-dark"
                                value={pageJump}
                                onChange={e => setPageJump(e.target.value.replace(/\D/g, ""))}
                                onKeyDown={e => {
                                    if (e.key === "Enter") {
                                        const val = parseInt(pageJump);
                                        if (!isNaN(val) && val >= 1 && val <= numPages) scrollToPage(val);
                                        else setPageJump(currentPage.toString());
                                    }
                                }}
                                onBlur={() => setPageJump(currentPage.toString())}
                            />
                        </div>
                        <span className="text-xs font-bold text-brand-sage">/ {numPages}</span>
                    </div>

                    <div className="w-px h-6 bg-[#E0DED9]" />

                    {/* Zoom */}
                    <div className="flex items-center gap-1 bg-[#f5f4f0] p-1 rounded-xl border border-[#E0DED9]">
                        <button onClick={zoomOut} disabled={!canZoomOut} className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-sage hover:bg-white hover:text-brand-dark hover:shadow-sm disabled:opacity-30 transition-all">
                            <IconMinus size={14} />
                        </button>
                        <div className="relative">
                            <button
                                onClick={e => { e.stopPropagation(); setShowZoomMenu(v => !v); }}
                                className="px-2 py-1 text-xs font-bold text-brand-dark hover:bg-white rounded-lg transition-all min-w-[46px] text-center"
                            >
                                {ZOOM_LABELS[zoom] ?? `${Math.round(zoom * 100)}%`}
                            </button>
                            <AnimatePresence>
                                {showZoomMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-white rounded-xl border border-[#E0DED9] shadow-xl overflow-hidden z-50 min-w-[90px]"
                                    >
                                        {ZOOM_LEVELS.map(z => (
                                            <button
                                                key={z}
                                                onClick={e => { e.stopPropagation(); setZoom(z); setShowZoomMenu(false); }}
                                                className={`w-full px-4 py-2 text-xs font-bold text-left hover:bg-[#f5f4f0] transition-colors ${zoom === z ? "bg-black text-white hover:bg-black" : "text-brand-dark"}`}
                                            >
                                                {ZOOM_LABELS[z]}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <button onClick={zoomIn} disabled={!canZoomIn} className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-sage hover:bg-white hover:text-brand-dark hover:shadow-sm disabled:opacity-30 transition-all">
                            <IconPlus size={14} />
                        </button>
                    </div>
                </div>

                {/* RIGHT spacer */}
                <div className="flex-1 hidden lg:block" />
            </div>

            {/* ── MAIN LAYOUT ── */}
            <div className="flex-1 flex overflow-hidden">

                {/* Left: Thumbnails */}
                {pages.length > 0 && (
                    <div className="hidden md:flex flex-col bg-white border-r border-[#E0DED9] shrink-0 w-[140px]">
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4 bg-[#fdfdfb]">
                            {pages.map((pg, i) => (
                                <div key={i} className="flex flex-col items-center gap-1.5">
                                    <button
                                        id={`edit-thumb-${i + 1}`}
                                        onClick={() => scrollToPage(i + 1)}
                                        className={`relative w-full rounded-md border-2 transition-all cursor-pointer overflow-hidden ${currentPage === i + 1 ? "border-brand-dark shadow-md" : "border-[#E0DED9] bg-white"}`}
                                    >
                                        <img src={pg.dataUrl} alt={`Page ${i + 1}`} className="w-full object-contain" draggable={false} />
                                    </button>
                                    <span className={`text-[11px] font-bold ${currentPage === i + 1 ? "text-brand-dark" : "text-brand-sage"}`}>
                                        Page {i + 1}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Center: All pages scrollable */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 bg-[#E8E6E3] overflow-auto custom-scrollbar"
                    onScroll={handleScroll}
                >
                    <div className="py-8 flex flex-col items-center gap-8 pb-20">
                        <div
                            className="flex flex-col gap-8"
                            style={{ width: `${Math.min(900 * zoom, 3000)}px`, maxWidth: "none" }}
                        >
                            {pages.map((pg, i) => {
                                const pageAnns = annotations.filter(a => a.page === i + 1);
                                const drawAnns = pageAnns.filter(a => a.type === "draw") as DrawAnnotation[];
                                const overlayAnns = pageAnns.filter(a => a.type === "text" || a.type === "image");

                                return (
                                    <div
                                        key={i}
                                        id={`edit-page-${i}`}
                                        className="relative bg-white shadow-xl mx-auto select-none"
                                        style={{
                                            aspectRatio: `${pg.width} / ${pg.height}`,
                                            width: "100%",
                                            border: "1px solid #ccc",
                                            cursor: tool === "text" ? "text" : ["draw", "highlight", "eraser"].includes(tool) ? "crosshair" : "default",
                                        }}
                                        onClick={e => onPageClick(e, i)}
                                    >
                                        {/* Page image */}
                                        <img
                                            src={pg.dataUrl}
                                            alt={`Page ${i + 1}`}
                                            className="w-full h-full object-contain select-none pointer-events-none"
                                            draggable={false}
                                        />

                                        {/* Draw canvas overlay */}
                                        <DrawCanvas
                                            page={i + 1}
                                            annotations={drawAnns}
                                            tool={tool}
                                            drawColor={drawColor}
                                            drawWidth={drawWidth}
                                            onDrawEnd={addDraw}
                                        />

                                        {/* Text / Image annotation overlays
                                             Position: CSS left/top % on wrapper → always zoom-accurate, no DOM reads
                                             Size: computed pixel dimensions from deterministic formula → matches zoom exactly
                                             Font: ta.fontSize * zoom → scales with page */}
                                        <div className="absolute inset-0 z-20" style={{ pointerEvents: ["draw", "highlight", "eraser"].includes(tool) ? "none" : "auto" }}>
                                            {overlayAnns.map(ann => {
                                                // Page pixel size computed from the same formula as the container style.
                                                // No DOM reads needed – deterministic and always current.
                                                const pagePxW = Math.min(900 * zoom, 3000);
                                                const pagePxH = pagePxW * (pg.height / pg.width);

                                                if (ann.type === "text") {
                                                    const ta = ann as TextAnnotation;
                                                    const rndW = (ta.w / 100) * pagePxW;
                                                    const rndH = (ta.h / 100) * pagePxH;
                                                    return (
                                                        <div
                                                            key={ta.id}
                                                            data-annotation="true"
                                                            className="absolute"
                                                            style={{
                                                                left: `${ta.x}%`,
                                                                top: `${ta.y}%`,
                                                                zIndex: 20,
                                                            }}
                                                        >
                                                            <Rnd
                                                                key={`${ta.id}-${zoom}`}
                                                                data-annotation="true"
                                                                size={{ width: rndW, height: rndH }}
                                                                position={{ x: 0, y: 0 }}
                                                                onDragStop={(_: any, d: any) => {
                                                                    updateAnnotation(ta.id, {
                                                                        x: ta.x + (d.x / pagePxW) * 100,
                                                                        y: ta.y + (d.y / pagePxH) * 100,
                                                                    } as any);
                                                                }}
                                                                onResizeStop={(_: any, __: any, ref: any, ___: any, pos: any) => {
                                                                    updateAnnotation(ta.id, {
                                                                        w: (parseInt(ref.style.width) / pagePxW) * 100,
                                                                        h: (parseInt(ref.style.height) / pagePxH) * 100,
                                                                        x: ta.x + (pos.x / pagePxW) * 100,
                                                                        y: ta.y + (pos.y / pagePxH) * 100,
                                                                    } as any);
                                                                }}
                                                                disableDragging={tool !== "select" || ta.editing}
                                                                enableResizing={tool === "select" && !ta.editing}
                                                                handleStyles={selectedId === ta.id && !ta.editing ? HANDLE_STYLES : {}}
                                                                className={`z-20 ${selectedId === ta.id ? "outline-2 outline-[#2563eb]" : "hover:outline-2 hover:outline-[#2563eb]/40"}`}
                                                                style={{ position: "relative" }}
                                                                onClick={(e: any) => {
                                                                    e.stopPropagation();
                                                                    setSelectedId(ta.id);
                                                                    updateAnnotation(ta.id, { editing: true } as any);
                                                                }}
                                                            >
                                                                <div className="w-full h-full relative group">
                                                                    {ta.editing ? (
                                                                        <textarea
                                                                            autoFocus
                                                                            rows={1}
                                                                            onFocus={(e) => {
                                                                                const target = e.target;
                                                                                if (ta.isNew) {
                                                                                    setTimeout(() => {
                                                                                        target.select();
                                                                                        target.style.height = "auto";
                                                                                        const sh = target.scrollHeight;
                                                                                        target.style.height = sh + "px";
                                                                                        updateAnnotation(ta.id, { isNew: false } as any);
                                                                                    }, 10);
                                                                                } else {
                                                                                    const val = target.value;
                                                                                    target.value = "";
                                                                                    target.value = val;
                                                                                    target.style.height = "auto";
                                                                                    const scrollH = target.scrollHeight;
                                                                                    target.style.height = scrollH + "px";
                                                                                }
                                                                            }}
                                                                            className="w-full h-full outline-none resize-none p-0 bg-transparent leading-snug overflow-hidden"
                                                                            style={{ fontSize: `${ta.fontSize * zoom}px`, fontFamily: ta.fontFamily, color: ta.color, fontWeight: ta.bold ? "bold" : "normal", fontStyle: ta.italic ? "italic" : "normal", textDecoration: ta.underline ? "underline" : "none", textAlign: ta.align, lineHeight: 1.3 }}
                                                                            value={ta.text}
                                                                            onChange={e => {
                                                                                updateAnnotation(ta.id, { text: e.target.value } as any);
                                                                                e.target.style.height = "auto";
                                                                                e.target.style.height = e.target.scrollHeight + "px";
                                                                            }}
                                                                            onBlur={() => updateAnnotation(ta.id, { editing: false } as any)}
                                                                        />
                                                                    ) : (
                                                                        <div
                                                                            className="w-full h-full p-0 whitespace-pre-wrap wrap-break-word overflow-hidden"
                                                                            style={{ fontSize: `${ta.fontSize * zoom}px`, fontFamily: ta.fontFamily, color: ta.color, fontWeight: ta.bold ? "bold" : "normal", fontStyle: ta.italic ? "italic" : "normal", textDecoration: ta.underline ? "underline" : "none", textAlign: ta.align, cursor: tool === "select" ? "move" : "default", lineHeight: 1.3 }}
                                                                        >
                                                                            {ta.text}
                                                                        </div>
                                                                    )}
                                                                    {selectedId === ta.id && (
                                                                        <div className="absolute -top-6 right-0 flex items-center gap-1.5 z-40">
                                                                            <button onClick={() => duplicateAnnotation(ta.id)} className="bg-[#2563eb] text-white rounded-md px-2 py-1 text-[11px] font-bold flex items-center gap-1 shadow-lg hover:bg-blue-700 transition-colors" title="Duplicate">
                                                                                <IconCopy size={12} />
                                                                            </button>
                                                                            <button onClick={() => deleteAnnotation(ta.id)} className="bg-red-500 text-white rounded-md px-2 py-1 text-[11px] font-bold flex items-center gap-1 shadow-lg hover:bg-red-600 transition-colors" title="Delete">
                                                                                <IconX size={12} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </Rnd>
                                                        </div>
                                                    );
                                                }
                                                if (ann.type === "image") {
                                                    const ia = ann as ImageAnnotation;
                                                    return (
                                                        <div
                                                            key={ia.id}
                                                            data-annotation="true"
                                                            className="absolute"
                                                            style={{
                                                                left: `${ia.x}%`,
                                                                top: `${ia.y}%`,
                                                                zIndex: 20,
                                                            }}
                                                        >
                                                            <Rnd
                                                                key={`${ia.id}-${zoom}`}
                                                                data-annotation="true"
                                                                size={{ width: (ia.w / 100) * pagePxW, height: (ia.h / 100) * pagePxH }}
                                                                position={{ x: 0, y: 0 }}
                                                                onDragStop={(_: any, d: any) => {
                                                                    updateAnnotation(ia.id, {
                                                                        x: ia.x + (d.x / pagePxW) * 100,
                                                                        y: ia.y + (d.y / pagePxH) * 100,
                                                                    } as any);
                                                                }}
                                                                onResizeStop={(_: any, __: any, ref: any, ___: any, pos: any) => {
                                                                    updateAnnotation(ia.id, {
                                                                        w: (parseInt(ref.style.width) / pagePxW) * 100,
                                                                        h: (parseInt(ref.style.height) / pagePxH) * 100,
                                                                        x: ia.x + (pos.x / pagePxW) * 100,
                                                                        y: ia.y + (pos.y / pagePxH) * 100,
                                                                    } as any);
                                                                }}
                                                                disableDragging={tool !== "select"}
                                                                enableResizing={tool === "select"}
                                                                handleStyles={selectedId === ia.id ? HANDLE_STYLES : {}}
                                                                className={`z-20 ${selectedId === ia.id ? "outline-2 outline-[#2563eb]" : "hover:outline-2 hover:outline-[#2563eb]/40"}`}
                                                                style={{ position: "relative" }}
                                                                onClick={(e: any) => { e.stopPropagation(); setSelectedId(ia.id); }}
                                                            >
                                                                <div className="w-full h-full relative group">
                                                                    <img src={ia.dataUrl} className="w-full h-full object-contain pointer-events-none" alt="" />
                                                                    {selectedId === ia.id && (
                                                                        <div className="absolute -top-6 right-0 flex items-center gap-1.5 z-40">
                                                                            <button onClick={() => duplicateAnnotation(ia.id)} className="bg-[#2563eb] text-white rounded-md px-2 py-1 text-[11px] font-bold flex items-center gap-1 shadow-lg hover:bg-blue-700 transition-colors" title="Duplicate">
                                                                                <IconCopy size={12} />
                                                                            </button>
                                                                            <button onClick={() => deleteAnnotation(ia.id)} className="bg-red-500 text-white rounded-md px-2 py-1 text-[11px] font-bold flex items-center gap-1 shadow-lg hover:bg-red-600 transition-colors" title="Delete">
                                                                                <IconX size={12} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </Rnd>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right: Properties panel */}
                <div className="hidden lg:flex flex-col bg-white border-l border-[#E0DED9] w-[270px] shrink-0">
                    <div className="px-4 py-4 border-b border-[#E0DED9]">
                        <h3 className="text-sm font-bold text-brand-dark flex items-center gap-2">
                            <IconForms size={16} className="text-black" />
                            Properties
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
                        {/* Text settings */}
                        {(tool === "text" || selectedAnn?.type === "text") && (
                            <div className="flex flex-col gap-4">
                                {/* Font picker with search */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-bold text-brand-sage uppercase tracking-wider">Font</label>
                                    <div className="relative">
                                        <div 
                                            className="flex items-center justify-between bg-[#f5f4f0] border border-[#E0DED9] rounded-xl px-2.5 py-1.5 cursor-pointer hover:bg-[#e8e6e3] transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowFontList(!showFontList);
                                                setFontSearch("");
                                            }}
                                        >
                                            <span style={{ fontFamily: selectedAnn?.type === "text" ? (selectedAnn as TextAnnotation).fontFamily : textFont }} className="text-xs font-medium text-brand-dark truncate">
                                                {selectedAnn?.type === "text" ? (selectedAnn as TextAnnotation).fontFamily : textFont}
                                            </span>
                                            <IconChevronDown size={14} className="text-brand-sage shrink-0" />
                                        </div>
                                        {showFontList && (
                                            <div 
                                                className="absolute top-full mt-1 left-0 right-0 bg-white border border-[#E0DED9] rounded-xl shadow-xl z-50 max-h-56 flex flex-col overflow-hidden"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <div className="p-2 border-b border-[#E0DED9]">
                                                    <div className="flex items-center gap-1.5 bg-[#f5f4f0] rounded-lg px-2 py-1.5">
                                                        <IconSearch size={12} className="text-brand-sage shrink-0" />
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            placeholder="Search..."
                                                            className="flex-1 bg-transparent text-xs font-medium outline-none text-brand-dark placeholder:text-brand-sage"
                                                            value={fontSearch}
                                                            onChange={e => setFontSearch(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="overflow-y-auto custom-scrollbar">
                                                {GOOGLE_FONTS.filter(f => f.toLowerCase().includes(fontSearch.toLowerCase())).map(f => (
                                                    <button
                                                        key={f}
                                                        onMouseDown={e => e.preventDefault()}
                                                        onClick={() => {
                                                            setTextFont(f);
                                                            setFontSearch("");
                                                            setShowFontList(false);
                                                            if (selectedAnn?.id) updateAnnotation(selectedAnn.id, { fontFamily: f } as any);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 text-xs hover:bg-[#f5f4f0] transition-colors ${textFont === f ? "bg-black text-white hover:bg-black font-bold" : "text-brand-dark"}`}
                                                        style={{ fontFamily: f }}
                                                    >
                                                        {f}
                                                    </button>
                                                ))}
                                                {GOOGLE_FONTS.filter(f => f.toLowerCase().includes(fontSearch.toLowerCase())).length === 0 && (
                                                    <div className="p-3 text-center text-xs text-brand-sage font-medium">No results found</div>
                                                )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-brand-sage">Current: <span style={{ fontFamily: textFont }} className="font-medium">{textFont}</span></p>
                                </div>

                                {/* Font size */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-bold text-brand-sage uppercase tracking-wider">Font Size</label>
                                    <input
                                        type="number"
                                        className="w-full bg-[#f5f4f0] border border-[#E0DED9] rounded-xl p-2.5 text-sm font-bold focus:ring-2 focus:ring-black/20 focus:border-black outline-none transition-all"
                                        value={selectedAnn?.type === "text" ? (selectedAnn as TextAnnotation).fontSize : textFontSize}
                                        onChange={e => {
                                            const v = Number(e.target.value);
                                            setTextFontSize(v);
                                            if (selectedAnn?.id) updateAnnotation(selectedAnn.id, { fontSize: v } as any);
                                        }}
                                    />
                                </div>

                                {/* Color */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-bold text-brand-sage uppercase tracking-wider">Color</label>
                                    <div className="flex flex-wrap gap-2">
                                        {COLORS.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => { setTextColor(c); if (selectedAnn?.id) updateAnnotation(selectedAnn.id, { color: c } as any); }}
                                                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${textColor === c ? "border-brand-teal scale-110" : "border-transparent shadow-sm"}`}
                                                style={{ background: c }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Bold/Italic/Underline */}
                                <div className="flex gap-1 bg-[#f5f4f0] p-1 rounded-xl border border-[#E0DED9]">
                                    {([
                                        { id: "bold", icon: IconBold },
                                        { id: "italic", icon: IconItalic },
                                        { id: "underline", icon: IconUnderline },
                                    ] as const).map(btn => {
                                        const isOn = selectedAnn?.type === "text"
                                            ? (selectedAnn as any)[btn.id]
                                            : btn.id === "bold" ? textBold : btn.id === "italic" ? textItalic : textUnderline;
                                        return (
                                            <button
                                                key={btn.id}
                                                onClick={() => {
                                                    const v = !isOn;
                                                    if (btn.id === "bold") setTextBold(v);
                                                    else if (btn.id === "italic") setTextItalic(v);
                                                    else setTextUnderline(v);
                                                    if (selectedAnn?.id) updateAnnotation(selectedAnn.id, { [btn.id]: v } as any);
                                                }}
                                                className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${isOn ? "bg-white text-brand-dark shadow-sm border border-[#E0DED9]" : "text-brand-sage hover:text-brand-dark"}`}
                                            >
                                                <btn.icon size={16} />
                                            </button>
                                        );
                                    })}
                                </div>


                            </div>
                        )}

                        {/* Selected individual component actions (for Text & Image) */}
                        {selectedAnn && (selectedAnn.type === "text" || selectedAnn.type === "image") && (
                            <div className="flex flex-col gap-1.5 pt-2 border-t border-[#E0DED9]">
                                <label className="text-[11px] font-bold text-brand-sage uppercase tracking-wider">Actions</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => duplicateAnnotation(selectedAnn.id)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#f5f4f0] border border-[#E0DED9] text-xs font-bold text-brand-dark hover:bg-[#E0DED9] transition-all"
                                    >
                                        <IconCopy size={14} /> Duplicate
                                    </button>
                                    <button
                                        onClick={() => deleteAnnotation(selectedAnn.id)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-red-600 hover:bg-red-100 transition-all"
                                    >
                                        <IconTrash size={14} /> Delete
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Draw settings */}
                        {["draw", "highlight", "eraser"].includes(tool) && (
                            <div className="flex flex-col gap-4">
                                {tool !== "eraser" && (
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-bold text-brand-sage uppercase tracking-wider">Brush Color</label>
                                        <div className="flex flex-wrap gap-2">
                                            {COLORS.map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => setDrawColor(c)}
                                                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${drawColor === c ? "border-brand-teal scale-110" : "border-transparent shadow-sm"}`}
                                                    style={{ background: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-bold text-brand-sage uppercase tracking-wider">Thickness: {drawWidth}px</label>
                                    <input type="range" min={1} max={24} className="w-full accent-black" value={drawWidth} onChange={e => setDrawWidth(Number(e.target.value))} />
                                </div>
                            </div>
                        )}

                        {!selectedAnn && tool === "select" && (
                            <div className="mt-16 text-center px-4">
                                <div className="w-14 h-14 bg-[#f5f4f0] rounded-full flex items-center justify-center mx-auto mb-3 border border-[#E0DED9]">
                                    <IconCursorText size={22} className="text-brand-sage" />
                                </div>
                                <p className="text-xs font-bold text-brand-dark">Nothing selected</p>
                                <p className="text-[11px] text-brand-sage mt-1">Click an object to edit its properties.</p>
                            </div>
                        )}
                    </div>

                    {/* Save button pinned to bottom */}
                    <div className="p-4 border-t border-[#E0DED9] bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                        <button
                            onClick={savePdf}
                            disabled={isSaving}
                            className="w-full py-3.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-[#222] disabled:opacity-50 flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-black/15 active:scale-[0.98]"
                        >
                            {isSaving ? <IconLoader2 size={18} className="animate-spin" /> : <IconDownload size={18} />}
                            {isSaving ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>

            <input ref={imgInputRef} type="file" className="hidden" accept="image/*" onChange={onImageFileChange} />
        </div>
    );
}
