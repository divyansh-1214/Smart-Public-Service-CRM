import { NextRequest, NextResponse } from "next/server";
import { classifyDepartmentWithAgent } from "@/lib/agents/classifier";

export async function GET(){
  const sampleDescription = "There is a large pothole on Main Street that is causing traffic issues.";
  const department = await classifyDepartmentWithAgent(sampleDescription);
  console.log(`Classified department for sample description: ${department}`);
  const response = NextResponse.json(
    {
      status: "ok",
      message: "GET request received successfully",
    });
  
  // Disable caching for Vapi agent interactions
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}


export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log("Received agent payload:", JSON.stringify(payload, null, 2));

    // Handle Vapi tool calls
    if (payload.message?.type === "tool-calls" && payload.message.toolWithToolCallList) {
      const results = [];

      for (const item of payload.message.toolWithToolCallList) {
        const toolCall = item.toolCall;
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments || "{}");

        console.log(`Executing tool: ${functionName}`, args);

        let resultData = "Tool execution failed or not found.";

        if (functionName === "checkComplaintStatus") {
          // Implement standard complaint status check
          const complaintId = args.complaintId;
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
          // Stub for creating a complaint
          resultData = "Creating complaints via voice is recorded. Our team will review the details.";
        } else {
          resultData = `The tool ${functionName} is not implemented on the server.`;
        }

        results.push({
          toolCallId: toolCall.id,
          result: resultData,
        });
      }

      // Return the array of results for each tool call
      const response = NextResponse.json({ results });
      
      // Disable caching for Vapi agent interactions
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      
      return response;
    }

    // Default response for other message types (e.g. status-update, end-of-call-report)
    const response = NextResponse.json({
      status: "ok",
      message: "Agent data received successfully",
    });
    
    // Disable caching for Vapi agent interactions
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error("Error parsing agent data:", error);
    const response = NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error parsing agent data",
      },
      { status: 400 }
    );
    
    // Disable caching for Vapi agent interactions
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  }
}
