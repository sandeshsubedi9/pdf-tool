"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconPhotoSearch } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function ExtractImagesPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleStart = () => {
        if (files.length === 0) return;
        // Reuse the same key the extract page reads from
        FileStore.setFile("current_pdf", files[0]);
        router.push("/pdf-to-jpg/extract");
    };

    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Need the pictures from a PDF file? SandeshPDF’s Extract Images from PDF tool automatically finds and extracts every embedded image and photo, saving them in high quality without losing resolution.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#8B5CF6]" />
                    <span><strong>Lossless Extraction:</strong> Get the exact original images used in the PDF.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#8B5CF6]" />
                    <span><strong>Bulk Export:</strong> Download all images inside a Zip file instantly.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#8B5CF6]" />
                    <span><strong>Format Preservation:</strong> Images are extracted as standard formats like JPG or PNG.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#8B5CF6]" />
                    <span><strong>Fast Processing:</strong> Pull hundreds of images from huge PDFs in seconds.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#8B5CF6]" />
                    <span>Asset Retrieval: Recover original assets when the source file is missing.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#8B5CF6]" />
                    <span>Content Repurposing: Grab photos from brochures for use on social media.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#8B5CF6]" />
                    <span>Archiving Graphics: Save charts, graphs, and logos from research papers.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Safely recover your graphics with our PDF image extractor.
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="Extract Images from PDF - Pull Photos from Any Document"
            description={descriptionContent}
            icon={<IconPhotoSearch size={28} stroke={1.5} />}
            accentColor="#8B5CF6"
        >
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-border">
                <FileUpload
                    accept={{ "application/pdf": [".pdf"] }}
                    multiple={false}
                    files={files}
                    setFiles={(f) => {
                        setFiles(f);
                        // Auto-proceed as soon as a file is chosen
                        const fileArray = f as File[];
                        if (fileArray.length > 0) {
                            FileStore.setFile("current_pdf", fileArray[0]);
                            router.push("/pdf-to-jpg/extract");
                        }
                    }}
                />

                {files.length > 0 && (
                    <div className="mt-6 flex justify-center">
                        <button
                            onClick={handleStart}
                            className="px-8 py-3 rounded-xl bg-[#8B5CF6] text-white font-bold text-sm hover:bg-[#7c3aed] transition-all shadow-lg shadow-purple-500/20 active:scale-[0.98] cursor-pointer"
                        >
                            Extract Images →
                        </button>
                    </div>
                )}
            </div>
        </ToolLayout>
    );
}
