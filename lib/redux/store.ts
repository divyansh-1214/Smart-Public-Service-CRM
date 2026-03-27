import { configureStore } from "@reduxjs/toolkit";
import {
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from "react-redux";

import authReducer from "./slices/authSlice";
import complaintsReducer from "./slices/complaintsSlice";
import officersReducer from "./slices/officersSlice";

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const store = configureStore({
  reducer: {
    auth: authReducer,
    complaints: complaintsReducer,
    officers: officersReducer,
  },
  devTools: process.env.NODE_ENV !== "production",
});

// ---------------------------------------------------------------------------
// Typed hooks — use these instead of plain `useDispatch` / `useSelector`
// ---------------------------------------------------------------------------

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
