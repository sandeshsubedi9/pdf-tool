"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconListNumbers } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function PageNumberPdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        setFiles(newFiles);
        FileStore.clearFile("pagenumber_0");
        FileStore.setFile("pagenumber_0", newFiles[0]);
        router.push("/page-number-pdf/number");
    };

    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Professional documents need page numbers. SandeshPDF’s Page Numbers tool allows you to add page numbers to PDF files automatically, with customizable position and formatting.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#059669]" />
                    <span><strong>Auto-Numbering:</strong> Sequentially number all pages or specific ranges.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#059669]" />
                    <span><strong>Custom Position:</strong> Place numbers in headers, footers, corners, or center.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#059669]" />
                    <span><strong>Formatting Options:</strong> Choose styles like "1, 2, 3" or "i, ii, iii".</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#059669]" />
                    <span><strong>Prefix/Suffix:</strong> Add text like "Page 1 of 10" easily.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#059669]" />
                    <span>Reports & Manuals: Ensure easy navigation in long documents.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#059669]" />
                    <span>Legal Filings: Meet court requirements for numbered pages.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#059669]" />
                    <span>Books & Ebooks: Provide readers with clear location markers.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Add professionalism to your docs with our PDF page numberer.
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="Page Numbers - Add Automatic Numbering to Your PDF"
            description={descriptionContent}
            icon={<IconListNumbers size={28} stroke={1.5} />}
            accentColor="#059669"
        >
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-border">
                <FileUpload
                    multiple={false}
                    accept={{ "application/pdf": [".pdf"] }}
                    files={files}
                    setFiles={setFiles}
                    onChange={handleFileSelection}
                />
            </div>
        </ToolLayout>
    );
}
