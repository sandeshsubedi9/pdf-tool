"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconArrowsJoin2 } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function MergePdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        setFiles(newFiles);

        // Clear any previous stored pdfs first
        for (let i = 0; i < 200; i++) FileStore.clearFile(`pdf_${i}`);

        // Store all initial files with indexed keys
        newFiles.forEach((f, i) => FileStore.setFile(`pdf_${i}`, f));

        // Immediately route to convert page
        router.push("/merge-pdf/convert");
    };

    return (
        <ToolLayout
            title="Merge PDF"
            description="Combine multiple PDFs into one unified document in any order."
            icon={<IconArrowsJoin2 size={28} stroke={1.5} />}
            accentColor="#047C58"
        >
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-border">
                <FileUpload
                    multiple
                    accept={{ "application/pdf": [".pdf"] }}
                    files={files}
                    setFiles={setFiles}
                    onChange={handleFileSelection}
                />
            </div>
        </ToolLayout>
    );
}
