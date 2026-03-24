"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  RefreshCw,
  LogOut,
  ChevronRight,
  Menu,
  Bell,
  Search,
  Settings,
  AlertCircle
} from "lucide-react";
import { useState } from "react";

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (!isLoaded) return null;
  if (!user) {
    // Basic guard - middleware should handle this but layout level for extra safety
    if (typeof window !== "undefined") window.location.href = "/sign-in";
    return null;
  }

  const sidebarItems = [
    { id: "dashboard", label: "Work Queue", icon: LayoutDashboard, href: "/worker/dashboard" },
    { id: "leave", label: "Leave Management", icon: Calendar, href: "/worker/leave" },
    { id: "sync", label: "Account Sync", icon: RefreshCw, href: "/worker/sync" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? "w-72" : "w-20"} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col z-20`}>
        <div className="p-6 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-100">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          {isSidebarOpen && <span className="text-xl font-black text-gray-900 tracking-tight">CRM Officer</span>}
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-8">
          {sidebarItems.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group hover:bg-gray-50 text-gray-500 hover:text-gray-900`}
            >
              <item.icon className={`w-5 h-5 group-hover:text-blue-600`} />
              {isSidebarOpen && <span className="font-bold text-sm tracking-wide">{item.label}</span>}
            </a>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-gray-100">
          <SignOutButton>
            <button className={`w-full flex items-center gap-4 p-4 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all group`}>
              <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {isSidebarOpen && <span className="font-bold text-sm tracking-wide">Sign Out</span>}
            </button>
          </SignOutButton>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500">
              <Menu className="w-6 h-6" />
            </button>
            <div className="h-6 w-px bg-gray-200" />
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">Officer Portal</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Resolving Grievances • {user.fullName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-100 border-2 border-white overflow-hidden shadow-sm">
              <img src={user.imageUrl} alt="User" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
}
