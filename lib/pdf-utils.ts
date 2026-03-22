/**
 * pdf-utils.ts
 * Central utility library for all client-side PDF operations.
 * Lazy-loads heavy libraries only when needed.
 */

// ─── PDF → IMAGE ────────────────────────────────────────────────────────────

/**
 * Render every page of a PDF as canvas data-URLs.
 * @param file   The PDF File object.
 * @param format 'image/jpeg' | 'image/png'
 * @param scale  Device pixel ratio multiplier (default 2 for retina quality)
 */
export async function pdfToImages(
    file: File,
    format: "image/jpeg" | "image/png" = "image/jpeg",
    scale = 2
): Promise<{ dataUrl: string; pageNum: number }[]> {
    const pdfjsLib = await import("pdfjs-dist");

    // Use the local worker bundled by Next.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const results: { dataUrl: string; pageNum: number }[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport } as any).promise;

        results.push({
            dataUrl: canvas.toDataURL(format, format === "image/jpeg" ? 0.92 : undefined),
            pageNum: i,
        });
    }

    return results;
}

// ─── PDF → TEXT ─────────────────────────────────────────────────────────────

/**
 * Extract text content client-side using PDF.js.
 */
export async function pdfToTextClient(file: File): Promise<string> {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const allText: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ");
        allText.push(`--- Page ${i} ---\n${pageText}`);
    }

    return allText.join("\n\n");
}

// ─── PDF → WORD (.docx) ─────────────────────────────────────────────────────

/**
 * Convert a PDF to a layout-preserving DOCX via the Python microservice.
 * The microservice uses pdf2docx which preserves tables, images, fonts,
 * columns, and all other formatting from the original PDF.
 *
 * Requires the Python microservice to be running:
 *   cd python-service && start.bat
 */
export async function pdfToDocx(file: File): Promise<Blob> {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch("/api/pdf-to-word", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let message = "Conversion failed.";
        try {
            const body = await response.json();
            message = body.error || message;
        } catch {
            message = await response.text() || message;
        }
        throw new Error(message);
    }

    return await response.blob();
}

/**
 * Convert a PDF to an Excel workbook (.xlsx) via the Python microservice.
 * Extracts tables from the PDF and creates an Excel file.
 */
export async function pdfToExcel(file: File): Promise<Blob> {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch("/api/pdf-to-excel", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let message = "Conversion failed.";
        try {
            const body = await response.json();
            message = body.error || message;
        } catch {
            message = await response.text() || message;
        }
        throw new Error(message);
    }

    return await response.blob();
}

/**
 * Convert a PDF to a PowerPoint presentation (.pptx) via the Python microservice.
 * Renders each PDF page as a high-quality PowerPoint slide.
 */
export async function pdfToPptx(file: File): Promise<Blob> {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch("/api/pdf-to-pptx", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let message = "Conversion failed.";
        try {
            const body = await response.json();
            message = body.error || message;
        } catch {
            message = await response.text() || message;
        }
        throw new Error(message);
    }

    return await response.blob();
}

/**
 * Convert a PDF to an EPUB e-book (.epub) via the Python microservice.
 * Extracts text and images per page and assembles a reflowable EPUB.
 */
export async function pdfToEpub(file: File): Promise<Blob> {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch("/api/pdf-to-epub", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let message = "Conversion failed.";
        try {
            const body = await response.json();
            message = body.error || message;
        } catch {
            message = await response.text() || message;
        }
        throw new Error(message);
    }

    return await response.blob();
}

/**
 * Convert a PDF to PDF/A format via the Python microservice.
 * @param file - The PDF file to convert
 * @param conformanceLevel - '1b' | '2b' | '3b' (defaults to '1b')
 */
export async function pdfToPdfa(file: File, conformanceLevel: "1b" | "2b" | "3b" = "1b"): Promise<Blob> {
    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("conformance_level", conformanceLevel);

    const response = await fetch("/api/pdf-to-pdfa", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let message = "Conversion failed.";
        try {
            const body = await response.json();
            message = body.error || message;
        } catch {
            const text = await response.text();
            message = text || message;
        }
        throw new Error(message);
    }

    return await response.blob();
}



/**
 * Convert PDF pages to high-quality images (JPG or PNG) using the Python server.
 * For multi-page PDFs, returns a ZIP file. For single-page, returns the image directly.
 */
export async function pdfToImageServer(file: File, format: "jpg" | "png" = "jpg"): Promise<Blob> {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch(`/api/pdf-to-image?format=${format}`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let message = "Conversion failed.";
        try {
            const body = await response.json();
            message = body.error || message;
        } catch {
            const text = await response.text();
            message = text || message;
        }
        throw new Error(message);
    }

    return await response.blob();
}

/**
 * Convert a PDF to high-fidelity plain text via the Python microservice.
 */
export async function pdfToTxt(file: File): Promise<Blob> {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch("/api/pdf-to-txt", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let message = "Conversion failed.";
        try {
            const body = await response.json();
            message = body.error || message;
        } catch {
            const text = await response.text();
            message = text || message;
        }
        throw new Error(message);
    }

    return await response.blob();
}



// ─── IMAGES → PDF ───────────────────────────────────────────────────────────

/**
 * Embed one or more image files (JPG/PNG) into a single PDF.
 * Returns a Uint8Array of PDF bytes.
 */

// ─── Page size definitions (in pts, 72 pts per inch) ─────────────────────────
const PAGE_SIZE_MAP: Record<string, [number, number]> = {
    a5: [419, 595],
    a4: [595, 842],
    a3: [842, 1191],
    letter: [612, 792],
    legal: [612, 1008],
    ledger: [792, 1224],
};

const MARGIN_MAP: Record<string, number> = {
    none: 0,
    small: 36,  // 0.5 inch × 72
    large: 72,  // 1 inch × 72
};

export interface ImagesToPdfOptions {
    pageSize?: string;        // "fit" | "a4" | "a5" … defaults to "fit"
    orientation?: "portrait" | "landscape";   // defaults to "portrait"
    margin?: string;          // "none" | "small" | "large"   defaults to "none"
    mergeAll?: boolean;       // defaults to true
}

export async function imagesToPdf(files: File[], options: ImagesToPdfOptions = {}): Promise<Uint8Array | Uint8Array[]> {
    const { PDFDocument } = await import("pdf-lib");

    const {
        pageSize = "fit",
        orientation = "portrait",
        margin = "none",
        mergeAll = true,
    } = options;

    const marginPts = MARGIN_MAP[margin] ?? 0;

    const embedImage = async (pdfDoc: Awaited<ReturnType<typeof PDFDocument.create>>, file: File) => {
        const arrayBuffer = await file.arrayBuffer();
        const mimeType = file.type || "image/png";

        if (mimeType === "image/jpeg") {
            return pdfDoc.embedJpg(arrayBuffer);
        }
        // For all other formats (png, webp, bmp, gif…) we rasterise via canvas first
        if (mimeType !== "image/png") {
            const blob = await rasteriseTopng(file);
            const ab = await blob.arrayBuffer();
            return pdfDoc.embedPng(ab);
        }
        return pdfDoc.embedPng(arrayBuffer);
    };

    const addImageToDoc = async (
        pdfDoc: Awaited<ReturnType<typeof PDFDocument.create>>,
        file: File
    ) => {
        const image = await embedImage(pdfDoc, file);
        const imgW = image.width;
        const imgH = image.height;

        let pageW: number, pageH: number;

        if (pageSize === "fit") {
            pageW = imgW + marginPts * 2;
            pageH = imgH + marginPts * 2;
        } else {
            let [baseW, baseH] = PAGE_SIZE_MAP[pageSize] ?? PAGE_SIZE_MAP.a4;
            if (orientation === "landscape") [baseW, baseH] = [baseH, baseW];
            pageW = baseW;
            pageH = baseH;
        }

        const page = pdfDoc.addPage([pageW, pageH]);

        // Scale image to fit within content area
        const maxW = pageW - marginPts * 2;
        const maxH = pageH - marginPts * 2;
        const scale = Math.min(maxW / imgW, maxH / imgH, 1);
        const drawW = imgW * scale;
        const drawH = imgH * scale;

        // Centre image on page
        const x = marginPts + (maxW - drawW) / 2;
        const y = marginPts + (maxH - drawH) / 2;

        page.drawImage(image, { x, y, width: drawW, height: drawH });
    };

    if (mergeAll) {
        const pdfDoc = await PDFDocument.create();
        for (const file of files) {
            await addImageToDoc(pdfDoc, file);
        }
        return pdfDoc.save();
    } else {
        const pdfs = [];
        for (const file of files) {
            const pdfDoc = await PDFDocument.create();
            await addImageToDoc(pdfDoc, file);
            pdfs.push(await pdfDoc.save());
        }
        return pdfs;
    }
}

async function rasteriseTopng(file: File): Promise<Blob> {
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



// ─── HTML → PDF ─────────────────────────────────────────────────────────────

/**
 * Convert a URL (fetched via iframe-snapshot or proxy) into a PDF by
 * rendering a hidden div with the provided HTML string.
 */
export async function htmlToPdf(htmlContent: string, fileName = "output"): Promise<void> {
    const { default: html2canvas } = await import("html2canvas");
    const { jsPDF } = await import("jspdf");

    const container = document.createElement("div");
    container.innerHTML = htmlContent;
    container.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;width:794px;background:#fff;padding:32px;font-family:sans-serif;";
    document.body.appendChild(container);

    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    document.body.removeChild(container);

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const pdf = new jsPDF({ orientation: "p", unit: "px", format: "a4" });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = pdfHeight;
    let position = 0;
    pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
    heightLeft -= pdf.internal.pageSize.getHeight();

    while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
    }

    pdf.save(`${fileName}.pdf`);
}

/**
 * Generate a high-fidelity PDF from a URL or raw HTML via Playwright on the Python server.
 */
export async function urlToPdf(options: {
    url?: string;
    html?: string;
    pageSize?: string;
    orientation?: string;
    margin?: string;
    oneLongPage?: boolean;
    hideCookie?: boolean;
    blockAd?: boolean;
    viewportWidth?: number;
    fileName?: string;
}): Promise<Blob> {
    const formData = new FormData();
    if (options.url) formData.append("url", options.url);
    if (options.html) formData.append("html", options.html);
    formData.append("page_size", options.pageSize || "a4");
    formData.append("orientation", options.orientation || "portrait");
    formData.append("margin", options.margin || "none");
    formData.append("one_long_page", options.oneLongPage ? "true" : "false");
    formData.append("hide_cookie", options.hideCookie ? "true" : "false");
    formData.append("block_ad", options.blockAd ? "true" : "false");
    if (options.viewportWidth) formData.append("viewport_width", String(options.viewportWidth));

    const response = await fetch("/api/convert-url-to-pdf", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let message = "URL-to-PDF conversion failed.";
        try {
            const body = await response.json();
            message = body.error || message;
        } catch {
            message = (await response.text()) || message;
        }
        throw new Error(message);
    }

    return await response.blob();
}

// ─── DOWNLOAD HELPERS ────────────────────────────────────────────────────────

export function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function downloadDataUrl(dataUrl: string, fileName: string) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

export async function downloadZip(
    items: { data: string | Blob; name: string }[],
    zipName: string
) {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const item of items) {
        if (typeof item.data === "string") {
            // data URL → strip prefix and convert to base64
            const base64 = item.data.split(",")[1];
            zip.file(item.name, base64, { base64: true });
        } else {
            zip.file(item.name, item.data);
        }
    }
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, zipName);
}

// ─── WORD → PDF ─────────────────────────────────────────────────────────────

/**
 * Convert a Word document (.doc, .docx) to PDF via the Python server.
 */
export async function wordToPdf(file: File): Promise<Blob> {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch("/api/word-to-pdf", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let message = "Conversion failed.";
        try {
            const body = await response.json();
            message = body.error || message;
        } catch {
            const text = await response.text();
            message = text || message;
        }
        throw new Error(message);
    }

    return await response.blob();
}

/**
 * Convert an Excel spreadsheet (.xls, .xlsx, .csv) to PDF via the Python server.
 */
export async function excelToPdf(file: File): Promise<Blob> {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch("/api/excel-to-pdf", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let message = "Conversion failed.";
        try {
            const body = await response.json();
            message = body.error || message;
        } catch {
            const text = await response.text();
            message = text || message;
        }
        throw new Error(message);
    }

    return await response.blob();
}

/**
 * Convert a PowerPoint presentation (.ppt, .pptx) to PDF via the Python server.
 */
export async function pptxToPdf(file: File): Promise<Blob> {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch("/api/pptx-to-pdf", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let message = "Conversion failed.";
        try {
            const body = await response.json();
            message = body.error || message;
        } catch {
            const text = await response.text();
            message = text || message;
        }
        throw new Error(message);
    }

    return await response.blob();
}

/**
 * Merge multiple PDF files into one.
 * @param files  Array of File objects (PDFs)
 */
export async function mergePdfs(files: File[]): Promise<Uint8Array> {
    const { PDFDocument } = await import("pdf-lib");
    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    return await mergedPdf.save();
}

// ─── PDF → PDF (SPLIT / EXTRACT) ──────────────────────────────────────────────

export interface PdfRange {
    start: number; // 1-indexed
    end: number;   // 1-indexed
}

/**
 * Split a PDF according to ranges.
 * @param file The original PDF file
 * @param ranges Array of {start, end} page numbers (1-indexed, inclusive)
 * @param mergeAll Whether to merge all output ranges into a single PDF
 * @returns Array of Uint8Array (one per range) or a single Uint8Array if mergeAll is true
 */
export async function splitPdf(file: File, ranges: PdfRange[], mergeAll: boolean = false): Promise<Uint8Array | Uint8Array[]> {
    const { PDFDocument } = await import("pdf-lib");
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const totalPages = pdf.getPageCount();

    if (mergeAll) {
        const mergedPdf = await PDFDocument.create();
        for (const range of ranges) {
            const start = Math.max(1, range.start) - 1;
            const end = Math.min(totalPages, range.end) - 1;
            if (start > end) continue;

            const indices = [];
            for (let i = start; i <= end; i++) indices.push(i);

            const copiedPages = await mergedPdf.copyPages(pdf, indices);
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }
        return await mergedPdf.save();
    } else {
        const pdfs = [];
        for (const range of ranges) {
            const newPdf = await PDFDocument.create();
            const start = Math.max(1, range.start) - 1;
            const end = Math.min(totalPages, range.end) - 1;
            if (start > end) continue;

            const indices = [];
            for (let i = start; i <= end; i++) indices.push(i);

            const copiedPages = await newPdf.copyPages(pdf, indices);
            copiedPages.forEach((page) => newPdf.addPage(page));
            pdfs.push(await newPdf.save());
        }
        return pdfs;
    }
}

// ─── COMPRESS PDF ─────────────────────────────────────────────────────────────

export type CompressQuality = "high" | "medium" | "low";

export interface CompressResult {
    blob: Blob;
    originalSize: number;
    compressedSize: number;
    filename: string;
}

/**
 * Compress a PDF via the Python microservice.
 * @param file     The source PDF file
 * @param quality  'high' | 'medium' | 'low'
 */
export async function compressPdf(file: File, quality: CompressQuality = "medium"): Promise<CompressResult> {
    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("quality", quality);

    const response = await fetch("/api/compress-pdf", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let message = "Compression failed.";
        try {
            const body = await response.json();
            message = body.error || message;
        } catch {
            message = (await response.text()) || message;
        }
        throw new Error(message);
    }

    const blob = await response.blob();
    const originalSize = parseInt(response.headers.get("X-Original-Size") || "0", 10);
    const compressedSize = parseInt(response.headers.get("X-Compressed-Size") || "0", 10);
    const filename =
        response.headers.get("X-Original-Filename") ||
        file.name.replace(/\.pdf$/i, "-compressed.pdf");

    return { blob, originalSize, compressedSize, filename };
}

// ─── REPAIR PDF ───────────────────────────────────────────────────────────────

export interface RepairResult {
    blob: Blob;
    filename: string;
}

/**
 * Repair a damaged PDF via the Python microservice.
 * @param file The source PDF file
 */
export async function repairPdf(file: File): Promise<RepairResult> {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch("/api/repair-pdf", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let message = "Repair failed.";
        try {
            const body = await response.json();
            message = body.error || message;
        } catch {
            message = (await response.text()) || message;
        }
        throw new Error(message);
    }

    const blob = await response.blob();
    const filename =
        response.headers.get("X-Original-Filename") ||
        file.name.replace(/\.pdf$/i, "-repaired.pdf");

    return { blob, filename };
}

// ─── PROTECT PDF ───────────────────────────────────────────────────────────────

export interface ProtectResult {
    blob: Blob;
    filename: string;
}

/**
 * Protect a PDF with a password via the Python microservice.
 * @param file The source PDF file
 * @param password The password to encrypt the PDF with
 */
export async function protectPdf(file: File, password: string): Promise<ProtectResult> {
    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("password", password);

    const response = await fetch("/api/protect-pdf", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let message = "Protection failed.";
        try {
            const body = await response.json();
            message = body.error || message;
        } catch {
            message = (await response.text()) || message;
        }
        throw new Error(message);
    }

    const blob = await response.blob();
    const filename =
        response.headers.get("X-Original-Filename") ||
        file.name.replace(/\.pdf$/i, "-protected.pdf");

    return { blob, filename };
}

// ─── UNLOCK PDF ───────────────────────────────────────────────────────────────

export interface UnlockResult {
    blob: Blob;
    filename: string;
}

/**
 * Unlock a password-protected PDF via the Python microservice.
 * @param file The source PDF file
 * @param password The password to decrypt the PDF with
 */
export async function unlockPdf(file: File, password: string): Promise<UnlockResult> {
    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("password", password);

    const response = await fetch("/api/unlock-pdf", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let message = "Unlock failed.";
        try {
            const body = await response.json();
            message = body.error || message;
        } catch {
            message = (await response.text()) || message;
        }
        throw new Error(message);
    }

    const blob = await response.blob();
    const filename =
        response.headers.get("X-Original-Filename") ||
        file.name.replace(/\.pdf$/i, "-unlocked.pdf");

    return { blob, filename };
}


// ─── OCR PDF ──────────────────────────────────────────────────────────────────

export interface OcrResult {
    blob: Blob;
    filename: string;
    alreadyHadText: boolean;
}

/**
 * Run OCR on a scanned / image-only PDF via the Python microservice.
 * Returns a searchable PDF with invisible selectable text overlaid on the original images.
 *
 * @param file     The source PDF file
 * @param language Tesseract language code(s), e.g. "eng", "eng+fra"
 * @param force    Re-OCR even if the file already has selectable text
 */
export async function ocrPdf(
    file: File,
    language = "eng",
    force = false
): Promise<OcrResult> {
    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("language", language);
    formData.append("force", force ? "true" : "false");

    const response = await fetch("/api/ocr-pdf", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let message = "OCR failed.";
        try {
            const body = await response.json();
            message = body.error || message;
        } catch {
            message = (await response.text()) || message;
        }
        throw new Error(message);
    }

    const blob = await response.blob();
    const filename =
        response.headers.get("X-Original-Filename") ||
        file.name.replace(/\.pdf$/i, "-searchable.pdf");
    const alreadyHadText = response.headers.get("X-Already-Had-Text") === "true";

    return { blob, filename, alreadyHadText };
}
