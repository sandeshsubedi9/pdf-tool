"use client";
import React, { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import {
    IconPresentation,
    IconLoader2,
    IconCheck,
} from "@tabler/icons-react";
import { pdfToPptx, downloadBlob } from "@/lib/pdf-utils";
import toast from "react-hot-toast";
export default function PdfToPptxPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleConvert = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setSuccess(false);

        const toastId = toast.loading("Converting PDF to PowerPoint...");

        try {
            const blob = await pdfToPptx(files[0]);
            const newName = files[0].name.replace(/\.pdf$/i, ".pptx");
            downloadBlob(blob, newName);
            setSuccess(true);
            toast.success("Conversion successful!", { id: toastId });
        } catch (err: any) {
            console.error(err);
            const isDev = process.env.NODE_ENV === "development";
            if (isDev) console.error("DEBUG:", err);

            const rawMsg = err?.message || "Unknown error";

            if (rawMsg.includes("not running") || rawMsg.includes("fetch")) {
                const devError = `Local Debug: Python service is offline. (${rawMsg})`;
                const prodError = "Conversion service is currently unavailable. Please try again later.";
                toast.error(isDev ? devError : prodError, { id: toastId, duration: 5000 });
            } else {
                toast.error(isDev ? `Error: ${rawMsg}` : "An error occurred during conversion.", { id: toastId });
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Revitalize your presentations with SandeshPDF’s PDF to PowerPoint tool. Convert static PDF slides into editable PPTX files, allowing you to update content, add animations, and customize designs.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#C43E1C]" />
                    <span><strong>Slide Conversion:</strong> Turn PDF pages into individual, editable PowerPoint slides.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#C43E1C]" />
                    <span><strong>Layout Preservation:</strong> Maintain original text boxes, images, and backgrounds.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#C43E1C]" />
                    <span><strong>Editable Elements:</strong> Modify text, move images, and change themes easily.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#C43E1C]" />
                    <span><strong>Quick Workflow:</strong> Convert PDF to PPT in seconds for immediate use.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#C43E1C]" />
                    <span>Update old decks: Refresh past presentations with new data.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#C43E1C]" />
                    <span>Reuse content: Extract slides from a PDF report for a meeting.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#C43E1C]" />
                    <span>Customize designs: Add branding or animations to existing slide content.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Bring your slides to life with our PDF to PowerPoint converter online.
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="PDF to PowerPoint - Convert PDFs to Editable Presentations"
            description={descriptionContent}
            icon={<IconPresentation size={28} stroke={1.5} />}
            accentColor="#C43E1C" // PowerPoint orange
        >
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
                                ? "bg-[#C43E1C]/30 cursor-not-allowed shadow-none"
                                : isProcessing
                                    ? "bg-[#C43E1C] opacity-50 cursor-wait"
                                    : "bg-[#C43E1C] hover:bg-[#a63417] cursor-pointer"
                                }`}
                        >
                            {isProcessing && <IconLoader2 className="animate-spin" size={20} />}
                            {isProcessing ? "Creating Presentation… this may take a moment" : "Convert to PowerPoint"}
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in duration-300">
                        <span className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                            <IconCheck size={32} stroke={2} />
                        </span>
                        <h2 className="text-xl font-bold text-brand-dark">Conversion Complete!</h2>
                        <p className="text-brand-sage mt-2">Your PowerPoint presentation is downloading.</p>
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

