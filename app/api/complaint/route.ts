import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { classifyDepartmentWithAgent } from "@/lib/agents/classifier";
import { ComplaintCategory, ComplaintStatus, DepartmentName, Priority } from "@prisma/client";
import { getWorkerSessionFromRequest } from "@/lib/worker-auth";
import {decideDiscription} from "@/lib/agents/classifydep";
import { predictComplaintCategoryAndCriticality } from "@/lib/agents/predict-complaint";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getCache, setCache } from "@/lib/cache";
import { buildRedisKey } from "@/lib/request-helpers";
// const DEFAULT_CITIZEN_ID = "cmmwnbwv200008goismex9hsg";

const COMPLAINT_CATEGORIES = Object.values(ComplaintCategory);
const PRIORITIES = Object.values(Priority);
const COMPLAINT_STATUSES = Object.values(ComplaintStatus);

const createComplaintSchema = z.object({
  citizenId: z.string().cuid(),
  category: z.nativeEnum(ComplaintCategory).optional(),
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10).max(4000),
  priority: z.nativeEnum(Priority).optional(),
  locationAddress: z.string().trim().min(3).max(250).optional(),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  ward: z.string().trim().max(50).optional(),
  pincode: z.string().trim().max(20).optional(),
  photosUrls: z.array(z.string().url()).optional().default([]),
  videoUrls: z.array(z.string().url()).optional().default([]),
  tags: z.array(z.string().trim().min(1).max(30)).optional().default([]),
  isPublic: z.boolean().optional().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const readRateLimitResponse = await enforceRateLimit(request, {
      prefix: "api:complaint:get",
      limit: 60,
      windowSec: 60,
    });

    if (readRateLimitResponse) {
      return readRateLimitResponse;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const citizenId = searchParams.get("citizenId");
    const assignedOfficerId = searchParams.get("assignedOfficerId");
    const mode = searchParams.get("mode");
    const mapMode = mode === "map";
    const statusesParam = searchParams.get("statuses") ?? searchParams.get("status");
    const statuses = statusesParam
      ? statusesParam
          .split(",")
          .map((value) => value.trim().toUpperCase())
          .filter((value): value is ComplaintStatus =>
            COMPLAINT_STATUSES.includes(value as ComplaintStatus),
          )
      : [];
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") ?? "1", 10),
    );
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10)),
    );
    const workerSession = getWorkerSessionFromRequest(request);
    const effectiveAssignedOfficerId = workerSession
      ? workerSession.officerId
      : assignedOfficerId;

    const cacheKey = buildRedisKey(
      "cache:complaint:get:v1",
      id ?? "list",
      citizenId,
      effectiveAssignedOfficerId,
      mapMode ? "map" : "default",
      statuses.join("|"),
      page,
      limit,
      workerSession?.officerId
    );

    const cachedResponse = await getCache<{ data: unknown; meta?: Record<string, unknown> }>(
      cacheKey
    );

    if (cachedResponse) {
      return NextResponse.json({
        ...cachedResponse,
        meta: {
          ...(cachedResponse.meta ?? {}),
          cache: "hit",
        },
      });
    }

    // id is provided - fetch specific complaint
    if (id !== null) {
      const complaints = await prisma.complaint.findMany({
        where: { id },
        include: {
          citizen: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      const responsePayload = {
        data: complaints,
        meta: {
          cache: "miss",
        },
      };

      await setCache(cacheKey, responsePayload, 30);

      return NextResponse.json(responsePayload);
    }
    const skip = (page - 1) * limit;

    if (assignedOfficerId && !workerSession) {
      return NextResponse.json(
        { error: "Worker authentication is required for assigned complaints" },
        { status: 401 },
      );
    }

    if (workerSession && assignedOfficerId && assignedOfficerId !== workerSession.officerId) {
      return NextResponse.json(
        { error: "You can only access complaints assigned to your worker account" },
        { status: 403 },
      );
    }

    const where = {
      ...(citizenId ? { citizenId } : {}),
      ...(effectiveAssignedOfficerId
        ? { assignedOfficerId: effectiveAssignedOfficerId }
        : {}),
      ...(statuses.length > 0 ? { status: { in: statuses } } : {}),
      ...(mapMode
        ? {
            locationLat: { not: null },
            locationLng: { not: null },
          }
        : {}),
    };

    if (mapMode) {
      const complaints = await prisma.complaint.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          priority: true,
          status: true,
          ward: true,
          locationAddress: true,
          locationLat: true,
          locationLng: true,
          createdAt: true,
        },
      });

      const markers = complaints
        .filter((item) => item.locationLat !== null && item.locationLng !== null)
        .map((item) => ({
          id: item.id,
          title: item.title,
          priority: item.priority,
          status: item.status,
          ward: item.ward,
          locationAddress: item.locationAddress,
          lat: item.locationLat as number,
          lng: item.locationLng as number,
          createdAt: item.createdAt,
        }));

      const responsePayload = {
        data: markers,
        meta: {
          mode: "map",
          total: markers.length,
          cache: "miss",
        },
      };

      await setCache(cacheKey, responsePayload, 20);

      return NextResponse.json(responsePayload);
    }

    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          citizen: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignedOfficer: {
            select: {
              id: true,
              name: true,
              department: {
                select: { name: true },
              },
            },
          },
          department: {
            select: { name: true },
          },
        },
      }),
      prisma.complaint.count({ where }),
    ]);

    const responsePayload = {
      data: complaints,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        cache: "miss",
      },
    };

    await setCache(cacheKey, responsePayload, 20);

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("[GET /api/complaint]", error);
    return NextResponse.json(
      { error: "Failed to fetch complaints" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const writeRateLimitResponse = await enforceRateLimit(request, {
      prefix: "api:complaint:post",
      limit: 12,
      windowSec: 60,
    });

    if (writeRateLimitResponse) {
      return writeRateLimitResponse;
    }

    const body = await request.json();
    const parsed = createComplaintSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const payload = parsed.data;

    const aiPrediction = await predictComplaintCategoryAndCriticality(
      payload.description,
    );

    const resolvedCategory = payload.category ?? aiPrediction.predictedCategory;
    const resolvedPriority = payload.priority ?? aiPrediction.predictedPriority;

    const citizen = await prisma.user.findUnique({
      where: { id: payload.citizenId },
      select: { id: true, isActive: true },
    });

    if (!citizen) {
      return NextResponse.json(
        { error: `Citizen with id ${payload.citizenId} was not found` },
        { status: 404 },
      );
    }

    if (!citizen.isActive) {
      return NextResponse.json(
        { error: "Citizen account is inactive" },
        { status: 400 },
      );
    }

    // Auto-classify department based on description
    const classifiedDeptNameStr = await classifyDepartmentWithAgent(
      payload.description,
    );
    const title = await decideDiscription(payload.description);
    payload.title = title;
    console.log("Classified department name:", classifiedDeptNameStr);
    const classifiedDeptName = classifiedDeptNameStr
      .replace(/\s+/g, "_")
      .toUpperCase() as DepartmentName;

    // Ensure department exists in the DB
    let department = await prisma.department.findUnique({
      where: { name: classifiedDeptName },
    });

    if (!department) {
      // Fallback to a default department if classification failed or doesn't exist
      department = await prisma.department.findFirst({
        where: { name: "PUBLIC_HEALTH_DEPARTMENT" },
      });

      if (!department) {
        // If even the fallback is missing, use the first available or create a basic one
        department = await prisma.department.findFirst();
        if (!department) {
          return NextResponse.json(
            { error: "No departments found in the system" },
            { status: 500 },
          );
        }
      }
    }

    const complaint = await prisma.complaint.create({
      data: {
        citizenId: payload.citizenId,
        category: resolvedCategory,
        title: payload.title,
        description: payload.description,
        priority: resolvedPriority,
        DEPARTMENT_NAME: department.name,
        departmentId: department.id,
        locationAddress: payload.locationAddress,
        locationLat: payload.locationLat,
        locationLng: payload.locationLng,
        ward: payload.ward,
        pincode: payload.pincode,
        photosUrls: payload.photosUrls,
        videoUrls: payload.videoUrls,
        tags: payload.tags,
        isPublic: payload.isPublic,
        attachmentCount: payload.photosUrls.length + payload.videoUrls.length,
      },
      // include: {
      //     department: { select: { name: true } }
      // }
    });

    prisma.aICategoryPrediction
      .upsert({
        where: { complaintId: complaint.id },
        create: {
          complaintId: complaint.id,
          predictedCategory: aiPrediction.predictedCategory,
          confidence: aiPrediction.confidence,
          alternativeCategories: aiPrediction.alternativeCategories,
          modelVersion: aiPrediction.modelVersion,
        },
        update: {
          predictedCategory: aiPrediction.predictedCategory,
          confidence: aiPrediction.confidence,
          alternativeCategories: aiPrediction.alternativeCategories,
          modelVersion: aiPrediction.modelVersion,
        },
      })
      .catch((predictionError) => {
        console.error("[POST /api/complaint] failed to persist AI prediction", predictionError);
      });

    return NextResponse.json(
      {
        message: "Complaint submitted successfully",
        data: complaint,
        meta: {
          aiPrediction: {
            predictedCategory: aiPrediction.predictedCategory,
            predictedPriority: aiPrediction.predictedPriority,
            confidence: aiPrediction.confidence,
            modelVersion: aiPrediction.modelVersion,
            appliedCategory: !payload.category,
            appliedPriority: !payload.priority,
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/complaint]", error);
    return NextResponse.json(
      { error: "Failed to create complaint" },
      { status: 500 },
    );
  }
}
