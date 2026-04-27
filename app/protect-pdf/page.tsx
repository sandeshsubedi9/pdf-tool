"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconLock } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function ProtectPdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        const file = newFiles[0];
        setFiles([file]);
        FileStore.clearFile("protect_pdf_main");
        FileStore.setFile("protect_pdf_main", file);
        router.push("/protect-pdf/protect");
    };

    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Keep your sensitive data safe with PDF Maya’s Protect PDF tool. Password protect PDF files to prevent unauthorized viewing, printing, or editing.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#E53935]" />
                    <span><strong>Encryption:</strong> Secure files with strong AES encryption.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#E53935]" />
                    <span><strong>Permission Control:</strong> Restrict printing, copying, or editing.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#E53935]" />
                    <span><strong>Owner Password:</strong> Set a password to manage permissions later.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#E53935]" />
                    <span><strong>User Password:</strong> Require a password just to open the file.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#E53935]" />
                    <span>Confidential Reports: Secure financial or HR data.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#E53935]" />
                    <span>Legal Documents: Protect contracts before signing.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#E53935]" />
                    <span>Personal Data: Safeguard IDs and medical records.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Lock down your files with our PDF password protector.
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="Protect PDF - Password Protect and Encrypt Your Documents"
            description={descriptionContent}
            icon={<IconLock size={28} stroke={1.5} />}
            accentColor="#E53935"
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
