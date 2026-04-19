"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { motion } from "motion/react";
import {
    IconArrowLeft,
    IconLoader2,
    IconDownload,
    IconFileTypePdf,
    IconAlertTriangle,
    IconLockOpen,
    IconEye,
    IconEyeOff,
    IconKey,
    IconCheck
} from "@tabler/icons-react";
import { unlockPdf, UnlockResult, downloadBlob } from "@/lib/pdf-utils";
import FileStore from "@/lib/file-store";
import toast from "react-hot-toast";
import { useRateLimitedAction } from "@/lib/use-rate-limited-action";
import { RateLimitModal } from "@/components/RateLimitModal";

export default function UnlockPdfActionPage() {
    const router = useRouter();
    const hasInitialized = useRef(false);
    const { execute, limitResult, clearLimitResult } = useRateLimitedAction();

    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [status, setStatus] = useState<"idle" | "unlocking" | "success" | "error">("idle");
    const [isEncrypted, setIsEncrypted] = useState<boolean | null>(null);
    const [result, setResult] = useState<UnlockResult | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    // Password field
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Load file
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const f = FileStore.getFile("unlock_pdf_main");
        if (!f) {
            router.replace("/unlock-pdf");
            return;
        }
        FileStore.clearFile("unlock_pdf_main");
        setFile(f);

        import("pdfjs-dist").then((pdfjsLib) => {
            pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
                "pdfjs-dist/build/pdf.worker.min.mjs",
                import.meta.url
            ).toString();
            f.arrayBuffer().then((buf) => {
                const loadingTask = pdfjsLib.getDocument({ data: buf });
                
                loadingTask.onPassword = (updatePassword: (pw: string) => void, reason: string) => {
                    setIsEncrypted(true);
                };

                loadingTask.promise.then((pdfDoc) => {
                    setPageCount(pdfDoc.numPages);
                    // If we reached here without onPassword being called, it's not encrypted
                    setIsEncrypted((prev) => prev === null ? false : prev);
                }).catch((err: any) => {
                    if (err.name === "PasswordException") {
                        setIsEncrypted(true);
                    }
                });
            });
        });
    }, [router]);

    const handleUnlock = () => execute(async () => {
        if (!file) return;
        if (!password) {
            toast.error("Please enter the password.");
            return;
        }

        setStatus("unlocking");
        setErrorMessage("");
        const toastId = toast.loading("Decrypting PDF…");

        try {
            const res = await unlockPdf(file, password);
            setResult(res);
            setStatus("success");
            toast.success("PDF unlocked successfully!", { id: toastId });
        } finally {
            setStatus((prev) => prev === "unlocking" ? "idle" : prev);
        }
    });

    const handleDownload = () => {
        if (!result) return;
        downloadBlob(result.blob, result.filename);
    };

    const handleReset = () => {
        setResult(null);
        router.push("/unlock-pdf");
    };

    if (!file) {
        return (
            <div className="min-h-screen flex flex-col" style={{ background: "var(--brand-white)" }}>
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <IconLoader2 size={36} className="animate-spin text-[#FF9800]" />
                        <p className="text-brand-sage text-sm font-medium">Loading document…</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "var(--brand-white)" }}>
            <RateLimitModal
                open={!!limitResult && !limitResult.allowed}
                limit={limitResult?.limit} resetAt={limitResult?.resetAt ?? 0}
                onClose={clearLimitResult}
            />
            <Navbar />

            {/* Dot grid */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage: "radial-gradient(circle, #FF9800 1px, transparent 1px)",
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
                            <span className="flex items-center justify-center w-20 h-20 rounded-full bg-[#FFF3E0] text-[#FF9800]">
                                <IconLockOpen size={40} stroke={2.5} />
                            </span>
                            <div>
                                <h1 className="text-2xl font-bold text-brand-dark">PDF Unlocked!</h1>
                                <p className="text-brand-sage mt-2 text-sm leading-relaxed">
                                    The password protection has been removed. You can now download the open version.
                                </p>
                            </div>

                            <div className="w-full flex items-start gap-3 text-left p-4 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                                <IconFileTypePdf size={24} className="text-[#FF9800] shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold truncate text-brand-dark" title={result.filename}>
                                        {result.filename}
                                    </p>
                                    <p className="text-xs text-brand-sage mt-0.5">Ready to download</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
                                <button
                                    onClick={handleReset}
                                    className="flex-1 py-3.5 rounded-xl bg-white text-brand-dark font-semibold border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-sm active:scale-[0.98] text-sm"
                                >
                                    Unlock another
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="flex-1 py-3.5 rounded-xl bg-[#FF9800] text-white font-bold hover:bg-[#F57C00] transition-all cursor-pointer shadow-md shadow-[#FF9800]/20 active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                                >
                                    <IconDownload size={18} />
                                    Download File
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <span className="flex items-center justify-center w-20 h-20 rounded-full bg-[#FFF3E0] text-[#FF9800]">
                                {status === "unlocking" ? (
                                    <IconLoader2 size={40} className="animate-spin text-[#FF9800]" />
                                ) : status === "error" ? (
                                    <IconAlertTriangle size={40} className="text-red-500" />
                                ) : (
                                    <IconLockOpen size={40} className="text-[#FF9800]" stroke={1.5} />
                                )}
                            </span>

                            <div>
                                <h1 className="text-2xl font-bold text-brand-dark">
                                    {status === "unlocking" ? "Decrypting PDF..." : status === "error" ? "Unlock Failed" : "Unlock PDF"}
                                </h1>
                                <p className="text-brand-sage mt-2 text-sm leading-relaxed">
                                    {status === "unlocking"
                                        ? "We're currently removing the encryption from your document. Please wait."
                                        : status === "error"
                                            ? errorMessage || "An error occurred while unlocking your file."
                                            : isEncrypted === false 
                                                ? "This PDF is already open and doesn't require a password to be unlocked."
                                                : "Enter the correct password to remove encryption from this document."}
                                </p>
                            </div>

                            <div className="w-full flex items-start flex-col gap-2 text-left p-4 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                                <p className="text-xs font-bold uppercase tracking-widest text-[#8C886B] mb-1">Target File</p>
                                <div className="flex gap-3 items-center w-full min-w-0">
                                    <IconFileTypePdf size={24} className="text-[#FF9800] shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold truncate text-brand-dark" title={file.name}>
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-brand-sage mt-0.5">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB {pageCount !== null && `· ${pageCount} pages`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {status !== "unlocking" && status !== "success" && isEncrypted !== false && (
                                <div className="w-full mt-4 space-y-4">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <IconKey className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter PDF password"
                                            className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF9800] focus:border-transparent text-sm transition-all"
                                            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                                        >
                                            {showPassword ? <IconEyeOff className="h-5 w-5" /> : <IconEye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isEncrypted === false && (
                                <div className="mt-2 w-full p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center gap-3">
                                    <IconCheck className="text-green-600 shrink-0" size={20} />
                                    <p className="text-sm font-medium text-green-700 text-left">
                                        This document is already unlocked and accessible.
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
                                <button
                                    onClick={() => router.push("/unlock-pdf")}
                                    disabled={status === "unlocking"}
                                    className="flex-1 py-3.5 rounded-xl bg-white text-brand-dark font-semibold border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-sm active:scale-[0.98] text-sm disabled:opacity-50"
                                >
                                    {isEncrypted === false ? "Back" : "Cancel"}
                                </button>
                                {isEncrypted !== false && (
                                    <button
                                        onClick={handleUnlock}
                                        disabled={status === "unlocking" || !password}
                                        className="flex-1 py-3.5 rounded-xl bg-[#FF9800] text-white font-bold hover:bg-[#F57C00] transition-all cursor-pointer shadow-md shadow-[#FF9800]/20 active:scale-[0.98] flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {status === "unlocking" ? "Unlocking..." : "Unlock PDF"}
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

