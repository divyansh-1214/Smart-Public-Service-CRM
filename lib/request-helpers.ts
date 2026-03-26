import { NextRequest } from "next/server";

export function extractClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cloudflareIp) return cloudflareIp;

  return "unknown";
}

export function buildRedisKey(prefix: string, ...parts: Array<string | number | undefined | null>): string {
  const normalized = parts
    .filter((part): part is string | number => part !== undefined && part !== null)
    .map((part) => String(part).trim())
    .filter((part) => part.length > 0)
    .map((part) => part.replace(/\s+/g, "_"));

  return [prefix, ...normalized].join(":");
}
