"use client";
import React from "react";
import { motion } from "motion/react";
import {
    IconInfoCircle,
    IconSchool,
    IconCheck,
    IconPencil,
    IconInfinity,
    IconAlertTriangle,
} from "@tabler/icons-react";

export default function UsagePlans() {
    return (
        <section id="usage-plans" className="py-24 px-5 md:px-8" style={{ background: "#F7F6F3" }}>
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="max-w-2xl mb-14 mx-auto text-center"
                >
                    <p className="text-xs font-semibold uppercase tracking-widest text-brand-teal mb-3">
                        How It Works
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold text-brand-dark leading-tight">
                        Almost everything is free.
                    </h2>
                    <p className="mt-4 text-brand-sage text-lg leading-relaxed">
                        The vast majority of our tools are completely unlimited. We only cap the
                        <strong className="text-brand-dark"> Edit PDF</strong> tool to keep processing fast for everyone.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">

                    {/* Unlimited Tools Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.45, delay: 0.05 }}
                        className="flex flex-col p-7 rounded-2xl bg-white border border-[#E0DED9] shadow-sm relative overflow-hidden"
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#e6f4ef] text-[#047C58]">
                                <IconInfinity size={20} stroke={1.8} />
                            </span>
                            <div>
                                <h3 className="font-bold text-brand-dark text-base">All Other Tools</h3>
                                <p className="text-xs text-brand-sage">No limits, ever.</p>
                            </div>
                        </div>

                        <div className="bg-[#e6f4ef] rounded-xl p-4 flex items-center gap-3 mb-5 border border-[#a3d9c5]">
                            <span className="text-2xl font-black text-[#047C58] leading-none">∞</span>
                            <p className="text-sm font-semibold text-[#047C58]">Unlimited usage for everyone</p>
                        </div>

                        <div className="flex flex-col flex-1 gap-4">
                            <p className="text-sm leading-relaxed text-brand-sage">
                                <strong className="text-brand-dark font-semibold">Every single tool</strong> in our suite, except for the main PDF Editor, is completely unrestricted.
                            </p>
                            <ul className="flex flex-col gap-3 w-full mt-1">
                                <li className="flex items-start gap-2 text-sm text-brand-sage">
                                    <IconCheck size={14} className="text-[#047C58] shrink-0 mt-0.5" />
                                    <span>No file size or page count restrictions.</span>
                                </li>
                                <li className="flex items-start gap-2 text-sm text-brand-sage">
                                    <IconCheck size={14} className="text-[#047C58] shrink-0 mt-0.5" />
                                    <span>No daily or hourly usage limits.</span>
                                </li>
                                <li className="flex items-start gap-2 text-sm text-brand-sage">
                                    <IconCheck size={14} className="text-[#047C58] shrink-0 mt-0.5" />
                                    <span>No sign-up or credit card required.</span>
                                </li>
                            </ul>
                        </div>
                    </motion.div>

                    {/* Edit PDF Limit Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.45, delay: 0.15 }}
                        className="flex flex-col p-7 rounded-2xl bg-white border-2 border-[#047C58]/30 shadow-sm relative overflow-hidden"
                    >
                        {/* Badge */}
                        <div className="absolute top-4 right-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#047C58] bg-[#e6f4ef] px-2 py-0.5 rounded-full border border-[#a3d9c5]">
                                Edit PDF only
                            </span>
                        </div>

                        <div className="flex items-center gap-3 mb-5">
                            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#fff3cd] text-[#b45309]">
                                <IconPencil size={20} stroke={1.8} />
                            </span>
                            <div>
                                <h3 className="font-bold text-brand-dark text-base">Edit PDF Limit</h3>
                                <p className="text-xs text-brand-sage">Applies to the editor only.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-5">
                            <div className="bg-[#faf9f7] rounded-xl p-3.5 flex flex-col border border-[#E0DED9]">
                                <p className="text-[10px] font-bold text-brand-sage uppercase tracking-wider mb-1">No Login</p>
                                <p className="text-2xl font-black text-brand-dark leading-none">3 <span className="text-xs font-medium text-brand-sage">/ hr</span></p>
                            </div>
                            <div className="bg-[#e6f4ef] rounded-xl p-3.5 flex flex-col border border-[#a3d9c5]">
                                <p className="text-[10px] font-bold text-brand-teal uppercase tracking-wider mb-1">Logged In</p>
                                <p className="text-2xl font-black text-[#047C58] leading-none">10 <span className="text-xs font-medium">/ hr</span></p>
                            </div>
                        </div>

                        <ul className="flex flex-col gap-2.5 flex-1">
                            <li className="flex items-start gap-2 text-sm text-brand-sage leading-relaxed">
                                <IconAlertTriangle size={14} className="text-[#b45309] shrink-0 mt-0.5" />
                                <span>Limit resets <strong className="text-brand-dark">1 hour</strong> after your last edit.</span>
                            </li>
                            <li className="flex items-start gap-2 text-sm text-brand-sage leading-relaxed">
                                <IconCheck size={14} className="text-[#047C58] shrink-0 mt-0.5" />
                                <span>Login to triple your hourly allowance.</span>
                            </li>
                        </ul>

                        <div className="pt-5 mt-5 border-t border-[#E0DED9]">
                            <a
                                href="/login"
                                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#047C58] text-[#047C58] font-bold text-sm hover:bg-[#e6f4ef] transition-colors active:scale-[0.98]"
                            >
                                Login to Free Account
                            </a>
                        </div>
                    </motion.div>

                    {/* Edu Accounts Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.45, delay: 0.25 }}
                        className="flex flex-col p-7 rounded-2xl bg-brand-dark shadow-xl relative overflow-hidden"
                    >
                        {/* decorative graphic */}
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full"
                            style={{ background: "radial-gradient(circle, rgba(4,124,88,0.25) 0%, transparent 60%)" }}
                        />

                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center gap-3 mb-5">
                                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-teal text-white">
                                    <IconSchool size={20} stroke={1.8} />
                                </span>
                                <div>
                                    <h3 className="font-bold text-white text-base">Education is Free</h3>
                                    <p className="text-xs text-[#a09888]">For students and educators</p>
                                </div>
                            </div>

                            <p className="text-[#C9C4B5] text-[14px] leading-relaxed mb-5 font-medium">
                                We believe students and teachers shouldn&apos;t pay to get basic academic tasks done.
                            </p>

                            <div className="bg-[#2a1a05] border border-[#4a3010] rounded-xl p-4 mb-auto">
                                <p className="text-white text-sm font-semibold mb-2">Unlock unlimited Edit PDF:</p>
                                <ul className="flex flex-col gap-2">
                                    <li className="flex items-start gap-2 text-sm text-[#A09888]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-brand-teal shrink-0 mt-1.5" />
                                        <span>Register with an <strong>.edu</strong> email, or verify via a school ID/document.</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-sm text-[#A09888]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-brand-teal shrink-0 mt-1.5" />
                                        <span>Your account will immediately be completely unlimited.</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="pt-5 mt-5 border-t border-[#4a3010]">
                                <a
                                    href="/login"
                                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-teal text-white font-bold text-sm hover:bg-[#036649] transition-colors shadow-lg active:scale-[0.98]"
                                >
                                    Login with .edu Email
                                </a>
                            </div>
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
