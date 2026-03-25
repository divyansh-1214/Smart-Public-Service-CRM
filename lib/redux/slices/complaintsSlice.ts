import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";

// ---------------------------------------------------------------------------
// Types — mirrors the /api/complaint GET response shape
// ---------------------------------------------------------------------------

export type ComplaintStatus =
  | "SUBMITTED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | "REJECTED";

export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "MINIMAL";

export type ComplaintCategory =
  | "POTHOLE"
  | "STREETLIGHT"
  | "GARBAGE"
  | "WATER_SUPPLY"
  | "SANITATION"
  | "NOISE_POLLUTION"
  | "ROAD_DAMAGE"
  | "ILLEGAL_CONSTRUCTION"
  | "OTHER";

export type EscalationLevel =
  | "LEVEL_1"
  | "LEVEL_2"
  | "LEVEL_3"
  | "LEVEL_4"
  | "LEVEL_5";

export interface Complaint {
  id: string;
  citizenId: string;
  category: ComplaintCategory;
  title: string;
  description: string;
  priority: Priority;
  status: ComplaintStatus;
  escalationLevel: EscalationLevel;

  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  ward?: string | null;
  pincode?: string | null;

  photosUrls: string[];
  videoUrls: string[];
  tags: string[];
  isPublic: boolean;

  assignedOfficerId?: string | null;
  slaDeadline?: string | null;
  slaBreached: boolean;

  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;

  // Relations included by the API
  citizen?: { id: string; name: string; email: string };
  assignedOfficer?: {
    id: string;
    name: string;
    department?: { name: string };
  } | null;
  department?: { name: string } | null;
}

export interface ComplaintFilters {
  status?: ComplaintStatus;
  priority?: Priority;
  category?: ComplaintCategory;
  citizenId?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ComplaintsState {
  items: Complaint[];
  loading: boolean;
  error: string | null;
  filters: ComplaintFilters;
  pagination: PaginationMeta;
}

// ---------------------------------------------------------------------------
// Async thunks
// ---------------------------------------------------------------------------

interface FetchComplaintsParams {
  page?: number;
  limit?: number;
  citizenId?: string;
}

export const fetchComplaints = createAsyncThunk<
  { data: Complaint[]; meta: PaginationMeta },
  FetchComplaintsParams | undefined,
  { rejectValue: string }
>("complaints/fetchComplaints", async (params, { rejectWithValue }) => {
  try {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.citizenId) searchParams.set("citizenId", params.citizenId);

    const res = await fetch(`/api/complaint?${searchParams.toString()}`);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return rejectWithValue(body.error ?? `Request failed (${res.status})`);
    }

    return (await res.json()) as { data: Complaint[]; meta: PaginationMeta };
  } catch (err) {
    return rejectWithValue(
      err instanceof Error ? err.message : "Unknown error",
    );
  }
});

export interface CreateComplaintPayload {
  citizenId: string;
  category: ComplaintCategory;
  title: string;
  description: string;
  priority?: Priority;
  locationAddress?: string;
  locationLat?: number;
  locationLng?: number;
  ward?: string;
  pincode?: string;
  photosUrls?: string[];
  videoUrls?: string[];
  tags?: string[];
  isPublic?: boolean;
}

export const createComplaint = createAsyncThunk<
  Complaint,
  CreateComplaintPayload,
  { rejectValue: string }
>("complaints/createComplaint", async (payload, { rejectWithValue }) => {
  try {
    const res = await fetch("/api/complaint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return rejectWithValue(body.error ?? `Request failed (${res.status})`);
    }

    const json = await res.json();
    return json.data as Complaint;
  } catch (err) {
    return rejectWithValue(
      err instanceof Error ? err.message : "Unknown error",
    );
  }
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: ComplaintsState = {
  items: [],
  loading: false,
  error: null,
  filters: {},
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const complaintsSlice = createSlice({
  name: "complaints",
  initialState,
  reducers: {
    setComplaintFilters(state, action: PayloadAction<ComplaintFilters>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearComplaintFilters(state) {
      state.filters = {};
    },
    setPage(state, action: PayloadAction<number>) {
      state.pagination.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── fetchComplaints ─────────────────────────────────────────────
      .addCase(fetchComplaints.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComplaints.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.pagination = action.payload.meta;
      })
      .addCase(fetchComplaints.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Failed to fetch complaints";
      })
      // ── createComplaint ─────────────────────────────────────────────
      .addCase(createComplaint.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createComplaint.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createComplaint.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Failed to create complaint";
      });
  },
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const { setComplaintFilters, clearComplaintFilters, setPage } =
  complaintsSlice.actions;

// Selectors
export const selectComplaints = (state: RootState) => state.complaints.items;
export const selectComplaintsLoading = (state: RootState) =>
  state.complaints.loading;
export const selectComplaintsError = (state: RootState) =>
  state.complaints.error;
export const selectComplaintFilters = (state: RootState) =>
  state.complaints.filters;
export const selectComplaintPagination = (state: RootState) =>
  state.complaints.pagination;

export default complaintsSlice.reducer;
