import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const WORKER_SESSION_COOKIE = "worker_session";
const WORKER_SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export type WorkerSession = {
  officerId: string;
  email: string;
  name: string;
  departmentId: string;
  status: string;
  exp: number;
};

function getSecret(): string {
  return (
    process.env.WORKER_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    "worker-dev-secret-change-me"
  );
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function encodeSession(session: WorkerSession): string {
  const payload = toBase64Url(JSON.stringify(session));
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function decodeSession(raw: string): WorkerSession | null {
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");
  if (expectedBuffer.length !== signatureBuffer.length) return null;
  if (!timingSafeEqual(expectedBuffer, signatureBuffer)) return null;

  try {
    const parsed = JSON.parse(fromBase64Url(payload)) as WorkerSession;
    if (!parsed.officerId || !parsed.email || !parsed.exp) {
      return null;
    }
    if (Date.now() >= parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getWorkerSessionFromRequest(
  request: NextRequest,
): WorkerSession | null {
  const cookie = request.cookies.get(WORKER_SESSION_COOKIE)?.value;
  if (!cookie) return null;
  return decodeSession(cookie);
}

export function setWorkerSessionCookie(
  response: NextResponse,
  payload: Omit<WorkerSession, "exp">,
): WorkerSession {
  const session: WorkerSession = {
    ...payload,
    exp: Date.now() + WORKER_SESSION_TTL_SECONDS * 1000,
  };

  response.cookies.set({
    name: WORKER_SESSION_COOKIE,
    value: encodeSession(session),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: WORKER_SESSION_TTL_SECONDS,
  });

  return session;
}

export function clearWorkerSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: WORKER_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
