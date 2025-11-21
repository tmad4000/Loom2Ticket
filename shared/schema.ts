import { z } from "zod";

export const loomUrlSchema = z.object({
  url: z.string().url().refine(
    (url) => url.includes('loom.com'),
    { message: "Please provide a valid Loom video URL" }
  ),
  transcript: z.string().optional(),
});

export type LoomUrlInput = z.infer<typeof loomUrlSchema>;

export const ticketSchema = z.object({
  title: z.string(),
  description: z.string(),
  stepsToReproduce: z.array(z.string()),
  expectedBehavior: z.string(),
  actualBehavior: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  environment: z.string().optional(),
});

export type Ticket = z.infer<typeof ticketSchema>;

export const analyzeVideoResponseSchema = z.object({
  ticket: ticketSchema,
  videoTitle: z.string().optional(),
  videoDuration: z.string().optional(),
});

export type AnalyzeVideoResponse = z.infer<typeof analyzeVideoResponseSchema>;
