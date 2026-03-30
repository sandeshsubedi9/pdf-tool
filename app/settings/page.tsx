"use client";

import React, { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  IconLoader2,
  IconUserCircle,
  IconSchool,
  IconCheck,
  IconDiamond,
  IconUpload,
  IconFile,
  IconMail,
  IconClock,
  IconX,
  IconAlertCircle,
} from "@tabler/icons-react";
import Navbar from "@/components/Navbar";

const DOCUMENT_TYPES = [
  { value: "student_id",       label: "Student ID Card" },
  { value: "admission_letter", label: "Admission / Enrollment Letter" },
  { value: "fee_receipt",      label: "Fee Receipt" },
  { value: "marksheet",        label: "Marksheet / Report Card" },
  { value: "other",            label: "Other School Document" },
];

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  // Email OTP state
  const [studentEmail, setStudentEmail] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifySent, setVerifySent] = useState(false);
  const [otp, setOtp] = useState("");
  const [isConfirmingOtp, setIsConfirmingOtp] = useState(false);

  // Document upload state
  const [verifyTab, setVerifyTab] = useState<"email" | "document">("email");
  const [institutionName, setInstitutionName] = useState("");
  const [documentType, setDocumentType] = useState("student_id");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (status === "loading" || !session?.user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <IconLoader2 size={32} className="animate-spin text-brand-teal" />
      </div>
    );
  }

  const user = session.user as any;
  const isPremium = !!user.isStudent;
  const verificationStatus = user.verificationStatus || "none";

  // ── Email OTP handlers ────────────────────────────────────────────────────

  const handleVerifyStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentEmail) return;
    setIsVerifying(true);
    try {
      const res = await fetch("/api/student/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentEmail }),
      });
      const data = await res.json();
      setIsVerifying(false);
      if (!res.ok) {
        toast.error(data.error || "Failed to send verification.");
      } else {
        setVerifySent(true);
        toast.success("Verification code sent! Check your school inbox.");
      }
    } catch {
      setIsVerifying(false);
      toast.error("An error occurred. Please try again.");
    }
  };

  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setIsConfirmingOtp(true);
    try {
      const res = await fetch("/api/student/confirm-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, studentEmail }),
      });
      const data = await res.json();
      setIsConfirmingOtp(false);
      if (!res.ok) {
        toast.error(data.error || "Invalid OTP code.");
      } else {
        toast.success("Success! You are now a verified student.");
        setVerifySent(false);
        update();
      }
    } catch {
      setIsConfirmingOtp(false);
      toast.error("An error occurred. Please try again.");
    }
  };

  // ── Document upload handlers ──────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, WebP, or PDF file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds the 10 MB limit.");
      return;
    }
    setSelectedFile(file);
  };

  const handleDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !institutionName) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("document", selectedFile);
      formData.append("institutionName", institutionName);
      formData.append("documentType", documentType);

      const res = await fetch("/api/student/submit-document", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to submit document.");
      } else {
        toast.success("Document submitted! We'll review it within 24–48 hours.");
        setUploadDone(true);
        update(); // refresh session to show pending status
      }
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ── Render verification section ───────────────────────────────────────────

  const renderVerificationSection = () => {
    // Already approved
    if (isPremium) {
      return (
        <div>
          <p className="text-sm text-emerald-700 font-medium mb-4">
            Your account is verified. You now have unlimited free conversions on PDFTool.
          </p>
          {user.studentEmail && (
            <div className="inline-flex items-center gap-2 bg-white/60 px-3 py-2 rounded-lg border border-emerald-200">
              <IconCheck size={16} className="text-emerald-500" />
              <span className="text-sm font-semibold text-emerald-800">{user.studentEmail}</span>
            </div>
          )}
        </div>
      );
    }

    // Pending document review
    if (verificationStatus === "pending" || uploadDone) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4">
          <div className="p-2 bg-amber-100 rounded-lg mt-0.5">
            <IconClock size={20} className="text-amber-600" />
          </div>
          <div>
            <div className="font-bold text-amber-800 text-sm mb-1">Verification Under Review</div>
            <p className="text-amber-700 text-sm leading-relaxed">
              Your document has been submitted and is being reviewed by our team.
              This usually takes <strong>24–48 hours</strong>. You'll receive an email once a decision is made.
            </p>
          </div>
        </div>
      );
    }

    // Rejected — allow resubmission
    if (verificationStatus === "rejected") {
      return (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <IconAlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <div className="font-bold text-red-700 text-sm">Verification Not Approved</div>
              <p className="text-red-600 text-sm mt-0.5">
                Your previous submission was not approved. Please re-submit with a clearer document.
              </p>
            </div>
          </div>
          {renderVerifyForm()}
        </div>
      );
    }

    // Default: no verification yet
    return renderVerifyForm();
  };

  const renderVerifyForm = () => (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setVerifyTab("email")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            verifyTab === "email"
              ? "bg-white text-brand-dark shadow-sm"
              : "text-brand-sage hover:text-brand-dark"
          }`}
        >
          <IconMail size={15} />
          School Email
        </button>
        <button
          onClick={() => setVerifyTab("document")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            verifyTab === "document"
              ? "bg-white text-brand-dark shadow-sm"
              : "text-brand-sage hover:text-brand-dark"
          }`}
        >
          <IconUpload size={15} />
          Upload Document
        </button>
      </div>

      {/* Email OTP Tab */}
      {verifyTab === "email" && (
        <div>
          <p className="text-sm text-brand-sage mb-4 leading-relaxed">
            If you have a school/university email (e.g. <span className="font-semibold text-brand-dark">you@school.edu.np</span>),
            enter it below to get an instant verification code.
          </p>
          {verifySent ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-brand-dark mb-4 text-center">
                Enter the 6-character code sent to <br />
                <strong className="text-brand-teal">{studentEmail}</strong>
              </p>
              <form onSubmit={handleConfirmOtp} className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="e.g. A1B2C3"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.toUpperCase())}
                  maxLength={6}
                  required
                  className="w-full text-center tracking-[0.5em] font-bold text-xl px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all text-brand-dark"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setVerifySent(false)}
                    className="flex-1 px-4 py-3 bg-white text-brand-dark font-semibold border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isConfirmingOtp || otp.length < 6}
                    className="flex-1 bg-brand-teal text-white font-bold px-4 py-3 rounded-xl hover:bg-[#036649] transition-all shadow-md active:scale-95 disabled:opacity-50 flex justify-center items-center text-sm"
                  >
                    {isConfirmingOtp ? <IconLoader2 size={18} className="animate-spin" /> : "Verify Code"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <form onSubmit={handleVerifyStudent} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="you@school.edu.np"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                required
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all text-sm font-medium"
              />
              <button
                type="submit"
                disabled={isVerifying}
                className="bg-brand-teal text-white font-bold px-6 py-3 rounded-xl hover:bg-[#036649] transition-all shadow-md active:scale-95 disabled:opacity-50 flex justify-center items-center shrink-0 min-w-[140px]"
              >
                {isVerifying ? <IconLoader2 size={18} className="animate-spin" /> : "Send Code"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Document Upload Tab */}
      {verifyTab === "document" && (
        <div>
          <p className="text-sm text-brand-sage mb-4 leading-relaxed">
            Don't have a school email? Upload any official school document that shows your name and institution.
            We'll review it within <strong className="text-brand-dark">24–48 hours</strong>.
          </p>
          <form onSubmit={handleDocumentSubmit} className="space-y-4">
            {/* Institution name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-sage mb-1.5">
                School / College Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Galaxy Secondary School, Kathmandu"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all text-sm font-medium"
              />
            </div>

            {/* Document type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-sage mb-1.5">
                Document Type <span className="text-red-400">*</span>
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all text-sm font-medium text-brand-dark appearance-none cursor-pointer"
              >
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt.value} value={dt.value}>{dt.label}</option>
                ))}
              </select>
            </div>

            {/* File upload */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-sage mb-1.5">
                Upload Document <span className="text-red-400">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex items-center gap-3 p-4 bg-brand-teal/5 border border-brand-teal/20 rounded-xl">
                  <div className="p-2 bg-brand-teal/10 rounded-lg">
                    <IconFile size={20} className="text-brand-teal" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-brand-dark text-sm truncate">{selectedFile.name}</div>
                    <div className="text-xs text-brand-sage">{formatFileSize(selectedFile.size)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-brand-sage"
                  >
                    <IconX size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-brand-teal hover:bg-brand-teal/5 transition-all group cursor-pointer"
                >
                  <div className="p-3 bg-slate-100 group-hover:bg-brand-teal/10 rounded-xl transition-colors">
                    <IconUpload size={24} className="text-slate-400 group-hover:text-brand-teal transition-colors" />
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-brand-dark text-sm">Click to upload</div>
                    <div className="text-xs text-brand-sage mt-0.5">JPG, PNG, WebP or PDF · Max 10 MB</div>
                  </div>
                </button>
              )}
            </div>

            {/* What's accepted info */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-xs text-blue-600 font-medium leading-relaxed">
                💡 <strong>Accepted documents:</strong> Any official document from your school that clearly shows <strong>your name</strong> and <strong>institution name</strong> — Student ID, Fee Receipt, Admission Letter, Report Card, etc.
              </p>
            </div>

            <button
              type="submit"
              disabled={isUploading || !selectedFile || !institutionName}
              className="w-full bg-brand-teal text-white font-bold px-6 py-3.5 rounded-xl hover:bg-[#036649] transition-all shadow-md active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isUploading ? (
                <><IconLoader2 size={18} className="animate-spin" /> Uploading...</>
              ) : (
                <><IconUpload size={18} /> Submit for Review</>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 pt-28 pb-20">
        <h1 className="text-3xl font-bold text-brand-dark mb-8">Account Settings</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Left Column: Profile Card */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-100 p-6">
              <div className="flex flex-col items-center">
                {user.image ? (
                  <img src={user.image} alt={user.name} className="w-24 h-24 rounded-full object-cover mb-4 ring-4 ring-slate-50" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-brand-teal/10 flex items-center justify-center mb-4 text-brand-teal font-bold text-3xl">
                    {user.name ? user.name.charAt(0) : "U"}
                  </div>
                )}
                <h2 className="text-xl font-bold text-brand-dark text-center">{user.name || "PDFTool User"}</h2>
                <p className="text-sm text-brand-sage text-center mb-4">{user.email}</p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-brand-teal/20 bg-brand-teal/10">
                  {isPremium ? (
                    <>
                      <IconDiamond size={14} className="text-brand-teal fill-brand-teal" />
                      <span className="text-xs font-bold tracking-wide text-brand-teal uppercase">Unlimited Usage</span>
                    </>
                  ) : verificationStatus === "pending" ? (
                    <>
                      <IconClock size={14} className="text-amber-500" />
                      <span className="text-xs font-bold tracking-wide text-amber-600 uppercase">Review Pending</span>
                    </>
                  ) : (
                    <span className="text-xs font-bold tracking-wide text-brand-sage uppercase">Free Tier</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="md:col-span-2 space-y-6">

            {/* Student Verification Widget */}
            <div className={`rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] border p-6 md:p-8 transition-colors ${
              isPremium ? "bg-[#ecfdf5] border-[#a7f3d0]" : "bg-white border-slate-100"
            }`}>
              <div className="flex items-start gap-4 mb-5">
                <div className={`p-3 rounded-xl mt-1 ${isPremium ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600"}`}>
                  <IconSchool size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-brand-dark mb-1">
                    {isPremium ? "Student Verification Active ✓" : "Are you a student?"}
                  </h3>
                  {!isPremium && (
                    <p className="text-sm text-brand-sage leading-relaxed">
                      Verify your student status to unlock <strong>Unlimited Free Conversions</strong>. Works even without a school email — just upload any school document.
                    </p>
                  )}
                </div>
              </div>
              {renderVerificationSection()}
            </div>

            {/* Profile Information */}
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-100 p-6 md:p-8">
              <h3 className="text-lg font-bold text-brand-dark mb-6 flex items-center gap-2">
                <IconUserCircle size={22} className="text-brand-teal" />
                Profile Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-sage mb-1.5 ml-1">Full Name</label>
                  <input
                    type="text"
                    disabled
                    value={user.name || ""}
                    className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-brand-dark opacity-70 cursor-not-allowed text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-sage mb-1.5 ml-1">Account Email</label>
                  <input
                    type="email"
                    disabled
                    value={user.email || ""}
                    className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-brand-dark opacity-70 cursor-not-allowed text-sm"
                  />
                  <p className="text-xs text-brand-sage mt-2 ml-1">Your primary email account cannot be changed currently.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
