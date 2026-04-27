"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconLayersSubtract } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function CompressPdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        const file = newFiles[0];
        setFiles([file]);
        FileStore.clearFile("compress_pdf_main");
        FileStore.setFile("compress_pdf_main", file);
        router.push("/compress-pdf/convert");
    };
    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Large files clog inboxes and fail upload limits. PDF Maya’s Compress PDF tool helps you reduce PDF file size significantly while maintaining readability. Whether you need to compress PDF to 1MB or smaller, our optimizer ensures your documents are email-ready.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                    <span><strong>High Compression:</strong> Shrink files by optimizing images and removing redundant data.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                    <span><strong>Quality Control:</strong> Choose between "Extreme," "Recommended," or "Low" compression levels.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                    <span><strong>Fast Processing:</strong> Compress large PDF files in seconds directly in your browser.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                    <span><strong>Safe & Secure:</strong> Files are processed securely and deleted automatically.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                    <span>Email attachments: Make sure your PDF fits within strict size limits (e.g., 10MB or 5MB).</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                    <span>Web Uploads: Reduce size for job portals, government sites, or form submissions.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                    <span>Storage Savings: Free up space on your device or cloud drive.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Learn how to make a PDF smaller without sacrificing quality with PDF Maya.
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="Compress PDF - Reduce File Size Without Losing Quality"
            description={descriptionContent}
            icon={<IconLayersSubtract size={28} stroke={1.5} />}
            accentColor="#7C3AED"
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
