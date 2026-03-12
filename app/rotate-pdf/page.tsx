"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconRotateClockwise2 } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function RotatePdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        setFiles(newFiles);

        // Clear any previous stored files
        for (let i = 0; i < 200; i++) FileStore.clearFile(`rotate_${i}`);

        // Store all initial files with indexed keys
        newFiles.forEach((f, i) => FileStore.setFile(`rotate_${i}`, f));

        // Immediately route to the editor
        router.push("/rotate-pdf/rotate");
    };

    return (
        <ToolLayout
            title="Rotate PDF"
            description="Rotate PDF pages individually or all together. Correct upside-down pages interactively."
            icon={<IconRotateClockwise2 size={28} stroke={1.5} />}
            accentColor="#059669" // Using Edit category color (emerald)
        >
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-border">
                <FileUpload
                    multiple={false} // Maybe just one PDF for Rotate? Or allow multiple? Multiple is fine.
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
