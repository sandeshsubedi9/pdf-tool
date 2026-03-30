"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { IconFileText, IconBrandGoogleFilled, IconLoader2, IconEye, IconEyeOff } from "@tabler/icons-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    setIsLoading(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Welcome back!");
      router.push("/");
      router.refresh();
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    await signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-100 p-8 sm:p-10">
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

        <h1 className="text-2xl font-bold text-center text-brand-dark mb-2">Welcome Back</h1>
        <p className="text-center text-brand-sage text-sm mb-8">Sign in to continue to your account.</p>

        <button
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading || isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-brand-dark font-semibold py-3.5 rounded-xl hover:bg-slate-50 transition-colors shadow-sm active:scale-[0.98] disabled:opacity-50"
        >
          {isGoogleLoading ? (
            <IconLoader2 size={20} className="animate-spin" />
          ) : (
            <IconBrandGoogleFilled size={20} className="text-rose-500" />
          )}
          Continue with Google
        </button>

        <div className="flex items-center my-8">
          <div className="flex-1 border-t border-slate-200" />
          <span className="px-4 text-xs font-medium text-brand-sage uppercase tracking-wider">Or</span>
          <div className="flex-1 border-t border-slate-200" />
        </div>

        <form onSubmit={handleCredentialsLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-brand-dark mb-1.5 ml-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all text-brand-dark"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5 ml-1 mr-1">
              <label className="block text-sm font-semibold text-brand-dark">Password</label>
              <Link 
                href={`/forgot-password?email=${encodeURIComponent(email)}`}
                className="text-xs font-medium text-brand-teal hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all text-brand-dark"
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
            className="w-full bg-brand-teal text-white font-bold py-3.5 rounded-xl mt-2 hover:bg-[#036649] transition-all shadow-md shadow-brand-teal/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <IconLoader2 size={18} className="animate-spin" />}
            Sign In
          </button>
        </form>

        <p className="text-center text-sm text-brand-sage mt-8">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="font-semibold text-brand-teal hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
