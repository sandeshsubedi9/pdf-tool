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

    return (
        <ToolLayout
            title="Extract Images"
            description="Pull out every embedded image from your PDF in one click. Download individually or as a ZIP."
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
