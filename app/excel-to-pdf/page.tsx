"use client";
import React, { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconTable, IconLoader2, IconCheck } from "@tabler/icons-react";
import { excelToPdf, downloadBlob } from "@/lib/pdf-utils";
import toast from "react-hot-toast";
import { useRateLimitedAction } from "@/lib/use-rate-limited-action";
import { RateLimitModal } from "@/components/RateLimitModal";

export default function ExcelToPdfPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const { execute, limitResult, clearLimitResult } = useRateLimitedAction();

    const handleConvert = () => execute(async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setSuccess(false);

        const toastId = toast.loading("Converting Excel to PDF...");

        try {
            const pdfBlob = await excelToPdf(files[0]);
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

    return (
        <ToolLayout
            title="Convert Excel to PDF"
            description="Turn spreadsheets into polished PDF files for easy viewing and sharing."
            icon={<IconTable size={28} stroke={1.5} />}
            accentColor="#047C58"
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
                            accept={{
                                "application/vnd.ms-excel": [".xls"],
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
                                "text/csv": [".csv"]
                            }}
                            multiple={false}
                            files={files}
                            setFiles={setFiles}
                        />

                        <button
                            onClick={handleConvert}
                            disabled={files.length === 0 || isProcessing}
                            className={`w-full mt-6 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-md active:scale-[0.98] ${files.length === 0
                                ? "bg-[#047C58]/30 cursor-not-allowed shadow-none"
                                : isProcessing
                                    ? "bg-[#047C58] opacity-50 cursor-wait"
                                    : "bg-[#047C58] hover:bg-[#036649] cursor-pointer"
                                }`}
                        >
                            {isProcessing && <IconLoader2 className="animate-spin" size={20} />}
                            {isProcessing ? "Converting… this may take a moment" : "Convert to PDF"}
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in duration-300">
                        <span className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
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
