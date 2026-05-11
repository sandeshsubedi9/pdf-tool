"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { IconUsers, IconSchool, IconLogout, IconShieldLock, IconMenu2, IconX } from "@tabler/icons-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Admin Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col shadow-2xl transition-transform duration-300 border-r border-slate-800
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
      `}>
        <div className="p-6 pb-8 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-teal flex items-center justify-center shadow-lg">
              <IconShieldLock size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-tight">Admin Portal</h1>
              <p className="text-xs text-brand-teal font-medium tracking-wide uppercase mt-0.5">Control Center</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-white">
            <IconX size={20} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1.5 text-sm font-medium">
          <div className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Management</div>
          
          <Link 
            href="/admin/users" 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${pathname.includes('/admin/users') ? 'bg-brand-teal text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <IconUsers size={18} stroke={pathname.includes('/admin/users') ? 2.5 : 2} /> All Users
          </Link>
          
          <Link 
            href="/admin/verifications" 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${pathname.includes('/admin/verifications') ? 'bg-brand-teal text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
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
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        {/* Mobile Header Toggle */}
        <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-teal flex items-center justify-center">
              <IconShieldLock size={16} className="text-white" />
            </div>
            <span className="font-bold text-brand-dark text-sm tracking-tight">Admin Portal</span>
          </div>
          <button 
            onClick={toggleSidebar}
            className="p-2 text-brand-dark hover:bg-slate-100 rounded-lg transition-colors"
          >
            <IconMenu2 size={24} />
          </button>
        </header>

        <main className="p-4 md:p-8 lg:p-12">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
