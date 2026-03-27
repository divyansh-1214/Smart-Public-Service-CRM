"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Calendar, 
  RefreshCw, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight,
  Bell,
  Search,
  User,
  Settings,
  MessageSquare
} from "lucide-react";

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const navItems = [
    { 
      label: "Dashboard", 
      href: "/worker/dashboard", 
      icon: LayoutDashboard,
      description: "Overview & Active Tasks"
    },
    { 
      label: "Leave Management", 
      href: "/worker/leave", 
      icon: Calendar,
      description: "Request & Track Time Off"
    },
    { 
      label: "Account Sync", 
      href: "/worker/sync", 
      icon: RefreshCw,
      description: "Update Profile & Role"
    },
    // { 
    //   label: "Worker", 
    //   href: "/worker", 
    //   icon: Worker,
    //   description: "you will go to the worker home page"
    // },
  ];

  const activeItem = navItems.find(item => pathname === item.href) || navItems[0];

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Desktop Sidebar */}
      <aside 
        className={`${isSidebarOpen ? "w-72" : "w-24"} hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-500 ease-[0.16, 1, 0.3, 1] z-50`}
      >
        <div className="p-8 flex items-center gap-4 border-b border-slate-50 mb-6">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-slate-200">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <AnimatePresence mode="wait">
            {isSidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="overflow-hidden"
              >
                <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none uppercase">PS-CRM</h1>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5">Officer Portal</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide">
          <p className={`text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 px-4 mb-4 ${!isSidebarOpen && "text-center px-0"}`}>
            {isSidebarOpen ? "Operations" : "Ops"}
          </p>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group relative ${
                  isActive 
                    ? "bg-slate-900 text-white shadow-xl shadow-slate-200" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon className={`w-5 h-5 transition-transform duration-500 group-hover:scale-110 ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-900"}`} />
                {isSidebarOpen && (
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-black text-[11px] uppercase tracking-widest">{item.label}</span>
                    <span className={`text-[9px] font-bold opacity-60 truncate ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                      {item.description}
                    </span>
                  </div>
                )}
                {isActive && isSidebarOpen && <ChevronRight className="w-4 h-4 ml-auto opacity-40" />}
                {!isSidebarOpen && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-50">
          <SignOutButton>
            <button className={`w-full flex items-center gap-4 p-4 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all group relative ${!isSidebarOpen && "justify-center"}`}>
              <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {isSidebarOpen && <span className="font-black text-[11px] uppercase tracking-widest">Sign Out</span>}
              {!isSidebarOpen && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
                  Sign Out
                </div>
              )}
            </button>
          </SignOutButton>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-24 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-8 flex items-center justify-between shrink-0 z-40">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden md:flex p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-900"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-900"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="h-8 w-px bg-slate-100 hidden sm:block" />
            <div className="hidden sm:block">
              <h2 className="text-base font-black text-slate-900 tracking-tight uppercase leading-none">
                {activeItem.label}
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5">
                Officer Portal •
              </p>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 lg:p-12 scroll-smooth">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-80 h-full bg-white flex flex-col p-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg font-black tracking-tighter uppercase text-slate-900">PS-CRM</span>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-all"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <nav className="flex-1 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 ml-2 mb-4">Operations</p>
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-4 p-5 rounded-3xl transition-all group ${
                        isActive 
                          ? "bg-slate-900 text-white shadow-2xl shadow-slate-200" 
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <item.icon className={`w-6 h-6 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <div className="flex flex-col">
                        <span className="font-black text-xs uppercase tracking-widest">{item.label}</span>
                        <span className={`text-[10px] font-bold opacity-60 ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                          {item.description}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto space-y-4">
                <SignOutButton>
                  <button className="w-full flex items-center gap-4 p-5 rounded-3xl text-rose-500 hover:bg-rose-50 transition-all font-black uppercase tracking-widest text-xs">
                    <LogOut className="w-6 h-6" />
                    Sign Out
                  </button>
                </SignOutButton>
                <div className="pt-6 border-t border-slate-50 text-center">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">
                    PS-CRM Officer Access • 2026
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
