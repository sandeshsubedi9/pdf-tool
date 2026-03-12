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
    IconRotateClockwise2,
} from "@tabler/icons-react";

// Pastel colour palette per category
const CAT_COLORS: Record<string, { bg: string; iconColor: string }> = {
    "convert-from": { bg: "#e0f2fe", iconColor: "#0369a1" }, // sky blue
    "convert-to":   { bg: "#eef2ff", iconColor: "#4338ca" }, // indigo
    "organise":     { bg: "#f0edff", iconColor: "#7c3aed" }, // violet
    "optimise":     { bg: "#fff8ed", iconColor: "#d97706" }, // amber
    "edit":         { bg: "#ecfdf5", iconColor: "#059669" }, // emerald
    "security":     { bg: "#fdf2f8", iconColor: "#be185d" }, // rose
};

const CF = CAT_COLORS["convert-from"];
const CT = CAT_COLORS["convert-to"];
const OR = CAT_COLORS["organise"];
const OP = CAT_COLORS["optimise"];
const ED = CAT_COLORS["edit"];
const SE = CAT_COLORS["security"];

const NAV_ITEMS = [
    {
        label: "Convert",
        href: "#convert",
        columns: [
            {
                title: "Convert from PDF",
                items: [
                    { label: "PDF to Word",       href: "/pdf-to-word",  icon: IconFileWord,      ...CF },
                    { label: "PDF to Excel",      href: "/pdf-to-excel", icon: IconTable,          ...CF },
                    { label: "PDF to PowerPoint", href: "/pdf-to-pptx",  icon: IconPresentation,  ...CF },
                    { label: "PDF to JPG",        href: "/pdf-to-jpg",   icon: IconPhoto,          ...CF },
                    { label: "PDF to ePub",       href: "/pdf-to-epub",  icon: IconFile,           ...CF },
                    { label: "PDF to PDF/A",      href: "/pdf-to-pdfa",  icon: IconFileTypePdf,   ...CF },
                    { label: "PDF to Text",       href: "/pdf-to-txt",   icon: IconFileCode,       ...CF },
                ],
            },
            {
                title: "Convert to PDF",
                items: [
                    { label: "Word to PDF",       href: "/word-to-pdf",  icon: IconFileArrowRight, ...CT },
                    { label: "Excel to PDF",      href: "/excel-to-pdf", icon: IconFileArrowRight, ...CT },
                    { label: "PowerPoint to PDF", href: "/pptx-to-pdf",  icon: IconFileArrowRight, ...CT },
                    { label: "Image to PDF",      href: "/jpg-to-pdf",   icon: IconPhoto,          ...CT },
                    { label: "HTML to PDF",       href: "/html-to-pdf",  icon: IconFileArrowRight, ...CT },
                ],
            }
        ],
    },
    {
        label: "Organise",
        href: "#organise",
        children: [
            { label: "Merge PDF",     href: "/merge-pdf",            icon: IconArrowsJoin2, ...OR },
            { label: "Split PDF",     href: "/split-pdf",            icon: IconScissors,    ...OR },
            { label: "Extract Pages", href: "/split-pdf?mode=extract", icon: IconCrop,      ...OR },
            { label: "Organise Pages",href: "/organise-pdf",         icon: IconStack,       ...OR },
        ],
    },
    {
        label: "Optimise",
        href: "#optimise",
        children: [
            { label: "Compress PDF", href: "/compress-pdf", icon: IconLayersSubtract, ...OP },
            { label: "Repair PDF",   href: "/repair-pdf",   icon: IconFileCheck,      ...OP },
            { label: "OCR PDF",      href: "#",             icon: IconScan,           ...OP },
        ],
    },
    {
        label: "Edit",
        href: "#edit",
        children: [
            { label: "Edit PDF",      href: "/edit-pdf",   icon: IconPencil,           ...ED },
            { label: "Rotate PDF",    href: "/rotate-pdf", icon: IconRotateClockwise2, ...ED },
            { label: "Translate PDF", href: "#",           icon: IconLanguage,         ...ED },
        ],
    },
    {
        label: "Security",
        href: "#security",
        children: [
            { label: "Protect PDF",  href: "/protect-pdf", icon: IconLock,     ...SE },
            { label: "Unlock PDF",   href: "/unlock-pdf",  icon: IconLockOpen, ...SE },
            { label: "Sign PDF",     href: "/sign-pdf",    icon: IconWriting,  ...SE },
            { label: "Watermark",    href: "#",            icon: IconDroplet,  ...SE },
            { label: "Redact PDF",   href: "/redact-pdf",  icon: IconEraser,   ...SE },
            { label: "Compare PDF",  href: "#",            icon: IconEye,      ...SE },
        ],
    },
    {
        label: "All Tools",
        href: "/#services",
        sections: [
            {
                title: "Organise", bg: OR.bg, iconColor: OR.iconColor,
                items: [
                    { label: "Merge PDF",      href: "/merge-pdf",              icon: IconArrowsJoin2, ...OR },
                    { label: "Split PDF",      href: "/split-pdf",              icon: IconScissors,    ...OR },
                    { label: "Extract Pages",  href: "/split-pdf?mode=extract", icon: IconCrop,        ...OR },
                    { label: "Organise Pages", href: "/organise-pdf",           icon: IconStack,       ...OR },
                ],
            },
            {
                title: "Optimise", bg: OP.bg, iconColor: OP.iconColor,
                items: [
                    { label: "Compress PDF", href: "/compress-pdf", icon: IconLayersSubtract, ...OP },
                    { label: "Repair PDF",   href: "/repair-pdf",   icon: IconFileCheck,      ...OP },
                    { label: "OCR PDF",      href: "#",             icon: IconScan,           ...OP },
                ],
            },
            {
                title: "Convert From PDF", bg: CF.bg, iconColor: CF.iconColor,
                items: [
                    { label: "PDF to Word",  href: "/pdf-to-word",  icon: IconFileWord,     ...CF },
                    { label: "PDF to Excel", href: "/pdf-to-excel", icon: IconTable,         ...CF },
                    { label: "PDF to PPT",   href: "/pdf-to-pptx",  icon: IconPresentation, ...CF },
                    { label: "PDF to JPG",   href: "/pdf-to-jpg",   icon: IconPhoto,         ...CF },
                    { label: "PDF to ePub",  href: "/pdf-to-epub",  icon: IconFile,          ...CF },
                    { label: "PDF to PDF/A", href: "/pdf-to-pdfa",  icon: IconFileTypePdf,  ...CF },
                    { label: "PDF to Text",  href: "/pdf-to-txt",   icon: IconFileCode,      ...CF },
                ],
            },
            {
                title: "Convert To PDF", bg: CT.bg, iconColor: CT.iconColor,
                items: [
                    { label: "Word to PDF",  href: "/word-to-pdf",  icon: IconFileArrowRight, ...CT },
                    { label: "Excel to PDF", href: "/excel-to-pdf", icon: IconFileArrowRight, ...CT },
                    { label: "PPT to PDF",   href: "/pptx-to-pdf",  icon: IconFileArrowRight, ...CT },
                    { label: "JPG to PDF",   href: "/jpg-to-pdf",   icon: IconPhoto,           ...CT },
                    { label: "HTML to PDF",  href: "/html-to-pdf",  icon: IconFileArrowRight, ...CT },
                ],
            },
            {
                title: "Edit", bg: ED.bg, iconColor: ED.iconColor,
                items: [
                    { label: "Edit PDF",      href: "/edit-pdf",   icon: IconPencil,           ...ED },
                    { label: "Rotate PDF",    href: "/rotate-pdf", icon: IconRotateClockwise2, ...ED },
                    { label: "Translate PDF", href: "#",           icon: IconLanguage,         ...ED },
                ],
            },
            {
                title: "Security", bg: SE.bg, iconColor: SE.iconColor,
                items: [
                    { label: "Protect PDF", href: "/protect-pdf", icon: IconLock,     ...SE },
                    { label: "Unlock PDF",  href: "/unlock-pdf",  icon: IconLockOpen, ...SE },
                    { label: "Sign PDF",    href: "/sign-pdf",    icon: IconWriting,  ...SE },
                    { label: "Watermark",   href: "#",            icon: IconDroplet,  ...SE },
                    { label: "Redact PDF",  href: "/redact-pdf",  icon: IconEraser,   ...SE },
                    { label: "Compare PDF", href: "#",            icon: IconEye,      ...SE },
                ],
            },
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
                <ul className="hidden md:flex items-center gap-1 h-full"> 
                    {NAV_ITEMS.map((item) => (
                        <li
                            key={item.label}
                            className="relative group h-full flex items-center"
                            onMouseEnter={() => setActiveDropdown(item.label)}
                            onMouseLeave={() => setActiveDropdown(null)}
                        >
                            <span
                                id={`nav-${item.label.toLowerCase()}`}
                                className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold text-brand-dark transition-all duration-200 cursor-pointer ${
                                    activeDropdown === item.label ? "bg-brand-teal/10" : "hover:bg-brand-teal/10"
                                }`}
                            >
                                {item.label}
                                <IconChevronDown
                                    size={14}
                                    className={`transition-transform duration-300 ${activeDropdown === item.label ? "rotate-180" : ""}`}
                                />
                            </span>

                            {/* Dropdown Container */}
                            {(item as any).sections ? (
                                <div
                                    className={`fixed top-[60px] pt-4 left-1/2 -translate-x-1/2 w-max z-50 transition-all duration-200 origin-top ${
                                        activeDropdown === item.label
                                            ? "opacity-100 scale-100 pointer-events-auto"
                                            : "opacity-0 scale-95 pointer-events-none"
                                    }`}
                                >
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.08)] overflow-hidden">
                                        <div className="p-6">
                                            <div className="grid grid-cols-6 gap-6">
                                                {(item as any).sections.map((section: any) => (
                                                    <div key={section.title} className="min-w-[170px]">
                                                        <div className="mb-4 pb-2 border-b border-slate-100">
                                                            <p className="text-[11px] font-bold uppercase tracking-widest text-brand-sage">
                                                                {section.title}
                                                            </p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            {section.items.map((child: any) => {
                                                                const Icon = child.icon;
                                                                return (
                                                                    <a
                                                                        key={child.label}
                                                                        href={child.href}
                                                                        className="group flex items-center gap-2.5 px-2 py-2 text-sm font-semibold text-brand-dark hover:bg-slate-100 rounded-lg transition-all duration-200"
                                                                    >
                                                                        {Icon && (
                                                                            <span
                                                                                className="flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-transform duration-200 group-hover:scale-110"
                                                                                style={{ background: child.bg, color: child.iconColor }}
                                                                            >
                                                                                <Icon size={15} />
                                                                            </span>
                                                                        )}
                                                                        <span className="group-hover:text-brand-dark">{child.label}</span>
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className={`absolute top-full pt-4 min-w-max transition-all duration-200 origin-top ${
                                        item.columns ? "left-0 w-[500px]" : "left-0 w-64"
                                    } ${
                                        activeDropdown === item.label
                                            ? "opacity-100 scale-100 pointer-events-auto"
                                            : "opacity-0 scale-95 pointer-events-none"
                                    }`}
                                >
                                    <div className="bg-white rounded-xl shadow-[0_8px_30px_rgba(30,23,2,0.12)] border border-border overflow-y-auto max-h-[80vh] custom-scrollbar">
                                        {item.columns ? (
                                            <div className={`grid gap-2 p-3 ${item.columns.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
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
                                                                        className="group flex items-center gap-2.5 px-2 py-2 text-sm font-semibold text-brand-dark hover:bg-slate-100 rounded-lg transition-all duration-200"
                                                                    >
                                                                        {Icon && (
                                                                            <span
                                                                                className="flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-transform duration-200 group-hover:scale-110"
                                                                                style={{ background: (child as any).bg || "#e6f4ef", color: (child as any).iconColor || "#047C58" }}
                                                                            >
                                                                                <Icon size={15} />
                                                                            </span>
                                                                        )}
                                                                        <span className="group-hover:text-brand-dark">{child.label}</span>
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-3 space-y-0.5">
                                                {item.children?.map((child) => {
                                                    const Icon = child.icon;
                                                    return (
                                                        <a
                                                            key={child.label}
                                                            href={child.href}
                                                            className="group flex items-center gap-2.5 px-2 py-2 text-sm font-semibold text-brand-dark hover:bg-slate-100 rounded-lg transition-all duration-200"
                                                        >
                                                            {Icon && (
                                                                <span
                                                                    className="flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-transform duration-200 group-hover:scale-110"
                                                                    style={{ background: (child as any).bg || "#e6f4ef", color: (child as any).iconColor || "#047C58" }}
                                                                >
                                                                    <Icon size={15} />
                                                                </span>
                                                            )}
                                                            <span className="group-hover:text-brand-dark">{child.label}</span>
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
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
                        {NAV_ITEMS.filter(item => item.label !== "All Tools").map((item) => (
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
                                                <div className={`grid gap-0.5 ${item.columns && item.columns.length === 3 ? "grid-cols-2" : "grid-cols-1"}`}>
                                                    {col.items.map((child) => {
                                                        const Icon = child.icon;
                                                        return (
                                                            <a
                                                                key={child.label}
                                                                href={child.href}
                                                                className="group flex items-center gap-3 px-2 py-1.5 text-sm font-semibold text-brand-dark hover:bg-slate-100 rounded-lg transition-all"
                                                                onClick={() => setMobileOpen(false)}
                                                            >
                                                                <span
                                                                    className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
                                                                    style={{ background: (child as any).bg || "#e6f4ef", color: (child as any).iconColor || "#047C58" }}
                                                                >
                                                                    {Icon && <Icon size={15} />}
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
                                                        className="group flex items-center gap-3 px-2 py-1.5 text-sm font-semibold text-brand-dark hover:bg-slate-100 rounded-lg transition-all"
                                                        onClick={() => setMobileOpen(false)}
                                                    >
                                                        <span
                                                            className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
                                                            style={{ background: (child as any).bg || "#e6f4ef", color: (child as any).iconColor || "#047C58" }}
                                                        >
                                                            {Icon && <Icon size={15} />}
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
