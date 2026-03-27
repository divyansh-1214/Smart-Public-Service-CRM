"use client";
import { useEffect, useState } from "react";
import { 
  Calendar, 
  Plus, 
  CheckCircle2, 
  X, 
  AlertCircle,
  Loader2,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import axios from "axios";
import { useAppSelector } from "@/lib/redux/store";
import { selectOfficerId } from "@/lib/redux/slices/authSlice";

export default function WorkerLeavePage() {
  const officerId = useAppSelector(selectOfficerId);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!officerId) {
      setLeaves([]);
      setLoading(false);
      return;
    }
    void fetchLeaves(officerId);
  }, [officerId]);

  async function fetchLeaves(currentOfficerId: string) {
    try {
      setLoading(true);
      const res = await axios.get(`/api/officer/leave?officerId=${currentOfficerId}`);
      setLeaves(res.data?.data ?? []);
    } catch (error) {
      console.error("Error fetching leaves:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!officerId) {
      setSubmitError("Worker session missing. Please login again.");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post("/api/officer/leave", {
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        reason,
        officerId,
      });

      setIsModalOpen(false);
      resetForm();
      await fetchLeaves(officerId);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Error submitting leave:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        const apiMessage =
          (error.response?.data as { error?: string; message?: string })?.error ??
          (error.response?.data as { error?: string; message?: string })?.message ??
          error.message;
        setSubmitError(apiMessage || "Failed to submit leave request.");
      } else {
        console.error("Error submitting leave:", error);
        setSubmitError("Failed to submit leave request.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStartDate("");
    setEndDate("");
    setReason("");
    setSubmitError(null);
  };
  if (loading) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Leave Management</h1>
          <p className="text-gray-500 font-medium mt-2">Track your time off and request new leaves.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-3 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
        >
          <Plus className="w-5 h-5" />
          Request Leave
        </button>
      </div>

      {/* Main List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-600" /> My Leave Records
          </h2>
          
          <div className="space-y-4">
            {leaves.length > 0 ? leaves.map((leave) => (
              <div key={leave.id} className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-blue-200 transition-all">
                <div className="flex items-center gap-4 md:gap-6">
                  <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                    leave.approved ? "bg-emerald-600 shadow-emerald-100" : "bg-amber-600 shadow-amber-100"
                  } text-white`}>
                    <Calendar className="w-5 h-5 md:w-7 md:h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm md:text-lg font-black text-gray-900 leading-none mb-1 md:mb-2">
                      {format(new Date(leave.startDate), "MMM d")} - {format(new Date(leave.endDate), "MMM d, yyyy")}
                    </h4>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate max-w-[200px] md:max-w-xs">
                      {leave.reason || "No reason specified."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 md:gap-6 ml-14 sm:ml-0">
                  <div className={`px-3 md:px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    leave.approved ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  }`}>
                    {leave.approved ? "Approved" : "Pending"}
                  </div>
                  <button className="p-2 md:p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )) : (
              <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-200 text-center">
                <Calendar className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="text-xl font-black text-gray-900 tracking-tight">No leave records</h3>
                <p className="text-gray-500 font-medium mt-2">You haven't requested any time off yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* Quick Stats */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-8">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Leave Balance</h3>
            <div className="space-y-6">
              {[
                { 
                  label: "Annual Leave", 
                  used: leaves.reduce((acc, l) => {
                    if (l.approved) {
                      const d = Math.ceil(Math.abs(new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      return acc + d;
                    }
                    return acc;
                  }, 0), 
                  total: 24, 
                  color: "bg-blue-600" 
                },
                { label: "Sick Leave", used: 0, total: 10, color: "bg-rose-600" }, // For prototype, assuming all current leaves are annual
                { label: "Personal Days", used: 0, total: 5, color: "bg-emerald-600" },
              ].map((bal, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-gray-700 tracking-tight uppercase">{bal.label}</span>
                    <span className="text-xs font-black text-gray-900">{bal.used} / {bal.total}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${bal.color} transition-all duration-1000 ease-out`} 
                      style={{ width: `${Math.min((bal.used / bal.total) * 100, 100)}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex gap-4 items-start">
            <div className="p-2 bg-white rounded-xl text-amber-600 shrink-0 shadow-sm">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-amber-800 leading-relaxed">
              Ensure you request leaves at least 7 days in advance for administrative approval.
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Request Leave</h3>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Submit for approval</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white text-gray-400 rounded-xl hover:text-gray-900 shadow-sm transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-2">Start Date</label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-900 focus:bg-white focus:border-blue-600 transition-all outline-none"
                    required
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-2">End Date</label>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-900 focus:bg-white focus:border-blue-600 transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-2">Reason</label>
                <textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe the reason for your leave request..."
                  className="w-full h-32 px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-900 focus:bg-white focus:border-blue-600 transition-all outline-none resize-none"
                  required
                />
              </div>

              {submitError && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {submitError}
                </div>
              )}

              <button 
                type="submit"
                disabled={submitting}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 hover:shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Request"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
