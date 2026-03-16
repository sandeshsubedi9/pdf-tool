"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconScan } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function OcrPdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        const file = newFiles[0];
        setFiles([file]);
        FileStore.clearFile("ocr_pdf_main");
        FileStore.setFile("ocr_pdf_main", file);
        router.push("/ocr-pdf/convert");
    };

    return (
        <ToolLayout
            title="OCR PDF"
            description="Make scanned PDFs searchable. Convert image-based text into real, selectable and copyable text — without changing the visual appearance."
            icon={<IconScan size={28} stroke={1.5} />}
            accentColor="#d97706"
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
