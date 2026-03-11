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

    return (
        <ToolLayout
            title="Organise PDF"
            description="Reorder, rotate, delete pages and insert blank pages. Merge PDFs and images into one perfectly organised document."
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
