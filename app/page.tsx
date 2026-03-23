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
import GrievanceForm from "@/components/crm/GrievanceForm";
import ComplaintTracker from "@/components/crm/ComplaintTracker";
import DashboardStats from "@/components/crm/DashboardStats";
import ComplaintMap from "@/components/crm/ComplaintMap";

export default function Home() {
  const { user, isLoaded } = useUser();
  const syncedUserIdRef = useRef<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "new" | "history" | "map">("dashboard");
  const [dbUser, setDbUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  useEffect(() => {
    if (!isLoaded || !user || syncedUserIdRef.current === user.id) {
      return;
    }

    syncedUserIdRef.current = user.id;

    const syncUser = async () => {
      try {
        const response = await fetch("/api/users/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const payload = await response.json();

        if (!response.ok) {
          setSyncMessage(payload.error ?? "Failed to sync account.");
          return;
        }

        setDbUser(payload.data);

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

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-500 font-bold animate-pulse">Initializing PS-CRM...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-2xl border border-gray-100 text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8 rotate-3">
            <ShieldCheck className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">PS-CRM</h1>
          <p className="text-gray-500 text-lg mb-10 font-medium">Police & Public Services <br/> Citizen Relationship Management</p>
          
          <div className="space-y-4">
            <a 
              href="/sign-in"
              className="block w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
            >
              Sign In to Dashboard
            </a>
            <p className="text-xs text-gray-400 font-medium">
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
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? "w-72" : "w-20"} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col z-20`}
      >
        <div className="p-6 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-100">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          {isSidebarOpen && <span className="text-xl font-black text-gray-900 tracking-tight">PS-CRM</span>}
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-8">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group ${
                activeTab === item.id 
                  ? "bg-blue-600 text-white shadow-xl shadow-blue-100" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? "text-white" : "group-hover:text-blue-600"}`} />
              {isSidebarOpen && <span className="font-bold text-sm tracking-wide">{item.label}</span>}
              {activeTab === item.id && isSidebarOpen && <ChevronRight className="w-4 h-4 ml-auto opacity-60" />}
            </button>
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="h-6 w-px bg-gray-200" />
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                {sidebarItems.find(i => i.id === activeTab)?.label}
              </h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                Citizen Portal • {user.firstName || "User"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Quick search..." 
                className="pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium w-64 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <button className="relative p-2.5 bg-gray-50 rounded-xl text-gray-500 hover:bg-gray-100 transition-all">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
            </button>
            <div className="h-10 w-10 rounded-xl overflow-hidden shadow-lg border-2 border-white bg-blue-600 flex items-center justify-center">
              {user.imageUrl ? (
                <img src={user.imageUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-black">{user.firstName?.[0] || "U"}</span>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Notification Banner */}
            {syncMessage && (
              <div className="bg-blue-600 p-4 rounded-2xl flex items-center justify-between text-white shadow-xl shadow-blue-100">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5" />
                  <p className="text-sm font-bold tracking-wide">{syncMessage}</p>
                </div>
                <button onClick={() => setSyncMessage("")}>
                  <X className="w-4 h-4 opacity-60 hover:opacity-100" />
                </button>
              </div>
            )}

            {/* Dashboard View */}
            {activeTab === "dashboard" && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col md:flex-row gap-8 items-end justify-between">
                  <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
                      Welcome back, {user.firstName || "Citizen"}
                    </h1>
                    <p className="text-gray-500 font-medium mt-2">
                      Manage your grievances and track real-time resolution progress.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("new")}
                    className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center gap-3 shadow-2xl hover:bg-blue-600 transition-all group"
                  >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    New Grievance
                  </button>
                </div>

                <DashboardStats />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-blue-600" />
                        Recent Activities
                      </h3>
                      <button 
                        onClick={() => setActiveTab("history")}
                        className="text-sm font-bold text-blue-600 hover:underline"
                      >
                        View All
                      </button>
                    </div>
                    {dbUser && <ComplaintTracker citizenId={dbUser.id} />}
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                      <MessageSquare className="w-6 h-6 text-blue-600" />
                      System Alerts
                    </h3>
                    <div className="space-y-4">
                      {[
                        { type: "warning", text: "Heavy rainfall alert in Ward 4. Road repair delays expected.", time: "2h ago" },
                        { type: "info", text: "New department 'Vigilance' added to the portal.", time: "5h ago" },
                        { type: "success", text: "System maintenance completed successfully.", time: "1d ago" }
                      ].map((alert, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex gap-4 items-start">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            alert.type === "warning" ? "bg-amber-50 text-amber-600" : 
                            alert.type === "success" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                          }`}>
                            <AlertCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800 leading-snug">{alert.text}</p>
                            <span className="text-[10px] font-black uppercase text-gray-400 mt-2 block">{alert.time}</span>
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
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-10 text-center">
                  <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Submit a Grievance</h1>
                  <p className="text-gray-500 font-medium mt-2 max-w-xl mx-auto">
                    Fill out the form below to report an issue. Your report will be automatically categorized and routed to the correct department.
                  </p>
                </div>
                {dbUser && (
                  <GrievanceForm 
                    citizenId={dbUser.id} 
                    onSuccess={() => setActiveTab("history")} 
                  />
                )}
              </div>
            )}

            {/* Tracking View */}
            {activeTab === "history" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-10">
                  <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Complaint Tracking</h1>
                  <p className="text-gray-500 font-medium mt-2">
                    Monitor the real-time status and action history of your submitted grievances.
                  </p>
                </div>
                {dbUser && <ComplaintTracker citizenId={dbUser.id} />}
              </div>
            )}

            {/* Map View */}
            {activeTab === "map" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                <div>
                  <h1 className="text-4xl font-black text-gray-900 tracking-tighter">City Heatmap</h1>
                  <p className="text-gray-500 font-medium mt-2">
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
