"use client";
import React from "react";
import { motion } from "motion/react";
import {
    IconInfoCircle,
    IconSchool,
    IconArrowRight,
    IconCheck,
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
                        Usage Limits
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold text-brand-dark leading-tight">
                        Fair usage, kept simple.
                    </h2>
                    <p className="mt-4 text-brand-sage text-lg leading-relaxed">
                        To keep the service fast and available for everyone, we enforce a transparent usage cap based on either your account status or email type.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

                    {/* Standard Limits Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.45, delay: 0.1 }}
                        className="flex flex-col p-8 rounded-2xl bg-white border border-[#E0DED9] shadow-sm relative overflow-hidden"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#f0ede4] text-[#8C886B]">
                                <IconInfoCircle size={20} stroke={1.8} />
                            </span>
                            <div>
                                <h3 className="font-bold text-brand-dark text-lg">Standard Limits</h3>
                                <p className="text-xs text-brand-sage">Limits are based on your login status.</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6 flex-1">
                            {/* Limit breakdown */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#faf9f7] rounded-xl p-4 flex flex-col justify-center border border-[#E0DED9]">
                                    <p className="text-[10px] font-bold text-brand-sage uppercase tracking-wider mb-1">Without Login</p>
                                    <p className="text-2xl font-black text-brand-dark leading-none">3 <span className="text-sm font-medium text-brand-sage">/ hr</span></p>
                                </div>
                                <div className="bg-[#e6f4ef] rounded-xl p-4 flex flex-col justify-center border border-[#a3d9c5]">
                                    <p className="text-[10px] font-bold text-brand-teal uppercase tracking-wider mb-1">Logged In</p>
                                    <p className="text-2xl font-black text-[#047C58] leading-none">10 <span className="text-sm font-medium">/ hr</span></p>
                                </div>
                            </div>

                            {/* Timer explanation */}
                            <ul className="flex flex-col gap-3 mt-2">
                                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                                    <IconCheck size={16} className="text-[#047C58] shrink-0 mt-0.5" />
                                    <span>If you hit your limit, just wait <strong>1 hour from your last action</strong> and you can continue.</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                                    <IconCheck size={16} className="text-[#047C58] shrink-0 mt-0.5" />
                                    <span>Limits apply across all PDF tools combined.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="pt-6 mt-6 border-t border-[#E0DED9]">
                            <a
                                href="/signup"
                                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#047C58] text-[#047C58] font-bold text-sm hover:bg-[#e6f4ef] transition-colors active:scale-[0.98]"
                            >
                                Create a Free Account
                            </a>
                        </div>
                    </motion.div>

                    {/* Edu Accounts Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.45, delay: 0.2 }}
                        className="flex flex-col p-8 rounded-2xl bg-brand-dark shadow-xl relative overflow-hidden"
                    >
                        {/* decorative graphic */}
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full"
                            style={{ background: "radial-gradient(circle, rgba(4,124,88,0.25) 0%, transparent 60%)" }}
                        />

                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-teal text-white">
                                    <IconSchool size={20} stroke={1.8} />
                                </span>
                                <div>
                                    <h3 className="font-bold text-white text-lg">Education is Free</h3>
                                    <p className="text-xs text-[#a09888]">For students and educators</p>
                                </div>
                            </div>

                            <p className="text-[#C9C4B5] text-[15px] leading-relaxed mb-6 font-medium">
                                We believe students and teachers shouldn't have to pay to get basic academic tasks done.
                            </p>

                            <div className="bg-[#2a1a05] border border-[#4a3010] rounded-xl p-5 mb-auto">
                                <p className="text-white text-sm font-semibold mb-2">How to unlock unlimited usage:</p>
                                <ul className="flex flex-col gap-2">
                                    <li className="flex items-start gap-2.5 text-sm text-[#A09888]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-brand-teal shrink-0 mt-1.5" />
                                        <span>Create an account with an <strong>.edu</strong> email, or verify via a valid school ID/document.</span>
                                    </li>
                                    <li className="flex items-start gap-2.5 text-sm text-[#A09888]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-brand-teal shrink-0 mt-1.5" />
                                        <span>Your account will immediately process as completely unlimited for all tools.</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="pt-6 mt-6 border-t border-[#4a3010]">
                                <a
                                    href="/signup"
                                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-teal text-white font-bold text-sm hover:bg-[#036649] transition-colors shadow-lg active:scale-[0.98]"
                                >
                                    Sign Up with .edu Email
                                </a>
                            </div>
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
