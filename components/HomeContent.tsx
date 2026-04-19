"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    IconPencil,
    IconArrowsJoin2,
    IconLayersSubtract,
    IconArrowsRightLeft,
    IconShieldLock,
    IconUsers,
    IconSchool,
    IconUser,
    IconArrowRight,
    IconPlus,
    IconMinus,
    IconUpload,
    IconSettings,
    IconDownload,
    IconRotateClockwise2,
    IconEraser,
    IconDroplet,
    IconWriting,
    IconEye,
    IconScissors,
    IconStack,
    IconFileMinus,
    IconCrop,
    IconListNumbers,
    IconLanguage,
    IconScan,
    IconFileCheck,
    IconFileWord,
    IconTable,
    IconPresentation,
    IconPhoto,
    IconFileArrowRight,
    IconLock,
    IconLockOpen,
    IconPhotoSearch,
} from "@tabler/icons-react";

// ─────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────

const TOOL_CATEGORIES = [
    {
        id: "edit",
        label: "Edit & Annotate",
        icon: IconPencil,
        accent: "#059669",
        bg: "#ecfdf5",
        heading: "Full control over your document content",
        description:
            "Our PDF editor lets you add and edit text, insert images, draw shapes, and annotate pages - directly in your browser, without needing the original source file. It's the fastest way to fix a typo in a contract, add a signature line, or annotate a report before sharing.",
        tools: [
            { icon: IconPencil, label: "Edit PDF", href: "/edit-pdf" },
            { icon: IconRotateClockwise2, label: "Rotate PDF", href: "/rotate-pdf" },
            { icon: IconCrop, label: "Crop PDF", href: "/crop-pdf" },
            { icon: IconListNumbers, label: "Page Numbers", href: "/page-number-pdf" },
            { icon: IconDroplet, label: "Watermark", href: "/watermark-pdf" },
            { icon: IconEraser, label: "Redact PDF", href: "/redact-pdf" },
            { icon: IconLanguage, label: "Translate PDF", href: "/translate-pdf" },
        ],
    },
    {
        id: "organise",
        label: "Organise",
        icon: IconArrowsJoin2,
        accent: "#7c3aed",
        bg: "#f0edff",
        heading: "Tame multi-page documents in seconds",
        description:
            "Whether you're combining five separate reports into one submission or splitting a 200-page textbook into individual chapters, our organise tools handle it all visually. Drag pages around, delete blanks, extract exactly what you need.",
        tools: [
            { icon: IconArrowsJoin2, label: "Merge PDF", href: "/merge-pdf" },
            { icon: IconScissors, label: "Split PDF", href: "/split-pdf" },
            { icon: IconCrop, label: "Extract Pages", href: "/split-pdf?mode=extract" },
            { icon: IconFileMinus, label: "Remove Pages", href: "/remove-pages" },
            { icon: IconStack, label: "Organise Pages", href: "/organise-pdf" },
        ],
    },
    {
        id: "optimise",
        label: "Optimise",
        icon: IconLayersSubtract,
        accent: "#d97706",
        bg: "#fff8ed",
        heading: "Smaller files, searchable scans, repaired documents",
        description:
            "Our compression engine significantly reduces file sizes while keeping text readable - ideal for email attachments or portal uploads with strict size limits. The OCR tool makes scanned PDFs fully searchable and selectable, and Repair PDF can salvage documents that refuse to open.",
        tools: [
            { icon: IconLayersSubtract, label: "Compress PDF", href: "/compress-pdf" },
            { icon: IconScan, label: "OCR PDF", href: "/ocr-pdf" },
            { icon: IconFileCheck, label: "Repair PDF", href: "/repair-pdf" },
        ],
    },
    {
        id: "convert",
        label: "Convert",
        icon: IconArrowsRightLeft,
        accent: "#0369a1",
        bg: "#e0f2fe",
        heading: "Switch formats without losing your layout",
        description:
            "Our conversion engine covers both directions - turning PDFs into editable Office documents and locking Office files into permanent PDFs. Tables, fonts, and images are preserved as faithfully as the format allows, saving you hours of reformatting.",
        tools: [
            { icon: IconFileWord, label: "PDF to Word", href: "/pdf-to-word" },
            { icon: IconTable, label: "PDF to Excel", href: "/pdf-to-excel" },
            { icon: IconPresentation, label: "PDF to PowerPoint", href: "/pdf-to-pptx" },
            { icon: IconPhoto, label: "PDF to JPG", href: "/pdf-to-jpg" },
            { icon: IconFileArrowRight, label: "Word to PDF", href: "/word-to-pdf" },
            { icon: IconFileArrowRight, label: "Excel to PDF", href: "/excel-to-pdf" },
            { icon: IconFileArrowRight, label: "PowerPoint to PDF", href: "/pptx-to-pdf" },
            { icon: IconFileArrowRight, label: "Image to PDF", href: "/jpg-to-pdf" },
            { icon: IconFileArrowRight, label: "HTML to PDF", href: "/html-to-pdf" },
        ],
    },
    {
        id: "security",
        label: "Sign & Secure",
        icon: IconShieldLock,
        accent: "#be185d",
        bg: "#fdf2f8",
        heading: "Sign contracts, protect sensitive files, verify changes",
        description:
            "Draw, type, or upload your signature and place it anywhere on the page - no printer required. Protect files with password encryption, permanently redact sensitive content, or use Compare PDF to spot what changed between two document versions.",
        tools: [
            { icon: IconWriting, label: "Sign PDF", href: "/sign-pdf" },
            { icon: IconLock, label: "Protect PDF", href: "/protect-pdf" },
            { icon: IconLockOpen, label: "Unlock PDF", href: "/unlock-pdf" },
            { icon: IconEraser, label: "Redact PDF", href: "/redact-pdf" },
            { icon: IconEye, label: "Compare PDF", href: "/compare-pdf" },
            { icon: IconPhotoSearch, label: "Extract Images", href: "/extract-images" },
        ],
    },
];

const USE_CASES = [
    {
        icon: IconUsers,
        label: "Professionals & Teams",
        accent: "#047C58",
        bg: "#e6f4ef",
        points: [
            "Merge contracts and annexures into a single clean submission",
            "Compress large scan bundles before emailing to clients",
            "Sign agreements digitally - no printing or scanning needed",
            "Permanently redact client data before sharing reports externally",
            "Convert PDF tables to Excel for quick financial analysis",
            "Compare two document versions to catch revision differences",
        ],
    },
    {
        icon: IconSchool,
        label: "Students & Educators",
        accent: "#7c3aed",
        bg: "#f0edff",
        points: [
            "Run OCR on scanned lecture notes to make them searchable",
            "Split a textbook PDF to extract only the chapters you need",
            "Merge essays and appendices into one final submission file",
            "Convert assignments to PDF so formatting stays intact on submission",
            "Translate a research paper while preserving its original layout",
            "Add page numbers to a portfolio before sharing with a professor",
        ],
    },
    {
        icon: IconUser,
        label: "Individuals & Freelancers",
        accent: "#d97706",
        bg: "#fff8ed",
        points: [
            "Edit a resume without needing the original design file",
            "Password-protect tax documents or personal records",
            "Sign a rental agreement or freelance contract from your phone",
            "Convert scanned receipts into organised, searchable PDFs",
            "Compress large PDFs to fit within email attachment limits",
            "Add a watermark to draft documents before sending for review",
        ],
    },
];

const HOW_IT_WORKS = [
    {
        step: "01",
        icon: IconUpload,
        title: "Pick your tool and upload",
        body: "Choose the task from the tools grid - merge, compress, convert, sign, and more. Drag and drop your file or click to browse. Most tools also accept files from your phone.",
    },
    {
        step: "02",
        icon: IconSettings,
        title: "Adjust and process",
        body: "Set any options relevant to your task - page ranges, compression level, output format, or signature placement. Then let our backend do the work. Processing typically takes a few seconds.",
    },
    {
        step: "03",
        icon: IconDownload,
        title: "Download your result",
        body: "Your processed file is ready to download instantly. Files are automatically removed from our servers after your session, so nothing is kept on our end.",
    },
];

const FAQS = [
    {
        q: "Is PDFTool really free?",
        a: "Yes. The majority of our tools - including editing, merging, splitting, compressing, and converting - are free to use without creating an account. We don't add watermarks to output files on our free tools.",
    },
    {
        q: "Can I edit text in a scanned PDF?",
        a: "Yes. First run the file through our OCR PDF tool. Once OCR is applied, the text in the scanned document becomes selectable and searchable. You can then open it in the Edit PDF tool to make changes.",
    },
    {
        q: "How much can I compress a PDF?",
        a: "It varies depending on how image-heavy the file is. Our compressor optimises embedded images and removes redundant data. Files with lots of high-resolution scans typically see the biggest size reduction.",
    },
    {
        q: "Is it safe to upload sensitive documents?",
        a: "All file transfers use SSL encryption. Files are processed on our secure backend and deleted after your session. We do not read, index, or store the contents of your documents.",
    },
    {
        q: "Can I sign a PDF from my phone?",
        a: "Yes. PDFTool is fully responsive and works in any modern mobile browser. You can draw a signature with your finger, type one, or upload an existing signature image.",
    },
    {
        q: "Does converting from PDF preserve formatting?",
        a: "Our conversion engine makes a strong effort to preserve tables, headings, fonts, and images. Very complex layouts may need minor touch-ups, but the result is far faster to work with than starting from scratch.",
    },
    {
        q: "Do I need to sign up?",
        a: "No account is required for most tools. You can get started immediately. Creating a free account unlocks saved preferences and slightly higher usage limits on compute-intensive tasks like OCR and conversion.",
    },
];

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
    const [open, setOpen] = useState(false);
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.06 }}
            className="border border-border rounded-2xl overflow-hidden"
        >
            <button
                id={`faq-${index}`}
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-6 py-5 text-left bg-white hover:bg-[#faf9f7] transition-colors cursor-pointer"
            >
                <span className="font-semibold text-brand-dark text-sm md:text-base pr-4">{q}</span>
                <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-[#f0ede4] text-brand-sage">
                    {open ? <IconMinus size={14} stroke={2.5} /> : <IconPlus size={14} stroke={2.5} />}
                </span>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <p className="px-6 pb-5 text-sm text-brand-sage leading-relaxed border-t border-border pt-4 bg-[#faf9f7]">
                            {a}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function HomeContent() {
    const [activeCategory, setActiveCategory] = useState("edit");
    const category = TOOL_CATEGORIES.find((c) => c.id === activeCategory)!;
    const CategoryIcon = category.icon;

    return (
        <>
            {/* ═══════════════════════════════════════════════
                SECTION 1 - Tool Deep-Dives
            ═══════════════════════════════════════════════ */}
            <section id="tool-categories" className="py-24 px-5 md:px-8 bg-white">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-12"
                    >
                        <p className="text-xs font-semibold uppercase tracking-widest text-brand-teal mb-3">
                            What you can do
                        </p>
                        <h2 className="text-3xl md:text-4xl font-bold text-brand-dark">
                            Every tool, built and working
                        </h2>
                        <p className="mt-3 text-brand-sage text-lg max-w-xl mx-auto">
                            Browse by category to see exactly what each tool does - and link straight to it.
                        </p>
                    </motion.div>

                    {/* Category tabs */}
                    <div className="flex flex-wrap justify-center gap-2 mb-10">
                        {TOOL_CATEGORIES.map((cat) => {
                            const CatIcon = cat.icon;
                            const isActive = activeCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    id={`cat-tab-${cat.id}`}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all border cursor-pointer active:scale-[0.98]"
                                    style={
                                        isActive
                                            ? {
                                                  backgroundColor: cat.bg,
                                                  color: cat.accent,
                                                  borderColor: cat.accent,
                                              }
                                            : {
                                                  background: "#fff",
                                                  color: "#8C886B",
                                                  borderColor: "#E0DED9",
                                              }
                                    }
                                >
                                    <CatIcon size={15} stroke={2} />
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Detail panel */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeCategory}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.3 }}
                            className="rounded-3xl border border-border overflow-hidden"
                            style={{ background: category.bg }}
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                                {/* Left - text */}
                                <div className="p-8 md:p-12 flex flex-col gap-5 justify-center">
                                    <span
                                        className="flex items-center justify-center w-12 h-12 rounded-2xl self-start"
                                        style={{ background: "#fff", color: category.accent }}
                                    >
                                        <CategoryIcon size={24} stroke={1.8} />
                                    </span>
                                    <h3 className="text-2xl md:text-3xl font-bold text-brand-dark leading-snug">
                                        {category.heading}
                                    </h3>
                                    <p className="text-brand-sage leading-relaxed text-base">
                                        {category.description}
                                    </p>
                                </div>

                                {/* Right - tool grid */}
                                <div className="p-8 md:p-12 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-border/40">
                                    <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: category.accent }}>
                                        Tools in this category
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {category.tools.map((tool) => {
                                            const TIcon = tool.icon;
                                            return (
                                                <a
                                                    key={tool.label}
                                                    href={tool.href}
                                                    id={`cat-tool-${tool.label.replace(/\s+/g, "-").toLowerCase()}`}
                                                    className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-border hover:border-current hover:shadow-sm transition-all group"
                                                    style={{ color: category.accent } as React.CSSProperties}
                                                >
                                                    <TIcon size={17} stroke={1.8} />
                                                    <span className="text-sm font-medium text-brand-dark group-hover:text-current transition-colors">
                                                        {tool.label}
                                                    </span>
                                                    <IconArrowRight
                                                        size={13}
                                                        className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                                    />
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════
                SECTION 2 - Who uses PDFTool
            ═══════════════════════════════════════════════ */}
            <section id="use-cases" className="py-24 px-5 md:px-8" style={{ background: "#F7F6F3" }}>
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-14"
                    >
                        <p className="text-xs font-semibold uppercase tracking-widest text-brand-teal mb-3">
                            Use cases
                        </p>
                        <h2 className="text-3xl md:text-4xl font-bold text-brand-dark">
                            Who uses PDFTool?
                        </h2>
                        <p className="mt-3 text-brand-sage text-lg max-w-xl mx-auto">
                            Real workflows for real people - no one-size-fits-all pitch.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {USE_CASES.map((uc, i) => {
                            const UCIcon = uc.icon;
                            return (
                                <motion.div
                                    key={uc.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.45, delay: i * 0.1 }}
                                    className="bg-white rounded-2xl border border-border p-7 flex flex-col gap-5 shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className="flex items-center justify-center w-10 h-10 rounded-xl"
                                            style={{ background: uc.bg, color: uc.accent }}
                                        >
                                            <UCIcon size={20} stroke={1.8} />
                                        </span>
                                        <h3 className="font-bold text-brand-dark">{uc.label}</h3>
                                    </div>
                                    <ul className="flex flex-col gap-2.5">
                                        {uc.points.map((point) => (
                                            <li key={point} className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                                                <span
                                                    className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                    style={{ background: uc.accent }}
                                                />
                                                {point}
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════
                SECTION 3 - How it works
            ═══════════════════════════════════════════════ */}
            <section id="how-it-works" className="py-24 px-5 md:px-8 bg-white">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-14"
                    >
                        <p className="text-xs font-semibold uppercase tracking-widest text-brand-teal mb-3">
                            How it works
                        </p>
                        <h2 className="text-3xl md:text-4xl font-bold text-brand-dark">
                            Three steps, every time
                        </h2>
                        <p className="mt-3 text-brand-sage text-lg max-w-md mx-auto">
                            We keep the workflow consistent across all 30+ tools so there's no learning curve.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                        {/* Connector line (desktop only) */}
                        <div
                            aria-hidden
                            className="hidden md:block absolute top-10 left-[calc(16.666%+2rem)] right-[calc(16.666%+2rem)] h-px"
                            style={{ background: "linear-gradient(to right, #E0DED9 0%, #047C58 50%, #E0DED9 100%)", opacity: 0.5 }}
                        />

                        {HOW_IT_WORKS.map((step, i) => {
                            const SIcon = step.icon;
                            return (
                                <motion.div
                                    key={step.step}
                                    initial={{ opacity: 0, y: 24 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.45, delay: i * 0.12 }}
                                    className="flex flex-col items-center text-center gap-4"
                                >
                                    <div className="relative">
                                        <span className="flex items-center justify-center w-20 h-20 rounded-2xl bg-brand-teal-lt border border-[#bce0d5] text-brand-teal shadow-sm">
                                            <SIcon size={30} stroke={1.6} />
                                        </span>
                                        <span className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 rounded-full bg-brand-teal text-white text-[10px] font-bold">
                                            {step.step}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-brand-dark text-lg">{step.title}</h3>
                                    <p className="text-sm text-brand-sage leading-relaxed max-w-xs">{step.body}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════
                SECTION 4 - FAQ
            ═══════════════════════════════════════════════ */}
            <section id="faq" className="py-24 px-5 md:px-8" style={{ background: "#F7F6F3" }}>
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-12"
                    >
                        <p className="text-xs font-semibold uppercase tracking-widest text-brand-teal mb-3">
                            FAQ
                        </p>
                        <h2 className="text-3xl md:text-4xl font-bold text-brand-dark">
                            Common questions
                        </h2>
                        <p className="mt-3 text-brand-sage text-lg">
                            Straight answers, no marketing fluff.
                        </p>
                    </motion.div>

                    <div className="flex flex-col gap-3">
                        {FAQS.map((faq, i) => (
                            <FaqItem key={faq.q} q={faq.q} a={faq.a} index={i} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════
                SECTION 5 - CTA
            ═══════════════════════════════════════════════ */}
            <section id="cta" className="py-24 px-5 md:px-8 bg-white">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.55 }}
                        className="relative rounded-3xl overflow-hidden px-8 py-16 md:px-16 text-center"
                        style={{ background: "var(--brand-dark)" }}
                    >
                        {/* subtle dot grid */}
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0"
                            style={{
                                backgroundImage: "radial-gradient(circle, #8C886B 1px, transparent 1px)",
                                backgroundSize: "28px 28px",
                                opacity: 0.1,
                            }}
                        />
                        {/* teal glow */}
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -bottom-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full"
                            style={{ background: "radial-gradient(circle, #047C58 0%, transparent 70%)", opacity: 0.25 }}
                        />

                        <div className="relative z-10 flex flex-col items-center gap-6">
                            <p className="text-xs font-semibold uppercase tracking-widest text-brand-teal">
                                Get started - no sign-up needed
                            </p>
                            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight max-w-xl">
                                Stop wrestling with your PDFs. Just fix them.
                            </h2>
                            <p className="text-[#a09888] text-lg max-w-lg leading-relaxed">
                                Pick any tool from our suite. Upload your file. Download the result. That's it -{" "}
                                free, private, and no software to install.
                            </p>
                            <div className="flex flex-wrap justify-center gap-3 mt-2">
                                <a
                                    href="#services"
                                    id="cta-explore-tools"
                                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-brand-teal text-white font-semibold text-sm hover:bg-[#036649] transition-all shadow-lg active:scale-[0.98]"
                                >
                                    Explore All Tools
                                    <IconArrowRight size={16} />
                                </a>
                                <a
                                    href="/edit-pdf"
                                    id="cta-edit-pdf"
                                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-[#4a3010] bg-[#2a1a05] text-[#C9C4B5] font-semibold text-sm hover:border-[#8C886B] transition-all active:scale-[0.98]"
                                >
                                    Open PDF Editor
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>
        </>
    );
}

