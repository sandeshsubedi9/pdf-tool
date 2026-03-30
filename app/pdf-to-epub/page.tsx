"use client";
import React, { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import {
    IconBook,
    IconLoader2,
    IconCheck,
    IconBooks,
} from "@tabler/icons-react";
import { pdfToEpub, downloadBlob } from "@/lib/pdf-utils";
import toast from "react-hot-toast";
import { useRateLimitedAction } from "@/lib/use-rate-limited-action";
import { RateLimitModal } from "@/components/RateLimitModal";

// EPUB brand color — a warm purple-indigo evoking reading/books
const EPUB_COLOR = "#5B4FCF";

export default function PdfToEpubPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const { execute, limitResult, clearLimitResult } = useRateLimitedAction();

    const handleConvert = () => execute(async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setSuccess(false);

        const toastId = toast.loading("Converting PDF to EPUB…");

        try {
            const blob = await pdfToEpub(files[0]);
            const newName = files[0].name.replace(/\.pdf$/i, ".epub");
            downloadBlob(blob, newName);
            setSuccess(true);
            toast.success("Conversion successful!", { id: toastId });
        } catch (err: any) {
            console.error(err);
            const isDev = process.env.NODE_ENV === "development";
            const rawMsg = err?.message || "Unknown error";

            if (rawMsg.includes("not running") || rawMsg.includes("fetch") || rawMsg.includes("service")) {
                const devError = `Local Debug: Python service is offline. (${rawMsg})`;
                const prodError = "Conversion service is currently unavailable. Please try again later.";
                toast.error(isDev ? devError : prodError, { id: toastId, duration: 5000 });
            } else {
                toast.error(isDev ? `Error: ${rawMsg}` : "An error occurred during conversion.", { id: toastId });
            }
        } finally {
            setIsProcessing(false);
        }
    });

    return (
        <ToolLayout
            title="Convert PDF to EPUB"
            description="Transform your PDF documents into reflowable EPUB e-books, perfectly formatted for e-readers like Kindle, Kobo, and Apple Books."
            icon={<IconBook size={28} stroke={1.5} />}
            accentColor={EPUB_COLOR}
        >
            <RateLimitModal
                open={!!limitResult && !limitResult.allowed}
                resetAt={limitResult?.resetAt ?? 0}
                onClose={clearLimitResult}
            />
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-border">
                {!success ? (
                    <>
                        <FileUpload
                            accept={{ "application/pdf": [".pdf"] }}
                            multiple={false}
                            files={files}
                            setFiles={setFiles}
                        />

                        <button
                            onClick={handleConvert}
                            disabled={files.length === 0 || isProcessing}
                            className={`w-full mt-6 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-md active:scale-[0.98] ${files.length === 0
                                ? "cursor-not-allowed shadow-none"
                                : isProcessing
                                    ? "opacity-50 cursor-wait"
                                    : "hover:opacity-90 cursor-pointer"
                                }`}
                            style={{
                                backgroundColor: files.length === 0 ? `${EPUB_COLOR}30` : EPUB_COLOR,
                            }}
                        >
                            {isProcessing && <IconLoader2 className="animate-spin" size={20} />}
                            {isProcessing
                                ? "Building EPUB… this may take a moment"
                                : "Convert to EPUB"}
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in duration-300">
                        <span
                            className="flex items-center justify-center w-16 h-16 rounded-full mb-4"
                            style={{ background: `${EPUB_COLOR}25`, color: EPUB_COLOR }}
                        >
                            <IconCheck size={32} stroke={2} />
                        </span>
                        <h2 className="text-xl font-bold text-brand-dark">Conversion Complete!</h2>
                        <p className="text-brand-sage mt-2">
                            Your EPUB e-book is downloading now.
                        </p>
                        <p className="text-xs text-brand-sage/70 mt-1">
                            Open it with Calibre, Apple Books, Kobo, or any EPUB reader.
                        </p>
                        <button
                            onClick={() => {
                                setFiles([]);
                                setSuccess(false);
                            }}
                            className="mt-6 px-8 py-3 rounded-xl bg-white text-black font-medium hover:bg-slate-50 transition-all cursor-pointer shadow-md"
                        >
                            Convert another file
                        </button>
                    </div>
                )}
            </div>
        </ToolLayout>
    );
}
