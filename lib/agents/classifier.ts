import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent, tool } from "langchain";
import { ChatGroq } from "@langchain/groq"
import * as z from "zod";

const departments = [
  "ADVERTISEMENT",
  "BUILDING DEPARTMENT",
  "DIRECTORATE OF INQUIRY",
  "ELECTION DEPARTMENT",
  "FINANCE DEPARTMENT",
  "INFORMATION TECHNOLOGY",
  "LAW DEPARTMENT",
  "PUBLIC HEALTH DEPARTMENT",
  "TOLL TAX",
  "ARCHITECTURE DEPARTMENT",
  "CENTRAL ESTABLISHMENT",
  "DIRECTORATE OF PRESS AND INFORMATION",
  "ENGINEERING DEPARTMENT",
  "HACKNEY CARRIAGE",
  "LABOUR WELFARE DEPARTMENT",
  "LICENSING DEPARTMENT",
  "REMUNERATIVE PROJECT CELL",
  "VETERINARY",
  "ASSESSMENT AND COLLECTION DEPARTMENT",
  "COMMITTEE AND CORPORATION",
  "DEPARTMENT OF ENVIRONMENTAL MANAGEMENT",
  "ELECTRICAL AND MECHANICAL DEPARTMENT",
  "HORTICULTURE DEPARTMENT",
  "LAND AND ESTATE",
  "MUNICIPAL SECRETARY OFFICE",
  "STATUTORY AUDIT DEPARTMENT",
  "VIGILANCE",
  "AYUSH DEPARTMENT",
  "COMMUNITY SERVICES",
  "EDUCATION",
  "FACTORY LICENSE",
  "HOSPITAL ADMINISTRATION",
  "LANGUAGE DEPARTMENT",
  "ORGANIZATION AND METHOD DEPARTMENT",
  "TOWN PLANNING"
] as const;

const keywordDepartmentRules: Array<{
  department: (typeof departments)[number];
  keywords: string[];
}> = [
  {
    department: "ADVERTISEMENT",
    keywords: ["hoarding", "banner", "advertisement", "billboard", "poster"],
  },
  {
    department: "BUILDING DEPARTMENT",
    keywords: ["building", "construction", "illegal construction", "structure", "demolition"],
  },
  {
    department: "DIRECTORATE OF INQUIRY",
    keywords: ["inquiry", "investigation", "complaint review", "probe"],
  },
  {
    department: "ELECTION DEPARTMENT",
    keywords: ["election", "voter", "polling", "booth", "vote"],
  },
  {
    department: "FINANCE DEPARTMENT",
    keywords: ["tax", "payment", "refund", "billing", "invoice", "fee"],
  },
  {
    department: "INFORMATION TECHNOLOGY",
    keywords: ["portal", "website", "server", "app", "login", "digital"],
  },
  {
    department: "LAW DEPARTMENT",
    keywords: ["legal", "court", "case", "law", "notice"],
  },
  {
    department: "PUBLIC HEALTH DEPARTMENT",
    keywords: ["garbage", "waste", "sanitation", "mosquito", "dirty", "hygiene", "toilet"],
  },
  {
    department: "TOLL TAX",
    keywords: ["toll", "tax booth", "toll plaza", "fee collection"],
  },
  {
    department: "ARCHITECTURE DEPARTMENT",
    keywords: ["design", "architecture", "map approval", "layout design"],
  },
  {
    department: "CENTRAL ESTABLISHMENT",
    keywords: ["staff", "employee", "recruitment", "posting", "transfer"],
  },
  {
    department: "DIRECTORATE OF PRESS AND INFORMATION",
    keywords: ["press", "media", "news", "information release"],
  },
  {
    department: "ENGINEERING DEPARTMENT",
    keywords: ["pothole", "road", "street", "drain", "sewer", "footpath", "bridge"],
  },
  {
    department: "HACKNEY CARRIAGE",
    keywords: ["taxi", "auto", "rickshaw", "transport permit"],
  },
  {
    department: "LABOUR WELFARE DEPARTMENT",
    keywords: ["labour", "worker", "wages", "employment", "benefits"],
  },
  {
    department: "LICENSING DEPARTMENT",
    keywords: ["license", "permit", "renewal", "shop license"],
  },
  {
    department: "REMUNERATIVE PROJECT CELL",
    keywords: ["project", "revenue", "scheme", "income generation"],
  },
  {
    department: "VETERINARY",
    keywords: ["dog", "animal", "cattle", "stray", "pet"],
  },
  {
    department: "ASSESSMENT AND COLLECTION DEPARTMENT",
    keywords: ["property tax", "assessment", "collection", "arrears"],
  },
  {
    department: "COMMITTEE AND CORPORATION",
    keywords: ["committee", "meeting", "resolution", "corporation"],
  },
  {
    department: "DEPARTMENT OF ENVIRONMENTAL MANAGEMENT",
    keywords: ["pollution", "environment", "air quality", "noise", "waste management"],
  },
  {
    department: "ELECTRICAL AND MECHANICAL DEPARTMENT",
    keywords: ["streetlight", "light", "electric", "power", "transformer"],
  },
  {
    department: "HORTICULTURE DEPARTMENT",
    keywords: ["tree", "park", "garden", "pruning", "plant"],
  },
  {
    department: "LAND AND ESTATE",
    keywords: ["land", "property", "estate", "encroachment", "lease"],
  },
  {
    department: "MUNICIPAL SECRETARY OFFICE",
    keywords: ["secretary", "office", "administration", "official"],
  },
  {
    department: "STATUTORY AUDIT DEPARTMENT",
    keywords: ["audit", "accounts", "financial review", "compliance"],
  },
  {
    department: "VIGILANCE",
    keywords: ["corruption", "fraud", "misconduct", "complaint"],
  },
  {
    department: "AYUSH DEPARTMENT",
    keywords: ["ayurveda", "homeopathy", "naturopathy", "alternative medicine"],
  },
  {
    department: "COMMUNITY SERVICES",
    keywords: ["community", "welfare", "public service", "social"],
  },
  {
    department: "EDUCATION",
    keywords: ["school", "education", "teacher", "student", "learning"],
  },
  {
    department: "FACTORY LICENSE",
    keywords: ["factory", "industrial", "manufacturing"],
  },
  {
    department: "HOSPITAL ADMINISTRATION",
    keywords: ["hospital", "doctor", "clinic", "medical"],
  },
  {
    department: "LANGUAGE DEPARTMENT",
    keywords: ["language", "translation", "official language"],
  },
  {
    department: "ORGANIZATION AND METHOD DEPARTMENT",
    keywords: ["process", "method", "workflow", "organization"],
  },
  {
    department: "TOWN PLANNING",
    keywords: ["zoning", "layout", "encroachment", "construction", "illegal building"],
  },
];

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",
  apiKey: process.env.GOOGLE_PLACE_API_KEY,
  maxOutputTokens: 50,
});


const llm = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    maxTokens: 50,
    maxRetries: 2,
    // other params...
})
function normalizeText(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function decideDepartment(complaint: string): string {
  const normalizedComplaint = normalizeText(complaint);

  let bestDepartment: string | null = null;
  let bestScore = 0;

  for (const rule of keywordDepartmentRules) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (normalizedComplaint.includes(keyword)) {
        score += keyword.split(" ").length;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestDepartment = rule.department;
    }
  }

  if (bestDepartment) {
    return bestDepartment;
  }

  return "PUBLIC HEALTH DEPARTMENT";
}

export const selectDepartmentTool = tool(
  async ({ description }: { description: string }) => {
    const department = decideDepartment(description);
    return JSON.stringify({ department, availableDepartments: departments });
  },
  {
    name: "select_department",
    description:
      "Select the best matching municipal department from the allowed list using the complaint description.",
    schema: z.object({
      description: z.string().min(5, "Description is required"),
    }),
  }
);

const agent = createAgent({
  model,
  tools: [selectDepartmentTool],
});

function extractDepartmentFromContent(content: string): string | null {
  return departments.find((dept) => content.toUpperCase().includes(dept)) ?? null;
}

async function classifyWithGemini(description: string): Promise<string | null> {
  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content:
          `Find the best department for this complaint description: "${description}". ` +
          "You must call the select_department tool and return only the department name.",
      },
    ],
  });

  const lastMessage = result.messages?.[result.messages.length - 1];
  const content =
    typeof lastMessage?.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage?.content ?? "");

  return extractDepartmentFromContent(content);
}

async function classifyWithGroq(description: string): Promise<string | null> {
  const response = await llm.invoke([
    [
      "system",
      "You are a municipal complaint router. Return only one department name from the provided list.",
    ],
    [
      "user",
      `Departments: ${departments.join(", ")}. Complaint: "${description}". Return only the exact department name.`,
    ],
  ]);

  const content = typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content ?? "");

  return extractDepartmentFromContent(content);
}

export async function classifyDepartmentWithAgent(description: string): Promise<string> {
  try {
    const geminiDepartment = await classifyWithGemini(description);
    if (geminiDepartment) {
      return geminiDepartment;
    }
  } catch (error) {
    console.warn("Gemini classification failed, trying Groq fallback", error);
  }

  try {
    const groqDepartment = await classifyWithGroq(description);
    if (groqDepartment) {
      return groqDepartment;
    }
  } catch (error) {
    console.warn("Groq fallback classification failed, using keyword fallback", error);
  }

  return decideDepartment(description);
}

export { departments, decideDepartment };
