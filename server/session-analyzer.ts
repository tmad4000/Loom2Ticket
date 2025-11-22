import { GoogleGenAI } from "@google/genai";
import type { TimestampedTicket } from "@shared/schema";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

if (!apiKey) {
  console.warn("No Gemini API key found. Session analysis will not work.");
}

const ai = new GoogleGenAI({ apiKey });

interface SessionAnalysisResult {
  tickets: TimestampedTicket[];
  analysisMethod: 'video' | 'transcript' | 'combined';
}

const timestampedTicketsSchema = {
  type: "object" as const,
  properties: {
    tickets: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          title: { type: "string" as const },
          description: { type: "string" as const },
          stepsToReproduce: {
            type: "array" as const,
            items: { type: "string" as const },
          },
          expectedBehavior: { type: "string" as const },
          actualBehavior: { type: "string" as const },
          severity: {
            type: "string" as const,
            enum: ["low", "medium", "high", "critical"],
          },
          environment: { type: "string" as const },
          timestampSeconds: { type: "number" as const },
          timestampDisplay: { type: "string" as const },
        },
        required: [
          "title",
          "description",
          "stepsToReproduce",
          "expectedBehavior",
          "actualBehavior",
          "timestampSeconds",
          "timestampDisplay",
        ],
      },
    },
  },
  required: ["tickets"],
};

export async function analyzeSessionForTickets(
  videoPath: string,
  transcript: string,
  baseVideoUrl: string,
  model: string = 'gemini-2.5-flash'
): Promise<SessionAnalysisResult & { modelUsed: string }> {
  console.log("Starting session analysis with video and transcript...");
  console.log(`Video path: ${videoPath}`);
  console.log(`Transcript length: ${transcript.length} characters`);
  console.log(`Base URL: ${baseVideoUrl}`);

  try {
    // Upload video to Gemini Files API
    const fs = await import("fs");
    const stat = fs.statSync(videoPath);
    const fileSizeMB = (stat.size / (1024 * 1024)).toFixed(2);
    
    console.log(`Uploading video to Gemini Files API for session analysis...`);
    console.log(`Video size: ${fileSizeMB}MB (${stat.size} bytes)`);

    const uploadResult = await ai.files.upload({
      file: videoPath,
      config: {
        mimeType: "video/mp4",
        displayName: "loom-session-video.mp4",
      },
    });

    const fileUri = uploadResult.uri;
    const fileName = uploadResult.name;
    console.log(`Video uploaded successfully. File URI: ${fileUri}`);
    console.log(`File name: ${fileName}`);

    // Poll until the video is processed
    console.log("Waiting for video to be processed...");
    let file = uploadResult;
    let attempts = 0;
    const maxAttempts = 60;
    while (file.state === "PROCESSING" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      file = await ai.files.get({ name: fileName });
      attempts++;
      if (attempts % 5 === 0) {
        console.log(`Still processing... (${attempts * 2}s elapsed)`);
      }
    }

    if (file.state === "FAILED") {
      throw new Error("Video processing failed on Gemini servers");
    }

    if (file.state === "PROCESSING") {
      throw new Error("Video processing timed out. Video may be too long.");
    }

    console.log(`Video processed successfully (state: ${file.state}). Analyzing session...`);

    // Analyze the video and transcript together
    const prompt = `You are analyzing a Loom screen recording session to identify ALL bugs, issues, or problems demonstrated in the video.

IMPORTANT INSTRUCTIONS:
1. Watch the ENTIRE video carefully and read the transcript
2. Identify EVERY distinct bug, issue, or problem shown (there may be multiple)
3. For each issue found, determine the approximate timestamp when it occurs
4. Skip any parts that are just navigation, setup, or explanation without demonstrating an actual bug
5. Each ticket should represent a SEPARATE, DISTINCT issue

For EACH issue you find, create a detailed bug ticket with:
- title: Clear, concise description of the specific bug
- description: Detailed explanation of what's wrong
- stepsToReproduce: Step-by-step instructions to recreate this specific issue
- expectedBehavior: What should happen
- actualBehavior: What actually happens (the bug)
- severity: "low", "medium", "high", or "critical"
- environment: Browser, OS, and other relevant details observed in the video
- timestampSeconds: The approximate time in seconds when this issue is demonstrated
- timestampDisplay: Human-readable timestamp (e.g., "1:23", "0:45", "12:30")

${transcript ? `\n\nTRANSCRIPT:\n${transcript}\n\nUse the transcript to help identify timestamps and understand context, but focus primarily on what you SEE in the video.\n` : ''}

Return a JSON object with a "tickets" array containing all issues found. If no bugs are demonstrated, return an empty tickets array.`;

    console.log(`Using AI model: ${model}`);
    const result = await ai.models.generateContent({
      model: model,
      config: {
        responseMimeType: "application/json",
        responseSchema: timestampedTicketsSchema,
      },
      contents: [
        {
          parts: [
            { text: prompt },
            {
              fileData: {
                fileUri,
                mimeType: "video/mp4",
              },
            },
          ],
        },
      ],
    });

    const responseText = result.text;
    const parsedResult = JSON.parse(responseText);

    if (!parsedResult.tickets) {
      throw new Error("Failed to extract tickets from session analysis");
    }

    console.log(`Successfully analyzed session. Found ${parsedResult.tickets.length} issue(s)`);

    // Add Loom URLs with timestamps to each ticket
    const ticketsWithUrls = parsedResult.tickets.map((ticket: any) => ({
      ...ticket,
      loomUrlWithTimestamp: `${baseVideoUrl}?t=${Math.floor(ticket.timestampSeconds)}s`,
    }));

    // Cleanup uploaded video
    try {
      await ai.files.delete({ name: fileName });
      console.log(`Cleaned up uploaded video from Gemini: ${fileName}`);
    } catch (cleanupError: any) {
      console.warn(`Failed to cleanup video file ${fileName} from Gemini:`, cleanupError.message);
    }

    return {
      tickets: ticketsWithUrls,
      analysisMethod: transcript ? 'combined' : 'video',
      modelUsed: model,
    };
  } catch (error: any) {
    console.error("Error analyzing session:", error);
    throw new Error(
      error.message || "Failed to analyze session. Please try again."
    );
  }
}

export async function analyzeSessionFromTranscript(
  transcript: string,
  baseVideoUrl: string,
  model: string = 'gemini-2.5-flash'
): Promise<SessionAnalysisResult & { modelUsed: string }> {
  console.log("Analyzing session from transcript only (no video)...");
  console.log(`Transcript length: ${transcript.length} characters`);

  try {
    const prompt = `You are analyzing a Loom video transcript to identify ALL bugs, issues, or problems mentioned.

IMPORTANT INSTRUCTIONS:
1. Read the ENTIRE transcript carefully
2. Identify EVERY distinct bug, issue, or problem mentioned (there may be multiple)
3. For each issue, try to determine the approximate timestamp from context clues in the transcript
4. Skip any parts that are just navigation, setup, or explanation without describing an actual bug
5. Each ticket should represent a SEPARATE, DISTINCT issue

For EACH issue you find, create a detailed bug ticket with:
- title: Clear, concise description of the specific bug
- description: Detailed explanation of what's wrong
- stepsToReproduce: Step-by-step instructions to recreate this specific issue
- expectedBehavior: What should happen
- actualBehavior: What actually happens (the bug)
- severity: "low", "medium", "high", or "critical"
- environment: Any environment details mentioned (browser, OS, etc.) or "Not specified"
- timestampSeconds: Best estimate of when this issue is discussed (in seconds from start)
- timestampDisplay: Human-readable timestamp (e.g., "1:23", "0:45", "12:30")

TRANSCRIPT:
${transcript}

Return a JSON object with a "tickets" array containing all issues found. If no bugs are described, return an empty tickets array.`;

    console.log(`Using AI model: ${model}`);
    const result = await ai.models.generateContent({
      model: model,
      config: {
        responseMimeType: "application/json",
        responseSchema: timestampedTicketsSchema,
      },
      contents: [{ parts: [{ text: prompt }] }],
    });

    const responseText = result.text;
    const parsedResult = JSON.parse(responseText);

    if (!parsedResult.tickets) {
      throw new Error("Failed to extract tickets from transcript");
    }

    console.log(`Successfully analyzed transcript. Found ${parsedResult.tickets.length} issue(s)`);

    // Add Loom URLs with timestamps to each ticket
    const ticketsWithUrls = parsedResult.tickets.map((ticket: any) => ({
      ...ticket,
      loomUrlWithTimestamp: `${baseVideoUrl}?t=${Math.floor(ticket.timestampSeconds)}s`,
    }));

    return {
      tickets: ticketsWithUrls,
      analysisMethod: 'transcript',
      modelUsed: model,
    };
  } catch (error: any) {
    console.error("Error analyzing session from transcript:", error);
    throw new Error(
      error.message || "Failed to analyze session from transcript. Please try again."
    );
  }
}
