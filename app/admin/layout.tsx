import { ReactNode } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

type AdminLayoutProps = {
  children: ReactNode;
};

function resolvePrimaryEmail(user: Awaited<ReturnType<typeof currentUser>>) {
  if (!user) {
    return null;
  }

  const primary = user.emailAddresses.find(
    (entry) => entry.id === user.primaryEmailAddressId,
  )?.emailAddress;

  const fallback = user.emailAddresses[0]?.emailAddress;
  return (primary ?? fallback)?.trim().toLowerCase() ?? null;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const clerkUser = await currentUser();
  const email = resolvePrimaryEmail(clerkUser);

  if (!email) {
    redirect("/dashboard");
  }

  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: {
      role: true,
      isActive: true,
    },
  });

  if (!dbUser || !dbUser.isActive) {
    redirect("/dashboard");
  }


  if (dbUser.role !== Role.ADMIN && dbUser.role !== Role.MANAGER) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">Access Denied</h1>
          <p className="mt-3 text-sm font-semibold text-slate-600">
            Only the admin can see this page.
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            Go back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
