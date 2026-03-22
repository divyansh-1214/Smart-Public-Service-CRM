import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { classifyDepartmentWithAgent } from "@/lib/agents/classifier";
import { ComplaintCategory, DepartmentName, Priority } from "@prisma/client";

const DEFAULT_CITIZEN_ID = "cmmwnbwv200008goismex9hsg";

const COMPLAINT_CATEGORIES = Object.values(ComplaintCategory);
const PRIORITIES = Object.values(Priority);

const createComplaintSchema = z.object({
    citizenId: z.string().cuid().optional().default(DEFAULT_CITIZEN_ID),
    category: z.nativeEnum(ComplaintCategory),
    title: z.string().trim().min(3).max(150),
    description: z.string().trim().min(10).max(4000),
    priority: z.nativeEnum(Priority).optional().default("MEDIUM"),
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
        const { searchParams } = new URL(request.url);
        const citizenId = searchParams.get("citizenId");
        const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10));
        const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10)));
        const skip = (page - 1) * limit;

        const where = citizenId ? { citizenId } : {};

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
                                select: { name: true }
                            }
                        }
                    },
                    assignedWorkers: {
                        select: {
                            id: true,
                            name: true,
                            position: true
                        }
                    },
                    department: {
                        select: { name: true }
                    }
                },
            }),
            prisma.complaint.count({ where }),
        ]);

        return NextResponse.json({
            data: complaints,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("[GET /api/complaint]", error);
        return NextResponse.json({ error: "Failed to fetch complaints" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = createComplaintSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid request body",
                    issues: parsed.error.flatten(),
                },
                { status: 400 }
            );
        }

        const payload = parsed.data;

        const citizen = await prisma.user.findUnique({
            where: { id: payload.citizenId },
            select: { id: true, isActive: true },
        });

        if (!citizen) {
            return NextResponse.json(
                { error: `Citizen with id ${payload.citizenId} was not found` },
                { status: 404 }
            );
        }

        if (!citizen.isActive) {
            return NextResponse.json(
                { error: "Citizen account is inactive" },
                { status: 400 }
            );
        }

        // Auto-classify department based on description
        const classifiedDeptNameStr = await classifyDepartmentWithAgent(payload.description);
        const classifiedDeptName = classifiedDeptNameStr.replace(/\s+/g, "_").toUpperCase() as DepartmentName;

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
                    return NextResponse.json({ error: "No departments found in the system" }, { status: 500 });
                }
            }
        }

        const complaint = await prisma.complaint.create({
            data: {
                citizenId: payload.citizenId,
                category: payload.category,
                title: payload.title,
                description: payload.description,
                priority: payload.priority,
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

        return NextResponse.json(
            {
                message: "Complaint submitted successfully",
                data: complaint,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("[POST /api/complaint]", error);
        return NextResponse.json({ error: "Failed to create complaint" }, { status: 500 });
    }
}