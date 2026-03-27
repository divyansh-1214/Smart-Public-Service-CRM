"use client";

import axios from "axios";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, LogOut, Mail, ShieldCheck, Inbox, AlertCircle, Clock, CheckCircle2, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useAppDispatch } from "@/lib/redux/store";
import { setWorkerSession, clearUser } from "@/lib/redux/slices/authSlice";

type WorkerSessionData = {
  officerId: string;
  email: string;
  name: string;
  departmentId: string;
  status: string;
};

type AssignedComplaint = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  department?: { name: string } | null;
};

const priorityConfig: Record<string, { bg: string; text: string; dot: string }> = {
  CRITICAL: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
  HIGH: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  MEDIUM: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  LOW: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  MINIMAL: { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400" },
};

const statusConfig: Record<string, { bg: string; text: string }> = {
  SUBMITTED: { bg: "bg-blue-50", text: "text-blue-700" },
  ASSIGNED: { bg: "bg-purple-50", text: "text-purple-700" },
  IN_PROGRESS: { bg: "bg-amber-50", text: "text-amber-700" },
  RESOLVED: { bg: "bg-emerald-50", text: "text-emerald-700" },
  CLOSED: { bg: "bg-slate-50", text: "text-slate-600" },
  REJECTED: { bg: "bg-rose-50", text: "text-rose-700" },
};

export default function WorkerHomePage() {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState("");
  const [worker, setWorker] = useState<WorkerSessionData | null>(null);
  const [complaints, setComplaints] = useState<AssignedComplaint[]>([]);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingComplaints, setIsFetchingComplaints] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchAssignedComplaints = async (officerId: string) => {
    setIsFetchingComplaints(true);
    try {
      const response = await axios.get("/api/complaint", {
        params: { assignedOfficerId: officerId, limit: 50, page: 1 },
      });
      setComplaints(response.data.data ?? []);
    } catch {
      setErrorMessage("Failed to fetch assigned complaints.");
    } finally {
      setIsFetchingComplaints(false);
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      setIsCheckingSession(true);
      try {
        const response = await axios.get("/api/worker/auth/session");
        const sessionWorker = response.data.data as WorkerSessionData;
        setWorker(sessionWorker);
        await fetchAssignedComplaints(sessionWorker.officerId);
      } catch {
        setWorker(null);
      } finally {
        setIsCheckingSession(false);
      }
    };
    void restoreSession();
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const response = await axios.post("/api/worker/auth/login", { email });
      console.log("Login response:", response.data);
      const sessionWorker = response.data.data as WorkerSessionData;
      setWorker(sessionWorker);
      dispatch(setWorkerSession({
        officerId: sessionWorker.officerId,
        departmentId: sessionWorker.departmentId,
      }));
      await fetchAssignedComplaints(sessionWorker.officerId);
    } catch {
      setErrorMessage("Only active worker emails can access this portal.");
      setWorker(null);
      setComplaints([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setErrorMessage(null);
    try {
      await axios.post("/api/worker/auth/logout");
      setWorker(null);
      setComplaints([]);
      setEmail("");
      dispatch(clearUser());
    } catch {
      setErrorMessage("Failed to logout. Please try again.");
    }
  };

  if (isCheckingSession) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="relative w-12 h-12">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
            <ShieldCheck className="absolute inset-0 m-auto w-5 h-5 text-slate-700" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse">Verifying Session</p>
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md animate-scale-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-slate-200">
              <ShieldCheck className="w-9 h-9 text-white" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Secure Worker Portal</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Officer Access Login</h2>
            <p className="mt-2 text-sm font-medium text-slate-500 max-w-xs mx-auto">
              Enter your registered officer email to access assigned complaint cases.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100 p-6 md:p-8">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-2">
                  Officer Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                    placeholder="officer@city.gov"
                    autoComplete="email"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 animate-fade-up">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <p className="text-sm font-medium text-rose-700">{errorMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-black uppercase tracking-wide text-white transition-all hover:bg-slate-800 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
              >
                {isSubmitting ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</>
                ) : (
                  <>Login as Worker <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const criticalCount = complaints.filter(c => c.priority === "CRITICAL" || c.priority === "HIGH").length;
  const inProgressCount = complaints.filter(c => c.status === "IN_PROGRESS").length;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Worker Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-200">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full -ml-24 -mb-24" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Active Session</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">{worker.name}</h2>
            <p className="text-sm font-medium text-slate-400 mt-1">{worker.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-rose-300 transition-all hover:bg-rose-500/20 hover:border-rose-400/50 active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Mini stats */}
        <div className="relative grid grid-cols-3 gap-3 mt-6">
          {[
            { label: "Assigned", value: complaints.length, icon: Inbox },
            { label: "In Progress", value: inProgressCount, icon: Clock },
            { label: "High Priority", value: criticalCount, icon: AlertCircle },
          ].map((stat, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 md:p-4 text-center">
              <p className="text-xl md:text-2xl font-black">{stat.value}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Complaints */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 md:px-8 py-5 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-lg font-black tracking-tight text-slate-900">Assigned Complaints</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-600">
            {complaints.length} items
          </span>
        </div>

        {isFetchingComplaints ? (
          <div className="p-12 flex flex-col items-center gap-4 animate-fade-in">
            <div className="w-8 h-8 border-4 border-slate-100 border-t-slate-600 rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-400">Loading complaints...</p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-12 md:p-16 text-center animate-scale-in">
            <CheckCircle2 className="w-14 h-14 text-emerald-200 mx-auto mb-4" />
            <h4 className="text-base font-black text-slate-900">All Clear!</h4>
            <p className="text-sm font-medium text-slate-500 mt-1">No complaints are currently assigned to your account.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {complaints.map((complaint, idx) => {
              const pConf = priorityConfig[complaint.priority] ?? priorityConfig.MINIMAL;
              const sConf = statusConfig[complaint.status] ?? statusConfig.SUBMITTED;
              return (
                <Link
                  key={complaint.id}
                  href={`/worker/complaint/${complaint.id}`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                  className="block px-4 py-4 md:px-6 md:py-5 transition-all hover:bg-slate-50 group animate-fade-up"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${pConf.dot} shrink-0`} />
                        <h4 className="text-sm font-black tracking-wide text-slate-900 truncate group-hover:text-indigo-700 transition-colors">{complaint.title}</h4>
                      </div>
                      <p className="text-xs font-medium text-slate-500 line-clamp-1 ml-4 mb-2.5">{complaint.description}</p>
                      <div className="flex flex-wrap items-center gap-2 ml-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${pConf.bg} ${pConf.text}`}>
                          {complaint.priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${sConf.bg} ${sConf.text}`}>
                          {complaint.status.replace("_", " ")}
                        </span>
                        {complaint.department?.name && (
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{complaint.department.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
