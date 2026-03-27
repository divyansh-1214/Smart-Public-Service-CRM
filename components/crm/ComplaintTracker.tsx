"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  ExternalLink,
  MapPin,
  Calendar,
  User,
  Building2,
  AlertCircle
} from "lucide-react";
import { ComplaintStatus, Priority } from "@prisma/client";
import axios from "axios";

interface Complaint {
  id: string;
  title: string;
  description: string;
  status: ComplaintStatus;
  priority: Priority;
  createdAt: string;
  locationAddress: string;
  department?: { name: string };
  assignedOfficer?: { name: string };
  slaDeadline?: string;
}

interface ComplaintTrackerProps {
  citizenId: string;
}

export default function ComplaintTracker({ citizenId }: ComplaintTrackerProps) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ComplaintStatus | "ALL">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchComplaints = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("/api/complaint", {
        params: {
          citizenId,
          page: 1,
          limit: 100,
        },
      });
      setComplaints(response.data.data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? "Failed to fetch complaints");
      } else {
        setError("Failed to fetch complaints");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (citizenId) {
      fetchComplaints();
    }
  }, [citizenId]);

  const filteredComplaints = complaints.filter((c) => {
    const matchesFilter = filter === "ALL" || c.status === filter;
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: ComplaintStatus) => {
    switch (status) {
      case "SUBMITTED": return "bg-blue-100 text-blue-700 border-blue-200";
      case "ASSIGNED": return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "IN_PROGRESS": return "bg-amber-100 text-amber-700 border-amber-200";
      case "RESOLVED": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "CLOSED": return "bg-gray-100 text-gray-700 border-gray-200";
      case "REJECTED": return "bg-rose-100 text-rose-700 border-rose-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case "CRITICAL": return "text-rose-600";
      case "HIGH": return "text-orange-600";
      case "MEDIUM": return "text-blue-600";
      case "LOW": return "text-emerald-600";
      case "MINIMAL": return "text-slate-600";
      default: return "text-gray-600";
    }
  };

  if (isLoading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-gray-500 font-medium animate-pulse">Loading your complaints...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-8 bg-red-50 rounded-2xl border border-red-100 flex flex-col items-center text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-red-900 mb-2">Something went wrong</h3>
        <p className="text-red-700 mb-6 max-w-md">{error}</p>
        <button 
          onClick={fetchComplaints}
          className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID or Title..."
            className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {["ALL", ...Object.values(ComplaintStatus)].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                filter === s 
                  ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100" 
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
            >
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Complaint List */}
      <div className="grid gap-4">
        {filteredComplaints.length > 0 ? (
          filteredComplaints.map((c) => (
            <div 
              key={c.id} 
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group"
            >
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-mono font-bold text-gray-400 uppercase">
                      #{c.id.slice(-8).toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border ${getStatusColor(c.status)}`}>
                      {c.status}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${getPriorityColor(c.priority)}`}>
                      <AlertTriangle className="w-3 h-3" />
                      {c.priority} Priority
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {c.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-y-3 gap-x-6 pt-2">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {format(new Date(c.createdAt), "MMM d, yyyy")}
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="truncate max-w-[200px]">{c.locationAddress}</span>
                    </div>
                    {c.department && (
                      <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        {c.department.name.replace(/_/g, " ")}
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:w-64 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-3 mb-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assigned Officer</span>
                      </div>
                      <p className="text-sm font-bold text-gray-700">
                        {c.assignedOfficer?.name ?? "Awaiting Assignment"}
                      </p>
                    </div>

                    {c.slaDeadline && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 rounded-lg border border-rose-100">
                        <Clock className="w-4 h-4 text-rose-500" />
                        <span className="text-[10px] font-bold text-rose-600 uppercase">
                          Due by {format(new Date(c.slaDeadline), "MMM d")}
                        </span>
                      </div>
                    )}
                  </div>

                  <a 
                    href={`/complaint/${c.id}`}
                    className="w-full mt-4 md:mt-0 flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all"
                  >
                    View Action History
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-200 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No complaints found</h3>
            <p className="text-gray-500 max-w-xs mb-8">
              {searchTerm || filter !== "ALL" 
                ? "No complaints match your current filters." 
                : "You haven't submitted any grievances yet. Your records will appear here."}
            </p>
            {(searchTerm || filter !== "ALL") && (
              <button 
                onClick={() => { setSearchTerm(""); setFilter("ALL"); }}
                className="text-blue-600 font-bold hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
