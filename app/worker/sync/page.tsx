"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { 
  RefreshCw, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  User,
  ShieldAlert,
  Loader2
} from "lucide-react";
import axios from "axios";

export default function WorkerSyncPage() {
  const { user, isLoaded } = useUser();
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "error">("idle");
  const [dbOfficer, setDbOfficer] = useState<any>(null);

  const triggerSync = async () => {
    setSyncing(true);
    setSyncStatus("idle");
    try {
      const res = await axios.post("/api/worker/sync");
      setSyncStatus("success");
      setDbOfficer(res.data?.data);
    } catch (error) {
      console.error("Error syncing worker:", error);
      setSyncStatus("error");
    } finally {
      setSyncing(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex items-center gap-6">
        <a href="/worker/dashboard" className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500">
          <ArrowLeft className="w-6 h-6" />
        </a>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Account Synchronization</h1>
          <p className="text-gray-500 font-medium mt-1">Sync your identity across the CRM ecosystem</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 space-y-10">
        <div className="flex items-center gap-8">
          <div className="w-24 h-24 rounded-3xl bg-blue-50 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
            <img src={user?.imageUrl} alt="Clerk Profile" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-2">{user?.fullName}</h3>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
          <div className={`p-4 rounded-2xl ${syncStatus === "success" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}>
            {syncStatus === "success" ? <CheckCircle2 className="w-8 h-8" /> : <RefreshCw className={`w-8 h-8 ${syncing ? "animate-spin" : ""}`} />}
          </div>
        </div>

        <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Authentication Source</span>
            <span className="text-xs font-black text-blue-600 uppercase tracking-widest px-3 py-1 bg-blue-50 rounded-lg">Clerk Auth</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Database Record</span>
            <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg ${dbOfficer ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
              {dbOfficer ? "Linked" : "Not Found"}
            </span>
          </div>
          {dbOfficer && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Department</span>
                <span className="text-xs font-black text-gray-900 uppercase tracking-widest">{dbOfficer.departmentId}</span>
              </div>
            </div>
          )}
        </div>

        {syncStatus === "error" && (
          <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl flex gap-4 items-start animate-in fade-in slide-in-from-top-2">
            <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-black text-rose-900 leading-none">Synchronization Failed</p>
              <p className="text-xs font-bold text-rose-700 leading-relaxed">
                Could not link your account. Ensure you are registered as an officer in the system before syncing.
              </p>
            </div>
          </div>
        )}

        <button 
          onClick={triggerSync}
          disabled={syncing}
          className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 hover:shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Link & Synchronize Now"}
        </button>
      </div>

      <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex gap-4 items-start">
        <AlertCircle className="w-6 h-6 text-blue-600 shrink-0" />
        <p className="text-xs font-bold text-blue-800 leading-relaxed">
          Account synchronization ensures your local profile, department access, and assignment permissions are always up-to-date with your identity provider.
        </p>
      </div>
    </div>
  );
}
