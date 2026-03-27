"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import {
  AlertCircle,
  Filter,
  MapPin,
  Search,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  ComplaintCategory,
  ComplaintStatus,
  DepartmentName,
  Priority,
} from "@prisma/client";

type CommunityComplaint = {
  id: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: Priority;
  status: ComplaintStatus;
  DEPARTMENT_NAME: DepartmentName;
  ward: string | null;
  locationAddress: string | null;
  photosUrls: string[];
  createdAt: string;
  citizen: {
    id: string;
    name: string;
  };
};

type CommunityResponse = {
  data: CommunityComplaint[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    sort: "newest" | "oldest" | "priority";
  };
};

const priorityColors: Record<Priority, string> = {
  CRITICAL: "bg-rose-100 text-rose-700 border-rose-200",
  HIGH: "bg-orange-100 text-orange-700 border-orange-200",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
  LOW: "bg-blue-100 text-blue-700 border-blue-200",
  MINIMAL: "bg-slate-100 text-slate-700 border-slate-200",
};

const statusColors: Record<ComplaintStatus, string> = {
  SUBMITTED: "bg-indigo-50 text-indigo-700 border-indigo-100",
  ASSIGNED: "bg-violet-50 text-violet-700 border-violet-100",
  IN_PROGRESS: "bg-cyan-50 text-cyan-700 border-cyan-100",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  CLOSED: "bg-slate-100 text-slate-700 border-slate-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-100",
};

export default function CommunityPage() {
  const [items, setItems] = useState<CommunityComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [priority, setPriority] = useState<string>("ALL");
  const [category, setCategory] = useState<string>("ALL");
  const [departmentName, setDepartmentName] = useState<string>("ALL");
  const [ward, setWard] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "priority">("newest");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const queryString = useMemo(() => {
    const query = new URLSearchParams({
      page: String(page),
      limit: "12",
      sort,
    });

    if (q.trim()) query.set("q", q.trim());
    if (status !== "ALL") query.set("status", status);
    if (priority !== "ALL") query.set("priority", priority);
    if (category !== "ALL") query.set("category", category);
    if (departmentName !== "ALL") query.set("departmentName", departmentName);
    if (ward.trim()) query.set("ward", ward.trim());

    return query.toString();
  }, [q, status, priority, category, departmentName, ward, sort, page]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get<CommunityResponse>(`/api/community?${queryString}`);
        setItems(response.data.data ?? []);
        setTotalPages(response.data.meta?.totalPages ?? 1);
        setTotal(response.data.meta?.total ?? 0);
      } catch (fetchError) {
        if (axios.isAxiosError(fetchError)) {
          setError(
            (fetchError.response?.data as { error?: string })?.error ??
              "Failed to load community complaints",
          );
        } else {
          setError("Failed to load community complaints");
        }
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [queryString]);

  useEffect(() => {
    setPage(1);
  }, [q, status, priority, category, departmentName, ward, sort]);

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-slate-50">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm backdrop-blur sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-500">
            Public Community Feed
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            See Complaints Shared By Citizens
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 sm:text-base">
            Browse all public complaints, track progress, and filter by status, category, area,
            priority, and department.
          </p>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="relative col-span-1 xl:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search title, description, address, ward or citizen"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-indigo-400 focus:bg-white"
              />
            </label>

            <label className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-indigo-400 focus:bg-white"
              >
                <option value="ALL">All Status</option>
                {Object.values(ComplaintStatus).map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:border-indigo-400 focus:bg-white"
              >
                <option value="ALL">All Priority</option>
                {Object.values(Priority).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:border-indigo-400 focus:bg-white"
              >
                <option value="ALL">All Category</option>
                {Object.values(ComplaintCategory).map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <select
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:border-indigo-400 focus:bg-white"
              >
                <option value="ALL">All Department</option>
                {Object.values(DepartmentName).map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <input
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                placeholder="Filter by ward"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-indigo-400 focus:bg-white"
              />
            </label>

            <label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as "newest" | "oldest" | "priority")}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:border-indigo-400 focus:bg-white"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="priority">Critical First</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400 shadow-sm sm:text-sm">
          <span>Total Public Complaints: {total}</span>
          <span>Page {page} of {totalPages}</span>
        </div>

        {error ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-56 animate-pulse rounded-3xl border border-slate-100 bg-white" />
            ))
          ) : items.length > 0 ? (
            items.map((item) => (
              <article
                key={item.id}
                className="group rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="line-clamp-2 text-lg font-black tracking-tight text-slate-900">
                    {item.title}
                  </h2>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${priorityColors[item.priority]}`}
                  >
                    {item.priority}
                  </span>
                </div>

                <p className="mt-2 line-clamp-3 text-sm font-medium leading-relaxed text-slate-600">
                  {item.description}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${statusColors[item.status]}`}
                  >
                    {item.status.replaceAll("_", " ")}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                    {item.category.replaceAll("_", " ")}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs font-semibold text-slate-500">
                  <p className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    {item.citizen.name}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    {item.ward || "Ward not specified"}
                  </p>
                  <p className="truncate">Department: {item.DEPARTMENT_NAME.replaceAll("_", " ")}</p>
                  {item.locationAddress ? <p className="truncate">Address: {item.locationAddress}</p> : null}
                  <p>Submitted: {format(new Date(item.createdAt), "MMM d, yyyy h:mm a")}</p>
                </div>
              </article>
            ))
          ) : (
            <div className="col-span-full rounded-3xl border border-slate-100 bg-white p-10 text-center">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-400">
                No complaints found for current filters
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
