"use client";
import React from "react";
import Navbar from "@/components/Navbar";
import { motion } from "motion/react";

interface ToolLayoutProps {
    title: string;
    description: string;
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
        <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "var(--brand-white)" }}>
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

            {/* Main split layout flex container */}
            <main className="flex-1 max-w-7xl mx-auto px-5 md:px-8 w-full py-12 md:py-0 relative z-10 flex flex-col justify-center">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full">

                    {/* ── LEFT COLUMN ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="flex flex-col gap-6"
                    >
                        <div className="flex items-center gap-4">
                            <span
                                className="flex items-center justify-center w-14 h-14 rounded-2xl text-white shrink-0 shadow-sm"
                                style={{ background: accentColor }}
                            >
                                {icon}
                            </span>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-teal-lt border border-[#bce0d5] text-xs font-semibold text-brand-teal tracking-wide w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse" />
                                Free Online PDF Tool
                            </div>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold leading-[1.15] tracking-tight text-brand-dark">
                            {title}
                        </h1>

                        <p className="text-lg text-brand-sage leading-relaxed max-w-md">
                            {description}
                        </p>


                    </motion.div>

                    {/* ── RIGHT COLUMN – Interactive Tool Area ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 0.6,
                            ease: [0.22, 1, 0.36, 1],
                            delay: 0.15,
                        }}
                        className="relative"
                    >
                        {/* We just wrap the children here, allowing individual tools to provide the card or dropzone design */}
                        {children}
                    </motion.div>

                </div>
            </main>

        </div>
    );
}
