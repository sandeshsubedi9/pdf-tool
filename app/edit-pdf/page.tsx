"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import FileStore from "@/lib/file-store";

// Dynamically import the editor to avoid SSR issues with pdfjs / canvas
const PdfEditor = dynamic(() => import("@/components/PdfEditor"), {
    ssr: false,
    loading: () => (
        <div className="flex-1 flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 rounded-full border-4 border-brand-teal border-t-transparent animate-spin" />
                <p className="text-brand-sage text-sm font-medium">Loading editor…</p>
            </div>
        </div>
    ),
});

export default function EditPdfPage() {
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        const storedFile = FileStore.getFile("edit_pdf_main");
        if (storedFile) {
            setFile(storedFile);
            FileStore.clearFile("edit_pdf_main");
        }
    }, []);

    // If there is no file, PdfEditor handles rendering the ToolLayout uploader.
    // We conditionally render the wrapper background only when the editor is actually active.
    return (
        <div className={file ? "min-h-screen flex flex-col bg-[#F4F3F1]" : "min-h-screen flex flex-col relative"}>
            {file && <Navbar />}
            <main className={file ? "flex-1 flex flex-col pt-16" : "flex-1 flex flex-col"}>
                <PdfEditor file={file!} setFile={setFile} />
            </main>
        </div>
    );
}
