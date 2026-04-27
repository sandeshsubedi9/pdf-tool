"use client";
import React from "react";
import Navbar from "@/components/Navbar";
import { motion } from "motion/react";

interface ToolLayoutProps {
    title: string;
    description: React.ReactNode;
    icon: React.ReactNode;
    accentColor?: string;
    children: React.ReactNode;
}

export default function ToolLayout({
    title,
    description,
    icon,
    accentColor = "#047C58",
    children,
}: ToolLayoutProps) {
    return (
        <div className="min-h-screen flex flex-col relative" style={{ background: "var(--brand-white)" }}>
            <Navbar />

            {/* Subtle geometric background accent */}
            <div
                aria-hidden
                className="pointer-events-none absolute right-0 top-0 w-1/2 h-full opacity-[0.03]"
                style={{
                    backgroundImage: `radial-gradient(circle at 80% 50%, ${accentColor} 0%, transparent 60%)`,
                }}
            />
            {/* Dot grid accent */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage: "radial-gradient(circle, #8C886B 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                    opacity: 0.05,
                }}
            />

            <style>{`
                .minimal-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .minimal-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                /* Hidden by default */
                .minimal-scrollbar::-webkit-scrollbar-thumb {
                    background: transparent;
                    border-radius: 10px;
                }
                /* Appears on container hover */
                .minimal-scrollbar:hover::-webkit-scrollbar-thumb {
                    background: rgba(156, 163, 175, 0.4);
                }
                /* Darker when interacting */
                .minimal-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(156, 163, 175, 0.7);
                }
                /* Firefox support */
                .minimal-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: transparent transparent;
                }
                .minimal-scrollbar:hover {
                    scrollbar-color: rgba(156, 163, 175, 0.4) transparent;
                }
                /* Mask fade effect for scroll block */
                .scroll-mask {
                    mask-image: linear-gradient(to bottom, black 90%, transparent 100%);
                    -webkit-mask-image: linear-gradient(to bottom, black 90%, transparent 100%);
                }
            `}</style>

            {/* Main split layout flex container */}
            <main className="flex-1 max-w-7xl mx-auto px-5 md:px-8 w-full pt-28 lg:pt-0 pb-16 lg:pb-0 relative z-10 flex flex-col justify-center">

                {/* ── MOBILE HEADER (Hidden on Desktop) ── */}
                <div className="flex lg:hidden flex-col gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <span
                            className="flex items-center justify-center w-12 h-12 rounded-2xl text-white shrink-0 shadow-sm"
                            style={{ background: accentColor }}
                        >
                            {icon}
                        </span>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-teal-lt border border-[#bce0d5] text-xs font-semibold text-brand-teal tracking-wide w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse" />
                            Free Online PDF Tools
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold leading-tight tracking-tight text-brand-dark mb-2 flex flex-col gap-1.5">
                        {typeof title === 'string' && title.includes(" - ") ? (
                            <>
                                <span>{title.split(" - ")[0]}</span>
                                <span className="sr-only"> - </span>
                                <span className="text-lg font-medium text-brand-sage leading-snug mt-1">
                                    {title.split(" - ").slice(1).join(" - ")}
                                </span>
                            </>
                        ) : (
                            title
                        )}
                    </h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center w-full">

                    {/* ── LEFT COLUMN (Text Content) ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="flex flex-col gap-6 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto minimal-scrollbar scroll-mask order-last lg:order-first lg:pr-6"
                    >
                        {/* DESKTOP ONLY: Header */}
                        <div className="hidden lg:flex items-center gap-4">
                            <span
                                className="flex items-center justify-center w-14 h-14 rounded-2xl text-white shrink-0 shadow-sm"
                                style={{ background: accentColor }}
                            >
                                {icon}
                            </span>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-teal-lt border border-[#bce0d5] text-xs font-semibold text-brand-teal tracking-wide w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse" />
                                Free Online PDF Tools
                            </div>
                        </div>

                        <h1 className="hidden lg:flex text-4xl md:text-5xl font-bold leading-[1.15] tracking-tight text-brand-dark flex flex-col gap-2">
                            {typeof title === 'string' && title.includes(" - ") ? (
                                <>
                                    <span>{title.split(" - ")[0]}</span>
                                    <span className="sr-only"> - </span>
                                    <span className="text-xl md:text-2xl font-medium text-brand-sage leading-snug mt-1">
                                        {title.split(" - ").slice(1).join(" - ")}
                                    </span>
                                </>
                            ) : (
                                title
                            )}
                        </h1>

                        <div className="text-[17px] text-brand-sage leading-relaxed w-full pb-8">
                            {description}
                        </div>

                    </motion.div>

                    {/* ── RIGHT COLUMN – Interactive Tool Area ── */}
                    <div className="relative w-full order-first lg:order-last">
                        <motion.div
                            initial={{ opacity: 0, y: 28 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: 0.6,
                                ease: [0.22, 1, 0.36, 1],
                                delay: 0.15,
                            }}
                            className="relative w-full"
                        >
                            {/* We just wrap the children here, allowing individual tools to provide the card or dropzone design */}
                            {children}
                        </motion.div>
                    </div>

                </div>
            </main>

        </div>
    );
}
