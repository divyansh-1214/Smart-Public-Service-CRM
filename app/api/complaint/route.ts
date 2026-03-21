import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const DEFAULT_CITIZEN_ID = "cmmwnbwv200008goismex9hsg";

// in this we are not varifing that the coplaiine is sublicate or not 


const COMPLAINT_CATEGORIES = [
    "POTHOLE",
    "STREETLIGHT",
    "GARBAGE",
    "WATER_SUPPLY",
    "SANITATION",
    "NOISE_POLLUTION",
    "ROAD_DAMAGE",
    "ILLEGAL_CONSTRUCTION",
    "OTHER",
] as const;

const PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "MINIMAL"] as const;

const createComplaintSchema = z.object({
    citizenId: z.string().cuid().optional().default(DEFAULT_CITIZEN_ID),
    category: z.enum(COMPLAINT_CATEGORIES),
    title: z.string().trim().min(3).max(150),
    description: z.string().trim().min(10).max(4000),
    priority: z.enum(PRIORITIES).optional().default("MEDIUM"),
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
        const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10));
        const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10)));
        const skip = (page - 1) * limit;

        const [complaints, total] = await Promise.all([
            prisma.complaint.findMany({
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
                },
            }),
            prisma.complaint.count(),
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

        const complaint = await prisma.complaint.create({
            data: {
                citizenId: payload.citizenId,
                category: payload.category,
                title: payload.title,
                description: payload.description,
                priority: payload.priority,
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
        });
        // const complaintWithCitizen = await prisma.complaint.findUnique({
        //     where: { id: complaint.id },
        //     include: { citizen: true }
        // });
        // console.log("Complaint with citizen data:", complaintWithCitizen);
        return NextResponse.json(
            {
                message: "fuck youu",
                data: complaint,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("[POST /api/complaint]", error);
        return NextResponse.json({ error: "Failed to create complaint" }, { status: 500 });
    }
}