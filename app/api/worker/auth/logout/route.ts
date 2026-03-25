import { NextResponse } from "next/server";
import { clearWorkerSessionCookie } from "@/lib/worker-auth";

export async function POST() {
  const response = NextResponse.json({ message: "Worker logout successful" });
  clearWorkerSessionCookie(response);
  return response;
}
