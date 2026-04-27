"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconFileCheck } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function RepairPdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        const file = newFiles[0];
        setFiles([file]);
        FileStore.clearFile("repair_pdf_main");
        FileStore.setFile("repair_pdf_main", file);
        router.push("/repair-pdf/convert");
    };
    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Is your PDF refusing to open? PDF Maya’s Repair PDF tool is designed to fix corrupted PDF files caused by transmission errors or incomplete downloads. Recover your important data with our advanced PDF repair online service.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span><strong>Corruption Recovery:</strong> Fix headers, cross-reference tables, and stream errors.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span><strong>Data Retrieval:</strong> Salvage text and images from damaged documents.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span><strong>Easy Upload:</strong> Simply upload the broken file and let our engine do the work.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span><strong>No Installation:</strong> Repair PDF online without needing complex desktop software.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span>Recover files that won't open in Adobe Reader or other viewers.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span>Fix documents interrupted during download or transfer.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span>Restore access to critical contracts or reports.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Don’t lose your data. Use our PDF corrector to get your files working again.
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="Repair PDF - Fix Corrupted Files and Open Damaged Documents"
            description={descriptionContent}
            icon={<IconFileCheck size={28} stroke={1.5} />}
            accentColor="#047C58"
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
