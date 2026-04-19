"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconEraser } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function RedactPdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        const file = newFiles[0];
        setFiles([file]);
        FileStore.clearFile("redact_pdf_main");
        FileStore.setFile("redact_pdf_main", file);
        router.push("/redact-pdf/redact");
    };

    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Protect privacy with SandeshPDF’s Redact PDF tool. Permanently black out sensitive data like names, SSNs, or financial figures so they cannot be recovered.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1a1a2e]" />
                    <span><strong>Permanent Removal:</strong> Unlike covering with shapes, redaction deletes the data.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1a1a2e]" />
                    <span><strong>Search & Redact:</strong> Find specific keywords and redact them automatically.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1a1a2e]" />
                    <span><strong>Manual Redaction:</strong> Draw boxes over areas to hide manually.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1a1a2e]" />
                    <span><strong>Compliance:</strong> Meet GDPR, HIPAA, and other privacy regulations.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1a1a2e]" />
                    <span>Legal Discovery: Share evidence without revealing private details.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1a1a2e]" />
                    <span>Public Records: Release documents while protecting citizen data.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1a1a2e]" />
                    <span>Medical Records: Share patient info safely with third parties.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Secure your data permanently with our PDF redactor.
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="Redact PDF - Permanently Hide Sensitive Information"
            description={descriptionContent}
            icon={<IconEraser size={28} stroke={1.5} />}
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
