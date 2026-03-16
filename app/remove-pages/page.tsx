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

    return (
        <ToolLayout
            title="Remove Pages"
            description="Select and remove pages you don't need from your PDF document."
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
