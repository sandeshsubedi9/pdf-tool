"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { motion } from "motion/react";
import {
    IconFileCheck,
    IconArrowLeft,
    IconLoader2,
    IconCheck,
    IconDownload,
    IconFileTypePdf,
    IconAlertTriangle,
    IconShieldCheck
} from "@tabler/icons-react";
import { repairPdf, RepairResult, downloadBlob } from "@/lib/pdf-utils";
import FileStore from "@/lib/file-store";
import toast from "react-hot-toast";

export default function RepairPdfConvertPage() {
    const router = useRouter();
    const hasInitialized = useRef(false);

    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [status, setStatus] = useState<"idle" | "repairing" | "success" | "error">("idle");
    const [result, setResult] = useState<RepairResult | null>(null);

    // Load file
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const f = FileStore.getFile("repair_pdf_main");
        if (!f) {
            router.replace("/repair-pdf");
            return;
        }
        FileStore.clearFile("repair_pdf_main");
        setFile(f);

        // Try getting page count, it may fail if file is heavily corrupted
        import("pdfjs-dist").then((pdfjsLib) => {
            pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
                "pdfjs-dist/build/pdf.worker.min.mjs",
                import.meta.url
            ).toString();
            f.arrayBuffer().then((buf) => {
                pdfjsLib.getDocument({ data: buf }).promise.then((pdfDoc) => {
                    setPageCount(pdfDoc.numPages);
                }).catch(() => {
                    // Ignore, it's corrupted
                });
            });
        });
    }, [router]);

    const handleRepair = async () => {
        if (!file) return;
        setStatus("repairing");
        const toastId = toast.loading("Analyzing and repairing PDF structure…");

        try {
            const res = await repairPdf(file);
            setResult(res);
            setStatus("success");
            toast.success("Repair successful!", { id: toastId });
        } catch (err: any) {
            setStatus("error");
            const raw = err?.message || "Unknown error";
            toast.error(raw, { id: toastId, duration: 6000 });
        }
    };

    const handleDownload = () => {
        if (!result) return;
        downloadBlob(result.blob, result.filename);
    };

    const handleReset = () => {
        setResult(null);
        router.push("/repair-pdf");
    };

    if (!file) {
        return (
            <div className="min-h-screen flex flex-col" style={{ background: "var(--brand-white)" }}>
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <IconLoader2 size={36} className="animate-spin text-[#047C58]" />
                        <p className="text-brand-sage text-sm font-medium">Loading document…</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "var(--brand-white)" }}>
            <Navbar />

            {/* Dot grid */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage: "radial-gradient(circle, #047C58 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                    opacity: 0.04,
                }}
            />

            <main className="flex-1 max-w-7xl mx-auto px-4 md:px-8 w-full pt-28 pb-10 relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">

                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center text-center gap-6 w-full max-w-lg bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-border"
                >
                    {status === "success" && result ? (
                        <>
                            <span className="flex items-center justify-center w-20 h-20 rounded-full bg-[#e6f4ef] text-[#047C58]">
                                <IconShieldCheck size={40} stroke={2.5} />
                            </span>
                            <div>
                                <h1 className="text-2xl font-bold text-brand-dark">PDF Reconstructed!</h1>
                                <p className="text-brand-sage mt-2 text-sm leading-relaxed">
                                    We've successfully recovered and rebuilt the internal structure of your document.
                                </p>
                            </div>

                            <div className="w-full flex items-start gap-3 text-left p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                <IconFileTypePdf size={24} className="text-brand-sage" />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate text-brand-dark">{result.filename}</p>
                                    <p className="text-xs text-brand-sage mt-0.5">Ready to download</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
                                <button
                                    onClick={handleReset}
                                    className="flex-1 py-3.5 rounded-xl bg-white text-brand-dark font-semibold border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-sm active:scale-[0.98] text-sm"
                                >
                                    Repair another
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="flex-1 py-3.5 rounded-xl bg-[#047C58] text-white font-bold hover:bg-[#036649] transition-all cursor-pointer shadow-md shadow-[#047C58]/20 active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                                >
                                    <IconDownload size={18} />
                                    Download File
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <span className="flex items-center justify-center w-20 h-20 rounded-full bg-[#f0ede4] text-[#8C886B]">
                                {status === "repairing" ? (
                                    <IconLoader2 size={40} className="animate-spin text-[#047C58]" />
                                ) : status === "error" ? (
                                    <IconAlertTriangle size={40} className="text-red-500" />
                                ) : (
                                    <IconFileCheck size={40} className="text-[#047C58]" stroke={1.5} />
                                )}
                            </span>

                            <div>
                                <h1 className="text-2xl font-bold text-brand-dark">
                                    {status === "repairing" ? "Repairing PDF..." : status === "error" ? "Repair Failed" : "Ready to Repair"}
                                </h1>
                                <p className="text-brand-sage mt-2 text-sm leading-relaxed">
                                    {status === "repairing"
                                        ? "We're currently reconstructing the internal tables and clearing corrupted bytes. Please wait."
                                        : status === "error"
                                            ? "This file may be too severely corrupted to recover using automated tools."
                                            : "Click below to begin analyzing and fixing broken references in your document."}
                                </p>
                            </div>

                            <div className="w-full flex items-start flex-col gap-2 text-left p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                <p className="text-xs font-bold uppercase tracking-widest text-[#8C886B] mb-1">Target File</p>
                                <div className="flex gap-3 items-center">
                                    <IconFileTypePdf size={24} className="text-[#047C58]" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold truncate text-brand-dark">{file.name}</p>
                                        <p className="text-xs text-brand-sage mt-0.5">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB {pageCount !== null && `· ${pageCount} pages`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
                                <button
                                    onClick={() => router.push("/repair-pdf")}
                                    disabled={status === "repairing"}
                                    className="flex-1 py-3.5 rounded-xl bg-white text-brand-dark font-semibold border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-sm active:scale-[0.98] text-sm disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                {status === "error" ? (
                                    <button
                                        onClick={handleRepair}
                                        className="flex-1 py-3.5 rounded-xl bg-[#047C58] text-white font-bold hover:bg-[#036649] transition-all cursor-pointer shadow-md shadow-[#047C58]/20 active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                                    >
                                        Try Again
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleRepair}
                                        disabled={status === "repairing"}
                                        className="flex-1 py-3.5 rounded-xl bg-[#047C58] text-white font-bold hover:bg-[#036649] transition-all cursor-pointer shadow-md shadow-[#047C58]/20 active:scale-[0.98] flex items-center justify-center gap-2 text-sm disabled:opacity-80"
                                    >
                                        {status === "repairing" ? "Repairing..." : "Repair PDF"}
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </motion.div>
            </main>
        </div>
    );
}
