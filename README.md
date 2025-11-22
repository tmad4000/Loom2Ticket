# Loom to Ticket

Transform Loom video recordings into structured bug tickets using AI-powered video analysis.

## Overview

**Loom to Ticket** is an AI-powered web application that converts informal Loom screen recordings into formal, structured bug tickets. Instead of manually transcribing issues from videos, developers can submit a Loom URL and receive professionally formatted bug reports ready for immediate use in issue tracking systems.

### Key Innovation

Unlike transcript-only analysis tools, Loom to Ticket uses **Google Gemini's vision AI** to analyze the actual video content, capturing visual information such as:
- UI interactions and mouse movements
- Error messages and console outputs
- Visual glitches and layout issues
- Environment details visible on screen
- Context that text alone cannot convey

## Features

### 1. Single-Ticket Mode
**Purpose**: Quick analysis of short bug demonstration videos

- **Route**: `/` (Homepage)
- **Use Case**: Individual bug reports, quick issues, focused demonstrations
- **Video Limit**: Up to 250MB
- **Output**: One comprehensive bug ticket with:
  - Descriptive title
  - Detailed description
  - Steps to reproduce
  - Expected vs. actual behavior
  - Environment details
  - Severity assessment (low, medium, high, critical)

**Best For**:
- Quick bug reports (under 2 minutes)
- Single-issue demonstrations
- Focused problem reproduction

### 2. Session Analysis Mode
**Purpose**: Extract multiple timestamped bug tickets from longer recordings

- **Route**: `/session`
- **Use Case**: QA testing sessions, bug bashes, exploratory testing
- **Video Limit**: Up to 500MB (approximately 1 hour)
- **Output**: Multiple timestamped tickets, each with:
  - All standard ticket fields
  - Precise timestamp (seconds + display format)
  - Direct Loom jump link (e.g., `?t=14s`)
  - Individual copy functionality

**Best For**:
- Testing sessions with multiple issues
- Comprehensive bug hunts
- QA walkthroughs
- User testing recordings

## Development Stages

### Stage 1: Core Single-Ticket Analysis ✅
**Status**: Complete

**Implemented**:
- Loom URL validation and metadata fetching
- Video download using yt-dlp (handles HLS streams, authentication)
- Gemini Files API integration for video upload
- AI-powered video analysis using Gemini 2.5 Flash with vision
- Structured ticket generation with type-safe schemas
- Transcript extraction as fallback
- Automatic cleanup of temporary files and uploaded videos
- React frontend with form validation
- Copy-to-clipboard functionality

**Technical Highlights**:
- Direct video file download (not just metadata)
- Gemini Files API polling for processing state
- Graceful degradation to transcript-only when video unavailable
- Proper cleanup to prevent quota exhaustion

### Stage 2: Multi-Ticket Session Analysis ✅
**Status**: Complete

**Implemented**:
- Session analysis backend service (`session-analyzer.ts`)
- Increased video size limit to 500MB for longer sessions
- Multi-ticket extraction with timestamp identification
- Automatic Loom URL generation with jump parameters
- Session analysis UI page (`/session`)
- Timestamped ticket display with visual hierarchy
- Direct jump links to specific moments in videos
- Navigation between single-ticket and session modes
- Empty state handling for sessions without bugs

**Technical Highlights**:
- Prompts optimized for identifying multiple distinct issues
- Timestamp extraction from both video and transcript
- Format: `https://www.loom.com/share/{id}?t={seconds}s`
- Bidirectional mode switching
- Consistent UI patterns across both modes

## Technical Specifications

### Architecture

**Frontend**:
- React with TypeScript
- Vite build tool
- Wouter for routing
- TanStack React Query for state management
- shadcn/ui component library with Radix UI
- Tailwind CSS styling

**Backend**:
- Node.js with Express.js
- TypeScript throughout
- Zod for schema validation and type safety
- Shared types between client and server

**External Services**:
- **Loom API**: oEmbed endpoint for metadata
- **yt-dlp**: Video file downloads (handles authentication, HLS)
- **Google Gemini 2.5 Flash**: Multimodal AI with vision capabilities
- **Gemini Files API**: Video upload and processing (2GB max, 48-hour retention)

### API Endpoints

#### `POST /api/analyze-video`
**Single-ticket analysis**

**Request**:
```json
{
  "url": "https://www.loom.com/share/{video_id}",
  "transcript": "optional manual transcript"
}
```

**Response**:
```json
{
  "ticket": {
    "title": "Bug title",
    "description": "Detailed description",
    "stepsToReproduce": ["Step 1", "Step 2"],
    "expectedBehavior": "What should happen",
    "actualBehavior": "What actually happens",
    "environment": "Browser, OS, etc.",
    "severity": "medium"
  },
  "videoTitle": "Loom video title",
  "videoDuration": "1:23.456",
  "analysisMethod": "video" | "transcript"
}
```

#### `POST /api/analyze-session`
**Multi-ticket session analysis**

**Request**:
```json
{
  "url": "https://www.loom.com/share/{video_id}",
  "transcript": "optional manual transcript"
}
```

**Response**:
```json
{
  "tickets": [
    {
      "title": "First bug",
      "description": "...",
      "stepsToReproduce": ["..."],
      "expectedBehavior": "...",
      "actualBehavior": "...",
      "environment": "...",
      "severity": "medium",
      "timestampSeconds": 14,
      "timestampDisplay": "0:14",
      "loomUrlWithTimestamp": "https://www.loom.com/share/{id}?t=14s"
    }
  ],
  "videoTitle": "Session video title",
  "videoDuration": "15:23.456",
  "analysisMethod": "video" | "transcript",
  "totalIssuesFound": 1
}
```

### Data Flow

**Primary Flow (Video Analysis)**:
1. User submits Loom URL
2. Backend validates URL format and domain
3. System downloads video file to temporary storage
4. Video uploaded to Gemini Files API
5. Poll until video processing complete (state: ACTIVE)
6. Gemini AI analyzes video content using structured prompt
7. AI returns typed ticket object(s) based on visual observations
8. System deletes uploaded video from Gemini storage
9. System removes temporary local file
10. Frontend displays formatted ticket(s) with appropriate indicators

**Fallback Flow (Transcript-Only)**:
1. If video download/upload fails (private, oversized, unavailable)
2. System attempts HTML scraping to extract transcript
3. If transcript available, Gemini analyzes text-only
4. Frontend shows ticket(s) with "transcript" analysis method
5. If both fail, error returned to user

## Environment Variables

Required secrets (stored in Replit Secrets):
- `GEMINI_API_KEY` or `GOOGLE_API_KEY`: Google Gemini API authentication

Optional:
- `DATABASE_URL`: PostgreSQL connection (configured but not actively used)
- `NODE_ENV`: Environment flag (`development` or `production`)

## Usage

### Running the Application

The application is configured to run automatically on Replit:

```bash
npm run dev
```

This starts:
- Express backend server on port 5000
- Vite development server with HMR
- Single-port setup (backend and frontend served together)

### Using Single-Ticket Mode

1. Navigate to the homepage (`/`)
2. Paste a Loom video URL
3. (Optional) Add transcript for better timestamp accuracy
4. Click "Analyze Video"
5. Wait 15-30 seconds for analysis
6. Review generated ticket
7. Click "Copy Ticket" to copy formatted markdown

### Using Session Analysis Mode

1. Click "Session Analysis" from homepage
2. Navigate to `/session`
3. Paste a Loom session URL (can be longer video)
4. (Optional) Add transcript
5. Click "Analyze Session"
6. Wait 30-60 seconds for longer videos
7. Review list of timestamped tickets
8. Click "Jump to this moment" to view specific issue in Loom
9. Copy individual tickets as needed

## AI Behavior

**Important**: Gemini's analysis is **non-deterministic**, meaning:
- The same video analyzed twice may yield different results
- AI may find 0 to N issues depending on what it focuses on
- This is expected behavior, not a bug
- AI might identify different aspects of the same video each time

**Recommendations**:
- For critical sessions, consider running analysis multiple times
- Manually verify timestamp accuracy
- Treat AI output as a starting point for formal documentation

## File Size Limits

- **Single-Ticket Mode**: 250MB maximum
- **Session Analysis Mode**: 500MB maximum
- **Gemini Storage**: Files retained for 48 hours, 20GB total quota
- **Automatic Cleanup**: Videos deleted immediately after analysis

## Technical Notes

### Why Video Analysis Matters

Analyzing actual video content (not just transcripts) captures:
- **Visual bugs**: UI glitches, layout issues, visual inconsistencies
- **Error messages**: Console outputs, modal dialogs, toast notifications
- **User interactions**: Mouse movements, click sequences, navigation patterns
- **Environmental context**: Browser dev tools, operating system, screen resolution
- **Timing issues**: Race conditions, loading states, animations

### Cleanup Strategy

To prevent quota exhaustion:
1. Videos uploaded to Gemini Files API
2. After analysis completes, files explicitly deleted via API
3. Temporary local files removed from `/tmp`
4. Cleanup happens even on errors (try/finally blocks)

### Model Selection

Currently using **Gemini 2.5 Flash**:
- Better quota limits than experimental models
- Supports vision (video analysis)
- Structured output with JSON schemas
- Fast processing times
- Reliable for production use

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── pages/
│   │   │   ├── home.tsx   # Single-ticket mode
│   │   │   └── session.tsx # Session analysis mode
│   │   ├── components/ui/  # shadcn components
│   │   └── App.tsx        # Routing and layout
├── server/                # Backend Express application
│   ├── gemini.ts          # Single-ticket AI analysis
│   ├── session-analyzer.ts # Multi-ticket extraction
│   ├── loom.ts            # Loom API integration
│   ├── loom-scraper.ts    # Transcript extraction
│   ├── loom-video-downloader.ts # Video download via yt-dlp
│   ├── routes.ts          # API endpoints
│   └── storage.ts         # Storage interface (currently in-memory)
├── shared/
│   └── schema.ts          # Shared Zod schemas and types
├── replit.md             # Technical architecture documentation
├── design_guidelines.md  # UI/UX design specifications
└── README.md            # This file
```

## Future Enhancements

**Potential Features**:
- Database persistence for ticket history
- User authentication and saved sessions
- Batch processing of multiple videos
- Custom ticket templates
- Integration with Jira, Linear, GitHub Issues
- Downloadable PDF/Markdown reports
- Team collaboration features
- Analytics dashboard

## License

This project is built on Replit and uses various open-source technologies.

## Support

For issues or questions:
1. Check this documentation first
2. Review `replit.md` for technical architecture details
3. Examine browser console and server logs for errors
4. Contact development team

---

**Built with**: React, TypeScript, Express, Google Gemini AI, Loom API, shadcn/ui, Tailwind CSS
