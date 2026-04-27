"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconStack2 } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function OrganisePdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        setFiles(newFiles);

        // Clear any previous stored files
        for (let i = 0; i < 200; i++) FileStore.clearFile(`organise_${i}`);

        // Store all initial files with indexed keys
        newFiles.forEach((f, i) => FileStore.setFile(`organise_${i}`, f));

        // Immediately route to the editor
        router.push("/organise-pdf/convert");
    };

    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4 text-brand-sage leading-relaxed">
            <p>
                Got your pages in the wrong order? PDF Maya’s Organise Pages tool lets you reorder PDF pages with a simple drag-and-drop interface. Perfect for fixing scanned documents or arranging presentation decks, this PDF page organizer gives you full control over your document flow.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span><strong>Drag and Drop:</strong> Visually rearrange pages to match your preferred sequence.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span><strong>Rotate Pages:</strong> Fix orientation issues while organizing your layout.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span><strong>Preview Changes:</strong> See the new order before finalizing the file.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span><strong>User-Friendly:</strong> No technical skills needed to organize PDF pages.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span>Fix scanned documents where pages were fed in reverse order.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#047C58]" />
                    <span>Rearrange presentation slides for a better narrative flow.</span>
                </li>
            </ul>
        </div>
    );

    return (
        <ToolLayout
            title="Organise Pages - Reorder and Rearrange Your PDF Layout"
            description={descriptionContent}
            icon={<IconStack2 size={28} stroke={1.5} />}
            accentColor="#047C58"
        >
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-border">
                <FileUpload
                    multiple
                    accept={{
                        "application/pdf": [".pdf"],
                        "image/jpeg": [".jpg", ".jpeg"],
                        "image/png": [".png"],
                        "image/webp": [".webp"],
                    }}
                    files={files}
                    setFiles={setFiles}
                    onChange={handleFileSelection}
                />
            </div>
        </ToolLayout>
    );
}
