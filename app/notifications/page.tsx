"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  ArrowLeft,
  X
} from "lucide-react";
import { format } from "date-fns";

export default function NotificationsPage() {
  const { user, isLoaded } = useUser();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      async function fetchNotifications() {
        try {
          // Get DB user ID first
          const syncRes = await fetch("/api/users/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          const syncJson = await syncRes.json();
          if (!syncRes.ok) throw new Error("Failed to sync user");
          
          const dbUserId = syncJson.data.id;

          const res = await fetch(`/api/notifications?userId=${dbUserId}`);
          const json = await res.json();
          setNotifications(json.data);
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
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold transition-all">
            <ArrowLeft className="w-5 h-5" />
            Back
          </a>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">System Notifications</h1>
        </div>

        <div className="space-y-4">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <div 
                key={n.id} 
                className={`bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex gap-6 items-start relative overflow-hidden transition-all group ${!n.isRead ? "border-blue-100" : ""}`}
              >
                {!n.isRead && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
                )}
                
                <div className={`p-3 rounded-2xl shrink-0 ${
                  n.type === "COMPLAINT_RESOLVED" ? "bg-emerald-50 text-emerald-600" :
                  n.type === "COMPLAINT_ASSIGNED" ? "bg-blue-50 text-blue-600" :
                  n.type === "ESCALATION_ALERT" ? "bg-rose-50 text-rose-600" : "bg-gray-50 text-gray-400"
                }`}>
                  {n.type === "COMPLAINT_RESOLVED" ? <CheckCircle2 className="w-6 h-6" /> :
                   n.type === "ESCALATION_ALERT" ? <AlertCircle className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{n.type}</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{format(new Date(n.createdAt), "MMM d, h:mm a")}</span>
                  </div>
                  <p className={`text-sm font-bold text-gray-800 leading-snug ${!n.isRead ? "text-gray-900" : "text-gray-500"}`}>
                    {n.message}
                  </p>
                  
                  {!n.isRead && (
                    <button 
                      onClick={() => markAsRead(n.id)}
                      className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-200 text-center">
              <Bell className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-xl font-black text-gray-900 tracking-tight">No notifications yet</h3>
              <p className="text-gray-500 font-medium mt-2">You're all caught up! Check back later for updates on your grievances.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
