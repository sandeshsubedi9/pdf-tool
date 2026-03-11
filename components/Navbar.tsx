"use client";
import React, { useState, useEffect } from "react";
import {
    IconFileText,
    IconMenu2,
    IconX,
    IconChevronDown,

    // Tools icons
    IconArrowsJoin2,
    IconScissors,
    IconCrop,
    IconStack,
    IconLayersSubtract,
    IconFileCheck,
    IconScan,
    IconFileWord,
    IconTable,
    IconPresentation,
    IconPhoto,
    IconFile,
    IconFileTypePdf,
    IconFileCode,
    IconFileArrowRight,
    IconPencil,
    IconWriting,
    IconDroplet,
    IconEraser,
    IconEye,
    IconLanguage,
    IconLock,
    IconLockOpen,
    IconSearch,
    IconFiles,
    IconLayoutGrid,
} from "@tabler/icons-react";

const NAV_ITEMS = [
    {
        label: "Convert",
        href: "#convert",
        columns: [
            {
                title: "Convert from PDF",
                items: [
                    { label: "PDF to Word", href: "/pdf-to-word", icon: IconFileWord },
                    { label: "PDF to Excel", href: "/pdf-to-excel", icon: IconTable },
                    { label: "PDF to PowerPoint", href: "/pdf-to-pptx", icon: IconPresentation },
                    { label: "PDF to JPG", href: "/pdf-to-jpg", icon: IconPhoto },
                    { label: "PDF to ePub", href: "/pdf-to-epub", icon: IconFile },
                    { label: "PDF to PDF/A", href: "/pdf-to-pdfa", icon: IconFileTypePdf },
                    { label: "PDF to Text", href: "/pdf-to-txt", icon: IconFileCode },
                ],
            },
            {
                title: "Convert to PDF",
                items: [
                    { label: "Word to PDF", href: "/word-to-pdf", icon: IconFileArrowRight },
                    { label: "Excel to PDF", href: "/excel-to-pdf", icon: IconFileArrowRight },
                    { label: "PowerPoint to PDF", href: "/pptx-to-pdf", icon: IconFileArrowRight },
                    { label: "Image to PDF", href: "/jpg-to-pdf", icon: IconPhoto },
                    { label: "HTML to PDF", href: "/html-to-pdf", icon: IconFileArrowRight },
                ],
            }
        ],
    },
    {
        label: "Organise",
        href: "#organise",
        children: [
            { label: "Merge PDF", href: "/merge-pdf", icon: IconArrowsJoin2 },
            { label: "Split PDF", href: "/split-pdf", icon: IconScissors },
            { label: "Extract Pages", href: "/split-pdf?mode=extract", icon: IconCrop },
            { label: "Organise Pages", href: "/organise-pdf", icon: IconStack },
        ],
    },
    {
        label: "Optimise",
        href: "#optimise",
        children: [
            { label: "Compress PDF", href: "/compress-pdf", icon: IconLayersSubtract },
            { label: "Repair PDF", href: "/repair-pdf", icon: IconFileCheck },
            { label: "OCR PDF", href: "#", icon: IconScan },
        ],
    },
    {
        label: "Edit",
        href: "#edit",
        children: [
            { label: "Edit PDF", href: "/edit-pdf", icon: IconPencil },
            { label: "Sign PDF", href: "/sign-pdf", icon: IconWriting },
            { label: "Watermark", href: "#", icon: IconDroplet },
            { label: "Redact PDF", href: "/redact-pdf", icon: IconEraser },
            { label: "Compare PDF", href: "#", icon: IconEye },
            { label: "Translate PDF", href: "#", icon: IconLanguage },
        ],
    },
    {
        label: "Security",
        href: "#security",
        children: [
            { label: "Protect PDF", href: "/protect-pdf", icon: IconLock },
            { label: "Unlock PDF", href: "/unlock-pdf", icon: IconLockOpen },
        ],
    },
    {
        label: "All Tools",
        href: "/#services",
        children: [
            { label: "View All Tools", href: "/#services", icon: IconLayoutGrid },
        ],
    },
];

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileOpen]);

    return (
        <header
            className={`fixed top-0 inset-x-0 z-50 transition-[background-color,box-shadow] duration-300 ${scrolled || mobileOpen
                ? "bg-white shadow-[0_1px_16px_rgba(30,23,2,0.08)]"
                : "bg-transparent"
                }`}
        >
            <nav className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
                {/* Logo */}
                <a href="/" id="nav-logo" className="flex items-center gap-2 group">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-teal text-white">
                        <IconFileText size={18} stroke={2} />
                    </span>
                    <span
                        className="font-bold text-lg tracking-tight text-brand-dark"
                        style={{ fontFamily: "var(--font-inter)" }}
                    >
                        PDF<span className="text-brand-teal">Tool</span>
                    </span>
                </a>

                {/* Desktop Nav */}
                <ul className="hidden md:flex items-center gap-1">
                    {NAV_ITEMS.map((item) => (
                        <li
                            key={item.label}
                            className="relative group"
                            onMouseEnter={() => setActiveDropdown(item.label)}
                            onMouseLeave={() => setActiveDropdown(null)}
                        >
                            <span
                                id={`nav-${item.label.toLowerCase()}`}
                                className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold text-brand-dark hover:text-brand-teal hover:bg-brand-teal-lt transition-all duration-200 cursor-pointer"
                            >
                                {item.label}
                                <IconChevronDown
                                    size={14}
                                    className={`transition-transform duration-300 ${activeDropdown === item.label ? "rotate-180" : ""
                                        }`}
                                />
                            </span>
                            {/* Dropdown Container (Bridge) */}
                            <div
                                className={`absolute top-full left-0 pt-5 ${item.columns ? "w-[500px]" : "w-64"} transition-all duration-200 origin-top ${activeDropdown === item.label
                                    ? "opacity-100 scale-100 pointer-events-auto"
                                    : "opacity-0 scale-95 pointer-events-none"
                                    }`}
                            >
                                <div className="bg-white rounded-xl shadow-[0_8px_30px_rgba(30,23,2,0.12)] border border-border overflow-y-auto max-h-[75vh] custom-scrollbar">
                                    {item.columns ? (
                                        <div className="grid grid-cols-2 gap-2 p-3">
                                            {item.columns.map((col) => (
                                                <div key={col.title}>
                                                    <p className="px-3 py-2 mb-1 text-[11px] font-bold uppercase tracking-widest text-brand-sage">
                                                        {col.title}
                                                    </p>
                                                    <div className="space-y-0.5">
                                                        {col.items.map((child) => {
                                                            const Icon = child.icon;
                                                            return (
                                                                <a
                                                                    key={child.label}
                                                                    href={child.href}
                                                                    className="group flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-brand-dark hover:bg-brand-teal-lt hover:text-brand-teal rounded-lg transition-all duration-200"
                                                                >
                                                                    {Icon && <Icon size={18} className="text-brand-sage group-hover:text-brand-teal transition-colors" />}
                                                                    <span>{child.label}</span>
                                                                </a>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-2 space-y-0.5">
                                            {item.children?.map((child) => {
                                                const Icon = child.icon;
                                                return (
                                                    <a
                                                        key={child.label}
                                                        href={child.href}
                                                        className="group flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-brand-dark hover:bg-brand-teal-lt hover:text-brand-teal rounded-lg transition-all duration-200"
                                                    >
                                                        {Icon && <Icon size={18} className="text-brand-sage group-hover:text-brand-teal transition-colors" />}
                                                        <span>{child.label}</span>
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>

                {/* CTA */}
                <div className="hidden md:flex items-center gap-3">
                    <a
                        href="#login"
                        id="nav-login"
                        className="px-4 py-2 text-sm font-medium text-brand-dark hover:text-brand-teal transition-colors"
                    >
                        Log in
                    </a>
                    <a
                        href="#signup"
                        id="nav-signup"
                        className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-brand-teal text-white hover:bg-[#036649] transition-all cursor-pointer shadow-md active:scale-[0.98]"
                    >
                        Get Started
                    </a>
                </div>

                {/* Mobile burger */}
                <button
                    id="nav-mobile-toggle"
                    className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-brand-dark hover:bg-brand-light transition-colors"
                    onClick={() => setMobileOpen((v) => !v)}
                    aria-label="Toggle menu"
                >
                    {mobileOpen ? <IconX size={20} /> : <IconMenu2 size={20} />}
                </button>
            </nav>

            {/* Mobile menu */}
            <div
                className={`md:hidden fixed inset-x-0 top-16 h-[calc(100vh-64px)] bg-white border-t border-border transition-all duration-300 z-50 flex flex-col ${mobileOpen ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0 pointer-events-none"
                    }`}
            >
                {/* Scrollable area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4">
                    <div className="flex flex-col gap-0.5">
                        {NAV_ITEMS.map((item) => (
                            <div key={item.label} className="mb-2">
                                <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-teal/70 mb-0.5">
                                    {item.label}
                                </p>
                                <div className="space-y-0.5">
                                    {item.columns ? (
                                        item.columns.map(col => (
                                            <div key={col.title} className="mb-1.5 last:mb-0">
                                                <p className="px-3 py-0.5 text-[9px] font-bold uppercase tracking-widest text-brand-sage opacity-50">
                                                    {col.title}
                                                </p>
                                                <div className="grid grid-cols-1 gap-0.5">
                                                    {col.items.map((child) => {
                                                        const Icon = child.icon;
                                                        return (
                                                            <a
                                                                key={child.label}
                                                                href={child.href}
                                                                className="group flex items-center gap-3 px-3 py-1.5 text-sm font-semibold text-brand-dark hover:text-brand-teal hover:bg-brand-teal-lt rounded-lg transition-all"
                                                                onClick={() => setMobileOpen(false)}
                                                            >
                                                                <span className="flex items-center justify-center w-7 h-7 rounded-md bg-slate-50 text-brand-sage group-hover:bg-white group-hover:text-brand-teal transition-colors border border-slate-100 shrink-0">
                                                                    {Icon && <Icon size={16} />}
                                                                </span>
                                                                <span className="truncate">{child.label}</span>
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="grid grid-cols-1 gap-0.5">
                                            {item.children?.map((child) => {
                                                const Icon = child.icon;
                                                return (
                                                    <a
                                                        key={child.label}
                                                        href={child.href}
                                                        className="group flex items-center gap-3 px-3 py-1.5 text-sm font-semibold text-brand-dark hover:text-brand-teal hover:bg-brand-teal-lt rounded-lg transition-all"
                                                        onClick={() => setMobileOpen(false)}
                                                    >
                                                        <span className="flex items-center justify-center w-7 h-7 rounded-md bg-slate-50 text-brand-sage group-hover:bg-white group-hover:text-brand-teal transition-colors border border-slate-100 shrink-0">
                                                            {Icon && <Icon size={16} />}
                                                        </span>
                                                        <span className="truncate">{child.label}</span>
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sticky Bottom Buttons */}
                <div className="p-6 border-t border-border bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
                    <div className="flex gap-3">
                        <a
                            href="#login"
                            className="flex-1 py-3.5 text-center text-sm font-bold border border-slate-200 rounded-xl text-brand-dark hover:bg-slate-50 transition-all active:scale-[0.98]"
                            onClick={() => setMobileOpen(false)}
                        >
                            Log in
                        </a>
                        <a
                            href="#signup"
                            className="flex-1 py-3.5 text-center text-sm font-bold rounded-xl bg-brand-teal text-white hover:bg-[#036649] transition-all active:scale-[0.98] shadow-md shadow-brand-teal/10"
                            onClick={() => setMobileOpen(false)}
                        >
                            Get Started
                        </a>
                    </div>
                </div>
            </div>
        </header>
    );
}
