"use client";

import axios from "axios";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, LogOut, Mail, ShieldCheck } from "lucide-react";
type WorkerSessionData = {
  officerId: string;
  email: string;
  name: string;
  departmentId: string;
  status: string;
};

type AssignedComplaint = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  department?: { name: string } | null;
};

export default function WorkerHomePage() {
  const [email, setEmail] = useState("");
  const [worker, setWorker] = useState<WorkerSessionData | null>(null);
  const [complaints, setComplaints] = useState<AssignedComplaint[]>([]);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingComplaints, setIsFetchingComplaints] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fetchAssignedComplaints = async (officerId: string) => {
    setIsFetchingComplaints(true);
    try {
      const response = await axios.get("/api/complaint", {
        params: { assignedOfficerId: officerId, limit: 50, page: 1 },
      });
      setComplaints(response.data.data ?? []);
    } catch {
      setErrorMessage("Failed to fetch assigned complaints.");
    } finally {
      setIsFetchingComplaints(false);
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      setIsCheckingSession(true);
      try {
        const response = await axios.get("/api/worker/auth/session");
        const sessionWorker = response.data.data as WorkerSessionData;
        setWorker(sessionWorker);
        await fetchAssignedComplaints(sessionWorker.officerId);
      } catch {
        setWorker(null);
      } finally {
        setIsCheckingSession(false);
      }
    };

    void restoreSession();
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await axios.post("/api/worker/auth/login", {
        email,
      });
      const sessionWorker = response.data.data as WorkerSessionData;
      setWorker(sessionWorker);
      await fetchAssignedComplaints(sessionWorker.officerId);
    } catch {
      setErrorMessage("Only active worker emails can access this portal.");
      setWorker(null);
      setComplaints([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setErrorMessage(null);
    try {
      await axios.post("/api/worker/auth/logout");
      setWorker(null);
      setComplaints([]);
      setEmail("");
    } catch {
      setErrorMessage("Failed to logout. Please try again.");
    }
  };

  if (isCheckingSession) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  if (!worker) {
    return (
      <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
        <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Worker Email Verification
        </p>

        <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-900">Officer Access Login</h2>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
          Enter your registered officer email to access assigned complaints.
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Officer Email
            </span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-4 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-slate-900"
                placeholder="officer@city.gov"
                autoComplete="email"
              />
            </div>
          </label>

          {errorMessage ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-black uppercase tracking-[0.12em] text-white transition-all hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Verifying..." : "Login as Worker"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Logged In Worker</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{worker.name}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">{worker.email}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-rose-700 transition-all hover:bg-rose-100"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-black tracking-tight text-slate-900">Assigned Complaints</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-700">
            {complaints.length} items
          </span>
        </div>

        {isFetchingComplaints ? (
          <p className="text-sm font-semibold text-slate-600">Loading assigned complaints...</p>
        ) : complaints.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-600">
            No complaints are currently assigned to your account.
          </p>
        ) : (
          <div className="space-y-3">
            {complaints.map((complaint) => (
              <Link
                key={complaint.id}
                href={`/worker/complaint/${complaint.id}`}
                className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h4 className="text-sm font-black tracking-wide text-slate-900">{complaint.title}</h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-black uppercase tracking-widest text-amber-700">
                      {complaint.priority}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-black uppercase tracking-widest text-blue-700">
                      {complaint.status}
                    </span>
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-relaxed text-slate-600">
                  {complaint.description}
                </p>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  {complaint.department?.name ?? "Department not set"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
