"use client";
import React, { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconFileCode, IconLoader2, IconCheck } from "@tabler/icons-react";
import { pdfToTxt, downloadBlob } from "@/lib/pdf-utils";
import toast from "react-hot-toast";

export default function PdfToTxtPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleConvert = async () => {
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
    };

    return (
        <ToolLayout
            title="Convert PDF to Text"
            description="Extract raw unformatted text content from your PDF documents."
            icon={<IconFileCode size={28} stroke={1.5} />}
            accentColor="#6B7280" // neutral grey
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
