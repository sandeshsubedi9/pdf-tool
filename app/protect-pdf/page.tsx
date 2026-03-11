"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconLock } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function ProtectPdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        const file = newFiles[0];
        setFiles([file]);
        FileStore.clearFile("protect_pdf_main");
        FileStore.setFile("protect_pdf_main", file);
        router.push("/protect-pdf/protect");
    };

    return (
        <ToolLayout
            title="Protect PDF"
            description="Protect PDF files with a password. Encrypt PDF documents to prevent unauthorized access."
            icon={<IconLock size={28} stroke={1.5} />}
            accentColor="#E53935"
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
