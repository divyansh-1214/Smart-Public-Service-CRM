"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const { user, isLoaded } = useUser();
  const syncedUserIdRef = useRef<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string>("");

  useEffect(() => {
    if (!isLoaded || !user || syncedUserIdRef.current === user.id) {
      return;
    }

    syncedUserIdRef.current = user.id;

    const syncUser = async () => {
      try {
        const response = await fetch("/api/users/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const payload = await response.json();

        if (!response.ok) {
          setSyncMessage(payload.error ?? "Failed to sync account.");
          return;
        }

        if (payload.meta?.created) {
          setSyncMessage("Your CRM account has been created.");
          return;
        }

        if (payload.meta?.exists) {
          setSyncMessage("Your CRM account already exists.");
          return;
        }

        setSyncMessage("Your account is ready.");
      } catch {
        setSyncMessage("Failed to sync account.");
      }
    };

    void syncUser();
  }, [isLoaded, user]);

  const welcomeText = !isLoaded
    ? "Loading your profile..."
    : user
      ? `Welcome back, ${user.firstName ?? "there"}.`
      : "Welcome to your CRM dashboard.";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">CRM</h1>
        <p className="text-gray-500 text-lg">{welcomeText}</p>
        {syncMessage ? (
          <p className="text-sm text-gray-400 mt-2">{syncMessage}</p>
        ) : null}
      </div>
    </main>
  );
}
