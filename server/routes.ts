import type { Express } from "express";
import { createServer, type Server } from "http";
import { analyzeVideoFileForBugTicket, analyzeTranscriptForBugTicket } from "./gemini";
import { getLoomVideoMetadata, isValidLoomUrl } from "./loom";
import { extractLoomTranscript } from "./loom-scraper";
import { downloadLoomVideo } from "./loom-video-downloader";
import { loomUrlSchema } from "@shared/schema";

const MAX_VIDEO_SIZE_FOR_ANALYSIS = 8 * 1024 * 1024;

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/analyze-video", async (req, res) => {
    let downloadedVideo: any = null;
    
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
      let ticket;
      let analysisMethod = "unknown";

      try {
        console.log("Attempting to download Loom video for analysis...");
        downloadedVideo = await downloadLoomVideo(url);
        
        if (downloadedVideo.sizeBytes <= MAX_VIDEO_SIZE_FOR_ANALYSIS) {
          console.log(`Video is ${(downloadedVideo.sizeBytes / 1024 / 1024).toFixed(2)}MB, analyzing with Gemini...`);
          ticket = await analyzeVideoFileForBugTicket(
            downloadedVideo.filePath,
            downloadedVideo.mimeType,
            url,
            metadata.title
          );
          analysisMethod = "video";
          console.log("Successfully analyzed video content");
        } else {
          const sizeMB = (downloadedVideo.sizeBytes / 1024 / 1024).toFixed(2);
          console.log(`Video is too large (${sizeMB}MB > 8MB limit), falling back to transcript analysis`);
          throw new Error("VIDEO_TOO_LARGE");
        }
      } catch (videoError: any) {
        console.log("Video analysis not available, falling back to transcript:", videoError.message);
        
        let transcript = userTranscript;
        if (!transcript || transcript.trim().length === 0) {
          try {
            transcript = await extractLoomTranscript(url);
            console.log('Successfully extracted transcript automatically');
          } catch (scrapeError: any) {
            console.error('Failed to extract transcript:', scrapeError.message);
            return res.status(400).json({
              error: "Could not download video for analysis and no transcript available. Please provide the transcript manually or use a shorter video (under 8MB).",
            });
          }
        }

        ticket = await analyzeTranscriptForBugTicket(url, metadata.title, transcript);
        analysisMethod = "transcript";
        console.log("Successfully analyzed transcript content");
      }

      return res.json({
        ticket,
        videoTitle: metadata.title,
        videoDuration: metadata.duration,
        analysisMethod,
      });
    } catch (error: any) {
      console.error("Error in /api/analyze-video:", error);
      return res.status(500).json({
        error: error.message || "Failed to analyze video",
      });
    } finally {
      if (downloadedVideo && downloadedVideo.cleanup) {
        await downloadedVideo.cleanup();
      }
    }
  });

  app.post("/api/test-download", async (req, res) => {
    let downloadedVideo: any = null;
    
    try {
      const { url } = req.body;

      if (!url || !isValidLoomUrl(url)) {
        return res.status(400).json({
          error: "Invalid Loom URL. Please provide a valid Loom video URL.",
        });
      }

      console.log(`\n===== TESTING VIDEO DOWNLOAD =====`);
      console.log(`URL: ${url}`);
      
      downloadedVideo = await downloadLoomVideo(url);
      
      const sizeMB = (downloadedVideo.sizeBytes / 1024 / 1024).toFixed(2);
      const result = {
        success: true,
        videoInfo: {
          filePath: downloadedVideo.filePath,
          mimeType: downloadedVideo.mimeType,
          sizeBytes: downloadedVideo.sizeBytes,
          sizeMB: `${sizeMB} MB`,
          isValidForGemini: downloadedVideo.mimeType.includes('video'),
          canUseFilesAPI: true,
        },
        message: `Successfully downloaded Loom video (${sizeMB}MB). File is ready for Gemini Files API upload.`
      };

      console.log(`\n===== DOWNLOAD SUCCESS =====`);
      console.log(`File: ${downloadedVideo.filePath}`);
      console.log(`Type: ${downloadedVideo.mimeType}`);
      console.log(`Size: ${sizeMB} MB (${downloadedVideo.sizeBytes.toLocaleString()} bytes)`);
      console.log(`Valid for Gemini: ${result.videoInfo.isValidForGemini}`);
      console.log(`===============================\n`);

      return res.json(result);
    } catch (error: any) {
      console.error(`\n===== DOWNLOAD FAILED =====`);
      console.error(`Error: ${error.message}`);
      console.error(`===========================\n`);
      
      return res.status(500).json({
        success: false,
        error: error.message,
        details: "Failed to download video. Check server logs for details."
      });
    } finally {
      if (downloadedVideo && downloadedVideo.cleanup) {
        await downloadedVideo.cleanup();
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
