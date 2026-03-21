import { NextRequest, NextResponse } from "next/server";
import { classifyDepartmentWithAgent } from "@/lib/agents/classifier";

export async function GET(){
  const sampleDescription = "There is a large pothole on Main Street that is causing traffic issues.";
  const department = await classifyDepartmentWithAgent(sampleDescription);
  console.log(`Classified department for sample description: ${department}`);
  return NextResponse.json(
    {
      status: "ok",
      message: "GET request received successfully",
    });
}


export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json();
    console.log("Received agent data:", { name, description });
  }
    catch (error) {
    console.error("Error parsing agent data:", error);
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Unknown error parsing agent data",
      },
      { status: 400 }
    );
  }
  return NextResponse.json(
    {
      status: "ok",
        message: "Agent data received successfully",
    });
}
