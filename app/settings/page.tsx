"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { IconLoader2, IconUserCircle, IconSchool, IconCheck, IconDiamond } from "@tabler/icons-react";
import Navbar from "@/components/Navbar";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [studentEmail, setStudentEmail] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifySent, setVerifySent] = useState(false);

  // Quick redirect if not logged in
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  if (status === "loading" || !session?.user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <IconLoader2 size={32} className="animate-spin text-brand-teal" />
      </div>
    );
  }

  const user = session.user as any;
  const isPremium = !!user.isStudent;

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
        toast.success("Verification link sent! Please check your university inbox.");
      }
    } catch (err) {
      setIsVerifying(false);
      toast.error("An error occurred. Please try again.");
    }
  };

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
                   ) : (
                     <span className="text-xs font-bold tracking-wide text-brand-sage uppercase">Free Tier</span>
                   )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Settings & Verification */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Student Verification Widget */}
            <div className={`rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] border p-6 md:p-8 transition-colors ${
              isPremium ? 'bg-[#ecfdf5] border-[#a7f3d0]' : 'bg-white border-slate-100'
            }`}>
              <div className="flex items-start gap-4 mb-2">
                <div className={`p-3 rounded-xl mt-1 ${isPremium ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                  <IconSchool size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-brand-dark mb-2">
                    {isPremium ? "Student Verification Active" : "Are you a student?"}
                  </h3>
                  
                  {isPremium ? (
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
                  ) : (
                    <div>
                      <p className="text-sm text-brand-sage mb-6 leading-relaxed">
                        Verify your university email address (`.edu`, `.ac.uk`, etc.) to instantly unlock exactly <strong>Unlimited Free Conversions</strong>. No credit card required.
                      </p>

                      {verifySent ? (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                          <IconCheck size={20} className="text-orange-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-orange-800">Verification link sent!</p>
                            <p className="text-sm text-orange-700 mt-1">
                              We sent an email to <strong>{studentEmail}</strong>. Click the link inside to upgrade your account instantly.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={handleVerifyStudent} className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="email"
                            placeholder="you@university.edu"
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
                            {isVerifying ? <IconLoader2 size={18} className="animate-spin" /> : "Verify Setup"}
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                </div>
              </div>
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
