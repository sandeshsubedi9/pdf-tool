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

    return (
        <ToolLayout
            title="Compress PDF"
            description="Reduce the file size of your PDF while keeping the best possible quality. Choose your compression level."
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
