import { NextResponse } from "next/server";
export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log("Received complaint data:", data);
    return NextResponse.json({ message: "Complaint assigned successfully!" });
  } catch (error) {
    console.error("Error assigning complaint:", error);
    return NextResponse.json({ error: "Failed to assign complaint." }, { status: 500 });
  }
}