import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { classifyDepartmentWithAgent } from "@/lib/agents/classifier";
import { decideDiscription } from "@/lib/agents/classifydep";
import { prisma } from "@/lib/prisma";
import {
  ComplaintCategory,
  DepartmentName,
  Priority,
} from "@prisma/client";

type ResolveCitizenResult =
  | { id: string; source: "citizenId" | "email" | "auto-created" }
  | { error: string };

function withNoStoreHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCuid(value: string) {
  return /^c[a-z0-9]{24,}$/i.test(value);
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function coerceCategory(value: unknown): ComplaintCategory {
  if (typeof value !== "string") return ComplaintCategory.OTHER;
  const normalized = value.trim().toUpperCase() as ComplaintCategory;
  return Object.values(ComplaintCategory).includes(normalized)
    ? normalized
    : ComplaintCategory.OTHER;
}

function coercePriority(value: unknown): Priority {
  if (typeof value !== "string") return Priority.MEDIUM;
  const normalized = value.trim().toUpperCase() as Priority;
  return Object.values(Priority).includes(normalized)
    ? normalized
    : Priority.MEDIUM;
}

async function resolveCitizenUser(args: Record<string, unknown>): Promise<ResolveCitizenResult> {
  console.log("[agents/createComplaint] resolveCitizenUser args", safeStringify(args));

  // 1) Direct DB user id path (already Prisma CUID)
  const citizenIdRaw =
    typeof args.citizenId === "string"
      ? args.citizenId
      : typeof args.userId === "string"
        ? args.userId
        : null;
  const citizenId = citizenIdRaw && isCuid(citizenIdRaw) ? citizenIdRaw : null;
  if (citizenId) {
    const byId = await prisma.user.findUnique({
      where: { id: citizenId },
      select: { id: true, isActive: true },
    });
    if (byId?.isActive) {
      return { id: byId.id, source: "citizenId" as const };
    }
  }

  // 2) Email from tool args (recommended for server-to-server webhook callbacks)
  const nestedUser = isRecord(args.user) ? args.user : null;
  const nestedMeta = isRecord(args.metadata) ? args.metadata : null;
  const argsEmail =
    normalizeEmail(typeof args.userEmail === "string" ? args.userEmail : null) ??
    normalizeEmail(typeof args.email === "string" ? args.email : null) ??
    normalizeEmail(nestedUser && typeof nestedUser.email === "string" ? nestedUser.email : null) ??
    normalizeEmail(nestedMeta && typeof nestedMeta.userEmail === "string" ? nestedMeta.userEmail : null);

  // 2.1) Clerk user id from args (webhook-safe path)
  const clerkUserId =
    (typeof args.clerkUserId === "string" ? args.clerkUserId : null) ??
    (nestedUser && typeof nestedUser.clerkUserId === "string" ? nestedUser.clerkUserId : null) ??
    (nestedMeta && typeof nestedMeta.clerkUserId === "string" ? nestedMeta.clerkUserId : null) ??
    (typeof args.userId === "string" && !isCuid(args.userId) ? args.userId : null);

  let resolvedEmailFromClerk: string | null = null;
  if (clerkUserId) {
    try {
      const client = await clerkClient();
      const clerk = await client.users.getUser(clerkUserId);
      const primary = clerk.emailAddresses.find(
        (entry) => entry.id === clerk.primaryEmailAddressId,
      )?.emailAddress;
      const fallback = clerk.emailAddresses[0]?.emailAddress;
      resolvedEmailFromClerk = normalizeEmail(primary ?? fallback ?? null);
    } catch (error) {
      console.warn("Unable to resolve Clerk user from clerkUserId", error);
    }
  }

  // 3) Fallback to current Clerk auth context if available
  let email = argsEmail ?? resolvedEmailFromClerk;
  if (!email) {
    const { userId } = await auth();
    if (userId) {
      const clerkUser = await currentUser();
      const primaryEmail = clerkUser?.emailAddresses.find(
        (entry) => entry.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress;
      const fallbackEmail = clerkUser?.emailAddresses[0]?.emailAddress;
      email = normalizeEmail(primaryEmail ?? fallbackEmail ?? null);
    }
  }

  if (!email) {
    console.warn("[agents/createComplaint] user resolution failed: no email/user identity");
    return {
      error:
        "Missing user identity. Provide citizenId or userEmail in createComplaint tool arguments.",
    };
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isActive: true },
  });

  if (existing?.isActive) {
    console.log("[agents/createComplaint] resolved citizen from existing email", existing.id);
    return { id: existing.id, source: "email" as const };
  }

  if (existing && !existing.isActive) {
    console.warn("[agents/createComplaint] citizen account inactive", existing.id);
    return { error: "Citizen account is inactive." };
  }

  // Auto-provision DB user from Clerk context when available, else fail with a clear message.
  const clerkUser = await currentUser();
  if (!clerkUser) {
    console.warn("[agents/createComplaint] no Clerk user available for auto-provision", email);
    return {
      error:
        `No DB user found for email ${email}. Please sign in once through app or sync user first.`,
    };
  }

  const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim();
  const name = fullName || clerkUser.username?.trim() || email.split("@")[0] || "User";

  const created = await prisma.user.create({
    data: {
      email,
      name,
      avatarUrl: clerkUser.imageUrl?.trim() || null,
    },
    select: { id: true },
  });

  console.log("[agents/createComplaint] auto-created citizen user", created.id);

  return { id: created.id, source: "auto-created" as const };
}

async function createComplaintFromVoice(args: Record<string, unknown>): Promise<string> {
  console.log("[agents/createComplaint] incoming args", safeStringify(args));

  const rawDescription = typeof args.description === "string" ? args.description.trim() : "";
  if (rawDescription.length < 10) {
    console.warn("[agents/createComplaint] rejected: description too short", rawDescription.length);
    return "Please provide a clearer complaint description (at least 10 characters).";
  }

  const citizen = await resolveCitizenUser(args);
  if ("error" in citizen) {
    console.warn("[agents/createComplaint] citizen resolve error", citizen.error);
    return citizen.error || "Unable to resolve citizen user";
  }

  console.log("[agents/createComplaint] citizen resolved", citizen.id, citizen.source);

  let departmentNameString = "PUBLIC HEALTH DEPARTMENT";
  try {
    departmentNameString = await classifyDepartmentWithAgent(rawDescription);
  } catch (error) {
    console.warn("Department classification failed, using fallback", error);
  }
  console.log("[agents/createComplaint] department classified", departmentNameString);

  let title = "Complaint Reported";
  try {
    title = await decideDiscription(rawDescription);
  } catch (error) {
    console.warn("Title generation failed, using fallback", error);
    title = rawDescription.split(" ").slice(0, 6).join(" ") || "Complaint Reported";
  }
  console.log("[agents/createComplaint] generated title", title);

  const normalizedDepartment = departmentNameString
    .replace(/\s+/g, "_")
    .toUpperCase() as DepartmentName;

  let department = await prisma.department.findUnique({
    where: { name: normalizedDepartment },
  });

  if (!department) {
    department = await prisma.department.findFirst({
      where: { name: DepartmentName.PUBLIC_HEALTH_DEPARTMENT },
    });
  }

  if (!department) {
    department = await prisma.department.findFirst();
  }

  if (!department) {
    console.error("[agents/createComplaint] no department found in DB");
    return "No departments are configured in the system yet, so complaint could not be created.";
  }

  const photosUrls = parseStringArray(args.photosUrls);
  const videoUrls = parseStringArray(args.videoUrls);

  const createInput = {
    citizenId: citizen.id,
    category: coerceCategory(args.category),
    title,
    description: rawDescription,
    priority: coercePriority(args.priority),
    DEPARTMENT_NAME: department.name,
    departmentId: department.id,
    locationAddress:
      typeof args.locationAddress === "string" ? args.locationAddress.trim() || null : null,
    locationLat:
      typeof args.locationLat === "number" ? args.locationLat : undefined,
    locationLng:
      typeof args.locationLng === "number" ? args.locationLng : undefined,
    ward: typeof args.ward === "string" ? args.ward.trim() || null : null,
    pincode: typeof args.pincode === "string" ? args.pincode.trim() || null : null,
    photosUrls,
    videoUrls,
    tags: parseStringArray(args.tags),
    isPublic: typeof args.isPublic === "boolean" ? args.isPublic : true,
    attachmentCount: photosUrls.length + videoUrls.length,
  };

  console.log("[agents/createComplaint] prisma create input", safeStringify(createInput));

  let complaint;
  try {
    complaint = await prisma.complaint.create({
      data: createInput,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        DEPARTMENT_NAME: true,
        createdAt: true,
      },
    });
  } catch (error) {
    console.error("[agents/createComplaint] prisma create failed", {
      error,
      input: createInput,
    });
    throw error;
  }

  console.log("[agents/createComplaint] complaint created", safeStringify(complaint));

  return `Complaint created successfully. ID: ${complaint.id}. Title: "${complaint.title}". Status: ${complaint.status}. Priority: ${complaint.priority}. Department: ${complaint.DEPARTMENT_NAME}.`;
}

export async function GET(){
  const sampleDescription = "There is a large pothole on Main Street that is causing traffic issues.";
  const department = await classifyDepartmentWithAgent(sampleDescription);
  console.log(`Classified department for sample description: ${department}`);
  const response = NextResponse.json(
    {
      status: "ok",
      message: "GET request received successfully",
    });

  return withNoStoreHeaders(response);
}


export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log("[agents] Received payload:", JSON.stringify(payload, null, 2));

    // Handle Vapi tool calls
    if (payload.message?.type === "tool-calls" && payload.message.toolWithToolCallList) {
      const results = [];

      for (const item of payload.message.toolWithToolCallList) {
        const toolCall = item.toolCall;
        const functionName = toolCall.function.name;
        console.log("[agents] tool call received", {
          functionName,
          toolCallId: toolCall.id,
          argsType: typeof toolCall.function.arguments,
        });
        let args: Record<string, unknown> = {};
        try {
          const rawArgs = toolCall.function.arguments;
          if (typeof rawArgs === "string") {
            args = JSON.parse(rawArgs || "{}");
          } else if (isRecord(rawArgs)) {
            args = rawArgs;
          } else {
            args = {};
          }
          console.log("[agents] parsed tool args", safeStringify(args));
        } catch {
          results.push({
            toolCallId: toolCall.id,
            result: "Invalid function arguments. Expected valid JSON.",
          });
          continue;
        }

        console.log(`Executing tool: ${functionName}`, args);

        let resultData = "Tool execution failed or not found.";

        if (functionName === "checkComplaintStatus") {
          // Implement standard complaint status check
          const complaintId = typeof args.complaintId === "string" ? args.complaintId : null;
          if (complaintId) {
            try {
              const { prisma } = await import("@/lib/prisma");
              const complaint = await prisma.complaint.findUnique({
                where: { id: complaintId },
                select: { status: true, title: true, priority: true }
              });
              
              if (complaint) {
                resultData = `The complaint "${complaint.title}" is currently marked as ${complaint.status} with a priority of ${complaint.priority}.`;
              } else {
                resultData = `Sorry, I could not find a complaint with ID ${complaintId}.`;
              }
            } catch (err: unknown) {
              console.error("DB error finding complaint:", err);
              resultData = `Error looking up complaint: ${err instanceof Error ? err.message : String(err)}`;
            }
          } else {
            resultData = "Please provide a valid complaint ID.";
          }
        } else if (functionName === "createComplaint") {
          try {
            resultData = await createComplaintFromVoice(args);
          } catch (err: unknown) {
            console.error("Create complaint tool failed:", err);
            resultData = `Unable to create complaint: ${err instanceof Error ? err.message : String(err)}`;
          }
        } else {
          resultData = `The tool ${functionName} is not implemented on the server.`;
        }

        results.push({
          toolCallId: toolCall.id,
          result: resultData,
        });

        console.log("[agents] tool result", {
          functionName,
          toolCallId: toolCall.id,
          resultData,
        });
      }

      // Return the array of results for each tool call
      const response = NextResponse.json({ results });
      return withNoStoreHeaders(response);
    }

    // Default response for other message types (e.g. status-update, end-of-call-report)
    const response = NextResponse.json({
      status: "ok",
      message: "Agent data received successfully",
    });

    return withNoStoreHeaders(response);
  } catch (error) {
    console.error("Error parsing agent data:", error);
    const response = NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error parsing agent data",
      },
      { status: 400 }
    );

    return withNoStoreHeaders(response);
  }
}
