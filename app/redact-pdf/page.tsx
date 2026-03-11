"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconEraser } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function RedactPdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        const file = newFiles[0];
        setFiles([file]);
        FileStore.clearFile("redact_pdf_main");
        FileStore.setFile("redact_pdf_main", file);
        router.push("/redact-pdf/redact");
    };

    return (
        <ToolLayout
            title="Redact PDF"
            description="Permanently remove sensitive information from your PDF. Draw redaction boxes over text, images or areas you want to hide with solid black overlays."
            icon={<IconEraser size={28} stroke={1.5} />}
            accentColor="#1a1a2e"
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
