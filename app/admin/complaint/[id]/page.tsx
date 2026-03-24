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
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { ComplaintStatus, Priority } from "@prisma/client";

export default function AdminComplaintDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [complaint, setComplaint] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Assignment State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [availableOfficers, setAvailableOfficers] = useState<any[]>([]);

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

  const openAssignModal = async () => {
    setIsAssignModalOpen(true);
    try {
      const res = await fetch(`/api/complaint/assign/${id}`);
      const json = await res.json();
      setAvailableOfficers(json.data.availableOfficers);
    } catch (error) {
      console.error("Error fetching available officers:", error);
    }
  };

  const handleAssign = async (officerId: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/complaint/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId: id, officerId }),
      });
      if (res.ok) {
        setIsAssignModalOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error("Error assigning officer:", error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!complaint) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Case Management</h1>
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
              onClick={openAssignModal}
              className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
            >
              <User className="w-5 h-5" />
              Assign Officer
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

              {complaint.photosUrls?.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" /> Evidence Attachments
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {complaint.photosUrls.map((url: string, i: number) => (
                      <div key={i} className="aspect-square bg-gray-100 rounded-2xl overflow-hidden border-2 border-white shadow-sm hover:scale-105 transition-all">
                        <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Audit History */}
            <div className="space-y-6">
              <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                <HistoryIcon className="w-6 h-6 text-blue-600" /> Audit Trail
              </h2>
              <div className="space-y-4">
                {auditLogs.map((log) => (
                  <div key={log.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex gap-6 items-center hover:border-blue-100 transition-all">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{log.action}</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{format(new Date(log.createdAt), "MMM d, h:mm a")}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-800">
                        {log.action === "ASSIGNED" ? `Assigned to officer ID ${log.newValue}` : 
                         log.action === "STATUS_CHANGED" ? `Status updated to ${log.newValue}` : log.action}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Status Card */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Case Control</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Current Status</span>
                  <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest ${
                    complaint.status === "RESOLVED" ? "bg-emerald-50 text-emerald-600" :
                    complaint.status === "SUBMITTED" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                  }`}>
                    {complaint.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Priority</span>
                  <span className="text-xs font-black text-gray-900 uppercase tracking-widest">{complaint.priority}</span>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Assigned Personnel</p>
                  {complaint.assignedOfficer ? (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-sm font-black text-white">
                        {complaint.assignedOfficer.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900 leading-none mb-1">{complaint.assignedOfficer.name}</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{complaint.assignedOfficer.position}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                      <p className="text-xs font-black text-amber-600 uppercase tracking-widest">No primary officer</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Management Actions</h3>
              <button 
                onClick={() => alert("Escalation requires a higher-tier officer assignment.")}
                disabled={updating}
                className="w-full py-4 px-6 bg-gray-50 text-gray-700 rounded-2xl font-bold text-sm flex items-center justify-between hover:bg-gray-100 transition-all group disabled:opacity-50"
              >
                Escalate Case
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="w-full py-4 px-6 bg-gray-50 text-gray-700 rounded-2xl font-bold text-sm flex items-center justify-between hover:bg-gray-100 transition-all group disabled:opacity-50">
                Mark as Internal
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => {
                  if (confirm("Are you sure you want to reject this case?")) {
                    updateStatus(ComplaintStatus.REJECTED);
                  }
                }}
                disabled={updating}
                className="w-full py-4 px-6 bg-rose-50 text-rose-600 rounded-2xl font-bold text-sm flex items-center justify-between hover:bg-rose-600 hover:text-white transition-all group disabled:opacity-50"
              >
                Reject Complaint
                <AlertCircle className="w-4 h-4 opacity-50 flex-shrink-0 group-hover:text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Assign Officer</h3>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Select resolving personnel</p>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:text-gray-900 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-4">
              {availableOfficers.map((officer) => (
                <button 
                  key={officer.id}
                  onClick={() => handleAssign(officer.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-sm font-black text-blue-700">
                    {officer.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-gray-900 leading-none mb-1">{officer.name}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{officer.position} • {officer.status}</p>
                  </div>
                  <Plus className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
