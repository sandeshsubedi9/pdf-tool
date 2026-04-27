"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconLockOpen } from "@tabler/icons-react";
import FileStore from "@/lib/file-store";

export default function UnlockPdfPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        const file = newFiles[0];
        setFiles([file]);
        FileStore.clearFile("unlock_pdf_main");
        FileStore.setFile("unlock_pdf_main", file);
        router.push("/unlock-pdf/unlock");
    };

    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Locked out of your own file? PDF Maya’s Unlock PDF tool helps you remove password from PDF and lift restrictions on printing or editing (provided you have the owner password or permission).
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#FF9800]" />
                    <span><strong>Restriction Removal:</strong> Enable printing, copying, and editing on locked files.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#FF9800]" />
                    <span><strong>Password Removal:</strong> Remove user passwords if known.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#FF9800]" />
                    <span><strong>Instant Access:</strong> Get an unlocked version of your document immediately.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#FF9800]" />
                    <span><strong>Secure Process:</strong> Files are handled securely and deleted after processing.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#FF9800]" />
                    <span>Forgotten Permissions: Regain editing rights to your own documents.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#FF9800]" />
                    <span>Archiving: Remove security for long-term storage systems.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#FF9800]" />
                    <span>Compatibility: Unlock files for use in older software.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Regain control with our PDF unlocker tool.
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="Unlock PDF - Remove Passwords and Restrictions"
            description={descriptionContent}
            icon={<IconLockOpen size={28} stroke={1.5} />}
            accentColor="#FF9800"
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
