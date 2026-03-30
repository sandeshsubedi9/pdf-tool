"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { 
  IconFileText, 
  IconLoader2, 
  IconArrowLeft, 
  IconLock, 
  IconMail, 
  IconShieldCheck,
  IconEye,
  IconEyeOff
} from "@tabler/icons-react";

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // States: email -> otp -> success
  const [step, setStep] = useState<"email" | "otp" | "success">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-fill email from URL if present
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  // 1. Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      
      toast.success("Reset code sent! Please check your inbox.");
      setStep("otp");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      
      toast.success("Password updated successfully!");
      setStep("success");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-100 p-8 sm:p-10 relative overflow-hidden">
        
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-teal/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
        
        <div className="flex justify-center mb-8">
          <a href="/" className="flex items-center gap-2 group cursor-pointer">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-teal text-white shadow-md shadow-brand-teal/20">
              <IconFileText size={22} stroke={2} />
            </span>
            <span className="font-bold text-2xl tracking-tight text-brand-dark" style={{ fontFamily: "var(--font-inter)"}}>
              PDF<span className="text-brand-teal">Tool</span>
            </span>
          </a>
        </div>

        {step === "email" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-2xl font-bold text-center text-brand-dark mb-2">Forgot Password?</h1>
            <p className="text-center text-brand-sage text-sm mb-8">No worries! Enter your email and we'll send you an OTP code to reset it.</p>
            
            <form onSubmit={handleRequestOtp} className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-black text-brand-sage uppercase tracking-widest mb-1.5 ml-1">Account Email</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-sage">
                    <IconMail size={18} stroke={2} />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all text-brand-dark"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-teal text-white font-bold py-3.5 rounded-xl hover:bg-[#036649] transition-all shadow-md shadow-brand-teal/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <IconLoader2 size={20} className="animate-spin" /> : "Send Reset Code"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/login")}
                className="flex items-center justify-center gap-2 text-sm font-semibold text-brand-sage hover:text-brand-dark transition-all cursor-pointer"
              >
                <IconArrowLeft size={16} />
                Back to Login
              </button>
            </form>
          </div>
        )}

        {step === "otp" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-2xl font-bold text-center text-brand-dark mb-1">Enter Code</h1>
            <div className="text-center mb-8">
              <p className="text-brand-sage text-sm leading-relaxed mb-1">
                A 6-character code was sent to:
              </p>
              <div className="font-bold text-brand-dark text-lg mb-1">{email}</div>
              <button 
                type="button"
                onClick={() => { setStep("email"); setOtp(""); }}
                className="text-xs font-bold text-brand-teal hover:underline uppercase tracking-wider"
              >
                Not you? Change email
              </button>
            </div>
            
            <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-black text-brand-sage uppercase tracking-widest mb-1.5 ml-1">6-Character OTP Code</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-sage">
                    <IconShieldCheck size={20} stroke={2} />
                  </span>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.toUpperCase())}
                    placeholder="ABCDEF"
                    maxLength={6}
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all text-brand-dark tracking-[4px] font-mono text-lg font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-brand-sage uppercase tracking-widest mb-1.5 ml-1">New Password</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-sage">
                    <IconLock size={18} stroke={2} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all text-brand-dark"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-sage hover:text-brand-dark transition-colors"
                  >
                    {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                  </button>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-dark text-white font-bold py-3.5 rounded-xl hover:bg-black transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? <IconLoader2 size={20} className="animate-spin" /> : "Reset Password"}
              </button>
            </form>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-4 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <IconShieldCheck size={40} stroke={2} />
            </div>
            <h1 className="text-2xl font-bold text-brand-dark mb-2">Password Updated!</h1>
            <p className="text-brand-sage text-sm mb-8 leading-relaxed">
              Your security is our priority. Your password has been changed successfully. You can now log in with your new credentials.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="w-full bg-brand-teal text-white font-bold py-3.5 rounded-xl hover:bg-[#036649] transition-all shadow-md shadow-brand-teal/20 active:scale-[0.98]"
            >
              Back to Login
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><IconLoader2 className="animate-spin text-brand-teal" size={40} /></div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
