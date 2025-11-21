// Reference: javascript_gemini blueprint
// This uses the full Gemini API with Files API support for video uploads (up to 2GB)
import { GoogleGenAI, Type } from "@google/genai";
import type { Ticket } from "@shared/schema";
import fs from "fs";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

interface AnalysisResult {
  ticket: Ticket;
}

const ticketResponseSchema = {
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
};

export async function analyzeVideoFileForBugTicket(
  videoFilePath: string,
  mimeType: string,
  videoUrl: string,
  videoTitle?: string
): Promise<Ticket> {
  try {
    console.log(`Uploading video to Gemini Files API: ${videoFilePath}`);
    
    const stats = fs.statSync(videoFilePath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`Video size: ${sizeMB}MB (${stats.size} bytes)`);

    const uploadResult = await ai.files.upload({
      file: videoFilePath,
      config: {
        mimeType,
        displayName: `loom-bug-report-${Date.now()}.mp4`
      }
    });

    const fileUri = uploadResult.uri;
    const fileName = uploadResult.name;
    console.log(`Video uploaded successfully. File URI: ${fileUri}`);
    console.log(`File name: ${fileName}`);
    console.log(`Waiting for video to be processed...`);

    let file = uploadResult;
    let attempts = 0;
    const maxAttempts = 60;
    while (file.state === 'PROCESSING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      file = await ai.files.get({ name: fileName });
      attempts++;
      if (attempts % 5 === 0) {
        console.log(`Still processing... (${attempts * 2}s elapsed)`);
      }
    }

    if (file.state === 'FAILED') {
      throw new Error('Video processing failed on Gemini servers');
    }

    if (file.state === 'PROCESSING') {
      throw new Error('Video processing timed out. Video may be too long.');
    }

    console.log(`Video processed successfully (state: ${file.state}). Analyzing with Gemini...`);

    const prompt = `You are analyzing a Loom screen recording video that shows someone encountering a bug in a piece of software.

Video URL: ${videoUrl}
${videoTitle ? `Video Title: ${videoTitle}` : ''}

Watch the video carefully and analyze what bug or issue is being demonstrated. Based on what you observe in the video, generate a detailed and specific bug ticket with the following information:

1. **title**: A clear, concise title that summarizes the bug (max 100 characters)
2. **description**: A detailed description of the issue observed in the video (2-3 sentences)
3. **stepsToReproduce**: An array of specific steps to reproduce the bug, in order (3-8 steps) - extract these from watching what the user does in the video
4. **expectedBehavior**: What should have happened
5. **actualBehavior**: What actually happened (the bug)
6. **severity**: The severity level - choose from: "low", "medium", "high", or "critical" based on the impact you observe
7. **environment**: Optional environment details if visible (browser, OS, app version, etc.)

Be specific and technical. Extract as much detail as possible from what you can observe in the video.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { 
              fileData: { 
                fileUri,
                mimeType 
              } 
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: ticketResponseSchema
      }
    });

    const result = JSON.parse(response.text || "{}") as AnalysisResult;
    
    if (!result.ticket) {
      throw new Error("Failed to generate ticket from video analysis");
    }

    console.log("Successfully generated ticket from video analysis");
    
    try {
      await ai.files.delete({ name: fileName });
      console.log(`Cleaned up uploaded video from Gemini: ${fileName}`);
    } catch (cleanupError: any) {
      console.warn(`Failed to cleanup video file ${fileName} from Gemini:`, cleanupError.message);
    }

    return result.ticket;
  } catch (error: any) {
    console.error("Error analyzing video file:", error);
    throw new Error(
      error.message || "Failed to analyze video file. Please try again."
    );
  }
}

export async function analyzeTranscriptForBugTicket(
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
        responseSchema: ticketResponseSchema
      }
    });

    const result = JSON.parse(response.text || "{}") as AnalysisResult;
    
    if (!result.ticket) {
      throw new Error("Failed to generate ticket from video analysis");
    }

    return result.ticket;
  } catch (error: any) {
    console.error("Error analyzing transcript:", error);
    throw new Error(
      error.message || "Failed to analyze transcript. Please try again."
    );
  }
}
