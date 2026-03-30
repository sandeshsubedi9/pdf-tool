"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { 
  IconFileText, 
  IconBrandGoogleFilled, 
  IconLoader2, 
  IconEye, 
  IconEyeOff, 
  IconShieldCheck,
  IconLock,
  IconArrowLeft,
  IconCheck
} from "@tabler/icons-react";

export default function SignupPage() {
  const router = useRouter();
  
  // Steps: "form" -> "otp" -> "success"
  const [step, setStep] = useState<"form" | "otp" | "success">("form");
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // 1. Initial Signup (Detect student)
  const handleCredentialsSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const resp = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await resp.json();
      setIsLoading(false);

      if (!resp.ok) {
        toast.error(data.error || "Failed to create account.");
      } else {
        // If student, we force OTP step
        if (data.isStudent) {
          toast.success("Verification code sent! Check your inbox.");
          setStep("otp");
        } else {
          // Normal user: Auto-login
          toast.success("Account created! Signing you in...");
          const res = await signIn("credentials", {
            redirect: false,
            email,
            password,
          });

          if (res?.error) {
            toast.error("Account created but failed to sign in.");
          } else {
            router.push("/");
            router.refresh();
          }
        }
      }
    } catch (err) {
      setIsLoading(false);
      toast.error("Something went wrong!");
    }
  };

  // 2. Verify OTP (For Students)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const resp = await fetch("/api/auth/verify-signup-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await resp.json();
      setIsLoading(false);

      if (!resp.ok) {
        toast.error(data.error || "Verification failed");
      } else {
        toast.success("Email verified! Finalizing...");
        setStep("success");
        
        // Auto sign-in
        const res = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });
        
        if (!res?.error) {
          setTimeout(() => {
            router.push("/");
            router.refresh();
          }, 1500);
        }
      }
    } catch (err) {
      setIsLoading(false);
      toast.error("Verification error occurred.");
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    await signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-100 p-8 sm:p-10 relative overflow-hidden">
        
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-teal/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

        <div className="flex justify-center mb-8">
          <a href="/" className="flex items-center gap-2 group cursor-pointer">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-teal text-white shadow-md shadow-brand-teal/20">
              <IconFileText size={22} stroke={2} />
            </span>
            <span className="font-bold text-2xl tracking-tight text-brand-dark" style={{ fontFamily: "var(--font-inter)" }}>
              PDF<span className="text-brand-teal">Tool</span>
            </span>
          </a>
        </div>

        {step === "form" && (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
            <h1 className="text-2xl font-bold text-center text-brand-dark mb-2">Create an account</h1>
            <p className="text-center text-brand-sage text-sm mb-8 px-2">Free workspace for all your document needs.</p>

            <button
              onClick={handleGoogleSignup}
              disabled={isGoogleLoading || isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-brand-dark font-semibold py-3.5 rounded-xl hover:bg-slate-50 transition-colors shadow-sm active:scale-[0.98] disabled:opacity-50"
            >
              {isGoogleLoading ? (
                <IconLoader2 size={20} className="animate-spin" />
              ) : (
                <IconBrandGoogleFilled size={20} className="text-rose-500" />
              )}
              Sign up with Google
            </button>

            <div className="flex items-center my-8">
              <div className="flex-1 border-t border-slate-200" />
              <span className="px-4 text-xs font-medium text-brand-sage uppercase tracking-wider">Or</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>

            <form onSubmit={handleCredentialsSignup} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-black text-brand-sage uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all text-brand-dark"
                />
              </div>
              <div>
                <label className="text-xs font-black text-brand-sage uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  required
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all text-brand-dark"
                />
                <p className="text-[10px] font-bold text-brand-teal ml-1 mt-2.5 flex items-center gap-1.5 uppercase tracking-wide">
                  <span className="text-sm">🎓</span> Student? Use your .edu email for unlimited access.
                </p>
              </div>
              <div className="mb-2">
                <label className="block text-xs font-black text-brand-sage uppercase tracking-widest mb-1.5 ml-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all text-brand-dark pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-sage hover:text-brand-dark transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <IconEyeOff size={20} stroke={2} /> : <IconEye size={20} stroke={2} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full bg-brand-teal text-white font-bold py-3.5 rounded-xl hover:bg-[#036649] transition-all shadow-md shadow-brand-teal/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading && <IconLoader2 size={18} className="animate-spin" />}
                Create Account
              </button>
            </form>

            <p className="text-center text-sm text-brand-sage mt-8">
              Already have an account?{" "}
              <a href="/login" className="font-semibold text-brand-teal hover:underline">
                Log in
              </a>
            </p>
          </div>
        )}

        {step === "otp" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-2xl font-bold text-center text-brand-dark mb-2">Verify Student Email</h1>
            <p className="text-center text-brand-sage text-sm mb-8 px-2 leading-relaxed">
              To unlock <span className="font-bold text-brand-dark">unlimited access</span>, please enter the 6-character code sent to: <br/>
              <span className="font-bold text-brand-teal">{email}</span>
            </p>
            
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-black text-brand-sage uppercase tracking-widest mb-1.5 ml-1">Enter Verification Code</label>
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-dark text-white font-bold py-3.5 rounded-xl hover:bg-black transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <IconLoader2 size={20} className="animate-spin" /> : "Verify & Unlock Unlimited"}
              </button>

              <button
                type="button"
                onClick={() => setStep("form")}
                className="flex items-center justify-center gap-2 text-sm font-semibold text-brand-sage hover:text-brand-dark transition-all cursor-pointer"
              >
                <IconArrowLeft size={16} />
                Back to registration
              </button>
            </form>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-6 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <IconCheck size={40} stroke={3} />
            </div>
            <h1 className="text-2xl font-bold text-brand-dark mb-2">Welcome!</h1>
            <p className="text-brand-sage text-sm mb-4 leading-relaxed">
              Your student email was verified successfully.
            </p>
            <div className="px-4 py-2 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-lg inline-block">
              Unlimited Access Unlocked
            </div>
            <p className="mt-8 text-xs text-brand-sage animate-pulse">Redirecting you to workspace...</p>
          </div>
        )}

      </div>
    </div>
  );
}
