"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { motion } from "motion/react";
import {
    IconArrowLeft,
    IconLoader2,
    IconCheck,
    IconDownload,
    IconFileTypePdf,
    IconAlertTriangle,
    IconLock,
    IconEye,
    IconEyeOff,
    IconKey
} from "@tabler/icons-react";
import { protectPdf, ProtectResult, downloadBlob } from "@/lib/pdf-utils";
import FileStore from "@/lib/file-store";
import toast from "react-hot-toast";

export default function ProtectPdfActionPage() {
    const router = useRouter();
    const hasInitialized = useRef(false);

    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [status, setStatus] = useState<"idle" | "protecting" | "success" | "error">("idle");
    const [result, setResult] = useState<ProtectResult | null>(null);

    // Password fields
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Load file
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const f = FileStore.getFile("protect_pdf_main");
        if (!f) {
            router.replace("/protect-pdf");
            return;
        }
        FileStore.clearFile("protect_pdf_main");
        setFile(f);

        import("pdfjs-dist").then((pdfjsLib) => {
            pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
                "pdfjs-dist/build/pdf.worker.min.mjs",
                import.meta.url
            ).toString();
            f.arrayBuffer().then((buf) => {
                pdfjsLib.getDocument({ data: buf }).promise.then((pdfDoc) => {
                    setPageCount(pdfDoc.numPages);
                }).catch(() => {
                    // Ignore
                });
            });
        });
    }, [router]);

    const handleProtect = async () => {
        if (!file) return;
        if (!password) {
            toast.error("Please enter a password.");
            return;
        }
        if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        setStatus("protecting");
        const toastId = toast.loading("Encrypting PDF…");

        try {
            const res = await protectPdf(file, password);
            setResult(res);
            setStatus("success");
            toast.success("PDF protected successfully!", { id: toastId });
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
        router.push("/protect-pdf");
    };

    if (!file) {
        return (
            <div className="min-h-screen flex flex-col" style={{ background: "var(--brand-white)" }}>
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <IconLoader2 size={36} className="animate-spin text-[#E53935]" />
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
                    backgroundImage: "radial-gradient(circle, #E53935 1px, transparent 1px)",
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
                            <span className="flex items-center justify-center w-20 h-20 rounded-full bg-[#fdecea] text-[#E53935]">
                                <IconLock size={40} stroke={2.5} />
                            </span>
                            <div>
                                <h1 className="text-2xl font-bold text-brand-dark">PDF Protected!</h1>
                                <p className="text-brand-sage mt-2 text-sm leading-relaxed">
                                    Your document has been encrypted with a password.
                                </p>
                            </div>

                            <div className="w-full flex items-start gap-3 text-left p-4 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                                <IconFileTypePdf size={24} className="text-brand-sage shrink-0" />
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
                                    Protect another
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="flex-1 py-3.5 rounded-xl bg-[#E53935] text-white font-bold hover:bg-[#c62828] transition-all cursor-pointer shadow-md shadow-[#E53935]/20 active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                                >
                                    <IconDownload size={18} />
                                    Download File
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <span className="flex items-center justify-center w-20 h-20 rounded-full bg-[#f0ede4] text-[#E53935]">
                                {status === "protecting" ? (
                                    <IconLoader2 size={40} className="animate-spin text-[#E53935]" />
                                ) : status === "error" ? (
                                    <IconAlertTriangle size={40} className="text-red-500" />
                                ) : (
                                    <IconLock size={40} className="text-[#E53935]" stroke={1.5} />
                                )}
                            </span>

                            <div>
                                <h1 className="text-2xl font-bold text-brand-dark">
                                    {status === "protecting" ? "Encrypting PDF..." : status === "error" ? "Protection Failed" : "Protect PDF"}
                                </h1>
                                <p className="text-brand-sage mt-2 text-sm leading-relaxed">
                                    {status === "protecting"
                                        ? "We're currently applying AES encryption to your document. Please wait."
                                        : status === "error"
                                            ? "An error occurred while protecting your file."
                                            : "Set a strong password to prevent unauthorized access."}
                                </p>
                            </div>

                            <div className="w-full flex items-start flex-col gap-2 text-left p-4 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                                <p className="text-xs font-bold uppercase tracking-widest text-[#8C886B] mb-1">Target File</p>
                                <div className="flex gap-3 items-center w-full min-w-0">
                                    <IconFileTypePdf size={24} className="text-[#E53935] shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-brand-dark truncate" title={file.name}>
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-brand-sage mt-0.5">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB {pageCount !== null && `· ${pageCount} pages`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {status !== "protecting" && status !== "error" && (
                                <div className="w-full mt-4 space-y-4">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <IconKey className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter password"
                                            className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#E53935] focus:border-transparent text-sm transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                                        >
                                            {showPassword ? <IconEyeOff className="h-5 w-5" /> : <IconEye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <IconKey className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm password"
                                            className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#E53935] focus:border-transparent text-sm transition-all"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
                                <button
                                    onClick={() => router.push("/protect-pdf")}
                                    disabled={status === "protecting"}
                                    className="flex-1 py-3.5 rounded-xl bg-white text-brand-dark font-semibold border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-sm active:scale-[0.98] text-sm disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                {status === "error" ? (
                                    <button
                                        onClick={handleProtect}
                                        className="flex-1 py-3.5 rounded-xl bg-[#E53935] text-white font-bold hover:bg-[#c62828] transition-all cursor-pointer shadow-md shadow-[#E53935]/20 active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                                    >
                                        Try Again
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleProtect}
                                        disabled={status === "protecting" || !password || password !== confirmPassword}
                                        className="flex-1 py-3.5 rounded-xl bg-[#E53935] text-white font-bold hover:bg-[#c62828] transition-all cursor-pointer shadow-md shadow-[#E53935]/20 active:scale-[0.98] flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {status === "protecting" ? "Encrypting..." : "Protect PDF"}
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
