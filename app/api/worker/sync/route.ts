import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { OfficerStatus, Position } from "@prisma/client";
import { z } from "zod";

const createWorkerSyncSchema = z.object({
  departmentId: z.string().cuid(),
  phone: z.string().trim().min(7).max(20),
  passwordHash: z.string().min(1).optional(),
  position: z.nativeEnum(Position).optional(),
  status: z.nativeEnum(OfficerStatus).optional().default(OfficerStatus.ACTIVE),
  maxConcurrentComplaints: z.number().int().min(1).max(100).optional().default(10),
  bio: z.string().trim().max(500).optional(),
});

function getNormalizedEmail(user: Awaited<ReturnType<typeof currentUser>>) {
  if (!user) {
    return null;
  }

  const primaryEmail = user.emailAddresses.find(
    (email) => email.id === user.primaryEmailAddressId
  )?.emailAddress;

  const fallbackEmail = user.emailAddresses[0]?.emailAddress;
  const email = (primaryEmail ?? fallbackEmail)?.trim().toLowerCase();

  return email || null;
}

function getDisplayName(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>, email: string) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  if (fullName) {
    return fullName;
  }

  if (user.username?.trim()) {
    return user.username.trim();
  }

  return email.split("@")[0] || "User";
}

function getAvatarUrl(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>) {
  const avatar = user.imageUrl?.trim();
  return avatar || null;
}

// GET /api/worker/sync — check if signed-in Clerk worker exists in officers
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const email = getNormalizedEmail(clerkUser);

    if (!email) {
      return NextResponse.json(
        { error: "No email address found on signed-in Clerk user" },
        { status: 400 }
      );
    }

    const existingWorker = await prisma.officer.findUnique({
      where: { email },
      select: {
        id: true,
        departmentId: true,
        email: true,
        name: true,
        status: true,
        position: true,
        maxConcurrentComplaints: true,
        phone: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      data: existingWorker,
      meta: {
        exists: Boolean(existingWorker),
      },
    });
  } catch (error) {
    console.error("[GET /api/worker/sync]", error);
    return NextResponse.json(
      { error: "Failed to check worker" },
      { status: 500 }
    );
  }
}

// POST /api/worker/sync — create signed-in Clerk worker in officers if missing
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json(
        { error: "Signed-in user not found in Clerk" },
        { status: 401 }
      );
    }

    const email = getNormalizedEmail(clerkUser);
    if (!email) {
      return NextResponse.json(
        { error: "No email address found on signed-in Clerk user" },
        { status: 400 }
      );
    }

    const existingWorker = await prisma.officer.findUnique({
      where: { email },
      select: {
        id: true,
        departmentId: true,
        email: true,
        name: true,
        status: true,
        position: true,
        maxConcurrentComplaints: true,
        phone: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (existingWorker) {
      return NextResponse.json({
        data: existingWorker,
        meta: {
          exists: true,
          created: false,
        },
      });
    }

    const parsed = createWorkerSyncSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const department = await prisma.department.findUnique({
      where: { id: payload.departmentId },
      select: { id: true },
    });

    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const createdWorker = await prisma.officer.create({
      data: {
        name: getDisplayName(clerkUser, email),
        email,
        phone: payload.phone,
        departmentId: payload.departmentId,
        ...(payload.passwordHash ? { passwordHash: payload.passwordHash } : {}),
        ...(payload.position ? { position: payload.position } : {}),
        ...(payload.bio ? { bio: payload.bio } : {}),
        status: payload.status,
        maxConcurrentComplaints: payload.maxConcurrentComplaints,
        ...(getAvatarUrl(clerkUser) ? { avatarUrl: getAvatarUrl(clerkUser) } : {}),
      },
      select: {
        id: true,
        departmentId: true,
        email: true,
        name: true,
        status: true,
        position: true,
        maxConcurrentComplaints: true,
        phone: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        data: createdWorker,
        meta: {
          exists: false,
          created: true,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/worker/sync]", error);
    return NextResponse.json(
      { error: "Failed to sync worker" },
      { status: 500 }
    );
  }
}
