"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { IconUsers, IconSchool, IconLogout, IconShieldLock } from "@tabler/icons-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // If they are strictly on the login page, just render the page standalone without sidebar
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    }
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Permanent Admin Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed inset-y-0 left-0 shadow-2xl z-40 border-r border-slate-800">
        <div className="p-6 pb-8 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-teal flex items-center justify-center shadow-lg">
            <IconShieldLock size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-tight">Admin Portal</h1>
            <p className="text-xs text-brand-teal font-medium tracking-wide uppercase mt-0.5">Control Center</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1.5 text-sm font-medium">
          <div className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Management</div>
          
          <Link href="/admin/users" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${pathname.includes('/admin/users') ? 'bg-brand-teal text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <IconUsers size={18} stroke={pathname.includes('/admin/users') ? 2.5 : 2} /> All Users
          </Link>
          
          <Link href="/admin/verifications" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${pathname.includes('/admin/verifications') ? 'bg-brand-teal text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <IconSchool size={18} stroke={pathname.includes('/admin/verifications') ? 2.5 : 2} /> Verifications
          </Link>
        </nav>
        
        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors text-sm font-bold">
            <IconLogout size={18} stroke={2} /> Secure Logout
          </button>
        </div>
      </aside>
      
      {/* Main Admin Content Container */}
      <main className="flex-1 ml-64 p-8 lg:p-12">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
