import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { RootState } from "../store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OfficerStatus = "ACTIVE" | "ON_LEAVE" | "INACTIVE";
export type Position =
  | "JUNIOR"
  | "SENIOR"
  | "SUPERVISOR"
  | "MANAGER"
  | "DIRECTOR";

export interface Officer {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string | null;
  bio?: string | null;
  departmentId: string;
  status: OfficerStatus;
  position?: Position | null;
  maxConcurrentComplaints: number;
  createdAt: string;
  updatedAt: string;

  // Relations
  department?: { name: string };
  _count?: { complaints: number };
}

export interface OfficerFilters {
  status?: OfficerStatus;
  departmentId?: string;
}

export interface OfficersState {
  items: Officer[];
  loading: boolean;
  error: string | null;
  filters: OfficerFilters;
}

// ---------------------------------------------------------------------------
// Async thunks
// ---------------------------------------------------------------------------

export const fetchOfficers = createAsyncThunk<
  { data: Officer[]; meta: { total: number } },
  OfficerFilters | undefined,
  { rejectValue: string }
>("officers/fetchOfficers", async (filters, { rejectWithValue }) => {
  try {
    const searchParams = new URLSearchParams();
    if (filters?.status) searchParams.set("status", filters.status);
    if (filters?.departmentId)
      searchParams.set("departmentId", filters.departmentId);

    const res = await fetch(`/api/officer?${searchParams.toString()}`);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return rejectWithValue(body.error ?? `Request failed (${res.status})`);
    }

    return (await res.json()) as {
      data: Officer[];
      meta: { total: number };
    };
  } catch (err) {
    return rejectWithValue(
      err instanceof Error ? err.message : "Unknown error",
    );
  }
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: OfficersState = {
  items: [],
  loading: false,
  error: null,
  filters: {},
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const officersSlice = createSlice({
  name: "officers",
  initialState,
  reducers: {
    setOfficerFilters(state, action: PayloadAction<OfficerFilters>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearOfficerFilters(state) {
      state.filters = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOfficers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOfficers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
      })
      .addCase(fetchOfficers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Failed to fetch officers";
      });
  },
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const { setOfficerFilters, clearOfficerFilters } =
  officersSlice.actions;

// Selectors
export const selectOfficers = (state: RootState) => state.officers.items;
export const selectOfficersLoading = (state: RootState) =>
  state.officers.loading;
export const selectOfficersError = (state: RootState) => state.officers.error;
export const selectActiveOfficers = (state: RootState) =>
  state.officers.items.filter((o) => o.status === "ACTIVE");

export default officersSlice.reducer;
