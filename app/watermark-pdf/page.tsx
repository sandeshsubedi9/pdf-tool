"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconDroplet } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function WatermarkPdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        setFiles(newFiles);
        FileStore.clearFile("watermark_0");
        FileStore.setFile("watermark_0", newFiles[0]);
        router.push("/watermark-pdf/apply");
    };

    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Protect your copyright or mark documents as "Draft" with PDF Maya’s Watermark tool. Add custom text or logo watermarks to PDF files easily.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                    <span><strong>Custom Text/Images:</strong> Add "Confidential," "Draft," or your company logo.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                    <span><strong>Opacity Control:</strong> Adjust transparency so the watermark doesn't obscure content.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                    <span><strong>Positioning:</strong> Place watermarks diagonally, centered, or tiled.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                    <span><strong>Batch Apply:</strong> Watermark all pages or specific sections.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                    <span>Copyright Protection: Prevent unauthorized use of your work.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                    <span>Drafting: Mark internal documents clearly as unfinished.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                    <span>Branding: Add logos to certificates or reports.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Brand and protect your docs with our PDF watermark tool.
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="Watermark - Add Text or Image Watermarks to PDFs"
            description={descriptionContent}
            icon={<IconDroplet size={28} stroke={1.5} />}
            accentColor="#7C3AED"
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
