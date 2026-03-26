"use client";

import {  
  CheckCircle2, 
  Clock, 
  Activity, 
  ShieldAlert,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

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

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const steps = 40;
    const stepValue = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += stepValue;
      if (current >= target) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [target, duration]);
  return count;
}

function StatCard({ card, idx }: { card: any; idx: number }) {
  const count = useCountUp(card.value);
  const isPositive = card.trend.startsWith("+");
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  
  return (
    <div
      style={{ animationDelay: `${idx * 100}ms` }}
      className="bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all group overflow-hidden relative animate-fade-up"
    >
      {/* Background icon */}
      <div className="absolute -bottom-4 -right-4 opacity-[0.04] group-hover:scale-110 group-hover:opacity-[0.07] transition-all duration-500">
        <card.icon className="w-28 h-28 text-slate-900" />
      </div>
      
      <div className="flex justify-between items-start relative z-10">
        <div className={`p-2.5 rounded-xl ${card.bgColor} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
          <card.icon className={`w-5 h-5 ${card.iconColor}`} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-black px-2 py-1 rounded-lg ${
          isPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
        }`}>
          <TrendIcon className="w-3 h-3" />
          {card.trend}
        </div>
      </div>
      
      <div className="mt-4 md:mt-6 relative z-10">
        <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight tabular-nums">{count.toLocaleString()}</h3>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">{card.label}</p>
        <p className="text-xs text-slate-400 mt-1.5 font-medium">{card.description}</p>
      </div>
    </div>
  );
}

export default function DashboardStats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const response = await axios.get("/api/dashboard/stats");
        setStats(response.data.data);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.error ?? "Could not load real-time statistics.");
        } else {
          setError("Could not load real-time statistics.");
        }
      } finally {
        setLoading(false);
      }
    }
    void fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 h-36 md:h-40 overflow-hidden relative">
            <div className="skeleton w-10 h-10 rounded-xl mb-4" />
            <div className="skeleton w-20 h-7 rounded-lg mb-2" />
            <div className="skeleton w-28 h-3 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl flex items-center gap-4 text-rose-700 animate-fade-up">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <p className="font-bold text-sm">{error || "Statistics are currently unavailable."}</p>
      </div>
    );
  }

  const cards = [
    { 
      label: "Total Grievances", 
      value: stats.total, 
      icon: Activity, 
      bgColor: "bg-indigo-50",
      iconColor: "text-indigo-600",
      trend: stats.trends.total, 
      description: "Overall submissions" 
    },
    { 
      label: "Open Tickets", 
      value: stats.open, 
      icon: Clock, 
      bgColor: "bg-amber-50",
      iconColor: "text-amber-600",
      trend: stats.trends.open, 
      description: "Currently in progress" 
    },
    { 
      label: "SLA Overdue", 
      value: stats.overdue, 
      icon: ShieldAlert, 
      bgColor: "bg-rose-50",
      iconColor: "text-rose-600",
      trend: stats.trends.overdue, 
      description: "Breached resolution time" 
    },
    { 
      label: "Resolved Cases", 
      value: stats.resolved, 
      icon: CheckCircle2, 
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600",
      trend: stats.trends.resolved, 
      description: "Successfully closed" 
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
      {cards.map((card, idx) => (
        <StatCard key={card.label} card={card} idx={idx} />
      ))}
    </div>
  );
}
