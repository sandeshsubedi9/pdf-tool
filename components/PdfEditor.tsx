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
    IconRotateClockwise,
    IconGripVertical,
    IconFilePlus,
} from "@tabler/icons-react";
import ToolLayout from "@/components/ToolLayout";
import Navbar from "@/components/Navbar";
import { FileUpload } from "@/components/ui/file-upload";
import { Rnd } from "react-rnd";
import { motion, AnimatePresence } from "motion/react";
import { useRateLimitedAction } from "@/lib/use-rate-limited-action";
import { RateLimitModal } from "@/components/RateLimitModal";

// ─── Types ──────────────────────────────────────────────────────────────────

type Tool = "select" | "text" | "image" | "draw" | "highlight" | "whiteout";

interface TextAnnotation {
    id: string;
    type: "text";
    page: number; // 1-indexed
    x: number;   // % of page width
    y: number;   // % of page height
    w: number;   // % of page width
    h: number;   // % of page height
    text: string;
    fontSize: number;   // rendered px at scale=1.5
    fontFamily: string;
    color: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    align: "left" | "center" | "right";
    editing: boolean;
    isNew?: boolean;
    // Existing content tracking
    isExisting?: boolean;
    origX0?: number; origY0?: number; origX1?: number; origY1?: number;
    originalText?: string;
    // pdf.js exact transform matrix [a,b,c,d,tx,ty] (PDF coordinate space)
    pdfTransform?: number[];
    // pdf page dimensions at extraction scale (used for coordinate conversion)
    pdfPageWidth?: number;
    pdfPageHeight?: number;
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
    // Existing content tracking
    isExisting?: boolean;
    origX0?: number; origY0?: number; origX1?: number; origY1?: number;
}

interface DrawAnnotation {
    id: string;
    type: "draw";
    page: number;
    paths: { x: number; y: number }[][]; // relative to local w/h bounding box [0..1]
    color: string;
    lineWidth: number;
    isHighlight?: boolean;
    x: number; // bounding box X % of page
    y: number; // bounding box Y % of page
    w: number; // bounding box W % of page
    h: number; // bounding box H % of page
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

const POPULAR_FONT_SIZES = [8, 12, 14, 16, 18, 20, 24, 28, 36, 48, 64, 72];

const HANDLE_STYLE: React.CSSProperties = {
    width: 10, height: 10,
    background: "#2563eb",
    border: "2px solid white",
    borderRadius: "50%",
    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
};
const HANDLE_STYLES = {
    topLeft: { ...HANDLE_STYLE, cursor: "nw-resize" },
    top: { ...HANDLE_STYLE, cursor: "n-resize" },
    topRight: { ...HANDLE_STYLE, cursor: "ne-resize" },
    right: { ...HANDLE_STYLE, cursor: "e-resize" },
    bottomRight: { ...HANDLE_STYLE, cursor: "se-resize" },
    bottom: { ...HANDLE_STYLE, cursor: "s-resize" },
    bottomLeft: { ...HANDLE_STYLE, cursor: "sw-resize" },
    left: { ...HANDLE_STYLE, cursor: "w-resize" },
};

function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── Inline contentEditable text editor ────────────────────────────────────
// A contentEditable div renders text IDENTICALLY to a regular display div.
// Unlike <textarea>, it has no browser-specific padding, size quirks, or
// font-weight inheritance issues — eliminating jarring size/position shifts.

interface TextEditBoxProps {
    initialText: string;
    style: React.CSSProperties;
    onUpdate: (text: string) => void;
    onBlur: () => void;
    selectAll?: boolean;
}

function TextEditBox({ initialText, style, onUpdate, onBlur, selectAll }: TextEditBoxProps) {
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const el = ref.current;
        if (!el) return;
        // Set content directly via DOM — avoids React re-render cursor-jump issue
        el.textContent = initialText;
        el.focus();

        // Handle text selection
        try {
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(el);
            if (!selectAll) {
                // Place cursor at end of text if not selecting all
                range.collapse(false);
            }
            sel?.removeAllRanges();
            sel?.addRange(range);
        } catch { /* ignore selection errors in restricted environments */ }
    }, []); // Only on mount — do NOT add deps or cursor will jump on every keystroke

    return (
        <div
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onInput={(e) => onUpdate(e.currentTarget.textContent || "")}
            onBlur={onBlur}
            onKeyDown={(e) => { if (e.key === "Escape") e.currentTarget.blur(); }}
            style={{
                gridArea: "1 / 1 / 2 / 2",
                outline: "none",
                border: "none",
                padding: 0,
                margin: 0,
                cursor: "text",
                ...style,
            }}
        />
    );
}

// ─── Draw overlay canvas per page ───────────────────────────────────────────

function DrawCanvas({
    page,
    tool,
    drawColor,
    drawWidth,
    width,
    height,
    onDrawEnd,
}: {
    page: number;
    tool: Tool;
    drawColor: string;
    drawWidth: number;
    width: number;
    height: number;
    onDrawEnd: (ann: DrawAnnotation) => void;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const currentPath = useRef<{ x: number; y: number }[]>([]);

    function getPos(e: MouseEvent | React.MouseEvent) {
        const c = ref.current!;
        const r = c.getBoundingClientRect();
        return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    }

    function down(e: React.MouseEvent) {
        if (!["draw", "highlight", "whiteout"].includes(tool)) return;
        e.stopPropagation();
        isDrawing.current = true;
        currentPath.current = [getPos(e)];
    }

    useEffect(() => {
        function handleMove(e: MouseEvent) {
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
            } else if (tool === "whiteout") {
                ctx.globalAlpha = 1;
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = drawWidth * 4;
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

        function handleUp() {
            if (!isDrawing.current) return;
            isDrawing.current = false;
            const path = currentPath.current;
            const c = ref.current;
            if (path.length >= 2 && c) {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (const p of path) {
                    if (p.x < minX) minX = p.x;
                    if (p.y < minY) minY = p.y;
                    if (p.x > maxX) maxX = p.x;
                    if (p.y > maxY) maxY = p.y;
                }

                const effectiveDrawWidth = (tool === "whiteout" || tool === "highlight") ? drawWidth * 4 : drawWidth;
                const padX = (effectiveDrawWidth / 2 + 2) / c.width;
                const padY = (effectiveDrawWidth / 2 + 2) / c.height;
                minX = Math.max(0, minX - padX);
                minY = Math.max(0, minY - padY);
                maxX = Math.min(1, maxX + padX);
                maxY = Math.min(1, maxY + padY);

                const w = maxX - minX;
                const h = maxY - minY;

                const relPath = path.map(p => ({
                    x: w === 0 ? 0 : (p.x - minX) / w,
                    y: h === 0 ? 0 : (p.y - minY) / h
                }));

                onDrawEnd({
                    id: uid(),
                    type: "draw",
                    page,
                    paths: [relPath],
                    color: tool === "whiteout" ? "#ffffff" : drawColor,
                    lineWidth: tool === "whiteout" ? drawWidth * 4 : drawWidth,
                    isHighlight: tool === "highlight",
                    x: minX * 100,
                    y: minY * 100,
                    w: w * 100,
                    h: h * 100,
                });
                c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
            }
            currentPath.current = [];
        }

        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);
        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleUp);
        };
    }, [tool, drawColor, drawWidth, page, onDrawEnd]);

    const isActive = ["draw", "highlight", "whiteout"].includes(tool);

    return (
        <canvas
            ref={ref}
            width={width}
            height={height}
            className="absolute inset-0 z-10"
            style={{
                width: "100%",
                height: "100%",
                pointerEvents: isActive ? "auto" : "none",
                cursor: isActive ? "crosshair" : "default",
            }}
            onMouseDown={down}
        />
    );
}

// ─── useDragAutoScroll ───────────────────────────────────────────────────────
// Fires requestAnimationFrame-based auto-scroll when the user drags near the
// top/bottom edge (threshold px) of the given scrollable container ref.
function useDragAutoScroll(containerRef: React.RefObject<HTMLElement | null>, threshold = 60, speed = 10) {
    const raf = useRef<number | null>(null);

    const stop = () => {
        if (raf.current !== null) { cancelAnimationFrame(raf.current); raf.current = null; }
    };

    const onDragOver = useCallback((e: React.DragEvent | DragEvent) => {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const y = (e as any).clientY;
        const distTop = y - rect.top;
        const distBottom = rect.bottom - y;

        stop();

        if (distTop < threshold || distBottom < threshold) {
            const scroll = () => {
                if (!containerRef.current) return;
                if (distTop < threshold) {
                    containerRef.current.scrollTop -= speed * (1 - distTop / threshold);
                } else {
                    containerRef.current.scrollTop += speed * (1 - distBottom / threshold);
                }
                raf.current = requestAnimationFrame(scroll);
            };
            raf.current = requestAnimationFrame(scroll);
        }
    }, [containerRef, threshold, speed]);

    const onDragEnd = useCallback(() => stop(), []);
    const onDragLeave = useCallback(() => stop(), []);

    return { onDragOver, onDragEnd, onDragLeave };
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
    const [isExtracting, setIsExtracting] = useState(false);
    const [isBlankMode, setIsBlankMode] = useState(false);

    useEffect(() => {
        if (sessionStorage.getItem("edit_pdf_blank") === "true") {
            sessionStorage.removeItem("edit_pdf_blank");
            startWithBlankPage();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync the font size local text state whenever the selection changes
    useEffect(() => {
        const currentSize = selectedAnn?.type === "text" ? (selectedAnn as TextAnnotation).fontSize : textFontSize;
        setFontSizeInputText(currentSize === 0 ? "" : currentSize.toString());
    }, [selectedId, tool, annotations]);

    const startWithBlankPage = () => {
        const W = 2480; // A4 at 300dpi-ish, looks good at any zoom
        const H = 3508;
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, W, H);
        const dataUrl = canvas.toDataURL("image/png");
        setPages([{ dataUrl, width: W, height: H }]);
        setNumPages(1);
        setIsBlankMode(true);
        setCurrentPage(1);
        setAnnotations([]);
        setSelectedId(null);
    };
    const { execute, limitResult, clearLimitResult } = useRateLimitedAction();

    // ─── In-editor toast (replaces browser alert()) ──────────────────────────
    const [editorToast, setEditorToast] = useState<{ msg: string; type: "success" | "error" | "info"; id: number } | null>(null);
    const showEditorToast = (msg: string, type: "success" | "error" | "info" = "info") => {
        const id = Date.now();
        setEditorToast({ msg, type, id });
        setTimeout(() => setEditorToast(t => t?.id === id ? null : t), 3500);
    };

    const [extractedOriginals, setExtractedOriginals] = useState<Map<string, any>>(new Map());
    const [originalFile, setOriginalFile] = useState<File | null>(null);

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
    const [showFontSizeList, setShowFontSizeList] = useState(false);
    const [fontSizeInputText, setFontSizeInputText] = useState(""); // Unified local string state for the text input to correctly handle decimals and backspacing cleanly

    const imgInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const sidebarScrollRef = useRef<HTMLDivElement>(null);
    const sidebarAutoScroll = useDragAutoScroll(sidebarScrollRef);

    // ─── Page management ─────────────────────────────────────────────────────
    const [deleteConfirmPage, setDeleteConfirmPage] = useState<number | null>(null);
    const dragPageRef = useRef<number | null>(null);
    const [dragOverPage, setDragOverPage] = useState<number | null>(null);

    const deletePage = (pageIndex: number) => {
        if (pages.length <= 1) {
            showEditorToast("Cannot delete the only page.", "error");
            return;
        }
        setPages(prev => prev.filter((_, i) => i !== pageIndex));
        setAnnotations(prev => {
            const filtered = prev.filter(a => a.page !== pageIndex + 1);
            return filtered.map(a => a.page > pageIndex + 1 ? { ...a, page: a.page - 1 } : a);
        });

        setNumPages(p => p - 1);
        setDeleteConfirmPage(null);
        setCurrentPage(c => (c > pageIndex + 1 ? c - 1 : Math.min(c, pages.length - 1)));
        showEditorToast("Page deleted. This action cannot be undone.", "error");
    };

    const addBlankPage = (afterIndex: number) => {
        // Create a blank white canvas dataUrl
        const first = pages[0];
        const canvas = document.createElement("canvas");
        const W = first?.width ?? 794;
        const H = first?.height ?? 1122;
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, W, H);
        const dataUrl = canvas.toDataURL("image/png");
        const blank: PageData = { dataUrl, width: W, height: H };
        setPages(prev => {
            const next = [...prev];
            next.splice(afterIndex + 1, 0, blank);
            return next;
        });
        setAnnotations(prev =>
            prev.map(a => a.page > afterIndex + 1 ? { ...a, page: a.page + 1 } : a)
        );
        setNumPages(p => p + 1);
        // Scroll to new page after state settles
        setTimeout(() => scrollToPage(afterIndex + 2), 80);
        showEditorToast("Blank page added.", "success");
    };

    const handlePageDragStart = (e: React.DragEvent, index: number) => {
        dragPageRef.current = index;
        e.dataTransfer.effectAllowed = "move";
    };

    const handlePageDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverPage(index);
    };

    const handlePageDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const from = dragPageRef.current;
        if (from === null || from === targetIndex) { setDragOverPage(null); return; }

        setPages(prev => {
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(targetIndex, 0, moved);
            return next;
        });
        setAnnotations(prev => prev.map(a => {
            let pg = a.page - 1; // 0-indexed
            if (pg === from) pg = targetIndex;
            else if (from < targetIndex && pg > from && pg <= targetIndex) pg--;
            else if (from > targetIndex && pg >= targetIndex && pg < from) pg++;
            return { ...a, page: pg + 1 };
        }));

        dragPageRef.current = null;
        setDragOverPage(null);
        setCurrentPage(targetIndex + 1);
        setTimeout(() => scrollToPage(targetIndex + 1), 80);
    };

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

        async function loadPdfAndExtract() {
            setIsLoading(true);
            setIsExtracting(true);
            setPages([]);
            setAnnotations([]);
            setSelectedId(null);
            setCurrentPage(1);
            setOriginalFile(file);

            const ab = await file.arrayBuffer();
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
                const newAnnotations: Annotation[] = [];
                const origMap = new Map<string, any>();

                // ── Font name → friendly name fallback map ──────────────────
                function mapFont(rawFontName: string): { family: string; bold: boolean; italic: boolean } {
                    // Strip common PDF font name prefixes like "BCDEE+"
                    const clean = rawFontName.replace(/^[A-Z]{6}\+/, "");
                    const bold = /bold|heavy|black|semibold|demibold/i.test(clean);
                    const italic = /italic|oblique|slanted/i.test(clean);
                    let family = "Helvetica";
                    if (/times|minion|palatino|garamond|bookman|schoolbook/i.test(clean)) family = "Times New Roman";
                    else if (/courier|consolas|monospace|typewriter/i.test(clean)) family = "Courier New";
                    else if (/arial/i.test(clean)) family = "Arial";
                    else if (/calibri/i.test(clean)) family = "Calibri";
                    else if (/cambria/i.test(clean)) family = "Cambria";
                    else if (/georgia/i.test(clean)) family = "Georgia";
                    else if (/verdana/i.test(clean)) family = "Verdana";
                    else if (/tahoma/i.test(clean)) family = "Tahoma";
                    else if (/trebuchet/i.test(clean)) family = "Trebuchet MS";
                    else if (/segoe/i.test(clean)) family = "Segoe UI";
                    else if (/impact/i.test(clean)) family = "Impact";
                    else if (/lato/i.test(clean)) family = "Lato";
                    else if (/roboto/i.test(clean)) family = "Roboto";
                    else if (/open.?sans/i.test(clean)) family = "Open Sans";
                    else if (/source.?sans/i.test(clean)) family = "Source Sans Pro";
                    else if (/noto.?sans/i.test(clean)) family = "Noto Sans";
                    else if (/poppins/i.test(clean)) family = "Poppins";
                    else if (/inter/i.test(clean)) family = "Inter";
                    else if (/montserrat/i.test(clean)) family = "Montserrat";
                    else if (/comic/i.test(clean)) family = "Comic Sans MS";
                    else if (/century/i.test(clean)) family = "Century Gothic";
                    else if (/franklin/i.test(clean)) family = "Franklin Gothic";
                    else if (/futura/i.test(clean)) family = "Futura";
                    else if (/lucida/i.test(clean)) family = "Lucida Sans";
                    return { family, bold, italic };
                }

                for (let i = 1; i <= doc.numPages; i++) {
                    const page = await doc.getPage(i);
                    const SCALE = 1.5;
                    const vp = page.getViewport({ scale: SCALE });
                    const canvas = document.createElement("canvas");
                    canvas.width = vp.width;
                    canvas.height = vp.height;
                    const ctx = canvas.getContext("2d")!;

                    // Render the full page including text — this gives a pixel-perfect
                    // canvas image identical to what PDF viewers produce.
                    await page.render({ canvasContext: ctx, viewport: vp } as any).promise;

                    results.push({ dataUrl: canvas.toDataURL("image/png"), width: vp.width, height: vp.height });

                    // ── PHASE 2: Extract font metadata from pdf.js internals ─
                    //    After render(), fonts are loaded in page.commonObjs.
                    //    We mine the operator list to find font keys,
                    //    then look up real PostScript names + bold/italic flags.
                    const fontMetaMap = new Map<string, { name: string; bold: boolean; italic: boolean }>();
                    const textColorMap: string[] = []; // color per showText operation

                    try {
                        const OPS = (await import("pdfjs-dist")).OPS;
                        const opList = await page.getOperatorList();

                        let currentColor = "#000000";

                        for (let oi = 0; oi < opList.fnArray.length; oi++) {
                            const op = opList.fnArray[oi];

                            // Track font switches
                            if (op === OPS.setFont) {
                                const fontRef = opList.argsArray[oi][0];
                                if (!fontMetaMap.has(fontRef)) {
                                    try {
                                        const fontObj = (page as any).commonObjs.get(fontRef);
                                        if (fontObj) {
                                            const realName = fontObj.name || fontObj.loadedName || "";
                                            fontMetaMap.set(fontRef, {
                                                name: realName,
                                                bold: !!(fontObj.bold ?? /bold|heavy|black|semibold/i.test(realName)),
                                                italic: !!(fontObj.italic ?? /italic|oblique/i.test(realName)),
                                            });
                                        }
                                    } catch { /* font not available */ }
                                }
                            }
                            // Track fill color changes (used for text color)
                            else if (op === OPS.setFillRGBColor) {
                                const [r, g, b] = opList.argsArray[oi];
                                currentColor = `#${Math.round(r * 255).toString(16).padStart(2, "0")}${Math.round(g * 255).toString(16).padStart(2, "0")}${Math.round(b * 255).toString(16).padStart(2, "0")}`;
                            }
                            else if (op === OPS.setFillGray) {
                                const gray = Math.round(opList.argsArray[oi][0] * 255);
                                const hex = gray.toString(16).padStart(2, "0");
                                currentColor = `#${hex}${hex}${hex}`;
                            }
                            else if (op === OPS.setFillCMYKColor) {
                                const [c, m, y, k] = opList.argsArray[oi];
                                const r = Math.round(255 * (1 - c) * (1 - k));
                                const g = Math.round(255 * (1 - m) * (1 - k));
                                const b = Math.round(255 * (1 - y) * (1 - k));
                                currentColor = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
                            }
                            // Record color at each text draw
                            else if (op === OPS.showText || op === OPS.showSpacedText) {
                                textColorMap.push(currentColor);
                            }
                        }
                    } catch (e) {
                        console.warn("Could not extract font/color metadata:", e);
                    }

                    // ── Get text positions from pdf.js ──────────────────────
                    const textContent = await page.getTextContent();
                    const pdfStyles = (textContent as any).styles || {};

                    // Filter to non-empty spans, keeping track of their original index to match textColorMap
                    const spans = (textContent.items as any[])
                        .map((it, idx) => ({ ...it, originalIndex: idx }))
                        .filter((it: any) => it.str && it.str.trim());

                    // DEBUG: Log first few font objects extracted (remove after debugging)
                    if (i === 1) {
                        console.log("[FontMeta] Font metadata map:", Object.fromEntries(fontMetaMap));
                        console.log("[FontMeta] Text colors extracted:", textColorMap.slice(0, 10));
                    }

                    // ── Smart-cluster spans ──────────────────────────────────
                    // Only merge spans that are:
                    //   1. On the same baseline (ty within 1pt)
                    //   2. Same font (fontName matches exactly)
                    //   3. Truly adjacent (X gap < half a character width)
                    // This prevents table cells from merging and preserves
                    // per-span font properties (bold, italic, family, size).
                    interface SpanCluster {
                        spans: any[];
                        fontName: string;
                        tx: number;
                        ty: number;
                        endX: number;
                        fontSize: number;
                        fontInfo: { family: string; bold: boolean; italic: boolean };
                        color: string;
                    }

                    const clusters: SpanCluster[] = [];

                    for (const span of spans) {
                        const [sa, sb, sc, sd, stx, sty] = span.transform;
                        const sFontSize = Math.sqrt(sc * sc + sd * sd);

                        // ── Font detection ──────────────────────────────────
                        // span.fontName is an internal key like "g_d0_f1".
                        const fontRefName = span.fontName;
                        const realFontMeta = fontMetaMap.get(fontRefName);

                        let sFontInfo = { family: "Helvetica", bold: false, italic: false };

                        if (realFontMeta) {
                            // If we extracted the real font name, pass that into mapFont to get clean family name
                            sFontInfo = mapFont(realFontMeta.name);
                            // Override bold/italic explicitly from metadata if true
                            if (realFontMeta.bold) sFontInfo.bold = true;
                            if (realFontMeta.italic) sFontInfo.italic = true;
                        } else {
                            // The REAL font info lives in textContent.styles.
                            const styleEntry = pdfStyles[span.fontName];
                            const cssFontFamily = styleEntry?.fontFamily || "";

                            // Map the CSS font family to our known families
                            sFontInfo = mapFont(cssFontFamily || span.fontName || "");

                            // For generic families (serif/sans-serif/monospace),
                            // map to sensible defaults
                            if (/^serif$/i.test(cssFontFamily)) sFontInfo.family = "Times New Roman";
                            else if (/^sans-serif$/i.test(cssFontFamily)) sFontInfo.family = "Helvetica";
                            else if (/^monospace$/i.test(cssFontFamily)) sFontInfo.family = "Courier New";
                            else if (cssFontFamily && !/^(sans-serif|serif|monospace)$/i.test(cssFontFamily)) {
                                // pdf.js gave us a specific family — use it directly
                                sFontInfo.family = cssFontFamily;
                            }

                            // Bold/italic: check BOTH the fontName key AND the CSS family.
                            const fontHints = (span.fontName || "") + " " + cssFontFamily;
                            if (/bold|heavy|black|semibold|demibold/i.test(fontHints)) sFontInfo.bold = true;
                            if (/italic|oblique|slanted/i.test(fontHints)) sFontInfo.italic = true;
                        }

                        // DEBUG: Log what pdf.js gives us vs what we resolved
                        if (clusters.length < 5) {
                            console.log(`[FontDebug] fontName="${span.fontName}" meta=`, realFontMeta, `→ family="${sFontInfo.family}" bold=${sFontInfo.bold} italic=${sFontInfo.italic} fontSize=${sFontSize} text="${span.str.substring(0, 30)}"`);
                        }

                        const spanEndX = stx + (span.width || 0);

                        // Try to extract color
                        let sColor = "#000000";
                        if (span.color && Array.isArray(span.color) && span.color.length >= 3) {
                            const [cr, cg, cb] = span.color;
                            // Check if color is not just transparent black ([0,0,0,0])
                            if (span.color.length === 3 || span.color[3] > 0) {
                                sColor = `#${Math.round(cr * 255).toString(16).padStart(2, "0")}${Math.round(cg * 255).toString(16).padStart(2, "0")}${Math.round(cb * 255).toString(16).padStart(2, "0")}`;
                            } else if (textColorMap[span.originalIndex]) {
                                sColor = textColorMap[span.originalIndex];
                            }
                        } else if (textColorMap[span.originalIndex]) {
                            sColor = textColorMap[span.originalIndex];
                        }

                        // Try to merge into an existing cluster
                        let merged = false;
                        for (const cluster of clusters) {
                            const baselineMatch = Math.abs(cluster.ty - sty) < 1;
                            const sameFont = cluster.fontName === span.fontName;
                            const gap = stx - cluster.endX;
                            // Adjacent = gap is small (less than half a character width)
                            const adjacent = gap >= -0.5 && gap < sFontSize * 0.5;

                            if (baselineMatch && sameFont && adjacent) {
                                cluster.spans.push(span);
                                cluster.endX = Math.max(cluster.endX, spanEndX);
                                merged = true;
                                break;
                            }
                        }

                        if (!merged) {
                            clusters.push({
                                spans: [span],
                                fontName: span.fontName,
                                tx: stx,
                                ty: sty,
                                endX: spanEndX,
                                fontSize: sFontSize,
                                fontInfo: sFontInfo,
                                color: sColor,
                            });
                        }
                    }

                    // ── Create annotations from clusters ─────────────────────
                    let spanIdx = 0;
                    for (const cluster of clusters) {
                        // Sort spans left → right
                        cluster.spans.sort((ca: any, cb: any) => ca.transform[4] - cb.transform[4]);

                        const first = cluster.spans[0];
                        const [, , , , tx, ty] = first.transform;
                        const fontSize = cluster.fontSize;

                        // Concatenate text, inserting spaces where there are visible gaps
                        let clusterText = "";
                        for (let si = 0; si < cluster.spans.length; si++) {
                            const sp = cluster.spans[si];
                            clusterText += sp.str;
                            if (si < cluster.spans.length - 1) {
                                const nextSp = cluster.spans[si + 1];
                                const gap = nextSp.transform[4] - (sp.transform[4] + (sp.width || 0));
                                if (gap > fontSize * 0.15) clusterText += " ";
                            }
                        }

                        // Total width from first span's start to last span's end
                        const lastSpan = cluster.spans[cluster.spans.length - 1];
                        const totalWidth = (lastSpan.transform[4] + (lastSpan.width || 0)) - tx;

                        // Convert PDF coords → canvas coords
                        const canvasX = tx * SCALE;
                        const canvasY = (vp.height / SCALE - ty) * SCALE - fontSize * SCALE * 0.82;
                        const clusterWidthPx = totalWidth * SCALE;
                        const clusterHeightPx = fontSize * SCALE * 1.35;

                        const ann: TextAnnotation = {
                            id: `pjs_${i}_${spanIdx}`,
                            type: "text",
                            page: i,
                            x: (canvasX / vp.width) * 100,
                            y: (canvasY / vp.height) * 100,
                            w: (clusterWidthPx / vp.width) * 100,
                            h: (clusterHeightPx / vp.height) * 100,
                            text: clusterText,
                            fontSize: Math.round((fontSize * SCALE) * 10) / 10, // Round to 1 decimal place for cleaner UI
                            fontFamily: cluster.fontInfo.family,
                            color: cluster.color,
                            bold: cluster.fontInfo.bold,
                            italic: cluster.fontInfo.italic,
                            underline: false,
                            align: "left",
                            editing: false,
                            isExisting: true,
                            pdfTransform: first.transform,
                            pdfPageWidth: vp.width / SCALE,
                            pdfPageHeight: vp.height / SCALE,
                            originalText: clusterText,
                            origX0: tx,
                            origY0: (vp.height / SCALE) - ty - fontSize,
                            origX1: tx + totalWidth,
                            origY1: (vp.height / SCALE) - ty + (fontSize * 0.25),
                        };
                        newAnnotations.push(ann);
                        origMap.set(ann.id, { ...ann });
                        spanIdx++;
                    }

                    // ── PHASE 3: Images still come from backend (pdf.js
                    //    doesn't easily give image coordinates)
                }

                // ── Fetch images from backend (fire-and-forget after pages show) ──
                setPages(results);
                // Directly set the text annotations instead of appending to prevent React strict-mode double-mounting duplicates
                setAnnotations(newAnnotations);
                setExtractedOriginals(origMap);
                setIsLoading(false);
                setIsExtracting(true); // reuse banner for image extraction

                try {
                    const formData = new FormData();
                    formData.append("file", file, file.name);
                    const res = await fetch("/api/edit-pdf/extract", { method: "POST", body: formData });
                    if (res.ok) {
                        const imgData = await res.json();
                        const imgAnnotations: ImageAnnotation[] = [];
                        for (const pageData of imgData.pages || []) {
                            for (const img of pageData.images || []) {
                                const ann: ImageAnnotation = {
                                    id: img.id,
                                    type: "image",
                                    page: pageData.page_number,
                                    x: img.x_pct,
                                    y: img.y_pct,
                                    w: img.w_pct,
                                    h: img.h_pct,
                                    dataUrl: img.dataUrl,
                                    isExisting: true,
                                    origX0: img.orig_x0,
                                    origY0: img.orig_y0,
                                    origX1: img.orig_x1,
                                    origY1: img.orig_y1,
                                };
                                imgAnnotations.push(ann);
                                origMap.set(img.id, { ...img });
                            }
                        }
                        // Deduplicate images based on ID to avoid strict-mode double mount errors
                        setAnnotations(prev => {
                            const seen = new Set(prev.map(a => a.id));
                            const newImgs = imgAnnotations.filter(img => !seen.has(img.id));
                            return [...prev, ...newImgs];
                        });
                        setExtractedOriginals(new Map(origMap));
                    }
                } catch (imgErr) {
                    console.warn("Image extraction unavailable:", imgErr);
                }

            } catch (err) {
                console.error("PDF load error:", err);
                setIsLoading(false);
            } finally {
                setIsExtracting(false);
            }
        }

        loadPdfAndExtract();
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
        copy = {
            ...ann,
            id: uid(),
            x: (ann as any).x + 3,
            y: (ann as any).y + 3,
            isNew: ann.type === "text" ? true : undefined
        } as Annotation;
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
    const savePdf = () => execute(async () => {
        if (!file) return;
        setIsSaving(true);
        try {
            // Classify annotations into modified, deleted, and added
            const modified: any[] = [];
            const deleted: any[] = [];
            const added: any[] = [];

            // Find existing items that were deleted (they were in extractedOriginals but no longer in annotations)
            const currentExistingIds = new Set(
                annotations.filter(a => (a as any).isExisting).map(a => a.id)
            );
            extractedOriginals.forEach((orig, id) => {
                if (!currentExistingIds.has(id)) {
                    deleted.push({
                        page: orig.page_number || annotations.find(a => a.id === id)?.page || 1,
                        // text annotations store coords as camelCase (origX0); image annotations
                        // come from backend as snake_case (orig_x0) — handle both
                        orig_x0: orig.orig_x0 ?? orig.origX0,
                        orig_y0: orig.orig_y0 ?? orig.origY0,
                        orig_x1: orig.orig_x1 ?? orig.origX1,
                        orig_y1: orig.orig_y1 ?? orig.origY1,
                    });
                }
            });

            for (const ann of annotations) {

                const isExisting = (ann as any).isExisting;

                if (isExisting && (ann.type === "text" || ann.type === "image")) {
                    const orig = extractedOriginals.get(ann.id);
                    if (!orig) continue;

                    // Check if anything changed
                    const ta = ann as TextAnnotation;
                    const ia = ann as ImageAnnotation;
                    const textChanged = ann.type === "text" && ta.text !== ta.originalText;
                    const posChanged = ann.type === "text"
                        ? (Math.abs(ta.x - orig.x_pct) > 0.1 || Math.abs(ta.y - orig.y_pct) > 0.1)
                        : (Math.abs(ia.x - orig.x_pct) > 0.1 || Math.abs(ia.y - orig.y_pct) > 0.1);
                    const sizeChanged = ann.type === "text"
                        ? (Math.abs(ta.w - orig.w_pct) > 0.1 || Math.abs(ta.h - orig.h_pct) > 0.1)
                        : (Math.abs(ia.w - orig.w_pct) > 0.1 || Math.abs(ia.h - orig.h_pct) > 0.1);

                    const propChanged = ann.type === "text" && (
                        ta.fontFamily !== orig.fontFamily ||
                        ta.color !== orig.color ||
                        ta.bold !== orig.bold ||
                        ta.italic !== orig.italic ||
                        Math.abs(ta.fontSize - (orig.fontSize || 0)) > 0.1
                    );

                    if (textChanged || posChanged || sizeChanged || propChanged) {
                        const editItem: any = {
                            type: ann.type,
                            page: ann.page,
                            // same camelCase/snake_case dual-source handling as deleted items
                            orig_x0: orig.orig_x0 ?? orig.origX0,
                            orig_y0: orig.orig_y0 ?? orig.origY0,
                            orig_x1: orig.orig_x1 ?? orig.origX1,
                            orig_y1: orig.orig_y1 ?? orig.origY1,
                            x_pct: ann.type === "text" ? ta.x : ia.x,
                            y_pct: ann.type === "text" ? ta.y : ia.y,
                            w_pct: ann.type === "text" ? ta.w : ia.w,
                            h_pct: ann.type === "text" ? ta.h : ia.h,
                        };
                        if (ann.type === "text") {
                            editItem.text = ta.text;
                            // Revert the 1.5 SCALE factor used for canvas rendering to specify correct PDF points
                            editItem.fontSize = ta.fontSize / 1.5;
                            editItem.fontFamily = ta.fontFamily;
                            editItem.color = ta.color;
                            editItem.bold = ta.bold;
                            editItem.italic = ta.italic;
                        } else {
                            editItem.dataUrl = ia.dataUrl;
                        }
                        modified.push(editItem);
                    }
                    // If nothing changed, skip — leave original as-is
                } else if (!isExisting) {
                    // New annotation (text, image, or draw)
                    const ta = ann as TextAnnotation;
                    const ia = ann as ImageAnnotation;
                    const da = ann as DrawAnnotation;
                    const addItem: any = {
                        type: ann.type,
                        page: ann.page,
                    };
                    if (ann.type === "draw") {
                        addItem.x_pct = da.x;
                        addItem.y_pct = da.y;
                        addItem.w_pct = da.w;
                        addItem.h_pct = da.h;
                        addItem.color = da.color;
                        addItem.lineWidth = da.lineWidth;
                        addItem.isHighlight = da.isHighlight;
                        addItem.paths = da.paths;
                    } else if (ann.type === "text") {
                        addItem.x_pct = ta.x;
                        addItem.y_pct = ta.y;
                        addItem.w_pct = ta.w;
                        addItem.h_pct = ta.h;
                        addItem.text = ta.text;
                        addItem.fontSize = ta.fontSize / 1.5;
                        addItem.fontFamily = ta.fontFamily;
                        addItem.color = ta.color;
                        addItem.bold = ta.bold;
                        addItem.italic = ta.italic;
                    } else {
                        addItem.x_pct = ia.x;
                        addItem.y_pct = ia.y;
                        addItem.w_pct = ia.w;
                        addItem.h_pct = ia.h;
                        addItem.dataUrl = ia.dataUrl;
                    }
                    added.push(addItem);
                }
            }

            const hasExistingEdits = modified.length > 0 || deleted.length > 0;
            const fileToUse = originalFile || file;

            if (hasExistingEdits) {
                // Use Python backend for whiteout + redraw
                const editsPayload = JSON.stringify({ modified, deleted, added });
                const formData = new FormData();
                formData.append("file", fileToUse, fileToUse.name);
                formData.append("edits", editsPayload);

                const res = await fetch("/api/edit-pdf/apply", { method: "POST", body: formData });
                if (!res.ok) {
                    const errBody = await res.json().catch(() => ({}));
                    throw new Error(errBody.error || "Failed to apply edits");
                }

                const blob = await res.blob();
                const outName = res.headers.get("X-Original-Filename") || `edited_${fileToUse.name}`;
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = outName;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
            } else if (added.length > 0 && (pdfArrayBuffer || isBlankMode)) {
                // Only new annotations — use pdf-lib (original approach, faster)
                const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");

                let pdfDoc;
                if (pdfArrayBuffer) {
                    pdfDoc = await PDFDocument.load(pdfArrayBuffer.slice(0));
                } else {
                    // Start from scratch for blank mode
                    pdfDoc = await PDFDocument.create();
                    for (let i = 0; i < numPages; i++) {
                        pdfDoc.addPage([595.28, 841.89]); // A4 in points
                    }
                }
                const pdfPages = pdfDoc.getPages();
                const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
                const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
                const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
                const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

                for (const ann of annotations) {
                    if ((ann as any).isExisting) continue;
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
                    } else if (ann.type === "draw") {
                        const da = ann as DrawAnnotation;
                        const xPt = (da.x / 100) * pw;
                        const yPtTop = (da.y / 100) * ph;
                        const wPt = (da.w / 100) * pw;
                        const hPt = (da.h / 100) * ph;

                        const hexToRgb = (hex: string) => {
                            const r = parseInt(hex.slice(1, 3), 16) / 255;
                            const g = parseInt(hex.slice(3, 5), 16) / 255;
                            const b = parseInt(hex.slice(5, 7), 16) / 255;
                            return rgb(r, g, b);
                        };

                        for (const path of da.paths) {
                            if (path.length < 2) continue;
                            const svgPath = path.map((p, ix) =>
                                `${ix === 0 ? 'M' : 'L'} ${xPt + p.x * wPt} ${ph - (yPtTop + p.y * hPt)}`
                            ).join(" ");

                            pdfPage.drawSvgPath(svgPath, {
                                color: undefined,
                                borderColor: hexToRgb(da.color),
                                borderWidth: da.isHighlight ? da.lineWidth * 4 : da.lineWidth,
                            });
                        }
                    }
                }

                const pdfBytes = await pdfDoc.save();
                const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = file ? `edited_${file.name}` : `document.pdf`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
            } else {
                showEditorToast("No changes to save.", "info");
            }
        } catch (err) {
            // Log a sanitized error to the console (prevents backend stack trace leaks)
            console.error("Save Error: Failed to generate the edited document on the server.");
            // Show a generic, user-friendly message in the toast
            showEditorToast(
                "Something went wrong while saving the PDF. Please try again.",
                "error"
            );
        } finally {
            setIsSaving(false);
        }
    });

    // ─── Upload screen ────────────────────────────────────────────────────────
    if (!file && !isBlankMode) {
        return (
            <ToolLayout
                title="Edit PDF"
                description="Add text, images, drawings and highlights to your PDF."
                icon={<IconPencil size={28} />}
                accentColor="#047C58"
            >
                <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
                    {/* Uploader */}
                    <div className="p-8 pb-6">
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

                    {/* Card Footer for Blank Page */}
                    <div
                        onClick={startWithBlankPage}
                        className="flex items-center justify-center gap-2 px-5 py-4 border-t border-border bg-[#faf9f7] cursor-pointer hover:bg-[#f2f0e9] transition-colors"
                    >
                        <span className="text-xs font-medium text-brand-sage">
                            Start with a blank page
                        </span>
                    </div>
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
        <>
            {!file && <Navbar />}
            <div
                className={`flex flex-col bg-[#fdfdfb] overflow-hidden ${!file ? "mt-16 h-[calc(100vh-64px)]" : "h-[calc(100vh-64px)]"}`}
                onClick={() => {
                    setShowZoomMenu(false);
                    setShowFontList(false);
                    setShowFontSizeList(false);
                }}
            >
                <RateLimitModal
                    open={!!limitResult && !limitResult.allowed}
                    resetAt={limitResult?.resetAt ?? 0}
                    onClose={clearLimitResult}
                />
                {/* ── In-editor toast notification (replaces browser alert) ── */}
                <AnimatePresence>
                    {editorToast && (
                        <motion.div
                            key={editorToast.id}
                            initial={{ opacity: 0, y: 24, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 12, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-9999 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold pointer-events-none select-none"
                            style={{
                                background: editorToast.type === "error"
                                    ? "#EF4444"
                                    : editorToast.type === "success"
                                        ? "#047C58"
                                        : "#1E1702",
                                color: "#fff",
                                minWidth: 220,
                                maxWidth: 420,
                                textAlign: "center",
                            }}
                        >
                            <span>
                                {editorToast.type === "error" ? "⚠️ " : editorToast.type === "success" ? "✅ " : "ℹ️ "}
                                {editorToast.msg}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
                {/* Extracting content banner */}
                {isExtracting && (
                    <div className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 px-4 py-2 flex items-center justify-center gap-2 z-50 shrink-0">
                        <IconLoader2 size={14} className="animate-spin text-emerald-600" />
                        <span className="text-xs font-semibold text-emerald-700">Extracting existing content for editing…</span>
                    </div>
                )}

                {/* ── SECONDARY NAVBAR ── */}
                <div className="h-14 shrink-0 bg-white border-b border-[#E0DED9] px-4 flex items-center justify-between z-40 gap-2 shadow-sm">

                    {/* LEFT: Back + file info */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="pr-4 border-r border-[#E0DED9] shrink-0">
                            <button
                                onClick={() => {
                                    setFile(null);
                                    setIsBlankMode(false);
                                }}
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
                                <span className="text-xs font-bold text-brand-dark max-w-[150px] truncate leading-tight">
                                    {file ? file.name : "Blank Document"}
                                </span>
                                <span className="text-[10px] text-brand-sage font-medium">
                                    {numPages} pages {file?.size ? `· ${(file.size / 1024 / 1024).toFixed(2)} MB` : ""}
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
                                { id: "whiteout", icon: IconEraser, label: "Whiteout" },
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
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-sage hover:bg-white hover:text-brand-dark hover:shadow-sm disabled:opacity-30 transition-all"
                            >
                                <IconChevronUp size={14} />
                            </button>
                            <button
                                onMouseDown={e => e.preventDefault()}
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
                            <button onMouseDown={e => e.preventDefault()} onClick={zoomOut} disabled={!canZoomOut} className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-sage hover:bg-white hover:text-brand-dark hover:shadow-sm disabled:opacity-30 transition-all">
                                <IconMinus size={14} />
                            </button>
                            <div className="relative">
                                <button
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={e => {
                                    e.stopPropagation();
                                    setShowZoomMenu(v => !v);
                                    setShowFontList(false);
                                    setShowFontSizeList(false);
                                }}
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
                            <button onMouseDown={e => e.preventDefault()} onClick={zoomIn} disabled={!canZoomIn} className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-sage hover:bg-white hover:text-brand-dark hover:shadow-sm disabled:opacity-30 transition-all">
                                <IconPlus size={14} />
                            </button>
                        </div>
                    </div>

                    {/* RIGHT spacer */}
                    <div className="flex-1 hidden lg:block" />
                </div>

                {/* ── MAIN LAYOUT ── */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Left: Thumbnails with page management */}
                    {pages.length > 0 && (
                        <div className="hidden md:flex flex-col bg-white border-r border-[#E0DED9] shrink-0 w-[152px]">
                            <div
                                ref={sidebarScrollRef}
                                className="flex-1 overflow-y-auto custom-scrollbar py-3 bg-[#fdfdfb]"
                                onDragLeave={(e) => { setDragOverPage(null); sidebarAutoScroll.onDragLeave(); }}
                                onDrop={() => { setDragOverPage(null); sidebarAutoScroll.onDragEnd(); }}
                                onDragOver={(e) => sidebarAutoScroll.onDragOver(e)}
                            >
                                {/* Add page at the very top */}
                                <div className="px-2 mb-2 mt-[-4px]">
                                    <button
                                        onClick={() => addBlankPage(-1)}
                                        className="w-full flex items-center justify-center gap-1 py-0.5 mt-0.5 text-[9px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-all border border-dashed border-emerald-300 hover:border-emerald-500"
                                        title="Add blank page at start"
                                    >
                                        <IconFilePlus size={10} /> Add page
                                    </button>
                                </div>

                                {pages.map((pg, i) => (
                                    <div
                                        key={i}
                                        className={`relative group flex flex-col items-center px-2 pb-2 transition-all ${dragOverPage === i ? "bg-blue-50 ring-2 ring-inset ring-blue-400 rounded-xl" : ""
                                            }`}
                                        draggable
                                        onDragStart={e => handlePageDragStart(e, i)}
                                        onDragOver={e => handlePageDragOver(e, i)}
                                        onDrop={e => handlePageDrop(e, i)}
                                    >
                                        {/* Drag grip */}
                                        <div className="absolute left-1.5 top-2 opacity-0 group-hover:opacity-40 transition-opacity cursor-grab active:cursor-grabbing text-brand-sage">
                                            <IconGripVertical size={12} />
                                        </div>

                                        {/* Thumbnail */}
                                        <div
                                            id={`edit-thumb-${i + 1}`}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => e.key === 'Enter' && scrollToPage(i + 1)}
                                            onClick={() => scrollToPage(i + 1)}
                                            className={`relative w-full rounded-md border-2 transition-all cursor-pointer overflow-hidden mt-1 block ${currentPage === i + 1 ? "border-brand-dark shadow-md" : "border-[#E0DED9] bg-white"
                                                }`}
                                        >
                                            <img
                                                src={pg.dataUrl}
                                                alt={`Page ${i + 1}`}
                                                className="w-full object-contain pointer-events-none select-none"
                                                draggable={false}
                                            />

                                            {/* Hover action buttons */}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                                                {/* Delete */}
                                                <button
                                                    onClick={e => { e.stopPropagation(); setDeleteConfirmPage(i); }}
                                                    className="w-7 h-7 rounded-full bg-red-500/90 flex items-center justify-center text-white hover:bg-red-600 shadow-md transition-all"
                                                    title="Delete page"
                                                >
                                                    <IconTrash size={13} />
                                                </button>
                                            </div>
                                        </div>

                                        <span className={`text-[10px] font-bold mt-1 ${currentPage === i + 1 ? "text-brand-dark" : "text-brand-sage"
                                            }`}>
                                            Page {i + 1}
                                        </span>

                                        {/* Add page below this one */}
                                        <button
                                            onClick={() => addBlankPage(i)}
                                            className="w-full flex items-center justify-center gap-1 py-0.5 mt-0.5 text-[9px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-all border border-dashed border-emerald-300 hover:border-emerald-500"
                                            title="Add blank page after this one"
                                        >
                                            <IconFilePlus size={10} /> Add page
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Delete page confirmation modal */}
                    {deleteConfirmPage !== null && (
                        <div className="fixed inset-0 z-9999 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setDeleteConfirmPage(null)}>
                            <div className="bg-white rounded-2xl shadow-2xl p-6 w-[320px] flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                        <IconTrash size={20} className="text-red-500" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-brand-dark text-sm">Delete Page {deleteConfirmPage + 1}?</p>
                                        <p className="text-[11px] text-brand-sage mt-0.5">This cannot be undone. All annotations on this page will also be removed.</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setDeleteConfirmPage(null)}
                                        className="flex-1 py-2.5 rounded-xl border border-[#E0DED9] text-xs font-bold text-brand-sage hover:bg-[#f5f4f0] transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => deletePage(deleteConfirmPage)}
                                        className="flex-1 py-2.5 rounded-xl bg-red-500 text-xs font-bold text-white hover:bg-red-600 transition-all"
                                    >
                                        Delete Page
                                    </button>
                                </div>
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
                                className="flex flex-col gap-8 mx-auto"
                                style={{ width: `${Math.min(900 * zoom, 3000)}px`, maxWidth: "none" }}
                            >
                                {pages.map((pg, i) => {
                                    const pageAnns = annotations.filter(a => a.page === i + 1);
                                    const overlayAnns = pageAnns.filter(a => ["text", "image", "draw"].includes(a.type));
                                    const baseW = Math.min(900 * zoom, 3000);

                                    return (
                                        <div
                                            key={i}
                                            className="relative bg-white shadow-xl select-none overflow-clip"
                                            style={{
                                                aspectRatio: `${pg.width} / ${pg.height}`,
                                                width: `${baseW}px`,
                                                marginLeft: "50%",
                                                transform: "translateX(-50%)",
                                                border: "1px solid #ccc",
                                                cursor: tool === "text" ? "text" : ["draw", "highlight", "whiteout"].includes(tool) ? "crosshair" : "default",
                                                overflow: "clip",
                                            }}
                                            onClick={e => onPageClick(e, i)}
                                        >
                                            <div
                                                id={`edit-page-${i}`}
                                                className="overflow-clip"
                                                style={{
                                                    position: "absolute",
                                                    top: "50%",
                                                    left: "50%",
                                                    width: "100%",
                                                    height: "100%",
                                                    transform: `translate(-50%, -50%)`,
                                                    overflow: "clip",
                                                    clipPath: "inset(0)", // Force clip everything outside the bounds
                                                }}
                                            >
                                                {/* Page image */}
                                                <img
                                                    src={pg.dataUrl}
                                                    alt={`Page ${i + 1}`}
                                                    className="w-full h-full object-contain pointer-events-none select-none"
                                                    draggable={false}
                                                />

                                                {/* Draw canvas overlay */}
                                                <DrawCanvas
                                                    page={i + 1}
                                                    tool={tool}
                                                    drawColor={drawColor}
                                                    drawWidth={drawWidth}
                                                    width={baseW}
                                                    height={baseW * (pg.height / pg.width)}
                                                    onDrawEnd={addDraw}
                                                />

                                                {/* Text / Image annotation overlays */}
                                                <div className="absolute inset-0 z-20" style={{ pointerEvents: "none" }}>
                                                    {overlayAnns.map(ann => {
                                                        const pagePxW = baseW;
                                                        const pagePxH = baseW * (pg.height / pg.width);

                                                        if (ann.type === "text") {
                                                            const ta = ann as TextAnnotation;
                                                            const rndW = (ta.w / 100) * pagePxW;
                                                            const rndH = (ta.h / 100) * pagePxH;
                                                            // When text hasn't been changed yet, the overlay is invisible
                                                            // so the real PDF text rendered on the canvas shows through.
                                                            const isUnmodified = ta.isExisting && ta.text === ta.originalText;
                                                            return (
                                                                <div
                                                                    key={ta.id}
                                                                    data-annotation="true"
                                                                    className="absolute"
                                                                    style={{
                                                                        left: `${ta.x}%`,
                                                                        top: `${ta.y}%`,
                                                                        zIndex: 20,
                                                                        pointerEvents: ["draw", "highlight", "whiteout"].includes(tool) ? "none" : "auto",
                                                                    }}
                                                                >
                                                                    <Rnd
                                                                        key={`${ta.id}-${zoom}`}
                                                                        data-annotation="true"
                                                                        bounds={`#edit-page-${i}`}
                                                                        // Let the text box expand dynamically based on content.
                                                                        // "auto" ensures that as text is typed, the bounds widen rather than force-wrapping.
                                                                        size={{ width: "auto", height: "auto" }}
                                                                        position={{ x: 0, y: 0 }}
                                                                        onDragStop={(_: any, d: any) => {
                                                                            updateAnnotation(ta.id, {
                                                                                x: ta.x + (d.x / pagePxW) * 100,
                                                                                y: ta.y + (d.y / pagePxH) * 100,
                                                                            } as any);
                                                                        }}
                                                                        onResizeStop={(_: any, __: any, ref: any, ___: any, pos: any) => {
                                                                            updateAnnotation(ta.id, {
                                                                                w: (ref.offsetWidth / pagePxW) * 100,
                                                                                h: (ref.offsetHeight / pagePxH) * 100,
                                                                                x: ta.x + (pos.x / pagePxW) * 100,
                                                                                y: ta.y + (pos.y / pagePxH) * 100,
                                                                            } as any);
                                                                        }}
                                                                        disableDragging={tool !== "select" || ta.editing}
                                                                        enableResizing={false}
                                                                        handleStyles={selectedId === ta.id && !ta.editing ? HANDLE_STYLES : {}}
                                                                        className={`z-20 ${selectedId === ta.id ? "outline-2 outline-[#2563eb]" : "hover:outline-2 hover:outline-[#2563eb]/40"}`}
                                                                        style={{ position: "relative" }}
                                                                        onClick={(e: any) => {
                                                                            e.stopPropagation();
                                                                            setSelectedId(ta.id);
                                                                            updateAnnotation(ta.id, { editing: true } as any);
                                                                        }}
                                                                    >
                                                                        <div className="w-full h-full relative group" style={{ display: "grid" }}>
                                                                            {/* Hidden measuring span that naturally pushes the container bounds without wrapping */}
                                                                            <div
                                                                                style={{
                                                                                    gridArea: "1 / 1 / 2 / 2",
                                                                                    visibility: "hidden",
                                                                                    whiteSpace: "pre-wrap", // Naturally wrap when hitting edge
                                                                                    wordBreak: "break-word",
                                                                                    fontFamily: ta.fontFamily,
                                                                                    fontSize: ta.isExisting ? `${ta.fontSize * (pagePxW / pg.width)}px` : `${ta.fontSize * zoom}px`,
                                                                                    fontWeight: ta.bold ? "bold" : "normal",
                                                                                    fontStyle: ta.italic ? "italic" : "normal",
                                                                                    lineHeight: ta.isExisting ? 1 : 1.3,
                                                                                }}
                                                                            >
                                                                                {ta.text + " "}
                                                                            </div>

                                                                            {ta.editing ? (
                                                                                // contentEditable div renders identically to the display div below —
                                                                                // same font metrics, same line-height, same CSS box model.
                                                                                // This eliminates the jarring size/position shift on click.
                                                                                <TextEditBox
                                                                                    initialText={ta.text}
                                                                                    onUpdate={(text) => updateAnnotation(ta.id, { text } as any)}
                                                                                    onBlur={() => updateAnnotation(ta.id, { editing: false, isNew: false } as any)}
                                                                                    selectAll={ta.isNew}
                                                                                    style={{
                                                                                        whiteSpace: "pre-wrap",
                                                                                        wordBreak: "break-word",
                                                                                        overflow: "visible",
                                                                                        // Opaque white totally hides the original PDF text underneath so you 
                                                                                        // don't see double/ghosting text while typing. New text has no ghost, so it is transparent.
                                                                                        background: ta.isExisting ? "#ffffff" : "transparent",
                                                                                        fontFamily: ta.fontFamily,
                                                                                        fontSize: ta.isExisting ? `${ta.fontSize * (pagePxW / pg.width)}px` : `${ta.fontSize * zoom}px`,
                                                                                        color: ta.color,
                                                                                        fontWeight: ta.bold ? "bold" : "normal",
                                                                                        fontStyle: ta.italic ? "italic" : "normal",
                                                                                        textDecoration: ta.underline ? "underline" : "none",
                                                                                        textAlign: ta.align,
                                                                                        lineHeight: ta.isExisting ? 1 : 1.3,
                                                                                        minWidth: `${rndW}px`,
                                                                                        maxWidth: `${pagePxW - (ta.x / 100) * pagePxW}px`, // Strictly never stretch past right edge of page
                                                                                    }}
                                                                                />
                                                                            ) : (
                                                                                <div
                                                                                    style={{
                                                                                        gridArea: "1 / 1 / 2 / 2",
                                                                                        // Match same spacing & styles
                                                                                        fontFamily: ta.fontFamily,
                                                                                        fontSize: ta.isExisting ? `${ta.fontSize * (pagePxW / pg.width)}px` : `${ta.fontSize * zoom}px`,
                                                                                        // If unmodified: transparent → real PDF canvas text shows through.
                                                                                        // If modified: show new text on SOLID white background so user sees their change 
                                                                                        // without the original ghost text bleeding through. New text is always transparent.
                                                                                        color: isUnmodified ? "transparent" : ta.color,
                                                                                        background: ta.isExisting ? (isUnmodified ? "transparent" : "#ffffff") : "transparent",
                                                                                        fontWeight: ta.bold ? "bold" : "normal",
                                                                                        fontStyle: ta.italic ? "italic" : "normal",
                                                                                        textDecoration: ta.underline ? "underline" : "none",
                                                                                        textAlign: ta.align,
                                                                                        cursor: ta.isExisting ? "text" : (tool === "select" ? "move" : "default"),
                                                                                        lineHeight: ta.isExisting ? 1 : 1.3,
                                                                                        whiteSpace: "pre",
                                                                                        overflow: "visible",
                                                                                    }}
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
                                                                        pointerEvents: ["draw", "highlight", "whiteout"].includes(tool) ? "none" : "auto",
                                                                    }}
                                                                >
                                                                    <Rnd
                                                                        key={`${ia.id}-${zoom}`}
                                                                        data-annotation="true"
                                                                        bounds={`#edit-page-${i}`}
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
                                                        if (ann.type === "draw") {
                                                            const da = ann as DrawAnnotation;
                                                            return (
                                                                <div
                                                                    key={da.id}
                                                                    data-annotation="true"
                                                                    className="absolute"
                                                                    style={{
                                                                        left: `${da.x}%`,
                                                                        top: `${da.y}%`,
                                                                        zIndex: 20,
                                                                        pointerEvents: ["draw", "highlight", "whiteout"].includes(tool) ? "none" : "auto",
                                                                    }}
                                                                >
                                                                    <Rnd
                                                                        key={`${da.id}-${zoom}`}
                                                                        data-annotation="true"
                                                                        bounds={`#edit-page-${i}`}
                                                                        size={{ width: (da.w / 100) * pagePxW, height: (da.h / 100) * pagePxH }}
                                                                        position={{ x: 0, y: 0 }}
                                                                        onDragStop={(_: any, d: any) => {
                                                                            updateAnnotation(da.id, {
                                                                                x: da.x + (d.x / pagePxW) * 100,
                                                                                y: da.y + (d.y / pagePxH) * 100,
                                                                            } as any);
                                                                        }}
                                                                        onResizeStop={(_: any, __: any, ref: any, ___: any, pos: any) => {
                                                                            updateAnnotation(da.id, {
                                                                                w: (parseInt(ref.style.width) / pagePxW) * 100,
                                                                                h: (parseInt(ref.style.height) / pagePxH) * 100,
                                                                                x: da.x + (pos.x / pagePxW) * 100,
                                                                                y: da.y + (pos.y / pagePxH) * 100,
                                                                            } as any);
                                                                        }}
                                                                        disableDragging={tool !== "select"}
                                                                        enableResizing={tool === "select"}
                                                                        handleStyles={selectedId === da.id ? HANDLE_STYLES : {}}
                                                                        className={`z-20 ${selectedId === da.id ? "outline-2 outline-[#2563eb]" : "hover:outline-2 hover:outline-[#2563eb]/40"}`}
                                                                        style={{ position: "relative" }}
                                                                        onClick={(e: any) => { e.stopPropagation(); setSelectedId(da.id); }}
                                                                    >
                                                                        <div className="w-full h-full relative group">
                                                                            <svg width="100%" height="100%" style={{ overflow: "hidden" }} preserveAspectRatio="none">
                                                                                {da.paths.map((path, idx) => {
                                                                                    if (path.length < 2) return null;
                                                                                    const svgPath = path.map((p, ix) => `${ix === 0 ? 'M' : 'L'} ${p.x * ((da.w / 100) * pagePxW)} ${p.y * ((da.h / 100) * pagePxH)}`).join(" ");
                                                                                    return (
                                                                                        <path
                                                                                            key={idx}
                                                                                            d={svgPath}
                                                                                            fill="none"
                                                                                            stroke={da.color}
                                                                                            strokeWidth={da.isHighlight ? da.lineWidth * 4 : da.lineWidth}
                                                                                            strokeOpacity={da.isHighlight ? 0.35 : 1}
                                                                                            strokeLinecap="round"
                                                                                            strokeLinejoin="round"
                                                                                        />
                                                                                    );
                                                                                })}
                                                                            </svg>
                                                                            {selectedId === da.id && (
                                                                                <div className="absolute -top-6 right-0 flex items-center gap-1.5 z-40">
                                                                                    <button onClick={() => duplicateAnnotation(da.id)} className="bg-[#2563eb] text-white rounded-md px-2 py-1 text-[11px] font-bold flex items-center gap-1 shadow-lg hover:bg-blue-700 transition-colors" title="Duplicate">
                                                                                        <IconCopy size={12} />
                                                                                    </button>
                                                                                    <button onClick={() => deleteAnnotation(da.id)} className="bg-red-500 text-white rounded-md px-2 py-1 text-[11px] font-bold flex items-center gap-1 shadow-lg hover:bg-red-600 transition-colors" title="Delete">
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
                                                onMouseDown={e => e.preventDefault()}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowFontList(!showFontList);
                                                    setShowFontSizeList(false);
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

                                    </div>

                                    {/* Font size */}
                                    <div className="flex flex-col gap-2 relative">
                                        <label className="text-[11px] font-bold text-brand-sage uppercase tracking-wider">Font Size</label>
                                        <div className="flex flex-col gap-2 relative">
                                            <input
                                                type="text"
                                                className="w-full bg-[#f5f4f0] border border-[#E0DED9] rounded-xl p-2.5 text-sm font-bold focus:ring-2 focus:ring-black/20 focus:border-black outline-none transition-all placeholder:text-[#ccc]"
                                                placeholder="Size..."
                                                value={fontSizeInputText}
                                                onMouseDown={e => e.stopPropagation()}
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    setShowFontSizeList(!showFontSizeList);
                                                    setShowFontList(false);
                                                }}
                                                onBlur={() => {
                                                    // Ensure valid number on blur if empty
                                                    if (!fontSizeInputText) {
                                                        const defaultVal = 24;
                                                        setFontSizeInputText(defaultVal.toString());
                                                        setTextFontSize(defaultVal);
                                                        if (selectedAnn?.id) updateAnnotation(selectedAnn.id, { fontSize: defaultVal } as any);
                                                    }
                                                }}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    // Allow decimal values or empty string
                                                    if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                                        setFontSizeInputText(val); // Keep local state exactly what user typed (including '.')
                                                        const num = parseFloat(val);
                                                        if (!isNaN(num)) {
                                                            setTextFontSize(num);
                                                            if (selectedAnn?.id) updateAnnotation(selectedAnn.id, { fontSize: num } as any);
                                                        } else if (val === "") {
                                                            // For empty string, update logically to 0 but keep it empty visually
                                                            setTextFontSize(0);
                                                            if (selectedAnn?.id) updateAnnotation(selectedAnn.id, { fontSize: 0 } as any);
                                                        }
                                                    }
                                                }}
                                            />
                                            {/* Popular sizes dropdown (grid) */}
                                            {showFontSizeList && (
                                                <div 
                                                    className="absolute top-full mt-1 left-0 right-0 p-2 bg-white border border-[#E0DED9] rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <div className="grid grid-cols-5 gap-1">
                                                        {POPULAR_FONT_SIZES.map(s => {
                                                            const currentSize = selectedAnn?.type === "text" ? (selectedAnn as TextAnnotation).fontSize : textFontSize;
                                                            return (
                                                                <button
                                                                    key={s}
                                                                    onMouseDown={e => {
                                                                        e.preventDefault();
                                                                    }}
                                                                    onClick={() => {
                                                                        setTextFontSize(s);
                                                                        if (selectedAnn?.id) updateAnnotation(selectedAnn.id, { fontSize: s } as any);
                                                                        setShowFontSizeList(false);
                                                                    }}
                                                                    className={`text-[10px] font-bold py-1.5 rounded-lg border transition-all ${
                                                                        currentSize === s
                                                                        ? "bg-black text-white border-black"
                                                                        : "bg-[#f5f4f0] text-brand-sage border-[#E0DED9] hover:text-brand-dark hover:bg-[#e8e6e3]"
                                                                    }`}
                                                                >
                                                                    {s}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Color */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-bold text-brand-sage uppercase tracking-wider">Color</label>
                                        <div className="flex flex-wrap gap-2">
                                            {COLORS.map(c => (
                                                <button
                                                    key={c}
                                                    onMouseDown={e => e.preventDefault()}
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
                                                    onMouseDown={e => e.preventDefault()}
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

                            {/* Selected individual component actions */}
                            {selectedAnn && (
                                <div className="flex flex-col gap-1.5 pt-2 border-t border-[#E0DED9]">
                                    <label className="text-[11px] font-bold text-brand-sage uppercase tracking-wider">Actions</label>
                                    <div className="flex gap-2">
                                        <button
                                            onMouseDown={e => e.preventDefault()}
                                            onClick={() => duplicateAnnotation(selectedAnn.id)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#f5f4f0] border border-[#E0DED9] text-xs font-bold text-brand-dark hover:bg-[#E0DED9] transition-all"
                                        >
                                            <IconCopy size={14} /> Duplicate
                                        </button>
                                        <button
                                            onMouseDown={e => e.preventDefault()}
                                            onClick={() => deleteAnnotation(selectedAnn.id)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-red-600 hover:bg-red-100 transition-all"
                                        >
                                            <IconTrash size={14} /> Delete
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Draw settings */}
                            {(["draw", "highlight", "whiteout"].includes(tool) || selectedAnn?.type === "draw") && (() => {
                                const isWhiteout = selectedAnn?.type === "draw" ? (selectedAnn as DrawAnnotation).color === "#ffffff" : tool === "whiteout";
                                const currentLineWidth = selectedAnn?.type === "draw" ? (selectedAnn as DrawAnnotation).lineWidth : drawWidth;
                                const currentColor = selectedAnn?.type === "draw" ? (selectedAnn as DrawAnnotation).color : drawColor;

                                return (
                                    <div className="flex flex-col gap-4">
                                        {isWhiteout && (
                                            <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl text-[11px] text-red-700 font-medium leading-relaxed">
                                                <strong className="font-bold">Warning:</strong> Whiteout covers information visually but does not fully remove it. Do not use for redacting sensitive or important information.
                                            </div>
                                        )}
                                        {!isWhiteout && (
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[11px] font-bold text-brand-sage uppercase tracking-wider">Brush Color</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {COLORS.map(c => (
                                                        <button
                                                            key={c}
                                                            onClick={() => {
                                                                setDrawColor(c);
                                                                if (selectedAnn?.id && selectedAnn.type === "draw") {
                                                                    updateAnnotation(selectedAnn.id, { color: c } as any);
                                                                }
                                                            }}
                                                            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${currentColor === c ? "border-brand-teal scale-110" : "border-transparent shadow-sm"}`}
                                                            style={{ background: c }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[11px] font-bold text-brand-sage uppercase tracking-wider">Thickness: {currentLineWidth}px</label>
                                            <input
                                                type="range"
                                                min={1}
                                                max={24}
                                                className="w-full accent-black"
                                                value={currentLineWidth}
                                                onChange={e => {
                                                    const v = Number(e.target.value);
                                                    setDrawWidth(v);
                                                    if (selectedAnn?.id && selectedAnn.type === "draw") {
                                                        updateAnnotation(selectedAnn.id, { lineWidth: v } as any);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })()}

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
        </>
    );
}
