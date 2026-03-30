"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  IconLoader2,
  IconSchool,
  IconCheck,
  IconX,
  IconClock,
  IconFilter,
  IconEye,
  IconBuildingBank,
  IconFileDescription,
  IconUser,
  IconMail,
  IconAlertTriangle,
  IconLogout,
} from "@tabler/icons-react";
import Navbar from "@/components/Navbar";

// .... skipping to header
// We'll replace lines from 1 to 141 as follows but wait, it's safer to target smaller blocks.



const ADMIN_EMAILS = ["sandeshsubedi2020@gmail.com"];

const DOC_TYPE_LABELS: Record<string, string> = {
  student_id: "Student ID Card",
  admission_letter: "Admission Letter",
  fee_receipt: "Fee Receipt",
  marksheet: "Marksheet",
  other: "Other",
};

const STATUS_CONFIG = {
  pending:  { label: "Pending",  color: "bg-amber-100 text-amber-700 border-amber-200",  dot: "bg-amber-400"  },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-400" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200",        dot: "bg-red-400"    },
};

interface Verification {
  _id: string;
  userName: string;
  userEmail: string;
  institutionName: string;
  documentType: string;
  documentUrl: string;
  documentMimeType: string;
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export default function AdminVerificationsPage() {
  const router = useRouter();

  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [selected, setSelected] = useState<Verification | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Logout function
  const handleLogout = async () => {
    // Clear cookie (a robust way is via API, or simply by pushing to an API that drops it, but here we can just clear it if we made it accessible, though HttpOnly prevents JS clear. For now redirecting to login is fine, or an /api/admin/logout route)
    // Create an immediate frontend redirect:
    document.cookie = "admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/admin/login");
  };

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === "all"
        ? "/api/admin/verifications"
        : `/api/admin/verifications?status=${filter}`;
      const res = await fetch(url);
      
      if (res.status === 401 || res.status === 403) {
        // Not logged in or invalid token
        router.push("/admin/login");
        return;
      }
      
      if (!res.ok) throw new Error();
      const data = await res.json();
      setVerifications(data.verifications);
    } catch {
      toast.error("Failed to load verification requests.");
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);


  const handleDecision = async (action: "approve" | "reject") => {
    if (!selected) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/verifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationId: selected._id,
          action,
          adminNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Verification ${action === "approve" ? "approved" : "rejected"}!`);
      setSelected(null);
      setAdminNote("");
      fetchVerifications();
    } catch (err: any) {
      toast.error(err.message || "Action failed.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading && verifications.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <IconLoader2 size={36} className="animate-spin text-brand-teal" />
      </div>
    );
  }

  const counts = {
    all: verifications.length,
    pending: verifications.filter(v => v.status === "pending").length,
    approved: verifications.filter(v => v.status === "approved").length,
    rejected: verifications.filter(v => v.status === "rejected").length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 pt-28 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-brand-dark flex items-center gap-3">
              <IconSchool size={32} className="text-brand-teal" />
              Student Verifications
            </h1>
            <p className="text-brand-sage mt-1 text-sm">Review and manage student document submissions</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchVerifications}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-brand-dark hover:bg-slate-50 transition-colors shadow-sm"
            >
              <IconLoader2 size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors shadow-sm"
            >
              <IconLogout size={16} />
              Admin Logout
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["pending", "all", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all capitalize ${
                filter === f
                  ? "bg-brand-dark text-white border-brand-dark"
                  : "bg-white text-brand-sage border-slate-200 hover:border-brand-dark hover:text-brand-dark"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                filter === f ? "bg-white/20 text-white" : "bg-slate-100 text-brand-sage"
              }`}>
                {f === "all" ? verifications.length : verifications.filter(v => v.status === f).length}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <IconLoader2 size={32} className="animate-spin text-brand-teal" />
            </div>
          ) : verifications.length === 0 ? (
            <div className="text-center py-20">
              <IconFileDescription size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-brand-sage font-medium">No verification requests found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-brand-sage">Student</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-brand-sage">Institution</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-brand-sage">Document</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-brand-sage">Submitted</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-brand-sage">Status</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-brand-sage">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {verifications.map((v) => {
                    const sc = STATUS_CONFIG[v.status];
                    return (
                      <tr key={v._id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-brand-dark">{v.userName || "—"}</div>
                          <div className="text-xs text-brand-sage">{v.userEmail}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-brand-dark max-w-[160px] truncate">{v.institutionName}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                            <IconFileDescription size={12} />
                            {DOC_TYPE_LABELS[v.documentType] || v.documentType}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-brand-sage text-xs">
                          {new Date(v.submittedAt).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric"
                          })}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${sc.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => { setSelected(v); setAdminNote(v.adminNote || ""); setPreviewOpen(false); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-dark text-white text-xs font-bold rounded-lg hover:bg-brand-teal transition-colors"
                          >
                            <IconEye size={13} />
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Review Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-brand-dark">Review Verification</h2>
              <button
                onClick={() => { setSelected(null); setAdminNote(""); }}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-brand-sage"
              >
                <IconX size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Student Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-sage mb-1">
                    <IconUser size={12} /> Student
                  </div>
                  <div className="font-bold text-brand-dark">{selected.userName || "—"}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-sage mb-1">
                    <IconMail size={12} /> Email
                  </div>
                  <div className="font-medium text-brand-dark text-sm break-all">{selected.userEmail}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-sage mb-1">
                    <IconBuildingBank size={12} /> Institution
                  </div>
                  <div className="font-bold text-brand-dark">{selected.institutionName}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-sage mb-1">
                    <IconFileDescription size={12} /> Document Type
                  </div>
                  <div className="font-medium text-brand-dark">{DOC_TYPE_LABELS[selected.documentType]}</div>
                </div>
              </div>

              {/* Document Preview */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-brand-sage mb-2">Submitted Document</div>
                {selected.documentMimeType === "application/pdf" ? (
                  <a
                    href={selected.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors group"
                  >
                    <IconFileDescription size={28} className="text-red-500" />
                    <div>
                      <div className="font-bold text-red-700 text-sm">View PDF Document</div>
                      <div className="text-xs text-red-500">Opens in new tab</div>
                    </div>
                  </a>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img
                      src={selected.documentUrl}
                      alt="Uploaded document"
                      className="w-full max-h-72 object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Current Status */}
              {selected.status !== "pending" && (
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${STATUS_CONFIG[selected.status].color}`}>
                  {selected.status === "approved" ? <IconCheck size={18} /> : <IconAlertTriangle size={18} />}
                  <div>
                    <div className="font-bold text-sm">
                      {selected.status === "approved" ? "Already approved" : "Already rejected"}
                    </div>
                    {selected.adminNote && (
                      <div className="text-xs mt-0.5">Note: {selected.adminNote}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Admin Note */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-sage mb-2">
                  Note to Student <span className="text-brand-sage/60 normal-case font-normal">(required if rejecting)</span>
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  placeholder="e.g. The document is blurry, please re-upload a clearer image..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal resize-none transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleDecision("reject")}
                  disabled={processing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 font-bold border border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {processing ? <IconLoader2 size={18} className="animate-spin" /> : <IconX size={18} />}
                  Reject
                </button>
                <button
                  onClick={() => handleDecision("approve")}
                  disabled={processing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-md"
                >
                  {processing ? <IconLoader2 size={18} className="animate-spin" /> : <IconCheck size={18} />}
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
