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

export const timestampedTicketSchema = ticketSchema.extend({
  timestampSeconds: z.number(),
  timestampDisplay: z.string(),
  loomUrlWithTimestamp: z.string().optional(),
});

export type TimestampedTicket = z.infer<typeof timestampedTicketSchema>;

export const analyzeVideoResponseSchema = z.object({
  ticket: ticketSchema,
  videoTitle: z.string().optional(),
  videoDuration: z.string().optional(),
  analysisMethod: z.enum(['video', 'transcript', 'unknown']).optional(),
  modelUsed: z.string().optional(),
});

export type AnalyzeVideoResponse = z.infer<typeof analyzeVideoResponseSchema>;

export const analyzeSessionResponseSchema = z.object({
  tickets: z.array(timestampedTicketSchema),
  videoTitle: z.string().optional(),
  videoDuration: z.string().optional(),
  analysisMethod: z.enum(['video', 'transcript', 'combined']).optional(),
  totalIssuesFound: z.number(),
  modelUsed: z.string().optional(),
});

export type AnalyzeSessionResponse = z.infer<typeof analyzeSessionResponseSchema>;
