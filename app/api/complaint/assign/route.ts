import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json(
      {
        message: "Use POST /api/complaint/assign/[id] to assign a complaint",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error assigning complaint:", error);
    return NextResponse.json({ error: "Failed to assign complaint." }, { status: 500 });
  }
}