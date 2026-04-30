"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { IconSettings, IconLogout, IconDiamond, IconUser } from "@tabler/icons-react";

export function UserDropdown() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    // Show a skeleton while auth is loading
    return <div className="w-9 h-9 bg-slate-200 animate-pulse rounded-full"></div>;
  }

  // If no session, show the standard Log In / Sign Up buttons
  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        {/* Desktop: full Log in text link */}
        <Link
          href="/login"
          className="hidden md:inline-flex px-4 py-2 text-sm font-medium text-brand-dark hover:text-brand-teal transition-colors"
        >
          Log in
        </Link>
        {/* Mobile: compact "Log in" button  |  Desktop: full "Get Started" CTA */}
        <Link
          href="/login"
          className="md:hidden px-4 py-2 text-sm font-semibold rounded-xl bg-brand-teal text-white hover:bg-[#036649] transition-all shadow-md active:scale-[0.98]"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="hidden md:inline-flex px-6 py-2.5 text-sm font-semibold rounded-xl bg-brand-teal text-white hover:bg-[#036649] transition-all shadow-md active:scale-[0.98]"
        >
          Get Started
        </Link>
      </div>
    );
  }

  const user = session.user as any;
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || "U";
  const isPremium = !!user.isStudent;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 border-2 border-transparent hover:border-brand-teal focus:outline-none transition-all focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
        aria-expanded={isOpen}
      >
        {user.image ? (
          <img src={user.image} alt={user.name || "User"} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="text-brand-dark font-bold text-sm">{initial}</span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-[0_8px_30px_rgba(30,23,2,0.12)] border border-border overflow-hidden z-50 transform origin-top transition-all scale-100 opacity-100">
          <div className="p-4 bg-slate-50 border-b border-border">
            <p className="text-sm font-bold text-brand-dark truncate">{user.name || "PDF Maya User"}</p>
            <p className="text-xs text-brand-sage truncate mt-0.5">{user.email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded border border-brand-teal/20 bg-brand-teal/10">
               {isPremium ? (
                 <>
                   <IconDiamond size={12} className="text-brand-teal fill-brand-teal" />
                   <span className="text-[10px] font-bold tracking-wide text-brand-teal uppercase">Unlimited Usage</span>
                 </>
               ) : (
                 <>
                   <IconUser size={12} className="text-brand-sage" />
                   <span className="text-[10px] font-bold tracking-wide text-brand-sage uppercase">Free Tier</span>
                 </>
               )}
            </div>
          </div>

          <div className="p-2 space-y-1">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-brand-dark hover:bg-slate-100 rounded-lg transition-colors"
            >
              <IconSettings size={18} className="text-brand-sage" />
              Account Settings
            </Link>
            <button
              disabled
              onClick={() => setIsOpen(false)}
              className="hidden w-full items-center justify-between px-3 py-2 text-sm font-medium text-slate-400 hover:bg-transparent rounded-lg cursor-not-allowed"
            >
              <span className="flex items-center gap-3">
                <IconDiamond size={18} />
                Premium API
              </span>
              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-slate-500">Soon</span>
            </button>
          </div>

          <div className="p-2 border-t border-border">
            <button
              onClick={() => {
                setIsOpen(false);
                signOut({ callbackUrl: "/" });
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <IconLogout size={18} />
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
