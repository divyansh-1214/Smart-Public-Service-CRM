import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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

// GET /api/users/sync — check if signed-in Clerk user's email exists in Prisma
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

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      data: existingUser,
      meta: {
        exists: Boolean(existingUser),
      },
    });
  } catch (error) {
    console.error("[GET /api/users/sync]", error);
    return NextResponse.json(
      { error: "Failed to check user" },
      { status: 500 }
    );
  }
}

// POST /api/users/sync — create signed-in Clerk user in Prisma if missing
export async function POST() {
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

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (existingUser) {
      return NextResponse.json({
        data: existingUser,
        meta: {
          exists: true,
          created: false,
        },
      });
    }

    const createdUser = await prisma.user.create({
      data: {
        email,
        name: getDisplayName(clerkUser, email),
        ...(getAvatarUrl(clerkUser) ? { avatarUrl: getAvatarUrl(clerkUser) } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        data: createdUser,
        meta: {
          exists: false,
          created: true,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/users/sync]", error);
    return NextResponse.json(
      { error: "Failed to sync user" },
      { status: 500 }
    );
  }
}
