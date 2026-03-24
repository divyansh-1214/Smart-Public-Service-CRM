"use client";

import { useEffect, useState } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Activity, 
  ArrowLeft,
  FileText,
  Download,
  Calendar,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { format, subDays } from "date-fns";

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/stats");
        const json = await res.json();
        setStats(json.data);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <a href="/admin" className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500">
              <ArrowLeft className="w-6 h-6" />
            </a>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">System Analytics</h1>
              <p className="text-gray-500 font-medium mt-1">Real-time performance metrics and SLA tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-6 py-3 bg-white text-gray-900 rounded-2xl font-bold flex items-center gap-2 border border-gray-100 shadow-sm hover:bg-gray-50 transition-all">
              <Calendar className="w-5 h-5" />
              Last 30 Days
            </button>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">
              <Download className="w-5 h-5" />
              Export Report
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Total Submissions", value: stats.total, icon: Activity, color: "blue", trend: stats.trends.total },
            { label: "Active Resolution", value: stats.open, icon: Clock, color: "amber", trend: stats.trends.open },
            { label: "SLA Breaches", value: stats.overdue, icon: AlertTriangle, color: "rose", trend: stats.trends.overdue },
            { label: "Successfully Closed", value: stats.resolved, icon: CheckCircle2, color: "emerald", trend: stats.trends.resolved },
          ].map((kpi, i) => (
            <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group transition-all hover:shadow-xl">
              <div className="flex justify-between items-start relative z-10">
                <div className={`p-4 rounded-2xl bg-${kpi.color}-50 text-${kpi.color}-600`}>
                  <kpi.icon className="w-7 h-7" />
                </div>
                <div className={`text-xs font-black px-3 py-1.5 rounded-full ${
                  kpi.trend.startsWith("+") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                }`}>
                  {kpi.trend}
                </div>
              </div>
              <div className="mt-8 relative z-10">
                <h3 className="text-4xl font-black text-gray-900 tracking-tight">{kpi.value.toLocaleString()}</h3>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-2">{kpi.label}</p>
              </div>
              <div className="absolute -bottom-6 -right-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                <kpi.icon className="w-32 h-32 text-gray-900" />
              </div>
            </div>
          ))}
        </div>

        {/* Charts / Data Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                Resolution Velocity
              </h3>
              <div className="flex items-center gap-2">
                <button className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:text-gray-900 transition-all"><ChevronLeft className="w-5 h-5" /></button>
                <button className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:text-gray-900 transition-all"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>
            
            {/* Mock Chart Area */}
            <div className="h-80 w-full bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Time-series data rendering...</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-8">
            <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-600" />
              SLA Compliance
            </h3>
            <div className="space-y-6">
              {[
                { label: "On-Time Resolution", value: 92, color: "bg-emerald-500" },
                { label: "Delayed Response", value: 6, color: "bg-amber-500" },
                { label: "SLA Breach Rate", value: 2, color: "bg-rose-500" },
              ].map((sla, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black text-gray-700 tracking-tight">{sla.label}</span>
                    <span className="text-sm font-black text-gray-900">{sla.value}%</span>
                  </div>
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${sla.color} transition-all duration-1000 ease-out`} 
                      style={{ width: `${sla.value}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-8 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-400 leading-relaxed italic">
                SLA targets are defined per priority level in system configuration. These metrics reflect organization-wide averages.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
