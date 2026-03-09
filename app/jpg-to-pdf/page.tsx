"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconPhoto, IconArrowRight } from "@tabler/icons-react";
import { motion, AnimatePresence } from "motion/react";
import FileStore from "@/lib/file-store";

const ACCEPTED_TYPES = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
    "image/gif": [".gif"],
    "image/bmp": [".bmp"],
    "image/tiff": [".tiff", ".tif"],
    "image/svg+xml": [".svg"],
    "image/heic": [".heic"],
};

export default function ImageToPdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        setFiles(newFiles);
        // Clear any previous stored images first
        for (let i = 0; i < 200; i++) FileStore.clearFile(`img_${i}`);
        // Store all initial files with indexed keys
        newFiles.forEach((f, i) => FileStore.setFile(`img_${i}`, f));

        // Immediately route to convert page
        router.push("/jpg-to-pdf/convert");
    };

    return (
        <ToolLayout
            title="Image to PDF"
            description="Convert JPG, PNG, WebP, BMP and more into a perfectly formatted PDF document."
            icon={<IconPhoto size={28} stroke={1.5} />}
            accentColor="#EAB308"
        >
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-border">
                <FileUpload
                    multiple
                    accept={ACCEPTED_TYPES}
                    files={files}
                    setFiles={setFiles}
                    onChange={handleFileSelection}
                />
            </div>
        </ToolLayout>
    );
}
