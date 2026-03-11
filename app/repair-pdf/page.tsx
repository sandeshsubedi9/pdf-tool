"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconFileCheck } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function RepairPdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        const file = newFiles[0];
        setFiles([file]);
        FileStore.clearFile("repair_pdf_main");
        FileStore.setFile("repair_pdf_main", file);
        router.push("/repair-pdf/convert");
    };

    return (
        <ToolLayout
            title="Repair PDF"
            description="Recover data from a corrupted or damaged PDF document. Depending on how severely damaged it is we will try to fix as much as possible."
            icon={<IconFileCheck size={28} stroke={1.5} />}
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
