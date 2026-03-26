import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
});

export async function GET() {
  try {
    await redis.set("test-key", "Redis is working! ✅");
    const value = await redis.get("test-key");
    return Response.json({ status: "success", message: value });
  } catch (error) {
    return Response.json({ status: "error", message: error }, { status: 500 });
  }
}