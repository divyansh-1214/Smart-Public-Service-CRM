"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { 
  Plus, 
  Search, 
  Bell, 
  Menu, 
  X, 
  LayoutDashboard, 
  FilePlus2, 
  History, 
  Settings,
  ShieldCheck,
  LogOut,
  ChevronRight,
  TrendingUp,
  Map as MapIcon,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import QuickComplaintForm from "@/components/crm/QuickComplaintForm";
import ComplaintTracker from "@/components/crm/ComplaintTracker";
import DashboardStats from "@/components/crm/DashboardStats";
import ComplaintMap from "@/components/crm/ComplaintMap";
import axios from "axios";

export default function Home() {
  const { user, isLoaded } = useUser();
  const syncedUserIdRef = useRef<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "new" | "history" | "map">("dashboard");
  const [dbUser, setDbUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    if (!isLoaded || !user || syncedUserIdRef.current === user.id) {
      return;
    }

    syncedUserIdRef.current = user.id;

    const syncUser = async () => {
      try {
        const response = await axios.post("/api/users/sync");
        const payload = response.data;

        setDbUser(payload.data);

        try {
          const notifRes = await axios.get(`/api/notifications?userId=${payload.data.id}&unreadOnly=true`);
          setUnreadCount(notifRes.data?.meta?.unreadCount || 0);
        } catch (e) {
          console.error("Failed to fetch notifications", e);
        }

        if (payload.meta?.created) {
          setSyncMessage("Your PS-CRM account has been created.");
          return;
        }

        setSyncMessage("Your account is ready.");
      } catch {
        setSyncMessage("Failed to sync account.");
      }
    };

    void syncUser();
  }, [isLoaded, user]);

  // Close mobile menu on tab change
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-6 animate-fade-in">
          <div className="relative w-16 h-16">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
            <ShieldCheck className="absolute inset-0 m-auto w-7 h-7 text-indigo-600 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">PS-CRM</p>
            <p className="text-xs font-bold text-slate-400 mt-1 animate-pulse">INITIALIZING SECURE PORTAL</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-indigo-50/30">
        <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-2xl shadow-slate-100 border border-slate-100 text-center animate-scale-in">
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-2xl shadow-indigo-200">
            <ShieldCheck className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter">PS-CRM</h1>
          <p className="text-slate-500 text-lg mb-10 font-medium">Police & Public Services <br/> Citizen Relationship Management</p>
          
          <div className="space-y-4">
            <a 
              href="/sign-in"
              className="block w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5 active:scale-95"
            >
              Sign In
            </a>
            <a 
              href="/sign-up"
              className="block w-full py-4 bg-white text-slate-900 border-2 border-slate-100 rounded-2xl font-bold hover:bg-slate-50 hover:border-slate-200 transition-all"
            >
              Register Account
            </a>
            <p className="text-xs text-slate-400 font-medium">
              Access grievance management, real-time tracking, and administrative controls.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "new", label: "Submit Grievance", icon: FilePlus2 },
    { id: "history", label: "Track History", icon: History },
    { id: "map", label: "Heatmap View", icon: MapIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-40 md:relative md:z-auto
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${isSidebarOpen ? "w-72" : "md:w-20 w-72"}
          bg-white border-r border-slate-100 
          transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] 
          flex flex-col shadow-xl md:shadow-none
        `}
      >
        <div className="p-6 flex items-center gap-4 border-b border-slate-50">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div className={`overflow-hidden transition-all duration-300 ${isSidebarOpen ? "opacity-100 w-auto" : "md:opacity-0 md:w-0 opacity-100 w-auto"}`}>
            <span className="text-xl font-black text-slate-900 tracking-tight whitespace-nowrap">PS-CRM</span>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Citizen Portal</p>
          </div>
          {/* Mobile close button */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="ml-auto md:hidden p-1.5 hover:bg-slate-50 rounded-xl text-slate-400 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto scrollbar-hide">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 px-4 mb-3">
            Navigation
          </p>
          {sidebarItems.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id as any)}
              style={{ animationDelay: `${idx * 50}ms` }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group animate-slide-in-left ${
                activeTab === item.id 
                  ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${activeTab === item.id ? "text-white" : "group-hover:text-indigo-600"}`} />
              <span className={`font-bold text-sm tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? "opacity-100 w-auto" : "md:opacity-0 md:w-0 opacity-100 w-auto"}`}>
                {item.label}
              </span>
              {activeTab === item.id && isSidebarOpen && <ChevronRight className="w-4 h-4 ml-auto opacity-60 shrink-0" />}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-50">
          <SignOutButton>
            <button className={`w-full flex items-center gap-4 p-4 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all group`}>
              <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform shrink-0" />
              <span className={`font-bold text-sm tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? "opacity-100 w-auto" : "md:opacity-0 md:w-0 opacity-100 w-auto"}`}>
                Sign Out
              </span>
            </button>
          </SignOutButton>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-16 md:h-20 bg-white border-b border-slate-100 px-4 md:px-8 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3 md:gap-6">
            {/* Mobile: hamburger opens mobile menu */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500 md:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            {/* Desktop: toggle sidebar collapse */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hidden md:flex"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="h-6 w-px bg-slate-100 hidden sm:block" />
            <div>
              <h2 className="text-base md:text-lg font-black text-slate-900 tracking-tight">
                {sidebarItems.find(i => i.id === activeTab)?.label}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hidden sm:block">
                Citizen Portal • {user.firstName || "User"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <a 
              href="/notifications"
              className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500 relative"
            >
              <Bell className="w-5 h-5 md:w-6 md:h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </a>
            <div className="relative hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Quick search..." 
                className="pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium w-52 lg:w-64 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all"
              />
            </div>
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl overflow-hidden shadow-lg border-2 border-white bg-indigo-600 flex items-center justify-center shrink-0">
              {user.imageUrl ? (
                <img src={user.imageUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-black text-sm">{user.firstName?.[0] || "U"}</span>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
            {/* Notification Banner */}
            {syncMessage && (
              <div className="bg-indigo-600 p-4 rounded-2xl flex items-center justify-between text-white shadow-xl shadow-indigo-100 animate-fade-up">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-bold tracking-wide">{syncMessage}</p>
                </div>
                <button onClick={() => setSyncMessage("")} className="p-1 hover:bg-white/20 rounded-lg transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Dashboard View */}
            {activeTab === "dashboard" && (
              <div className="space-y-8 animate-fade-up">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-start sm:items-end justify-between">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">
                      Welcome back, {user.firstName || "Citizen"}
                    </h1>
                    <p className="text-slate-500 font-medium mt-2 text-sm md:text-base">
                      Manage your grievances and track real-time resolution progress.
                    </p>
                  </div>
                  <button 
                    onClick={() => handleTabChange("new")}
                    className="px-6 md:px-8 py-3 md:py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-3 shadow-2xl hover:bg-indigo-600 transition-all group whitespace-nowrap hover:-translate-y-0.5 active:scale-95"
                  >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    New Grievance
                  </button>
                </div>

                <DashboardStats />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-indigo-600" />
                        Recent Activities
                      </h3>
                      <button 
                        onClick={() => handleTabChange("history")}
                        className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors hover:underline"
                      >
                        View All
                      </button>
                    </div>
                    {dbUser && <ComplaintTracker citizenId={dbUser.id} />}
                  </div>

                  <div className="space-y-4 md:space-y-6">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                      <MessageSquare className="w-6 h-6 text-indigo-600" />
                      System Alerts
                    </h3>
                    <div className="space-y-3">
                      {[
                        { type: "warning", text: "Heavy rainfall alert in Ward 4. Road repair delays expected.", time: "2h ago" },
                        { type: "info", text: "New department 'Vigilance' added to the portal.", time: "5h ago" },
                        { type: "success", text: "System maintenance completed successfully.", time: "1d ago" }
                      ].map((alert, i) => (
                        <div 
                          key={i} 
                          style={{ animationDelay: `${i * 100}ms` }}
                          className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex gap-4 items-start animate-fade-up"
                        >
                          <div className={`p-2 rounded-lg shrink-0 ${
                            alert.type === "warning" ? "bg-amber-50 text-amber-600" : 
                            alert.type === "success" ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                          }`}>
                            <AlertCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 leading-snug">{alert.text}</p>
                            <span className="text-[10px] font-black uppercase text-slate-400 mt-2 block">{alert.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* New Grievance View */}
            {activeTab === "new" && (
              <div className="animate-fade-up">
                {dbUser && (
                  <QuickComplaintForm 
                    citizenId={dbUser.id} 
                    onSuccess={() => handleTabChange("history")} 
                  />
                )}
              </div>
            )}

            {/* Tracking View */}
            {activeTab === "history" && (
              <div className="animate-fade-up">
                <div className="mb-8">
                  <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">Complaint Tracking</h1>
                  <p className="text-slate-500 font-medium mt-2 text-sm md:text-base">
                    Monitor the real-time status and action history of your submitted grievances.
                  </p>
                </div>
                {dbUser && <ComplaintTracker citizenId={dbUser.id} />}
              </div>
            )}

            {/* Map View */}
            {activeTab === "map" && (
              <div className="animate-fade-up space-y-8">
                <div>
                  <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">City Heatmap</h1>
                  <p className="text-slate-500 font-medium mt-2 text-sm md:text-base">
                    Visualizing complaint density and high-priority zones across city wards.
                  </p>
                </div>
                <ComplaintMap />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
