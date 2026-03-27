"use client";

import { useEffect, useState } from "react";
import { 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  ChevronRight,
  ShieldCheck,
  Inbox,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import axios from "axios";

const priorityConfig: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: "bg-rose-600", text: "text-white", border: "border-rose-200" },
  HIGH: { bg: "bg-orange-500", text: "text-white", border: "border-orange-200" },
  MEDIUM: { bg: "bg-amber-500", text: "text-white", border: "border-amber-200" },
  LOW: { bg: "bg-blue-500", text: "text-white", border: "border-blue-200" },
  MINIMAL: { bg: "bg-slate-400", text: "text-white", border: "border-slate-200" },
};

export default function WorkerDashboard() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const syncRes = await axios.post("/api/worker/sync");
        const officerId = syncRes.data?.data?.id;
        const allComplaintsRes = await axios.get("/api/complaint?limit=100");
        const myComplaints = (allComplaintsRes.data?.data ?? []).filter(
          (c: any) => c.assignedOfficer?.id === officerId
        );
        setComplaints(myComplaints);
      } catch (error) {
        console.error("Error fetching worker dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Skeleton header */}
        <div className="h-12 bg-slate-100 rounded-2xl w-2/3" />
        {/* Skeleton stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-slate-100 rounded-3xl" />)}
        </div>
        {/* Skeleton list */}
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const highPriorityCount = complaints.filter(c => c.priority === "HIGH" || c.priority === "CRITICAL").length;
  const inProgressCount = complaints.filter(c => c.status === "IN_PROGRESS").length;
  const resolvedCount = complaints.filter(c => c.status === "RESOLVED").length;

  const stats = [
    { label: "Assigned", value: complaints.length, icon: Activity, colorClass: "bg-indigo-50 text-indigo-600", numClass: "text-indigo-700" },
    { label: "High Priority", value: highPriorityCount, icon: AlertCircle, colorClass: "bg-rose-50 text-rose-600", numClass: "text-rose-700" },
    { label: "Resolved", value: resolvedCount, icon: CheckCircle2, colorClass: "bg-emerald-50 text-emerald-600", numClass: "text-emerald-700" },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between animate-fade-up">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">Your Work Queue</h1>
          <p className="text-slate-500 font-medium mt-2">Manage assigned grievances and resolve citizen issues.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-black text-slate-900">{inProgressCount} In Progress</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 md:gap-6">
        {stats.map((stat, i) => (
          <div
            key={i}
            style={{ animationDelay: `${i * 80}ms` }}
            className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all animate-fade-up group"
          >
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className={`w-10 h-10 rounded-xl ${stat.colorClass} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <h3 className={`text-2xl md:text-3xl font-black tracking-tight ${stat.numClass}`}>{stat.value}</h3>
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Complaints List */}
      <div className="space-y-4 animate-fade-up" style={{ animationDelay: "240ms" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Clock className="w-6 h-6 text-indigo-600" />
            Active Assignments
          </h2>
          <span className="text-xs font-bold text-slate-400">{complaints.length} cases</span>
        </div>

        {complaints.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 md:p-16 text-center animate-scale-in">
            <Inbox className="w-14 h-14 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-black text-slate-900">No Active Assignments</h3>
            <p className="text-sm font-medium text-slate-500 mt-2">You're all clear. Check back later for new assignments.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:gap-4">
            {complaints.map((complaint, idx) => {
              const pConf = priorityConfig[complaint.priority] ?? priorityConfig.MINIMAL;
              return (
                <a 
                  key={complaint.id}
                  href={`/worker/complaint/${complaint.id}`}
                  style={{ animationDelay: `${320 + idx * 50}ms` }}
                  className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all animate-fade-up"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${pConf.bg}`}>
                      <ShieldCheck className={`w-6 h-6 md:w-7 md:h-7 ${pConf.text}`} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm md:text-base font-black text-slate-900 leading-none mb-1.5 truncate group-hover:text-indigo-700 transition-colors">
                        {complaint.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {complaint.ward && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />Ward {complaint.ward}
                          </span>
                        )}
                        <span>•</span>
                        <span>{format(new Date(complaint.createdAt), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-4 shrink-0 ml-4">
                    <span className={`hidden sm:block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      complaint.status === "IN_PROGRESS" ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-700"
                    }`}>
                      {complaint.status.replace("_", " ")}
                    </span>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
