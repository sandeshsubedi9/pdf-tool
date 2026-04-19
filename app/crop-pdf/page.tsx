"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconCrop } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function CropPdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        const file = newFiles[0];
        setFiles([file]);
        FileStore.clearFile("crop_pdf_main");
        FileStore.setFile("crop_pdf_main", file);
        router.push("/crop-pdf/crop");
    };

    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Focus on the content that matters with SandeshPDF’s Crop PDF tool. Remove white space, margins, or unwanted sections from your PDF pages to create cleaner, more professional documents.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1a1a2e]" />
                    <span><strong>Custom Cropping:</strong> Define exact crop areas for each page.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1a1a2e]" />
                    <span><strong>Margin Removal:</strong> Eliminate excessive white space to save paper and ink.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1a1a2e]" />
                    <span><strong>Content Focus:</strong> Highlight specific sections by cropping out distractions.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1a1a2e]" />
                    <span><strong>Batch Apply:</strong> Apply the same crop settings to all pages.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1a1a2e]" />
                    <span>Presentation Slides: Remove speaker notes or margins for projection.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1a1a2e]" />
                    <span>Forms: Trim borders for a tighter fit in folders.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1a1a2e]" />
                    <span>Images: Clean up scanned documents with messy edges.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Refine your layout with our PDF cropper tool.
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="Crop PDF - Trim Margins and Remove Unwanted Areas"
            description={descriptionContent}
            icon={<IconCrop size={28} stroke={1.5} />}
            accentColor="#1a1a2e"
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
