"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconArrowsJoin2 } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function MergePdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        setFiles(newFiles);

        // Clear any previous stored pdfs first
        for (let i = 0; i < 200; i++) FileStore.clearFile(`pdf_${i}`);

        // Store all initial files with indexed keys
        newFiles.forEach((f, i) => FileStore.setFile(`pdf_${i}`, f));

        // Immediately route to convert page
        router.push("/merge-pdf/convert");
    };

    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                PDF Maya’s Merge PDF tool allows you to combine PDF files from different sources into a single, organized document. Whether you are compiling a report, merging invoices, or creating a complete application package, our online PDF merger makes it easy to join documents in seconds.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span><strong>Combine PDFs Online:</strong> Drag and drop multiple files to merge PDF documents in your desired order.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span><strong>Reorder Pages:</strong> Arrange files before merging to ensure the final document flows logically.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span><strong>Handle Large Files:</strong> Merge large reports or hundreds of pages easily.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span><strong>Secure Processing:</strong> Your files are encrypted during the merge process and deleted immediately after.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span>Combine contracts and annexures into one file for client submission.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span>Merge scanned receipts or forms into a single archive for record-keeping.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span>Join chapters of an ebook or manual into a complete volume.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Stop emailing separate attachments. Use PDF Maya to combine two PDFs or more into one professional file today.
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="Merge PDF - Combine Multiple Files into One Document Instantly"
            description={descriptionContent}
            icon={<IconArrowsJoin2 size={28} stroke={1.5} />}
            accentColor="#047C58"
        >
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-border">
                <FileUpload
                    multiple
                    accept={{ "application/pdf": [".pdf"] }}
                    files={files}
                    setFiles={setFiles}
                    onChange={handleFileSelection}
                />
            </div>
        </ToolLayout>
    );
}
