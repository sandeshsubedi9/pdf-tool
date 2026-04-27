"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconFileMinus } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function RemovePagesPdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        setFiles(newFiles);

        // Clear any previous stored files
        for (let i = 0; i < 200; i++) FileStore.clearFile(`remove-pages_${i}`);

        // Store all initial files with indexed keys
        newFiles.forEach((f, i) => FileStore.setFile(`remove-pages_${i}`, f));

        // Immediately route to the editor
        router.push("/remove-pages/remove");
    };

    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4 text-brand-sage leading-relaxed">
            <p>
                Sometimes you just need to clean up a document. PDF Maya’s Remove Pages tool allows you to delete pages from PDF files quickly and securely. Whether it’s a blank page, a draft cover, or sensitive information, you can remove PDF pages with a single click.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#059669]" />
                    <span><strong>Selective Deletion:</strong> Choose specific page numbers to remove while keeping the rest intact.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#059669]" />
                    <span><strong>Batch Removal:</strong> Delete multiple non-consecutive pages in one go.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#059669]" />
                    <span><strong>Instant Preview:</strong> See exactly which pages will be removed before processing.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#059669]" />
                    <span><strong>Preserve Quality:</strong> The remaining pages retain their original resolution and formatting.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#059669]" />
                    <span>Remove blank pages that were accidentally scanned.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#059669]" />
                    <span>Delete draft covers or watermarked versions before final submission.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#059669]" />
                    Clean up resumes by removing outdated experience sections.
                </li>
            </ul>
        </div>
    );

    return (
        <ToolLayout
            title="Remove Pages - Delete Unwanted Content from Your PDF"
            description={descriptionContent}
            icon={<IconFileMinus size={28} stroke={1.5} />}
            accentColor="#059669" // Using Edit category color (emerald)
        >
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-border">
                <FileUpload
                    multiple={false} // Only one PDF for Remove Pages
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
