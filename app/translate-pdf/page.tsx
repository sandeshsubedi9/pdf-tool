"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconLanguage } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function TranslatePdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        setFiles(newFiles);

        // Clear any previous stored files
        for (let i = 0; i < 200; i++) FileStore.clearFile(`translate_${i}`);

        // Store first file
        FileStore.setFile(`translate_0`, newFiles[0]);

        // Immediately route to the editor
        router.push("/translate-pdf/translate");
    };

    return (
        <ToolLayout
            title="Translate PDF"
            description="Translate your PDF to another language while preserving the original layout and formatting."
            icon={<IconLanguage size={28} stroke={1.5} />}
            accentColor="#059669" // Using Edit category color (emerald)
        >
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-border">
                <FileUpload
                    multiple={false} // Only one PDF at a time for Translation
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
