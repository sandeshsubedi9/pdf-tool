"use client";
import React, { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconPresentation, IconLoader2, IconCheck } from "@tabler/icons-react";
import { pptxToPdf, downloadBlob } from "@/lib/pdf-utils";
import toast from "react-hot-toast";
import { useRateLimitedAction } from "@/lib/use-rate-limited-action";
import { RateLimitModal } from "@/components/RateLimitModal";

export default function PptxToPdfPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const { execute, limitResult, clearLimitResult } = useRateLimitedAction();

    const handleConvert = () => execute(async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setSuccess(false);

        const toastId = toast.loading("Converting PowerPoint to PDF...");

        try {
            const pdfBlob = await pptxToPdf(files[0]);
            const newName = files[0].name.replace(/\.[^/.]+$/, ".pdf");
            downloadBlob(pdfBlob, newName);
            setSuccess(true);
            toast.success("Conversion successful!", { id: toastId });
        } catch (err: any) {
            const isDev = process.env.NODE_ENV === "development";
            if (isDev) console.error(err);

            const rawMsg = err?.message || "Unknown error";

            if (rawMsg.includes("fetch") || rawMsg.includes("ECONNREFUSED") || rawMsg.includes("fetch failed")) {
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

    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Share your slides without compatibility issues using SandeshPDF’s PowerPoint to PDF tool. Convert PPTX files into universal PDFs that preserve animations as static slides and maintain design integrity.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#C05621]" />
                    <span><strong>Design Preservation:</strong> Keep fonts, colors, and layouts intact.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#C05621]" />
                    <span><strong>Universal Viewing:</strong> Recipients don’t need PowerPoint to view your slides.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#C05621]" />
                    <span><strong>File Size Reduction:</strong> Often creates smaller files than the original PPT.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#C05621]" />
                    <span><strong>Secure Distribution:</strong> Prevent unauthorized editing of your presentation.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#C05621]" />
                    <span>Handouts: Distribute slide decks for meetings or conferences.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#C05621]" />
                    <span>Portfolios: Showcase design work in a stable format.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#C05621]" />
                    <span>Archiving: Save final versions of presentations for records.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Make your presentations portable with our PowerPoint to PDF converter.
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="PowerPoint to PDF - Convert Presentations to Shareable Files"
            description={descriptionContent}
            icon={<IconPresentation size={28} stroke={1.5} />}
            accentColor="#C05621"
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
                            accept={{
                                "application/vnd.ms-powerpoint": [".ppt"],
                                "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"]
                            }}
                            multiple={false}
                            files={files}
                            setFiles={setFiles}
                        />

                        <button
                            onClick={handleConvert}
                            disabled={files.length === 0 || isProcessing}
                            className={`w-full mt-6 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-md active:scale-[0.98] ${files.length === 0
                                ? "bg-[#C05621]/30 cursor-not-allowed shadow-none"
                                : isProcessing
                                    ? "bg-[#C05621] opacity-50 cursor-wait"
                                    : "bg-[#C05621] hover:bg-[#9c421a] cursor-pointer"
                                }`}
                        >
                            {isProcessing && <IconLoader2 className="animate-spin" size={20} />}
                            {isProcessing ? "Converting… this may take a moment" : "Convert to PDF"}
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in duration-300">
                        <span className="flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 text-orange-600 mb-4">
                            <IconCheck size={32} stroke={2} />
                        </span>
                        <h2 className="text-xl font-bold text-brand-dark">Conversion Complete!</h2>
                        <p className="text-brand-sage mt-2">
                            Your PDF document is downloading.
                        </p>
                        <button
                            onClick={() => {
                                setFiles([]);
                                setSuccess(false);
                            }}
                            className="mt-6 px-8 py-3 rounded-xl bg-white text-black font-medium hover:bg-slate-50 transition-all cursor-pointer shadow-md border"
                        >
                            Convert another file
                        </button>
                    </div>
                )}
            </div>
        </ToolLayout>
    );
}

