"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  IconLoader2,
  IconUsers,
  IconMail,
  IconCheck,
  IconShieldCheck,
  IconAlertTriangle,
  IconX,
  IconBrandGoogleFilled,
  IconKey,
} from "@tabler/icons-react";

interface UserRecord {
  _id: string;
  name?: string;
  email: string;
  authProvider?: string;
  isStudent?: boolean;
  verificationStatus?: string;
  createdAt?: string;
}

export default function AdminUsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingMail, setProcessingMail] = useState(false);
  const [blastModalOpen, setBlastModalOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 7;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      
      if (res.status === 401 || res.status === 403) {
        router.push("/admin/login");
        return;
      }
      
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data.users);
    } catch {
      toast.error("Failed to load users from database.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleMailBlast = async () => {
    if (users.length === 0) return;
    setProcessingMail(true);
    
    // Extract simply the emails to blast out
    const emails = users.map(u => u.email).filter(Boolean);

    try {
      const res = await fetch("/api/admin/users/mail-blast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`Sent emails to ${emails.length} users successfully!`);
      setBlastModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger mail blast.");
    } finally {
      setProcessingMail(false);
    }
  };

  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE) || 1;
  const displayUsers = users.slice(
    (currentPage - 1) * ITEMS_PER_PAGE, 
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-dark flex items-center gap-3">
            <IconUsers size={32} className="text-brand-teal" />
            Platform Users
          </h1>
          <p className="text-brand-sage mt-1 text-sm">View all registered accounts and dispatch mass communications</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-brand-dark hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <IconLoader2 size={16} className={loading && !users.length ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => setBlastModalOpen(true)}
            disabled={users.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-brand-teal border border-brand-teal rounded-xl text-sm font-bold text-white hover:bg-[#036649] transition-colors shadow-md disabled:opacity-50"
          >
            <IconMail size={16} />
            Mass Mail Blast
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <IconLoader2 size={32} className="animate-spin text-brand-teal" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 border border-slate-100">
              <IconUsers size={28} className="text-slate-300" />
            </div>
            <p className="text-brand-sage font-medium">No users found in database.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-brand-sage">User Account</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-brand-sage">Authentication</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-brand-sage">Subscription / Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-brand-sage">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayUsers.map((u) => {
                  return (
                    <tr key={u._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-brand-dark">{u.name || "Unknown User"}</div>
                        <div className="text-xs text-brand-sage mt-0.5">{u.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        {u.authProvider === "google" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-medium border border-red-100">
                            <IconBrandGoogleFilled size={12} /> Google Login
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium border border-slate-200">
                            <IconKey size={12} /> Email/Password
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {u.isStudent ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-100 text-emerald-700 border-emerald-200">
                            <IconShieldCheck size={14} /> Full Access (Student)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-slate-100 text-slate-500 border-slate-200">
                            Basic Limited Tier
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-brand-sage text-xs">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric"
                        }) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
                <div className="text-sm text-brand-sage">
                  Showing <span className="font-semibold text-brand-dark">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-semibold text-brand-dark">{Math.min(currentPage * ITEMS_PER_PAGE, users.length)}</span> of <span className="font-semibold text-brand-dark">{users.length}</span> users
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-brand-dark hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-brand-dark hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {blastModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-200">
            <div className="p-6 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-teal/10 mb-2">
                <IconMail size={32} className="text-brand-teal" />
              </div>
              <h2 className="text-xl font-bold text-brand-dark">Send Promotional Email?</h2>
              <p className="text-brand-sage text-sm leading-relaxed px-2">
                This will instantly blast a creative promotional email encouraging users to come back and use PDF Maya.
              </p>
              
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between mt-6">
                <div className="text-sm font-bold text-slate-500">Total Recipients</div>
                <div className="text-lg font-black text-brand-teal">{users.length}</div>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setBlastModalOpen(false)}
                disabled={processingMail}
                className="flex-1 px-4 py-3 bg-white text-slate-600 font-bold border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMailBlast}
                disabled={processingMail}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-teal text-white font-bold rounded-xl hover:bg-[#036649] transition-colors disabled:opacity-50 shadow-md"
              >
                {processingMail ? <IconLoader2 size={18} className="animate-spin" /> : <IconCheck size={18} />}
                Confirm Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
