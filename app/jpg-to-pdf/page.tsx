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

    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Turn your photos into a document with SandeshPDF’s Image to PDF tool. Combine multiple JPG, PNG, or TIFF images into a single, organized PDF file.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#EAB308]" />
                    <span><strong>Multiple Formats:</strong> Support for JPG, PNG, TIFF, and more.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#EAB308]" />
                    <span><strong>Order Control:</strong> Arrange images in the desired sequence before converting.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#EAB308]" />
                    <span><strong>Compression:</strong> Optimize image size within the PDF for faster sharing.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#EAB308]" />
                    <span><strong>Scan Alternative:</strong> Perfect for digitizing physical photos or whiteboard notes.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#EAB308]" />
                    <span>Digitize Receipts: Combine photos of receipts into one expense report.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#EAB308]" />
                    <span>Photo Albums: Create a PDF portfolio of images.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#EAB308]" />
                    <span>Document Assembly: Merge screenshots or scanned pages into a file.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Create documents from images instantly with our JPG to PDF converter.
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="Image to PDF - Combine Photos and Scans into One Document"
            description={descriptionContent}
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
