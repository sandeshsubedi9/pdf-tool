"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconListNumbers } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function PageNumberPdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        setFiles(newFiles);
        FileStore.clearFile("pagenumber_0");
        FileStore.setFile("pagenumber_0", newFiles[0]);
        router.push("/page-number-pdf/number");
    };

    return (
        <ToolLayout
            title="Add Page Numbers"
            description="Easily add page numbers to your PDF. Choose position, style, font, size, and color."
            icon={<IconListNumbers size={28} stroke={1.5} />}
            accentColor="#059669"
        >
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-border">
                <FileUpload
                    multiple={false}
                    accept={{ "application/pdf": [".pdf"] }}
                    files={files}
                    setFiles={setFiles}
                    onChange={handleFileSelection}
                />
            </div>
        </ToolLayout>
    );
}
