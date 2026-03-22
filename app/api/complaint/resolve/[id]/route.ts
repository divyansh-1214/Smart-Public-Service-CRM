import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ComplaintStatus } from "@prisma/client";
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const complaint = await prisma.complaint.findMany({
            where: { resolvedAt: null },
            include: {
                assignedOfficer: true
            }
        });

        return NextResponse.json({ message: `Resolve complaint with ID: ${id}`,
            data: complaint});
    }
    catch (error) {
        console.error("[GET /api/complaint/resolve/[id]]", error);
        return NextResponse.json({ error: "Failed to fetch complaint" }, { status: 500 });
    } 
}

export async function PATCH(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }){
        try{
            const { id } = await params;
            const updatedComplaint = await prisma.complaint.update({
                where: { id },
                data: {
                    status: ComplaintStatus.RESOLVED,
                    resolvedAt: new Date(),
                },
            });
            return NextResponse.json({ message: `Complaint resolved successfully`, data: updatedComplaint });
        }
        catch (error) {
            console.error("[PATCH /api/complaint/resolve/[id]]", error);
            return NextResponse.json({ error: "Failed to resolve complaint" }, { status: 500 });

        }
    }