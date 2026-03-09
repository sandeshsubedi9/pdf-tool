"use client";
import React from "react";
import { motion } from "motion/react";
import { IconShieldLock, IconDeviceLaptop, IconInfinity, IconLanguage } from "@tabler/icons-react";

const FEATURES = [
    {
        icon: IconShieldLock,
        title: "Your files stay private",
        body: "All uploaded files are processed on encrypted servers and automatically deleted after one hour. We never store or share your data.",
        accent: "#047C58",
        bg: "#e6f4ef",
    },
    {
        icon: IconDeviceLaptop,
        title: "Works on any device",
        body: "PDFTool runs fully in your browser. There is no app to download or plugin to install. Works on Mac, Windows, Linux, iPhone and Android.",
        accent: "#8C886B",
        bg: "#f0ede4",
    },
    {
        icon: IconInfinity,
        title: "Unlimited & always free",
        body: "Every tool on PDFTool is free to use without limits. No watermarks, no hidden fees, and no account required.",
        accent: "#342005",
        bg: "#ede9de",
    },
    {
        icon: IconLanguage,
        title: "Available worldwide",
        body: "PDFTool is available in 25+ languages, serving users from more than 180 countries around the globe.",
        accent: "#047C58",
        bg: "#e6f4ef",
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
                        Fast, reliable, and thoughtfully designed so you can get things done
                        without the hassle.
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

                {/* Stats strip */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 pt-12 border-t border-border"
                >
                    {[
                        { value: "2M+", label: "Active Users" },
                        { value: "36", label: "PDF Tools" },
                        { value: "180+", label: "Countries" },
                        { value: "25+", label: "Languages" },
                    ].map((stat) => (
                        <div key={stat.label} className="text-center">
                            <p className="text-3xl font-bold text-brand-teal">{stat.value}</p>
                            <p className="text-sm text-brand-sage mt-1">{stat.label}</p>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
