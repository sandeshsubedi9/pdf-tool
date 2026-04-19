"use client";
import React, { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import {
    IconTable,
    IconLoader2,
    IconCheck,
} from "@tabler/icons-react";
import { pdfToExcel, downloadBlob } from "@/lib/pdf-utils";
import toast from "react-hot-toast";
export default function PdfToExcelPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleConvert = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setSuccess(false);

        const toastId = toast.loading("Converting PDF to Excel...");

        try {
            const blob = await pdfToExcel(files[0]);
            const newName = files[0].name.replace(/\.pdf$/i, ".xlsx");
            downloadBlob(blob, newName);
            setSuccess(true);
            toast.success("Conversion successful!", { id: toastId });
        } catch (err: any) {
            const isDev = process.env.NODE_ENV === "development";
            if (isDev) console.error(err);

            const rawMsg = err?.message || "Unknown error";

            if (rawMsg.includes("not running") || rawMsg.includes("fetch")) {
                const devError = `Local Debug: Python service is offline. (${rawMsg})`;
                const prodError = "Extraction service is currently unavailable. Please try again later.";
                toast.error(isDev ? devError : prodError, { id: toastId, duration: 5000 });
            } else {
                toast.error(isDev ? `Error: ${rawMsg}` : "An error occurred during extraction.", { id: toastId });
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Extract data from PDFs effortlessly with SandeshPDF’s PDF to Excel tool. Perfect for financial reports and data analysis, our PDF to XLSX converter turns static tables into editable spreadsheets.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1D6F42]" />
                    <span><strong>Data Extraction:</strong> Accurately pull tables and rows from PDF to Excel.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1D6F42]" />
                    <span><strong>Editable Cells:</strong> Sort, filter, and calculate data immediately after conversion.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1D6F42]" />
                    <span><strong>Format Retention:</strong> Keep column structures and number formats consistent.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1D6F42]" />
                    <span><strong>Time-Saver:</strong> Avoid manual data entry from printed reports.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1D6F42]" />
                    <span>Analyze financial statements: Convert bank statements or invoices to Excel.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1D6F42]" />
                    <span>Process survey results: Extract data tables for statistical analysis.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1D6F42]" />
                    <span>Migrate data: Move legacy PDF data into modern spreadsheet systems.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Transform your data with the best PDF to Excel converter free tool available.
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="PDF to Excel - Extract Tables and Data into Spreadsheets"
            description={descriptionContent}
            icon={<IconTable size={28} stroke={1.5} />}
            accentColor="#1D6F42"
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
                                ? "bg-[#1D6F42]/30 cursor-not-allowed shadow-none"
                                : isProcessing
                                    ? "bg-[#1D6F42] opacity-50 cursor-wait"
                                    : "bg-[#1D6F42] hover:bg-[#175c37] cursor-pointer"
                                }`}
                        >
                            {isProcessing && <IconLoader2 className="animate-spin" size={20} />}
                            {isProcessing ? "Converting… this may take a moment" : "Convert to Excel"}
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in duration-300">
                        <span className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                            <IconCheck size={32} stroke={2} />
                        </span>
                        <h2 className="text-xl font-bold text-brand-dark">Conversion Complete!</h2>
                        <p className="text-brand-sage mt-2">Your Excel spreadsheet is downloading.</p>
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

