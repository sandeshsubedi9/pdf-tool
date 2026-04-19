"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconSearch } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function SearchPdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        const file = newFiles[0];
        setFiles([file]);
        FileStore.setFile("search_pdf_file", file);
        router.push("/search-pdf/search");
    };

    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Instantly find any word or phrase inside your PDF. SandeshPDF's Search PDF tool
                renders every page and highlights every match so you can navigate large documents
                in seconds — no download, no account required.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features &amp; Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#0369a1]" />
                    <span><strong>Instant Highlighting:</strong> Every match is highlighted in bright yellow across all pages.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#0369a1]" />
                    <span><strong>Jump to Match:</strong> Navigate between results with ↑ ↓ arrows and auto-scroll to each hit.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#0369a1]" />
                    <span><strong>Match Counter:</strong> See exactly how many times a word appears across the document.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#0369a1]" />
                    <span><strong>100% Private:</strong> Your PDF never leaves the browser — all processing is client-side.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#0369a1]" />
                    <span>Research &amp; Reports: Quickly locate citations, keywords, or section headings.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#0369a1]" />
                    <span>Legal Documents: Find specific clauses or references in long contracts.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#0369a1]" />
                    <span>Scanned PDFs with OCR text layer: Search through digitized books and invoices.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Upload your PDF and start searching in under a second with SandeshPDF.
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="Search PDF - Find Any Word or Phrase Instantly"
            description={descriptionContent}
            icon={<IconSearch size={28} stroke={1.5} />}
            accentColor="#0369a1"
        >
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-border">
                <FileUpload
                    accept={{ "application/pdf": [".pdf"] }}
                    multiple={false}
                    files={files}
                    setFiles={(f) => {
                        const fileArray = f as File[];
                        setFiles(fileArray);
                        if (fileArray.length > 0) {
                            handleFileSelection(fileArray);
                        }
                    }}
                    onChange={handleFileSelection}
                />
            </div>
        </ToolLayout>
    );
}
