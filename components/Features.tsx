"use client";
import React from "react";
import { motion } from "motion/react";
import {
    IconShieldLock,
    IconDeviceLaptop,
    IconFreeRights,
    IconBolt,
} from "@tabler/icons-react";

const FEATURES = [
    {
        icon: IconShieldLock,
        title: "Your files stay private",
        body: "Every file you upload is processed securely on our backend and discarded immediately after your task completes. We do not read, store, or share your documents.",
        accent: "#047C58",
        bg: "#e6f4ef",
    },
    {
        icon: IconDeviceLaptop,
        title: "Works on any device",
        body: "PDFTool runs entirely in your browser. No downloads, no plugins, no OS restrictions. Works on Mac, Windows, Linux, iPhone, and Android.",
        accent: "#8C886B",
        bg: "#f0ede4",
    },
    {
        icon: IconFreeRights,
        title: "Free, with no hidden walls",
        body: "Most tools are completely free to use without creating an account. No watermarks on your output files, no credit card required to get started.",
        accent: "#047C58",
        bg: "#e6f4ef",
    },
    {
        icon: IconBolt,
        title: "Fast and straightforward",
        body: "Upload, process, download - that's the whole flow. Our toolset is deliberately simple so you can finish PDF tasks in seconds, not minutes.",
        accent: "#8C886B",
        bg: "#f0ede4",
    },
];

export default function Features() {
    return (
        <section id="features" className="py-24 px-5 md:px-8 bg-white">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="max-w-2xl mb-14"
                >
                    <p className="text-xs font-semibold uppercase tracking-widest text-brand-teal mb-3">
                        Why PDFTool
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold text-brand-dark leading-tight">
                        Built for people who work with PDFs every day.
                    </h2>
                    <p className="mt-4 text-brand-sage text-lg">
                        Fast, reliable, and thoughtfully designed - so you can get things done
                        without the hassle of heavy software or subscription paywalls.
                    </p>
                </motion.div>

                {/* Feature cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {FEATURES.map((f, i) => {
                        const Icon = f.icon;
                        return (
                            <motion.div
                                key={f.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.45, delay: i * 0.1 }}
                                className="flex flex-col gap-4 p-6 rounded-2xl border border-border hover:border-[#8C886B] transition-colors"
                            >
                                <span
                                    className="flex items-center justify-center w-11 h-11 rounded-xl"
                                    style={{ background: f.bg, color: f.accent }}
                                >
                                    <Icon size={22} stroke={1.8} />
                                </span>
                                <h3 className="font-semibold text-brand-dark text-base leading-snug">
                                    {f.title}
                                </h3>
                                <p className="text-sm text-brand-sage leading-relaxed">
                                    {f.body}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

