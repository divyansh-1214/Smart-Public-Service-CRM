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
  Loader2,
  Camera
} from "lucide-react";
import { format } from "date-fns";
import { ComplaintStatus, Priority } from "@prisma/client";
import axios from "axios";
import FileUploader from "@/components/crm/FileUploader";

const workerUpdatableStatuses = Object.values(ComplaintStatus).filter(
  (status) => status !== ComplaintStatus.RESOLVED,
);

export default function WorkerComplaintDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [complaint, setComplaint] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus | "">("");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showResolvePanel, setShowResolvePanel] = useState(false);
  const [resolutionProofUrls, setResolutionProofUrls] = useState<string[]>([]);
  const [resolutionNote, setResolutionNote] = useState("");

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      setLoading(true);
      await axios.get("/api/worker/auth/session");
      const [complaintRes, auditRes] = await Promise.all([
        axios.get(`/api/complaint/${id}`),
        axios.get(`/api/audit-log?complaintId=${id}`)
      ]);

      const complaintData = complaintRes.data?.data;
      setComplaint(complaintData);
      if (complaintData?.status && complaintData.status !== ComplaintStatus.RESOLVED) {
        setSelectedStatus(complaintData.status as ComplaintStatus);
      } else {
        setSelectedStatus("");
      }
      setAuditLogs(auditRes.data?.data ?? []);
    } catch (error) {
      console.error("Error fetching complaint details:", error);
      router.replace("/worker");
    } finally {
      setLoading(false);
    }
  }

  const updateStatus = async () => {
    if (!selectedStatus) return;

    setStatusError(null);
    setUpdating(true);
    try {
      await axios.patch(`/api/complaint/${id}`, { status: selectedStatus });
      await fetchData();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiMessage =
          (error.response?.data as { error?: string })?.error ??
          error.message;

        console.error("Error updating status:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });

        setStatusError(apiMessage || "Failed to update status");
      } else {
        console.error("Error updating status:", error);
        setStatusError("Failed to update status");
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleResolve = async () => {
    if (resolutionProofUrls.length === 0) {
      setStatusError("Please upload at least one proof photo before resolving.");
      return;
    }
    setStatusError(null);
    setUpdating(true);
    try {
      await axios.patch(`/api/complaint/resolve/${id}`, {
        resolutionProofUrls,
        resolutionNote: resolutionNote.trim() || undefined,
      });
      alert("Case marked as resolved with proof!");
      router.push("/worker");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setStatusError((error.response?.data as { error?: string })?.error ?? "Failed to resolve");
      } else {
        console.error("Error resolving complaint:", error);
        setStatusError("Failed to resolve complaint.");
      }
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
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ComplaintStatus)}
            className="bg-white border-2 border-gray-100 px-6 py-3 rounded-2xl font-bold text-sm focus:border-blue-600 outline-none transition-all shadow-sm"
            disabled={updating}
          >
            <option value="" disabled>Select status</option>
            {workerUpdatableStatuses.map(s => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
          <button
            onClick={updateStatus}
            disabled={
              updating ||
              !selectedStatus ||
              selectedStatus === complaint.status
            }
            className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Settings className="w-5 h-5" />}
            Update Status
          </button>
          <button 
            onClick={() => setShowResolvePanel(!showResolvePanel)}
            className={`px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-xl transition-all ${
              showResolvePanel
                ? "bg-gray-200 text-gray-700 shadow-gray-100 hover:bg-gray-300"
                : "bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700"
            }`}
          >
            {showResolvePanel ? <X className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            {showResolvePanel ? "Cancel" : "Resolve Case"}
          </button>
        </div>
      </div>

      {statusError && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {statusError}
        </div>
      )}

      {/* Resolution Proof Panel */}
      {showResolvePanel && (
        <div className="bg-emerald-50 rounded-3xl p-8 border-2 border-emerald-200 space-y-6 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Upload Resolution Proof</h3>
              <p className="text-sm font-medium text-gray-500">Upload photos proving the work has been done. The citizen will verify these.</p>
            </div>
          </div>

          <FileUploader
            value={resolutionProofUrls}
            onChange={setResolutionProofUrls}
            maxFiles={5}
            label="Proof Photos"
            description="Upload at least 1 photo showing the completed work"
          />

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Resolution Note (Optional)</label>
            <textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Describe the work done to resolve this complaint..."
              className="w-full h-24 px-6 py-4 bg-white border-2 border-emerald-100 rounded-2xl font-bold text-gray-900 focus:border-emerald-500 transition-all outline-none resize-none"
              maxLength={2000}
            />
          </div>

          <button
            onClick={handleResolve}
            disabled={updating || resolutionProofUrls.length === 0}
            className="w-full px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {resolutionProofUrls.length === 0 ? "Upload Proof to Resolve" : `Resolve with ${resolutionProofUrls.length} Proof Photo${resolutionProofUrls.length > 1 ? "s" : ""}`}
          </button>
        </div>
      )}

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
                <button 
                  onClick={async () => {
                    if (!newComment.trim()) return;
                    try {
                      await axios.patch(`/api/complaint/${id}`, { status: "IN_PROGRESS" }); // Or just call an audit log endpoint if it exists
                      setNewComment("");
                      fetchData();
                      alert("Update posted successfully.");
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  disabled={!newComment.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all ml-auto disabled:opacity-50"
                >
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
