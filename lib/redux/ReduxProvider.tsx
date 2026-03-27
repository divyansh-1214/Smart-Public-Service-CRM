"use client";

import { Provider } from "react-redux";
import { store } from "./store";

/**
 * Client-only Redux Provider wrapper.
 *
 * Next.js App Router `layout.tsx` is a Server Component by default.
 * We need a separate "use client" component to host the Provider.
 */
export default function ReduxProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Provider store={store}>{children}</Provider>;
}
