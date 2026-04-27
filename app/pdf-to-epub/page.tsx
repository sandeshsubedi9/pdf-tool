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
// EPUB brand color — a warm purple-indigo evoking reading/books
const EPUB_COLOR = "#5B4FCF";

export default function PdfToEpubPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleConvert = async () => {
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
    };

    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Reading PDFs on small screens can be tough. PDF Maya’s PDF to ePub tool converts your documents into reflowable ePub format, perfect for Kindles, iPads, and other e-readers.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#5B4FCF]" />
                    <span><strong>Reflowable Text:</strong> Adjusts text size and layout for any screen size.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#5B4FCF]" />
                    <span><strong>E-Reader Compatible:</strong> Works seamlessly with Kindle, Apple Books, and Kobo.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#5B4FCF]" />
                    <span><strong>Chapter Detection:</strong> Preserves document structure for easy navigation.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#5B4FCF]" />
                    <span><strong>Portable Format:</strong> Create lightweight files for mobile reading.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#5B4FCF]" />
                    <span>Read on the go: Convert manuals or books for mobile devices.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#5B4FCF]" />
                    <span>Self-Publishing: Prepare drafts for e-book distribution.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#5B4FCF]" />
                    <span>Accessibility: Improve readability for users with visual impairments.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Enjoy reading anywhere with our PDF to ePub converter.
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="PDF to ePub - Convert Documents for E-Readers"
            description={descriptionContent}
            icon={<IconBook size={28} stroke={1.5} />}
            accentColor={EPUB_COLOR}
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

