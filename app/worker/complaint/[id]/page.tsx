"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Clock, 
  MapPin, 
  FileText, 
  History as HistoryIcon, 
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  User,
  ArrowLeft,
  Settings,
  X,
  Plus,
  MessageSquare,
  Image as ImageIcon,
  Send,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ComplaintStatus, Priority } from "@prisma/client";

export default function WorkerComplaintDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [complaint, setComplaint] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      setLoading(true);
      const [complaintRes, auditRes] = await Promise.all([
        fetch(`/api/complaint/${id}`),
        fetch(`/api/audit-log?complaintId=${id}`)
      ]);

      const complaintData = await complaintRes.json();
      const auditData = await auditRes.json();

      setComplaint(complaintData.data);
      setAuditLogs(auditData.data);
    } catch (error) {
      console.error("Error fetching complaint details:", error);
    } finally {
      setLoading(false);
    }
  }

  const updateStatus = async (status: ComplaintStatus) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/complaint/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleResolve = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/complaint/resolve/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RESOLVED" }),
      });
      if (res.ok) {
        alert("Case marked as resolved!");
        router.push("/worker/dashboard");
      }
    } catch (error) {
      console.error("Error resolving complaint:", error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return null;
  if (!complaint) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Resolve Case</h1>
            <p className="text-gray-500 font-medium mt-1">Grievance #{complaint.id.slice(-8).toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={complaint.status}
            onChange={(e) => updateStatus(e.target.value as ComplaintStatus)}
            className="bg-white border-2 border-gray-100 px-6 py-3 rounded-2xl font-bold text-sm focus:border-blue-600 outline-none transition-all shadow-sm"
            disabled={updating}
          >
            {Object.values(ComplaintStatus).map(s => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
          <button 
            onClick={handleResolve}
            disabled={updating}
            className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center gap-3 shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50"
          >
            {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            Resolve Case
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Info */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">{complaint.title}</h2>
              <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-lg"><Clock className="w-3.5 h-3.5" /> {format(new Date(complaint.createdAt), "PPP")}</span>
                <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-lg"><ShieldCheck className="w-3.5 h-3.5" /> {complaint.category}</span>
                <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-lg"><MapPin className="w-3.5 h-3.5" /> Ward {complaint.ward || "N/A"}</span>
              </div>
            </div>

            <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" /> Full Description
              </h3>
              <p className="text-gray-600 leading-relaxed font-medium">{complaint.description}</p>
            </div>
          </div>

          {/* Action Area */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-8">
            <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-blue-600" /> Update Case
            </h3>
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Internal Resolution Notes</label>
                <textarea 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Describe actions taken to resolve this grievance..."
                  className="w-full h-32 px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-900 focus:bg-white focus:border-blue-600 transition-all outline-none resize-none"
                />
              </div>
              <div className="flex gap-4">
                <button className="px-6 py-3 bg-gray-50 text-gray-500 rounded-xl font-bold text-sm flex items-center gap-2 border border-gray-100 hover:bg-gray-100 transition-all">
                  <ImageIcon className="w-5 h-5" />
                  Attach Evidence
                </button>
                <button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all ml-auto">
                  <Send className="w-5 h-5" />
                  Post Update
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Citizen Details */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Citizen Info</h3>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-lg font-black uppercase">
                {complaint.citizen.name[0]}
              </div>
              <div>
                <p className="text-sm font-black text-gray-900 leading-none mb-1">{complaint.citizen.name}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grievance Filer</p>
              </div>
            </div>
          </div>

          {/* Audit History */}
          <div className="space-y-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-3 px-2">
              <HistoryIcon className="w-5 h-5 text-blue-600" /> Timeline
            </h3>
            <div className="space-y-4">
              {auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex gap-4 items-center transition-all">
                  <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{log.action}</span>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{format(new Date(log.createdAt), "MMM d")}</span>
                    </div>
                    <p className="text-[11px] font-bold text-gray-800 truncate">
                      {log.action === "ASSIGNED" ? `Assigned to ${log.newValue}` : log.action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
