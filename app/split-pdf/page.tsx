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

    return (
        <ToolLayout
            title={isExtract ? "Extract Pages" : "Split PDF"}
            description={isExtract ? "Select and extract specific pages from your PDF." : "Separate one page or a whole set for easy conversion into independent PDF files."}
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
