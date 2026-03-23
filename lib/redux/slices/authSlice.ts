import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserRole = "ADMIN" | "MANAGER" | "USER" | "WORKER";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
  phone?: string | null;
  isActive: boolean;
  isVerified: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: AuthState = {
  user: null,
  role: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /** Populate user profile after Clerk sign-in + Prisma DB lookup */
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
      state.role = action.payload.role;
      state.isAuthenticated = true;
      state.error = null;
    },

    /** Clear user on sign-out */
    clearUser(state) {
      state.user = null;
      state.role = null;
      state.isAuthenticated = false;
      state.error = null;
    },

    /** Override role (e.g. admin impersonation) */
    setRole(state, action: PayloadAction<UserRole>) {
      state.role = action.payload;
    },

    setAuthLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },

    setAuthError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const { setUser, clearUser, setRole, setAuthLoading, setAuthError } =
  authSlice.actions;

// Selectors
export const selectAuthUser = (state: RootState) => state.auth.user;
export const selectAuthRole = (state: RootState) => state.auth.role;
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.isAuthenticated;

export default authSlice.reducer;
