import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth-guard";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/users/[id] — fetch a single user
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("[GET /api/users/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

// PATCH /api/users/[id] — partially update a user
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const authz = await requireRole([Role.ADMIN]);
    if (!authz.ok) {
      return authz.response;
    }

    const { id } = await params;
    const body = await request.json();
    const { email, name, role, phone, avatarUrl, isActive } = body;

    // Make sure the user exists first
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // --- validation ---
    if (email !== undefined) {
      if (typeof email !== "string") {
        return NextResponse.json(
          { error: "email must be a string" },
          { status: 400 }
        );
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: "email format is invalid" },
          { status: 400 }
        );
      }
    }

    if (name !== undefined && typeof name !== "string") {
      return NextResponse.json(
        { error: "name must be a string" },
        { status: 400 }
      );
    }

    if (role !== undefined && !Object.values(Role).includes(role)) {
      return NextResponse.json(
        { error: `role must be one of: ${Object.values(Role).join(", ")}` },
        { status: 400 }
      );
    }

    if (isActive !== undefined && typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive must be a boolean" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(phone !== undefined ? { phone: phone === null ? null : String(phone).trim() } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl === null ? null : String(avatarUrl).trim() } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    console.error("[PATCH /api/users/[id]]", error);

    // Duplicate email
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// DELETE /api/users/[id] — remove a user
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const authz = await requireRole([Role.ADMIN]);
    if (!authz.ok) {
      return authz.response;
    }

    const { id } = await params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json(
      { message: `User ${id} deleted successfully` },
      { status: 200 }
    );
  } catch (error) {
    console.error("[DELETE /api/users/[id]]", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
