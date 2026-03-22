"use client";

import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Activity, 
  Map as MapIcon,
  ShieldAlert,
  Users
} from "lucide-react";

interface StatsData {
  total: number;
  open: number;
  overdue: number;
  escalated: number;
  resolved: number;
}

export default function DashboardStats({ stats }: { stats?: StatsData }) {
  // Use mocked stats for now, or actual if provided
  const data = stats || {
    total: 1248,
    open: 412,
    overdue: 42,
    escalated: 18,
    resolved: 776,
  };

  const cards = [
    { 
      label: "Total Grievances", 
      value: data.total, 
      icon: Activity, 
      color: "bg-blue-600", 
      trend: "+12.4%", 
      description: "Overall submissions" 
    },
    { 
      label: "Open Tickets", 
      value: data.open, 
      icon: Clock, 
      color: "bg-amber-600", 
      trend: "-4.2%", 
      description: "Currently in progress" 
    },
    { 
      label: "SLA Overdue", 
      value: data.overdue, 
      icon: ShieldAlert, 
      color: "bg-rose-600", 
      trend: "+2.1%", 
      description: "Breached resolution time" 
    },
    { 
      label: "Resolved Cases", 
      value: data.resolved, 
      icon: CheckCircle2, 
      color: "bg-emerald-600", 
      trend: "+8.9%", 
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
