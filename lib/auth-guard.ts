import { auth, currentUser } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type AuthorizedActor = {
  id: string;
  email: string;
  role: Role;
};

type AuthorizationResult =
  | { ok: true; actor: AuthorizedActor }
  | { ok: false; response: NextResponse };

function forbiddenResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function requireRole(
  allowedRoles: Role[],
): Promise<AuthorizationResult> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthenticated" }, { status: 401 }),
    };
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses
    .find((item) => item.id === clerkUser.primaryEmailAddressId)
    ?.emailAddress?.trim()
    .toLowerCase() ?? clerkUser?.emailAddresses[0]?.emailAddress?.trim().toLowerCase();

  if (!email) {
    return {
      ok: false,
      response: forbiddenResponse("No email address found for authenticated user"),
    };
  }

  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!dbUser || !dbUser.isActive) {
    return {
      ok: false,
      response: forbiddenResponse("Authenticated account is not active in this system"),
    };
  }

  if (!allowedRoles.includes(dbUser.role)) {
    return {
      ok: false,
      response: forbiddenResponse("Insufficient permissions"),
    };
  }

  return {
    ok: true,
    actor: {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
    },
  };
}
