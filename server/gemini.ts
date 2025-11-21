// Reference: javascript_gemini_ai_integrations blueprint
// This is using Replit's AI Integrations service for Gemini API access
import { GoogleGenAI, Type } from "@google/genai";
import type { Ticket } from "@shared/schema";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || "",
  },
});

interface AnalysisResult {
  ticket: Ticket;
}

export async function analyzeVideoForBugTicket(
  videoUrl: string,
  videoTitle?: string,
  transcript?: string
): Promise<Ticket> {
  if (!transcript || transcript.trim().length < 10) {
    throw new Error("Transcript content is required to generate a bug ticket");
  }
  
  const prompt = `You are analyzing a Loom video transcript that shows someone encountering a bug in a piece of software.

Video URL: ${videoUrl}
${videoTitle ? `Video Title: ${videoTitle}` : ''}

Video Transcript/Description:
${transcript}

Based on this bug report transcript, generate a detailed and specific bug ticket with the following information:

1. **title**: A clear, concise title that summarizes the bug (max 100 characters)
2. **description**: A detailed description of the issue observed in the video (2-3 sentences)
3. **stepsToReproduce**: An array of specific steps to reproduce the bug, in order (3-8 steps)
4. **expectedBehavior**: What should have happened
5. **actualBehavior**: What actually happened (the bug)
6. **severity**: The severity level - choose from: "low", "medium", "high", or "critical"
7. **environment**: Optional environment details if visible (browser, OS, app version, etc.)

Be specific and technical. Extract as much detail as possible from what you can observe.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ticket: {
              type: Type.OBJECT,
              properties: {
                title: { 
                  type: Type.STRING,
                  description: "Clear, concise bug title"
                },
                description: { 
                  type: Type.STRING,
                  description: "Detailed description of the bug"
                },
                stepsToReproduce: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Ordered steps to reproduce the bug"
                },
                expectedBehavior: { 
                  type: Type.STRING,
                  description: "What should happen"
                },
                actualBehavior: { 
                  type: Type.STRING,
                  description: "What actually happens (the bug)"
                },
                severity: {
                  type: Type.STRING,
                  enum: ["low", "medium", "high", "critical"],
                  description: "Bug severity level"
                },
                environment: {
                  type: Type.STRING,
                  description: "Environment details if visible",
                  nullable: true
                }
              },
              required: ["title", "description", "stepsToReproduce", "expectedBehavior", "actualBehavior"]
            }
          },
          required: ["ticket"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}") as AnalysisResult;
    
    if (!result.ticket) {
      throw new Error("Failed to generate ticket from video analysis");
    }

    return result.ticket;
  } catch (error: any) {
    console.error("Error analyzing video:", error);
    throw new Error(
      error.message || "Failed to analyze video. Please try again."
    );
  }
}
