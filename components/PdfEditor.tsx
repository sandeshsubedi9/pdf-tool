"use client";

import React, {
    useState,
    useRef,
    useCallback,
    useEffect,
    ChangeEvent,
} from "react";
import {
    IconUpload,
    IconTypography,
    IconPhoto,
    IconPencil,
    IconHighlight,
    IconTrash,
    IconDownload,
    IconChevronLeft,
    IconChevronRight,
    IconZoomIn,
    IconZoomOut,
    IconCursorText,
    IconEraser,
    IconArrowBack,
    IconLoader2,
    IconBold,
    IconItalic,
    IconUnderline,
    IconAlignLeft,
    IconAlignCenter,
    IconAlignRight,
    IconFileText,
    IconForms,
} from "@tabler/icons-react";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { Rnd } from "react-rnd";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

// ─── Types ──────────────────────────────────────────────────────────────────

type Tool = "select" | "text" | "image" | "draw" | "highlight" | "eraser" | "shape";

interface TextAnnotation {
    id: string;
    type: "text";
    page: number; // 1-indexed
    x: number;    // relative to page
    y: number;    // relative to page
    w: number;    // width in pixels
    h: number;    // height in pixels
    text: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    align: "left" | "center" | "right";
    editing: boolean;
}

interface ImageAnnotation {
    id: string;
    type: "image";
    page: number;
    x: number;
    y: number;
    w: number;
    h: number;
    dataUrl: string;
}

interface DrawAnnotation {
    id: string;
    type: "draw";
    page: number;
    paths: { x: number; y: number }[][];
    color: string;
    lineWidth: number;
    isHighlight?: boolean;
}

interface ShapeAnnotation {
    id: string;
    type: "shape";
    shape: "rect" | "ellipse" | "line";
    page: number;
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    lineWidth: number;
}

type Annotation = TextAnnotation | ImageAnnotation | DrawAnnotation | ShapeAnnotation;

// ─── Constants ──────────────────────────────────────────────────────────────

const FONTS = ["Helvetica", "Times New Roman", "Courier New", "Georgia", "Arial"];
const COLORS = ["#1E1702", "#047C58", "#EF4444", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899", "#ffffff"];

// ─── Helpers ────────────────────────────────────────────────────────────────

function uid() {
    return Math.random().toString(36).slice(2, 10);
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PdfEditor({ file, setFile }: { file: File, setFile: (f: File | null) => void }) {
    // ── State ──
    const [pdfArrayBuffer, setPdfArrayBuffer] = useState<ArrayBuffer | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [tool, setTool] = useState<Tool>("select");
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [drawColor, setDrawColor] = useState("#1E1702");
    const [drawWidth, setDrawWidth] = useState(3);
    const [textColor, setTextColor] = useState("#1E1702");
    const [textFontSize, setTextFontSize] = useState(24);
    const [textFont, setTextFont] = useState("Helvetica");
    const [textBold, setTextBold] = useState(false);
    const [textItalic, setTextItalic] = useState(false);
    const [textUnderline, setTextUnderline] = useState(false);
    const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");

    // ── Refs ──
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const drawCanvasRef = useRef<HTMLCanvasElement>(null);
    const imgInputRef = useRef<HTMLInputElement>(null);
    const pageContainerRef = useRef<HTMLDivElement>(null);
    const isDrawingRef = useRef(false);
    const currentPathRef = useRef<{ x: number; y: number }[]>([]);
    const pdfDocRef = useRef<any>(null);
    const pageViewportsRef = useRef<Record<number, any>>({});

    // ──────────────────────────────────────────────────────────────────────────
    // LOAD PDF
    // ──────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!file) return;
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
                pdfDocRef.current = doc;
                setNumPages(doc.numPages);
                setCurrentPage(1);
                setAnnotations([]);
                setSelectedId(null);
            } catch (err) {
                console.error("PDF Load Error:", err);
            }
        };
        reader.readAsArrayBuffer(file);
    }, [file]);

    // ──────────────────────────────────────────────────────────────────────────
    // RENDER PDF PAGE
    // ──────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!pdfDocRef.current || !canvasRef.current) return;
        let cancelled = false;

        (async () => {
            const page = await pdfDocRef.current.getPage(currentPage);
            if (cancelled) return;

            const viewport = page.getViewport({ scale: 2 }); // Render at high quality
            pageViewportsRef.current[currentPage] = viewport;

            const canvas = canvasRef.current!;
            const ctx = canvas.getContext("2d")!;
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            if (drawCanvasRef.current) {
                drawCanvasRef.current.width = viewport.width;
                drawCanvasRef.current.height = viewport.height;
            }

            await page.render({ canvasContext: ctx, viewport }).promise;
            redrawDrawLayer(viewport.width, viewport.height);
        })();

        return () => { cancelled = true; };
    }, [currentPage, pdfDocRef.current]);

    function redrawDrawLayer(w: number, h: number) {
        const dc = drawCanvasRef.current;
        if (!dc) return;
        const ctx = dc.getContext("2d")!;
        ctx.clearRect(0, 0, w, h);

        const pageDrawAnnotations = annotations.filter(
            (a) => a.type === "draw" && a.page === currentPage
        ) as DrawAnnotation[];

        for (const ann of pageDrawAnnotations) {
            for (const path of ann.paths) {
                if (path.length < 2) continue;
                ctx.beginPath();
                ctx.strokeStyle = ann.color;
                ctx.lineWidth = ann.lineWidth;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                if (ann.isHighlight) {
                    ctx.globalAlpha = 0.35;
                    ctx.lineWidth = ann.lineWidth * 4;
                } else {
                    ctx.globalAlpha = 1;
                }
                ctx.moveTo(path[0].x * w, path[0].y * h);
                for (let i = 1; i < path.length; i++) {
                    ctx.lineTo(path[i].x * w, path[i].y * h);
                }
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
    }

    // Use effect to redraw draw layer when annotations change
    useEffect(() => {
        if (canvasRef.current) {
            redrawDrawLayer(canvasRef.current.width, canvasRef.current.height);
        }
    }, [annotations, currentPage]);

    // ──────────────────────────────────────────────────────────────────────────
    // DRAW TOOL Handlers
    // ──────────────────────────────────────────────────────────────────────────
    function getRelPos(e: React.MouseEvent | React.TouchEvent) {
        const dc = drawCanvasRef.current!;
        const rect = dc.getBoundingClientRect();
        const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        return {
            x: (clientX - rect.left) / rect.width,
            y: (clientY - rect.top) / rect.height,
        };
    }

    function onMouseDown(e: React.MouseEvent) {
        if (tool !== "draw" && tool !== "highlight" && tool !== "eraser") return;
        isDrawingRef.current = true;
        currentPathRef.current = [getRelPos(e)];
    }

    function onMouseMove(e: React.MouseEvent) {
        if (!isDrawingRef.current) return;
        const pos = getRelPos(e);
        currentPathRef.current.push(pos);

        const dc = drawCanvasRef.current!;
        const ctx = dc.getContext("2d")!;
        const w = dc.width;
        const h = dc.height;
        const path = currentPathRef.current;
        if (path.length < 2) return;
        const prev = path[path.length - 2];
        const cur = path[path.length - 1];

        ctx.beginPath();
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
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.moveTo(prev.x * w, prev.y * h);
        ctx.lineTo(cur.x * w, cur.y * h);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
    }

    function onMouseUp() {
        if (isDrawingRef.current) {
            isDrawingRef.current = false;
            const path = currentPathRef.current;
            if (path.length >= 2) {
                const newAnn: DrawAnnotation = {
                    id: uid(),
                    type: "draw",
                    page: currentPage,
                    paths: [path],
                    color: tool === "eraser" ? "#ffffff" : drawColor,
                    lineWidth: drawWidth,
                    isHighlight: tool === "highlight",
                };
                setAnnotations((prev) => [...prev, newAnn]);
            }
            currentPathRef.current = [];
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ADD TEXT/IMAGE
    // ──────────────────────────────────────────────────────────────────────────
    function onOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
        if (tool === "text") {
            if ((e.target as HTMLElement) !== overlayRef.current) return;
            const rect = overlayRef.current!.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            const newText: TextAnnotation = {
                id: uid(),
                type: "text",
                page: currentPage,
                x,
                y,
                w: 200,
                h: 50,
                text: "New Text Box",
                fontSize: textFontSize,
                fontFamily: textFont,
                color: textColor,
                bold: textBold,
                italic: textItalic,
                underline: textUnderline,
                align: textAlign,
                editing: true,
            };
            setAnnotations(prev => [...prev, newText]);
            setSelectedId(newText.id);
            setTool("select");
        }
    }

    function onImageFileChange(e: ChangeEvent<HTMLInputElement>) {
        const imgFile = e.target.files?.[0];
        if (!imgFile) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target!.result as string;
            const newAnn: ImageAnnotation = {
                id: uid(),
                type: "image",
                page: currentPage,
                x: 20,
                y: 20,
                w: 200,
                h: 150,
                dataUrl,
            };
            setAnnotations((prev) => [...prev, newAnn]);
            setSelectedId(newAnn.id);
            setTool("select");
        };
        reader.readAsDataURL(imgFile);
        e.target.value = "";
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SAVE PDF
    // ──────────────────────────────────────────────────────────────────────────
    async function savePdf() {
        if (!pdfArrayBuffer || !file) return;
        setIsSaving(true);
        try {
            const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
            const pdfDoc = await PDFDocument.load(pdfArrayBuffer.slice(0));
            const pages = pdfDoc.getPages();

            const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
            const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

            for (const ann of annotations) {
                const pdfPage = pages[ann.page - 1];
                if (!pdfPage) continue;
                const { width: pw, height: ph } = pdfPage.getSize();

                if (ann.type === "text") {
                    const ta = ann as TextAnnotation;
                    const xPt = (ta.x / 100) * pw;
                    const yPt = ph - ((ta.y / 100) * ph) - (ta.fontSize);

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
                    const color = hexToRgb(ta.color.startsWith("#") ? ta.color : "#000000");

                    pdfPage.drawText(ta.text, {
                        x: xPt,
                        y: yPt,
                        size: ta.fontSize,
                        font,
                        color,
                    });
                } else if (ann.type === "image") {
                    const ia = ann as ImageAnnotation;
                    const xPt = (ia.x / 100) * pw;
                    const yPt = ph - (ia.y / 100) * ph - ((ia.h / 500) * ph); // Rough scaling
                    const wPt = (ia.w / 1000) * pw; // Rough scaling
                    const hPt = (ia.h / 1000) * ph;

                    const base64 = ia.dataUrl.split(",")[1];
                    const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
                    let embeddedImg;
                    if (ia.dataUrl.startsWith("data:image/png")) {
                        embeddedImg = await pdfDoc.embedPng(imgBytes);
                    } else {
                        embeddedImg = await pdfDoc.embedJpg(imgBytes);
                    }
                    pdfPage.drawImage(embeddedImg, { x: xPt, y: yPt, width: wPt, height: hPt });
                }
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `edited_${file.name}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Save Error:", err);
            alert("Failed to save PDF.");
        } finally {
            setIsSaving(false);
        }
    }

    const updateAnnotation = (id: string, patch: any) => {
        setAnnotations(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
    };

    const deleteAnnotation = (id: string) => {
        setAnnotations(prev => prev.filter(a => a.id !== id));
        setSelectedId(null);
    };

    const selectedAnn = annotations.find(a => a.id === selectedId);

    // ──────────────────────────────────────────────────────────────────────────
    // RENDER HELPERS
    // ──────────────────────────────────────────────────────────────────────────
    if (!file || !numPages) {
        return (
            <ToolLayout
                title="Edit PDF"
                description="Modern, feature-rich PDF editor. Add text, images, and drawings with ease."
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
                            else if (typeof files === 'function') {
                                const result = files([]);
                                if (result.length > 0) setFile(result[0]);
                            }
                        }}
                    />
                </div>
            </ToolLayout>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-[#F4F3F1] overflow-hidden">
            {/* ── TOP BAR ── */}
            <header className="h-16 bg-white border-b border-border px-6 flex items-center justify-between z-50 shadow-sm">
                <div className="flex items-center gap-6">
                    <button onClick={() => setFile(null)} className="flex items-center gap-2 text-gray-500 hover:text-brand-dark transition-colors font-medium">
                        <IconArrowBack size={18} />
                        <span className="text-sm">Change</span>
                    </button>
                    <div className="h-6 w-px bg-gray-200" />
                    <div className="flex items-center gap-2">
                        <IconFileText size={22} className="text-brand-teal" />
                        <span className="text-sm font-bold text-brand-dark max-w-[180px] truncate">{file.name}</span>
                    </div>
                </div>

                {/* Toolbar in center */}
                <div className="flex items-center bg-gray-50 border border-gray-100 rounded-2xl p-1 shadow-inner translate-x-1/2 absolute left-1/4">
                    {[
                        { id: "select", icon: IconCursorText, label: "Select" },
                        { id: "text", icon: IconTypography, label: "Text" },
                        { id: "image", icon: IconPhoto, label: "Image" },
                        { id: "draw", icon: IconPencil, label: "Draw" },
                        { id: "highlight", icon: IconHighlight, label: "Highlight" },
                        { id: "eraser", icon: IconEraser, label: "Eraser" },
                    ].map(btn => (
                        <button
                            key={btn.id}
                            onClick={() => {
                                setTool(btn.id as Tool);
                                if (btn.id === "image") imgInputRef.current?.click();
                            }}
                            className={`p-2.5 px-4 rounded-xl transition-all flex items-center gap-2 ${tool === btn.id ? "bg-white text-brand-teal shadow-md shadow-black/5" : "text-gray-400 hover:text-brand-teal"}`}
                            title={btn.label}
                        >
                            <btn.icon size={20} />
                            <span className={`text-xs font-bold ${tool === btn.id ? "flex" : "hidden md:flex"}`}>{btn.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={savePdf}
                        disabled={isSaving}
                        className={`flex items-center gap-2 bg-brand-teal text-white px-6 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-md active:scale-[0.98] cursor-pointer ${isSaving ? "opacity-50 cursor-wait" : "hover:bg-[#036649]"
                            }`}
                    >
                        {isSaving ? <IconLoader2 size={18} className="animate-spin" /> : <IconDownload size={18} />}
                        Save Changes
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* ── LEFT SIDEBAR (Thumbnails) ── */}
                <aside className="w-56 bg-white border-r border-border flex flex-col z-40">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pages ({numPages})</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar bg-gray-50/50">
                        {Array.from({ length: numPages }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`group relative flex flex-col items-center gap-2 transition-all p-2 rounded-xl h-44 ${currentPage === i + 1 ? "bg-white ring-2 ring-brand-teal shadow-xl" : "hover:bg-white hover:shadow-lg"}`}
                            >
                                <div className="flex-1 w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-100 flex items-center justify-center">
                                    {/* Placeholder or tiny canvas for thumbnail */}
                                    <IconFileText size={40} className={`opacity-20 ${currentPage === i + 1 ? "text-brand-teal opacity-40" : ""}`} />
                                </div>
                                <span className={`text-[10px] font-bold ${currentPage === i + 1 ? "text-brand-teal" : "text-gray-400"}`}>{i + 1}</span>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* ── MAIN CANVAS AREA ── */}
                <main className="flex-1 bg-[#E8E6E3] overflow-hidden relative">
                    <TransformWrapper
                        initialScale={0.7}
                        minScale={0.1}
                        maxScale={5}
                        centerOnInit
                        wheel={{ step: 0.1 }}
                        doubleClick={{ disabled: true }}
                    >
                        {({ zoomIn, zoomOut, resetTransform }) => (
                            <>
                                {/* Floating Zoom Controls */}
                                <div className="absolute bottom-6 right-6 flex items-center gap-2 z-30 bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-white/20">
                                    <button onClick={() => zoomOut()} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><IconZoomOut size={20} /></button>
                                    <button onClick={() => resetTransform()} className="text-xs font-bold px-2 hover:bg-gray-100 rounded-lg transition-colors">Reset</button>
                                    <button onClick={() => zoomIn()} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><IconZoomIn size={20} /></button>
                                </div>

                                <TransformComponent wrapperClass="!w-full !h-full" contentClass="flex items-center justify-center min-h-full">
                                    <div ref={pageContainerRef} className="relative bg-white shadow-2xl my-10" style={{ display: "inline-block" }}>
                                        <canvas ref={canvasRef} />

                                        <canvas
                                            ref={drawCanvasRef}
                                            className="absolute inset-0 z-10"
                                            style={{
                                                cursor: (tool === 'draw' || tool === 'highlight' || tool === 'eraser') ? 'crosshair' : 'default',
                                                pointerEvents: (tool === 'draw' || tool === 'highlight' || tool === 'eraser') ? 'auto' : 'none',
                                            }}
                                            onMouseDown={onMouseDown}
                                            onMouseMove={onMouseMove}
                                            onMouseUp={onMouseUp}
                                            onMouseLeave={onMouseUp}
                                        />

                                        <div
                                            ref={overlayRef}
                                            className="absolute inset-0 z-20"
                                            onClick={onOverlayClick}
                                            style={{
                                                cursor: tool === "text" ? "text" : "default",
                                                pointerEvents: (tool === 'draw' || tool === 'highlight' || tool === 'eraser') ? 'none' : 'auto'
                                            }}
                                        >
                                            {annotations.filter(a => a.page === currentPage).map(ann => {
                                                if (ann.type === "text") {
                                                    const ta = ann as TextAnnotation;
                                                    return (
                                                        <Rnd
                                                            key={ta.id}
                                                            size={{ width: ta.w, height: ta.h }}
                                                            position={{ x: (ta.x / 100) * (canvasRef.current?.width || 0), y: (ta.y / 100) * (canvasRef.current?.height || 0) }}
                                                            onDragStop={(e: any, d: any) => {
                                                                const cw = canvasRef.current?.width || 1;
                                                                const ch = canvasRef.current?.height || 1;
                                                                updateAnnotation(ta.id, { x: (d.x / cw) * 100, y: (d.y / ch) * 100 });
                                                            }}
                                                            onResizeStop={(e: any, direction: any, ref: any, delta: any, position: any) => {
                                                                const cw = canvasRef.current?.width || 1;
                                                                const ch = canvasRef.current?.height || 1;
                                                                updateAnnotation(ta.id, {
                                                                    w: parseInt(ref.style.width),
                                                                    h: parseInt(ref.style.height),
                                                                    x: (position.x / cw) * 100,
                                                                    y: (position.y / ch) * 100
                                                                });
                                                            }}
                                                            bounds="parent"
                                                            disableDragging={tool !== "select" || ta.editing}
                                                            enableResizing={tool === "select" && !ta.editing}
                                                            className={`z-20 ${selectedId === ta.id ? "ring-2 ring-brand-teal" : "hover:ring-1 hover:ring-brand-teal/50"}`}
                                                            onClick={(e: any) => { e.stopPropagation(); setSelectedId(ta.id); }}
                                                        >
                                                            <div className="w-full h-full relative group">
                                                                {ta.editing ? (
                                                                    <textarea
                                                                        autoFocus
                                                                        className="w-full h-full bg-white/10 outline-none resize-none p-1 overflow-hidden"
                                                                        style={{
                                                                            fontSize: `${ta.fontSize}px`,
                                                                            fontFamily: ta.fontFamily,
                                                                            color: ta.color,
                                                                            fontWeight: ta.bold ? "bold" : "normal",
                                                                            fontStyle: ta.italic ? "italic" : "normal",
                                                                            textDecoration: ta.underline ? "underline" : "none",
                                                                            textAlign: ta.align,
                                                                        }}
                                                                        value={ta.text}
                                                                        onChange={(e) => updateAnnotation(ta.id, { text: e.target.value })}
                                                                        onBlur={() => updateAnnotation(ta.id, { editing: false })}
                                                                    />
                                                                ) : (
                                                                    <div
                                                                        className="w-full h-full p-1 whitespace-pre-wrap wrap-break-word overflow-hidden cursor-move"
                                                                        style={{
                                                                            fontSize: `${ta.fontSize}px`,
                                                                            fontFamily: ta.fontFamily,
                                                                            color: ta.color,
                                                                            fontWeight: ta.bold ? "bold" : "normal",
                                                                            fontStyle: ta.italic ? "italic" : "normal",
                                                                            textDecoration: ta.underline ? "underline" : "none",
                                                                            textAlign: ta.align,
                                                                        }}
                                                                        onDoubleClick={() => updateAnnotation(ta.id, { editing: true })}
                                                                    >
                                                                        {ta.text}
                                                                    </div>
                                                                )}
                                                                {selectedId === ta.id && (
                                                                    <button
                                                                        onClick={() => deleteAnnotation(ta.id)}
                                                                        className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    >
                                                                        <IconTrash size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </Rnd>
                                                    );
                                                }
                                                if (ann.type === "image") {
                                                    const ia = ann as ImageAnnotation;
                                                    return (
                                                        <Rnd
                                                            key={ia.id}
                                                            size={{ width: ia.w, height: ia.h }}
                                                            position={{ x: (ia.x / 100) * (canvasRef.current?.width || 0), y: (ia.y / 100) * (canvasRef.current?.height || 0) }}
                                                            onDragStop={(e: any, d: any) => {
                                                                const cw = canvasRef.current?.width || 1;
                                                                const ch = canvasRef.current?.height || 1;
                                                                updateAnnotation(ia.id, { x: (d.x / cw) * 100, y: (d.y / ch) * 100 });
                                                            }}
                                                            onResizeStop={(e: any, dir: any, ref: any, delta: any, pos: any) => {
                                                                const cw = canvasRef.current?.width || 1;
                                                                const ch = canvasRef.current?.height || 1;
                                                                updateAnnotation(ia.id, {
                                                                    w: parseInt(ref.style.width),
                                                                    h: parseInt(ref.style.height),
                                                                    x: (pos.x / cw) * 100,
                                                                    y: (pos.y / ch) * 100
                                                                });
                                                            }}
                                                            bounds="parent"
                                                            disableDragging={tool !== "select"}
                                                            className={`z-20 ${selectedId === ia.id ? "ring-2 ring-brand-teal" : ""}`}
                                                            onClick={(e: any) => { e.stopPropagation(); setSelectedId(ia.id); }}
                                                        >
                                                            <div className="w-full h-full relative group">
                                                                <img src={ia.dataUrl} className="w-full h-full object-contain pointer-events-none" alt="" />
                                                                {selectedId === ia.id && (
                                                                    <button
                                                                        onClick={() => deleteAnnotation(ia.id)}
                                                                        className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg"
                                                                    >
                                                                        <IconTrash size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </Rnd>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </div>
                                    </div>
                                </TransformComponent>
                            </>
                        )}
                    </TransformWrapper>
                </main>

                {/* ── RIGHT PROPERTIES PANEL ── */}
                <aside className="w-64 bg-white border-l border-border flex flex-col p-4 gap-6 z-40 overflow-y-auto">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Properties</h3>

                    {/* TEXT SETTINGS */}
                    {(tool === "text" || (selectedAnn?.type === "text")) && (
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] font-bold text-gray-500">Font Size</label>
                                <input
                                    type="number"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none"
                                    value={selectedAnn?.type === "text" ? (selectedAnn as TextAnnotation).fontSize : textFontSize}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        setTextFontSize(v);
                                        if (selectedAnn?.id) updateAnnotation(selectedAnn.id, { fontSize: v });
                                    }}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] font-bold text-gray-500">Color</label>
                                <div className="flex flex-wrap gap-2">
                                    {COLORS.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => {
                                                setTextColor(c);
                                                if (selectedAnn?.id) updateAnnotation(selectedAnn.id, { color: c });
                                            }}
                                            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${textColor === c ? "border-brand-teal scale-110" : "border-transparent"}`}
                                            style={{ background: c }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-1">
                                {[
                                    { id: 'bold', icon: IconBold },
                                    { id: 'italic', icon: IconItalic },
                                    { id: 'underline', icon: IconUnderline }
                                ].map(btn => (
                                    <button
                                        key={btn.id}
                                        onClick={() => {
                                            const key = btn.id as keyof TextAnnotation;
                                            const current = selectedAnn?.type === "text" ? (selectedAnn as any)[key] : (btn.id === 'bold' ? textBold : btn.id === 'italic' ? textItalic : textUnderline);
                                            const newVal = !current;
                                            if (btn.id === 'bold') setTextBold(newVal);
                                            else if (btn.id === 'italic') setTextItalic(newVal);
                                            else setTextUnderline(newVal);
                                            if (selectedAnn?.id) updateAnnotation(selectedAnn.id, { [key]: newVal });
                                        }}
                                        className={`flex-1 p-2 rounded-lg border transition-all ${((selectedAnn?.type === "text" ? (selectedAnn as any)[btn.id] : (btn.id === 'bold' ? textBold : btn.id === 'italic' ? textItalic : textUnderline))) ? "bg-brand-teal text-white border-brand-teal" : "bg-gray-50 text-gray-500 border-gray-200"}`}
                                    >
                                        <btn.icon size={16} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DRAW SETTINGS */}
                    {(['draw', 'highlight', 'eraser'].includes(tool)) && (
                        <div className="flex flex-col gap-4">
                            {tool !== 'eraser' && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-bold text-gray-500">Brush Color</label>
                                    <div className="flex flex-wrap gap-2">
                                        {COLORS.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setDrawColor(c)}
                                                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${drawColor === c ? "border-brand-teal scale-110" : "border-transparent"}`}
                                                style={{ background: c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] font-bold text-gray-500">Thickness: {drawWidth}px</label>
                                <input
                                    type="range"
                                    min="1" max="24"
                                    className="w-full accent-brand-teal"
                                    value={drawWidth}
                                    onChange={(e) => setDrawWidth(Number(e.target.value))}
                                />
                            </div>
                        </div>
                    )}

                    {!selectedAnn && tool === "select" && (
                        <div className="mt-20 text-center">
                            <IconCursorText size={32} className="mx-auto text-gray-200 mb-2" />
                            <p className="text-xs text-gray-400">Select an object on the canvas to edit its properties.</p>
                        </div>
                    )}
                </aside>
            </div>

            <input ref={imgInputRef} type="file" className="hidden" accept="image/*" onChange={onImageFileChange} />
        </div>
    );
}
