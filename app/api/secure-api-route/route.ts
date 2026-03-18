import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  return Response.json({ userId });
}
