"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconScan } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function OcrPdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        const file = newFiles[0];
        setFiles([file]);
        FileStore.clearFile("ocr_pdf_main");
        FileStore.setFile("ocr_pdf_main", file);
        router.push("/ocr-pdf/convert");
    };
    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Turn static scans into searchable, editable documents with PDF Maya’s OCR PDF tool. Our Optical Character Recognition (OCR) technology recognizes text in images, allowing you to edit scanned PDFs and copy content instantly.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#d97706]" />
                    <span><strong>Text Recognition:</strong> Convert image-based PDFs into selectable and editable text.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#d97706]" />
                    <span><strong>Searchable Files:</strong> Make scanned documents searchable by keyword.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#d97706]" />
                    <span><strong>Multi-Language Support:</strong> Recognize text in various languages accurately.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#d97706]" />
                    <span><strong>High Accuracy:</strong> Advanced algorithms ensure minimal errors in conversion.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#d97706]" />
                    <span>Digitize old records: Turn paper archives into editable digital files.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#d97706]" />
                    <span>Edit scanned contracts: Update dates or names without re-typing everything.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#d97706]" />
                    <span>Copy text from images: Extract data from screenshots or photos of documents.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Make your documents smart with our free OCR PDF to Word capable tool.
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="OCR PDF - Convert Scanned Images into Editable Text"
            description={descriptionContent}
            icon={<IconScan size={28} stroke={1.5} />}
            accentColor="#d97706"
        >
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-border">
                <FileUpload
                    accept={{ "application/pdf": [".pdf"] }}
                    multiple={false}
                    files={files}
                    setFiles={setFiles}
                    onChange={handleFileSelection}
                />
            </div>
        </ToolLayout>
    );
}
