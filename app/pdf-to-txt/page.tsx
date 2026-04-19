"use client";
import React, { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconFileCode, IconLoader2, IconCheck } from "@tabler/icons-react";
import { pdfToTxt, downloadBlob } from "@/lib/pdf-utils";
import toast from "react-hot-toast";
import { useRateLimitedAction } from "@/lib/use-rate-limited-action";
import { RateLimitModal } from "@/components/RateLimitModal";

export default function PdfToTxtPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const { execute, limitResult, clearLimitResult } = useRateLimitedAction();

    const handleConvert = () => execute(async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setSuccess(false);

        const toastId = toast.loading("Extracting text...");

        try {
            const blob = await pdfToTxt(files[0]);
            const newName = files[0].name.replace(/\.pdf$/i, ".txt");
            downloadBlob(blob, newName);
            setSuccess(true);
            toast.success("Text extracted successfully!", { id: toastId });
        } catch (err: any) {
            const isDev = process.env.NODE_ENV === "development";
            if (isDev) console.error(err);

            const rawMsg = err?.message || "Unknown error";
            toast.error(isDev ? `Error: ${rawMsg}` : "Failed to extract text from PDF.", { id: toastId });
        } finally {
            setIsProcessing(false);
        }
    });

    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Need just the words? SandeshPDF’s PDF to Text tool strips away formatting and images to extract pure text from your PDF files. Perfect for coding, data analysis, or quick copying.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#6B7280]" />
                    <span><strong>Raw Text Extraction:</strong> Get clean .txt files without layout clutter.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#6B7280]" />
                    <span><strong>Fast Processing:</strong> Extract text from large documents instantly.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#6B7280]" />
                    <span><strong>Copy-Paste Ready:</strong> Ideal for pasting into code editors or note apps.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#6B7280]" />
                    <span><strong>Lightweight Output:</strong> Create tiny text files from heavy PDFs.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#6B7280]" />
                    <span>Data Mining: Extract content for natural language processing.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#6B7280]" />
                    <span>Coding: Pull text snippets for development projects.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#6B7280]" />
                    <span>Quick Reference: Copy terms and conditions without formatting issues.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Get the content you need with our PDF to Text converter.
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="PDF to Text - Extract Raw Text from PDF Documents"
            description={descriptionContent}
            icon={<IconFileCode size={28} stroke={1.5} />}
            accentColor="#6B7280" // neutral grey
        >
            <RateLimitModal
                open={!!limitResult && !limitResult.allowed}
                limit={limitResult?.limit} resetAt={limitResult?.resetAt ?? 0}
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
                                ? "bg-[#6B7280]/30 cursor-not-allowed shadow-none"
                                : isProcessing
                                    ? "bg-[#6B7280] opacity-50 cursor-wait"
                                    : "bg-[#6B7280] hover:bg-gray-600 cursor-pointer"
                                }`}
                        >
                            {isProcessing && <IconLoader2 className="animate-spin" size={20} />}
                            {isProcessing ? "Extracting Text..." : "Extract to TXT"}
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in duration-300">
                        <span className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                            <IconCheck size={32} stroke={2} />
                        </span>
                        <h2 className="text-xl font-bold text-brand-dark">Extraction Complete!</h2>
                        <p className="text-brand-sage mt-2">Your text file is downloading.</p>
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

