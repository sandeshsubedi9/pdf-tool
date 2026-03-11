"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconWriting } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function SignPdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        const file = newFiles[0];
        setFiles([file]);
        FileStore.clearFile("sign_pdf_main");
        FileStore.setFile("sign_pdf_main", file);
        router.push("/sign-pdf/sign");
    };

    return (
        <ToolLayout
            title="Sign PDF"
            description="Add your signature to a PDF document quickly and easily. Draw, type, or upload your signature directly in your browser."
            icon={<IconWriting size={28} stroke={1.5} />}
            accentColor="#047C58"
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
