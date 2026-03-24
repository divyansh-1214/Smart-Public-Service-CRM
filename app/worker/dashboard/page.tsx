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
  Search
} from "lucide-react";
import { format } from "date-fns";
import axios from "axios";

export default function WorkerDashboard() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Sync officer to get DB ID
        const syncRes = await axios.post("/api/worker/sync");
        
        const officerId = syncRes.data?.data?.id;

        // Fetch complaints assigned to this officer and global stats
        const [, statsRes] = await Promise.all([
          axios.get(`/api/complaint/assign/${officerId}`), // In a real app we'd use a dedicated endpoint, but let's filter the general endpoint for now since assign/[id] gets the assignment context
          axios.get("/api/dashboard/stats")
        ]);
        
        // Wait, the GET /api/complaint doesn't accept officerId out of the box. 
        // Let's fetch all complaints but filter client-side for now, or see if it accepts it.
        // Looking at route.ts, filtering by assignedOfficerId is not built-in to the GET route.
        // We'll filter client-side since this is a CRM prototype.
        const allComplaintsRes = await axios.get("/api/complaint?limit=100");
        const allComplaintsData = allComplaintsRes.data;
        
        const myComplaints = allComplaintsData.data.filter(
          (c: any) => c.assignedOfficer?.id === officerId
        );

        setComplaints(myComplaints);
        setStats(statsRes.data?.data);
      } catch (error) {
        console.error("Error fetching worker dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Welcome */}
      <div className="flex flex-col md:flex-row gap-8 items-end justify-between">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Your Work Queue</h1>
          <p className="text-gray-500 font-medium mt-2">Manage assigned grievances and resolve citizen issues.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 flex items-center gap-3 shadow-sm">
            <Activity className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-black text-gray-900">{complaints.length} Assigned</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Assigned To You", value: complaints.length, icon: Activity, color: "blue" },
          { label: "High Priority", value: complaints.filter(c => c.priority === "HIGH" || c.priority === "CRITICAL").length, icon: AlertCircle, color: "rose" },
          { label: "Resolutions", value: 0, icon: CheckCircle2, color: "emerald" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group transition-all hover:shadow-xl">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-3xl font-black text-gray-900 tracking-tight">{stat.value}</h3>
            </div>
            <div className={`w-14 h-14 bg-${stat.color}-50 rounded-2xl flex items-center justify-center text-${stat.color}-600`}>
              <stat.icon className="w-7 h-7" />
            </div>
          </div>
        ))}
      </div>

      {/* Main List */}
      <div className="space-y-6">
        <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
          <Clock className="w-6 h-6 text-blue-600" /> Active Assignments
        </h2>
        
        <div className="grid grid-cols-1 gap-4">
          {complaints.map((complaint) => (
            <a 
              key={complaint.id}
              href={`/worker/complaint/${complaint.id}`}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all"
            >
              <div className="flex items-center gap-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg ${
                  complaint.priority === "CRITICAL" ? "bg-rose-600 shadow-rose-100" :
                  complaint.priority === "HIGH" ? "bg-orange-600 shadow-orange-100" : "bg-blue-600 shadow-blue-100"
                }`}>
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-gray-900 leading-none mb-2">{complaint.title}</h4>
                  <div className="flex items-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Ward {complaint.ward || "N/A"}</span>
                    <span>•</span>
                    <span>{format(new Date(complaint.createdAt), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  complaint.status === "IN_PROGRESS" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                }`}>
                  {complaint.status}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
