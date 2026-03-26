"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  BellOff,
  Sparkles,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import axios from "axios";

export default function NotificationsPage() {
  const { user, isLoaded } = useUser();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      async function fetchNotifications() {
        try {
          const syncRes = await axios.post("/api/users/sync");
          const dbUserId = syncRes.data?.data?.id;
          const res = await axios.get(`/api/notifications?userId=${dbUserId}`);
          setNotifications(res.data?.data ?? []);
        } catch (error) {
          console.error("Error fetching notifications:", error);
        } finally {
          setLoading(false);
        }
      }
      fetchNotifications();
    }
  }, [isLoaded, user]);

  const markAsRead = async (id: string) => {
    setMarkingReadId(id);
    try {
      await axios.patch(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    } finally {
      setMarkingReadId(null);
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    for (const n of unread) {
      await markAsRead(n.id);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-400 animate-pulse uppercase tracking-widest">Loading</p>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const typeConfig: Record<string, { icon: any; bg: string; text: string }> = {
    COMPLAINT_RESOLVED: { icon: CheckCircle2, bg: "bg-emerald-50", text: "text-emerald-600" },
    COMPLAINT_ASSIGNED: { icon: Bell, bg: "bg-indigo-50", text: "text-indigo-600" },
    ESCALATION_ALERT: { icon: AlertCircle, bg: "bg-rose-50", text: "text-rose-600" },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/20 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-up">
          <a 
            href="/dashboard" 
            className="group flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-all"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline">Back</span>
          </a>
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-1">
                {unreadCount} unread
              </p>
            )}
          </div>
          {unreadCount > 0 ? (
            <button 
              onClick={markAllRead}
              className="text-xs font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest transition-colors"
            >
              Mark all read
            </button>
          ) : <div className="w-16" />}
        </div>

        {/* Notifications */}
        <div className="space-y-3">
          {notifications.length > 0 ? (
            notifications.map((n, idx) => {
              const config = typeConfig[n.type] ?? { icon: Bell, bg: "bg-slate-50", text: "text-slate-400" };
              const IconComp = config.icon;
              return (
                <div 
                  key={n.id} 
                  style={{ animationDelay: `${idx * 60}ms` }}
                  className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all duration-300 animate-fade-up hover:shadow-md ${
                    !n.isRead ? "border-indigo-100 shadow-indigo-50" : "border-slate-100"
                  }`}
                >
                  {/* Unread accent line */}
                  {!n.isRead && (
                    <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 to-indigo-300" />
                  )}
                  <div className="p-4 md:p-6 flex gap-4 items-start">
                    <div className={`p-2.5 rounded-xl shrink-0 ${config.bg}`}>
                      <IconComp className={`w-5 h-5 ${config.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${config.text}`}>
                          {n.type.replace(/_/g, " ")}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span className="text-[10px] font-bold">{format(new Date(n.createdAt), "MMM d, h:mm a")}</span>
                        </div>
                      </div>
                      <p className={`text-sm leading-relaxed ${!n.isRead ? "font-bold text-slate-900" : "font-medium text-slate-500"}`}>
                        {n.message}
                      </p>
                      {!n.isRead && (
                        <button 
                          onClick={() => markAsRead(n.id)}
                          disabled={markingReadId === n.id}
                          className="mt-3 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50 active:scale-95"
                        >
                          {markingReadId === n.id ? "Marking..." : "Mark as Read"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white p-12 md:p-20 rounded-3xl border border-dashed border-slate-200 text-center animate-scale-in">
              <div className="relative mx-auto w-20 h-20 mb-6">
                <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center">
                  <BellOff className="w-10 h-10 text-slate-200" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">All caught up!</h3>
              <p className="text-slate-500 font-medium mt-2 text-sm max-w-xs mx-auto">
                No notifications yet. We'll let you know when something happens with your grievances.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
