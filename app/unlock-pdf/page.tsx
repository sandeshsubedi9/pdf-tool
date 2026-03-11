"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconLockOpen } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function UnlockPdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        const file = newFiles[0];
        setFiles([file]);
        FileStore.clearFile("unlock_pdf_main");
        FileStore.setFile("unlock_pdf_main", file);
        router.push("/unlock-pdf/unlock");
    };

    return (
        <ToolLayout
            title="Unlock PDF"
            description="Remove password protection from a PDF document. You must know the password to unlock the file."
            icon={<IconLockOpen size={28} stroke={1.5} />}
            accentColor="#FF9800"
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
