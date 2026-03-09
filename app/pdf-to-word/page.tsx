"use client";
import React, { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconFileWord, IconLoader2, IconCheck } from "@tabler/icons-react";
import { pdfToDocx, downloadBlob } from "@/lib/pdf-utils";
import toast from "react-hot-toast";

export default function PdfToWordPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleConvert = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setSuccess(false);

        const toastId = toast.loading("Converting PDF to Word...");

        try {
            const docxBlob = await pdfToDocx(files[0]);
            const newName = files[0].name.replace(/\.pdf$/i, ".docx");
            downloadBlob(docxBlob, newName);
            setSuccess(true);
            toast.success("Conversion successful!", { id: toastId });
        } catch (err: any) {
            const isDev = process.env.NODE_ENV === "development";
            if (isDev) console.error(err);

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

    return (
        <ToolLayout
            title="Convert PDF to Word"
            description="Convert your PDF into a fully editable Word document (.docx). Preserving layout, tables, images, and fonts."
            icon={<IconFileWord size={28} stroke={1.5} />}
            accentColor="#1A56DB"
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
                                ? "bg-[#1A56DB]/30 cursor-not-allowed shadow-none"
                                : isProcessing
                                    ? "bg-[#1A56DB] opacity-50 cursor-wait"
                                    : "bg-[#1A56DB] hover:bg-[#1546b5] cursor-pointer"
                                }`}
                        >
                            {isProcessing && <IconLoader2 className="animate-spin" size={20} />}
                            {isProcessing ? "Converting… this may take a moment" : "Convert to Word"}
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in duration-300">
                        <span className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                            <IconCheck size={32} stroke={2} />
                        </span>
                        <h2 className="text-xl font-bold text-brand-dark">Conversion Complete!</h2>
                        <p className="text-brand-sage mt-2">
                            Your Word document is downloading. Layout and formatting preserved.
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
