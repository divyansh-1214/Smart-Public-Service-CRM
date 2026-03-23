"use client";

import {  
  CheckCircle2, 
  Clock, 
  Activity, 
  Map as MapIcon,
  ShieldAlert,
  Loader2
} from "lucide-react";
import { useEffect, useState } from "react";

interface StatsData {
  total: number;
  open: number;
  overdue: number;
  escalated: number;
  resolved: number;
  trends: {
    total: string;
    open: string;
    overdue: string;
    resolved: string;
  };
}

export default function DashboardStats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const response = await fetch("/api/dashboard/stats");
        if (!response.ok) throw new Error("Failed to fetch dashboard stats");
        const json = await response.json();
        setStats(json.data);
      } catch (err) {
        console.error(err);
        setError("Could not load real-time statistics.");
      } finally {
        setLoading(false);
      }
    }

    void fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 h-40 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-200 animate-spin" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl flex items-center gap-4 text-rose-700">
        <ShieldAlert className="w-6 h-6" />
        <p className="font-bold">{error || "Statistics are currently unavailable."}</p>
      </div>
    );
  }

  const cards = [
    { 
      label: "Total Grievances", 
      value: stats.total, 
      icon: Activity, 
      color: "bg-blue-600", 
      trend: stats.trends.total, 
      description: "Overall submissions" 
    },
    { 
      label: "Open Tickets", 
      value: stats.open, 
      icon: Clock, 
      color: "bg-amber-600", 
      trend: stats.trends.open, 
      description: "Currently in progress" 
    },
    { 
      label: "SLA Overdue", 
      value: stats.overdue, 
      icon: ShieldAlert, 
      color: "bg-rose-600", 
      trend: stats.trends.overdue, 
      description: "Breached resolution time" 
    },
    { 
      label: "Resolved Cases", 
      value: stats.resolved, 
      icon: CheckCircle2, 
      color: "bg-emerald-600", 
      trend: stats.trends.resolved, 
      description: "Successfully closed" 
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <div 
          key={card.label} 
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative"
        >
          <div className="flex justify-between items-start relative z-10">
            <div className={`p-3 rounded-xl ${card.color} text-white shadow-lg`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div className={`text-xs font-bold px-2 py-1 rounded-lg ${
              card.trend.startsWith("+") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
            }`}>
              {card.trend}
            </div>
          </div>
          
          <div className="mt-6 relative z-10">
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{card.value.toLocaleString()}</h3>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">{card.label}</p>
            <p className="text-xs text-gray-400 mt-2 font-medium">{card.description}</p>
          </div>

          <div className="absolute -bottom-6 -right-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
            <card.icon className="w-32 h-32 text-gray-900" />
          </div>
        </div>
      ))}
    </div>
  );
}
