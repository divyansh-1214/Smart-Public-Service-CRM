"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useAppDispatch,
  useAppSelector,
} from "@/lib/redux/store";
import {
  fetchComplaints,
  setComplaintFilters,
  setPage,
  selectComplaints,
  selectComplaintsLoading,
  selectComplaintsError,
  selectComplaintFilters,
  selectComplaintPagination,
  type ComplaintStatus,
  type Priority,
} from "@/lib/redux/slices/complaintsSlice";

// ---------------------------------------------------------------------------
// Status / Priority badge helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-800",
  ASSIGNED: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-indigo-100 text-indigo-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-700",
  REJECTED: "bg-red-100 text-red-800",
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-400 text-yellow-900",
  LOW: "bg-sky-200 text-sky-900",
  MINIMAL: "bg-gray-200 text-gray-600",
};

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${colorClass}`}
    >
      {label.replace(/_/g, " ")}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ComplaintList Component
// ---------------------------------------------------------------------------

export default function ComplaintList() {
  const dispatch = useAppDispatch();

  const complaints = useAppSelector(selectComplaints);
  const loading = useAppSelector(selectComplaintsLoading);
  const error = useAppSelector(selectComplaintsError);
  const filters = useAppSelector(selectComplaintFilters);
  const pagination = useAppSelector(selectComplaintPagination);

  // Fetch on mount and when filters/page change
  useEffect(() => {
    dispatch(
      fetchComplaints({
        page: pagination.page,
        limit: pagination.limit,
        citizenId: filters.citizenId,
      }),
    );
  }, [dispatch, pagination.page, pagination.limit, filters.citizenId]);

  // ── Filter handlers ─────────────────────────────────────────────────

  const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as ComplaintStatus | "";
    dispatch(setComplaintFilters({ status: value || undefined }));
  };

  const handlePriorityFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as Priority | "";
    dispatch(setComplaintFilters({ priority: value || undefined }));
  };

  // Client-side filter (status & priority) — the API supports pagination
  // but doesn't support these filters server-side yet, so we filter locally.
  const filteredComplaints = complaints.filter((c) => {
    if (filters.status && c.status !== filters.status) return false;
    if (filters.priority && c.priority !== filters.priority) return false;
    return true;
  });

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Complaints</h2>

        {/* Filters */}
        <div className="flex gap-3">
          <select
            value={filters.status ?? ""}
            onChange={handleStatusFilter}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            {Object.keys(STATUS_COLORS).map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <select
            value={filters.priority ?? ""}
            onChange={handlePriorityFilter}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Priorities</option>
            {Object.keys(PRIORITY_COLORS).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 mb-4">
          <p className="font-medium">Error loading complaints</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() =>
              dispatch(fetchComplaints({ page: pagination.page }))
            }
            className="mt-2 text-sm font-semibold text-red-600 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Complaint Cards */}
      {!loading && !error && (
        <>
          {filteredComplaints.length === 0 ? (
            <p className="text-center text-gray-500 py-12">
              No complaints found.
            </p>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="grid gap-4">
                {filteredComplaints.map((complaint, index) => (
                  <motion.div
                    key={complaint.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ delay: index * 0.03 }}
                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">
                          {complaint.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {complaint.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 shrink-0">
                        <Badge
                          label={complaint.status}
                          colorClass={
                            STATUS_COLORS[complaint.status] ??
                            "bg-gray-100 text-gray-700"
                          }
                        />
                        <Badge
                          label={complaint.priority}
                          colorClass={
                            PRIORITY_COLORS[complaint.priority] ??
                            "bg-gray-200 text-gray-600"
                          }
                        />
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                      {complaint.department?.name && (
                        <span>
                          🏢{" "}
                          {complaint.department.name.replace(/_/g, " ")}
                        </span>
                      )}
                      {complaint.citizen?.name && (
                        <span>👤 {complaint.citizen.name}</span>
                      )}
                      {complaint.assignedOfficer?.name && (
                        <span>
                          🛡️ {complaint.assignedOfficer.name}
                        </span>
                      )}
                      <span>
                        📅{" "}
                        {new Date(complaint.createdAt).toLocaleDateString()}
                      </span>
                      {complaint.slaBreached && (
                        <span className="text-red-600 font-semibold">
                          ⚠️ SLA Breached
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                disabled={pagination.page <= 1}
                onClick={() => dispatch(setPage(pagination.page - 1))}
                className="px-3 py-1.5 rounded-lg border text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition"
              >
                ← Prev
              </button>

              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => dispatch(setPage(pagination.page + 1))}
                className="px-3 py-1.5 rounded-lg border text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
