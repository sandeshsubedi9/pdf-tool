"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconDroplet } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function WatermarkPdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        setFiles(newFiles);
        FileStore.clearFile("watermark_0");
        FileStore.setFile("watermark_0", newFiles[0]);
        router.push("/watermark-pdf/apply");
    };

    return (
        <ToolLayout
            title="Watermark PDF"
            description="Add text or image watermarks to your PDF. Control position, opacity, rotation, font, and more."
            icon={<IconDroplet size={28} stroke={1.5} />}
            accentColor="#7C3AED"
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
