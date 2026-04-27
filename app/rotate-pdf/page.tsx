"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconRotateClockwise2 } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function RotatePdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        setFiles(newFiles);

        // Clear any previous stored files
        for (let i = 0; i < 200; i++) FileStore.clearFile(`rotate_${i}`);

        // Store all initial files with indexed keys
        newFiles.forEach((f, i) => FileStore.setFile(`rotate_${i}`, f));

        // Immediately route to the editor
        router.push("/rotate-pdf/rotate");
    };

    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Are your pages upside down or sideways? PDF Maya’s Rotate PDF tool lets you rotate PDF pages to the correct orientation in seconds. Fix scanned documents or presentation decks effortlessly.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span><strong>Flexible Rotation:</strong> Rotate pages 90°, 180°, or 270° clockwise or counter-clockwise.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span><strong>Selective Rotation:</strong> Rotate only specific pages, not the whole file.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span><strong>Instant Preview:</strong> See changes before downloading.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span><strong>Batch Processing:</strong> Fix orientation for entire documents at once.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span>Scanned Errors: Correct pages fed incorrectly into a scanner.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span>Presentation Prep: Ensure all slides face the right way.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span>Mobile Viewing: Optimize portrait/landscape mix for tablets.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Straighten out your documents with our PDF rotator tool.
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="Rotate PDF - Fix Page Orientation Instantly"
            description={descriptionContent}
            icon={<IconRotateClockwise2 size={28} stroke={1.5} />}
            accentColor="#047C58"
        >
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-border">
                <FileUpload
                    multiple={false} // Maybe just one PDF for Rotate? Or allow multiple? Multiple is fine.
                    accept={{
                        "application/pdf": [".pdf"],
                    }}
                    files={files}
                    setFiles={setFiles}
                    onChange={handleFileSelection}
                />
            </div>
        </ToolLayout>
    );
}
