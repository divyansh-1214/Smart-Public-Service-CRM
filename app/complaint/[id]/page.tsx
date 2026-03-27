"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import axios from "axios";
import Image from "next/image";
export default function ComplaintDetailsPage() {
  const { id } = useParams();
  const [complaint, setComplaint] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [complaintRes, auditRes] = await Promise.all([
          axios.get(`/api/complaint/${id}`),
          axios.get(`/api/audit-log?complaintId=${id}`)
        ]);

        setComplaint(complaintRes.data?.data);
        setAuditLogs(auditRes.data?.data ?? []);
        console.log("Fetched complaint details:", complaintRes.data?.data);
      } catch (error) {
        console.error("Error fetching complaint details:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
        <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
        <h1 className="text-2xl font-black text-gray-900">Complaint Not Found</h1>
        <p className="text-gray-500 mt-2">The grievance you are looking for does not exist or has been removed.</p>
        <a href="/" className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">Back to Dashboard</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold transition-all">
            <ArrowLeft className="w-5 h-5" />
            Back
          </a>
          <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
            complaint.status === "RESOLVED" ? "bg-emerald-50 text-emerald-600" :
            complaint.status === "REJECTED" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
          }`}>
            {complaint.status}
          </div>
        </div>

        {/* Main Info */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{complaint.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-400 font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {format(new Date(complaint.createdAt), "PPP")}</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> {complaint.category}</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {complaint.ward || "No Ward"}</span>
            </div>
          </div>

          <div className="p-6 bg-gray-50 rounded-2xl">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" /> Description
            </h3>
            <p className="text-gray-600 leading-relaxed font-medium">{complaint.description}</p>
          </div>
          {Array.isArray(complaint.photosUrls) && complaint.photosUrls.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4">
              {complaint.photosUrls.map((url: string, index: number) => (
                <div key={index} className="relative aspect-4/3 overflow-hidden rounded-2xl bg-gray-100">
                  <Image
                    src={url}
                    alt={`Complaint Image ${index + 1}`}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm font-medium text-gray-500">No photos attached.</p>
          )}
        </div>

        {/* Timeline / Audit Logs */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <HistoryIcon className="w-6 h-6 text-blue-600" /> Case Timeline
          </h2>
          
          <div className="space-y-4">
            {auditLogs.map((log, index) => (
              <div key={log.id} className="relative flex gap-6 group">
                {index !== auditLogs.length - 1 && (
                  <div className="absolute left-6 top-10 bottom-0 w-0.5 bg-gray-100 group-hover:bg-blue-100 transition-colors" />
                )}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 z-10 ${
                  log.action === "RESOLVED" ? "bg-emerald-50 text-emerald-600" :
                  log.action === "ASSIGNED" ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-400"
                }`}>
                  {log.action === "RESOLVED" ? <CheckCircle2 className="w-6 h-6" /> :
                   log.action === "ASSIGNED" ? <User className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                </div>
                <div className="flex-1 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm group-hover:border-blue-100 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-blue-600 uppercase tracking-widest">{log.action}</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{format(new Date(log.createdAt), "MMM d, h:mm a")}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-800">
                    {log.action === "ASSIGNED" ? `Case assigned to officer ${log.newValue}` : 
                     log.action === "STATUS_CHANGED" ? `Status updated to ${log.newValue}` : log.action}
                  </p>
                  {log.metadata?.reason && (
                    <p className="text-xs text-gray-500 mt-2 italic">"{log.metadata.reason}"</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
