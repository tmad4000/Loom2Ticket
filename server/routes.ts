import type { Express } from "express";
import { createServer, type Server } from "http";
import { analyzeVideoForBugTicket } from "./gemini";
import { getLoomVideoMetadata, isValidLoomUrl } from "./loom";
import { extractLoomTranscript } from "./loom-scraper";
import { loomUrlSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/analyze-video", async (req, res) => {
    try {
      const validationResult = loomUrlSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: validationResult.error.errors,
        });
      }

      const { url, transcript: userTranscript } = validationResult.data;

      if (!isValidLoomUrl(url)) {
        return res.status(400).json({
          error: "Invalid Loom URL. Please provide a valid Loom video URL.",
        });
      }

      const metadata = await getLoomVideoMetadata(url);

      let transcript = userTranscript;
      if (!transcript || transcript.trim().length === 0) {
        try {
          transcript = await extractLoomTranscript(url);
          console.log('Successfully extracted transcript automatically');
        } catch (scrapeError: any) {
          console.error('Failed to extract transcript:', scrapeError.message);
          return res.status(400).json({
            error: scrapeError.message || "Failed to extract transcript. Please provide the transcript manually.",
          });
        }
      }

      const ticket = await analyzeVideoForBugTicket(url, metadata.title, transcript);

      return res.json({
        ticket,
        videoTitle: metadata.title,
        videoDuration: metadata.duration,
      });
    } catch (error: any) {
      console.error("Error in /api/analyze-video:", error);
      return res.status(500).json({
        error: error.message || "Failed to analyze video",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
