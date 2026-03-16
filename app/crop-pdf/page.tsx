"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconCrop } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function CropPdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        const file = newFiles[0];
        setFiles([file]);
        FileStore.clearFile("crop_pdf_main");
        FileStore.setFile("crop_pdf_main", file);
        router.push("/crop-pdf/crop");
    };

    return (
        <ToolLayout
            title="Crop PDF"
            description="Crop any page of your PDF to remove unwanted margins or white space. Define a crop box per page, resize or move it, then download your trimmed PDF."
            icon={<IconCrop size={28} stroke={1.5} />}
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
