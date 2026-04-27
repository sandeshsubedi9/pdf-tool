"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconLanguage } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function TranslatePdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        setFiles(newFiles);

        // Clear any previous stored files
        for (let i = 0; i < 200; i++) FileStore.clearFile(`translate_${i}`);

        // Store first file
        FileStore.setFile(`translate_0`, newFiles[0]);

        // Immediately route to the editor
        router.push("/translate-pdf/translate");
    };

    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Break language barriers with PDF Maya’s Translate PDF tool. Instantly translate PDF documents into dozens of languages while preserving the original layout and formatting.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#059669]" />
                    <span><strong>Layout Preservation:</strong> Text replaces text without messing up the design.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#059669]" />
                    <span><strong>Multi-Language Support:</strong> Translate to/from English, Spanish, French, German, and more.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#059669]" />
                    <span><strong>Fast Processing:</strong> Get translated documents in seconds.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#059669]" />
                    <span><strong>Editable Output:</strong> Receive a PDF that can be further edited if needed.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#059669]" />
                    <span>Global Business: Translate contracts and proposals for international clients.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#059669]" />
                    <span>Education: Convert study materials for diverse student bodies.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#059669]" />
                    <span>Travel: Translate guides or manuals on the go.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Communicate globally with our PDF translator
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="Translate PDF - Convert Document Content to Any Language"
            description={descriptionContent}
            icon={<IconLanguage size={28} stroke={1.5} />}
            accentColor="#059669" // Using Edit category color (emerald)
        >
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-border">
                <FileUpload
                    multiple={false} // Only one PDF at a time for Translation
                    accept={{
                        "application/pdf": [".pdf"],
                    }}
                    files={files}
                    setFiles={setFiles}
                    onChange={handleFileSelection}
                />
            </div>
        </ToolLayout>
    );
}
