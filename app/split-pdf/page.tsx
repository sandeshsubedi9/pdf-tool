"use client";
import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconScissors, IconCrop } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

function SplitPdfContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode") as "split" | "extract" | null;
    const isExtract = mode === "extract";
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;

        // Split PDF operates on a single file, so we take the first
        const file = newFiles[0];
        setFiles([file]);

        // Clear any previous staged file
        FileStore.clearFile("split_pdf_main");

        // Store current split target
        FileStore.setFile("split_pdf_main", file);

        // Immediately route to convert page
        router.push(isExtract ? "/split-pdf/convert?mode=extract" : "/split-pdf/convert");
    };

    const splitDescription = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Need to share only specific sections of a large file? PDF Maya’s Split PDF tool lets you extract pages from PDF documents or split a large file into multiple smaller ones instantly. It’s the fastest way to divide PDF files without losing quality.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#F97316]" />
                    <span><strong>Split by Range:</strong> Select exact page ranges to create new, standalone files.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#F97316]" />
                    <span><strong>Extract Specific Pages:</strong> Select specific pages to pull them out into independent documents.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#F97316]" />
                    <span><strong>Fast & Free:</strong> Split PDF online for free directly in your browser.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#F97316]" />
                    <span>Send only relevant chapters of a manual to a specific team member.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#F97316]" />
                    <span>Extract a single invoice from a monthly statement batch.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#F97316]" />
                    <span>Separate personal data from a shared document before distribution.</span>
                </li>
            </ul>
        </div>
    );

    const extractDescription = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                PDF Maya’s Extract Pages tool is designed to help you pull pages from PDF documents to create new, independent files. Instead of splitting the whole document, simply select the pages you need and extract them instantly.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#F97316]" />
                    <span><strong>Create New Files:</strong> Turn selected pages into a brand-new PDF document.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#F97316]" />
                    <span><strong>Custom Selection:</strong> Pick individual pages or continuous ranges effortlessly.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#F97316]" />
                    <span><strong>Maintain Formatting:</strong> Images, text, and layouts remain exactly as they were in the original.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#F97316]" />
                    <span><strong>Quick Download:</strong> Get your extracted file ready for download in seconds.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#F97316]" />
                    <span>Extract the summary page of a long report for executive review.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#F97316]" />
                    Pull specific contract clauses to share with legal teams.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#F97316]" />
                    Save key slides from a presentation deck as a handout.
                </li>
            </ul>
        </div>
    );

    return (
        <ToolLayout
            title={isExtract ? "Extract Pages - Pull Specific Sections into New Files" : "Split PDF - Extract Pages and Divide Large Documents Easily"}
            description={isExtract ? extractDescription : splitDescription}
            icon={isExtract ? <IconCrop size={28} stroke={1.5} /> : <IconScissors size={28} stroke={1.5} />}
            accentColor="#F97316"
        >
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-border">
                <FileUpload
                    accept={{ "application/pdf": [".pdf"] }}
                    files={files}
                    setFiles={setFiles}
                    onChange={handleFileSelection}
                />
            </div>
        </ToolLayout>
    );
}

export default function SplitPdfPage() {
    return (
        <Suspense fallback={<div className="min-h-screen"></div>}>
            <SplitPdfContent />
        </Suspense>
    );
}
