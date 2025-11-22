# Loom to Ticket - AI-Powered Bug Ticket Generator

## Documentation Index

This file contains technical architecture details for AI context. For other documentation, see:

- **[README.md](README.md)**: Project overview, features, usage guide, and specifications
- **[DEVELOPMENT.md](DEVELOPMENT.md)**: Developer guide with setup, architecture deep-dive, implementation stages, testing, and troubleshooting
- **[design_guidelines.md](design_guidelines.md)**: UI/UX design specifications and component guidelines

## Overview

Loom to Ticket is a web application that transforms Loom video recordings into structured bug tickets using AI vision analysis. Users submit a Loom video URL, and the application automatically downloads the video (up to 250MB), uploads it to Google's Gemini Files API, and analyzes the actual video content using Gemini 2.5 Flash with vision capabilities. The AI generates a comprehensive bug ticket with title, description, steps to reproduce, expected/actual behavior, environment details, and severity level based on what it observes in the video.

The application focuses on developer productivity by converting informal video bug reports into formal, structured documentation that can be immediately used in issue tracking systems. Unlike transcript-only analysis, video analysis captures visual information like UI interactions, error messages, mouse movements, and environment details that text alone cannot convey.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Improvements (November 2025)

**Session Analysis UX Enhancements**:

1. **Progress Tracking** ✅:
   - Real-time progress messages during analysis (30-60 second operations)
   - Staged updates: "Fetching video metadata..." → "Downloading video..." → "Uploading to AI..." → "AI is analyzing..." → "Extracting tickets..."
   - Spinner icons for visual feedback
   - Provides transparency during long-running video analysis

2. **Error Display** ✅:
   - Prominent red Alert component displays when analysis fails
   - Shows "Analysis Failed" header with detailed error message
   - Error state tracked separately from results
   - More visible than toast-only notifications

3. **Model Transparency** ✅:
   - Badge displays which AI model was used for analysis
   - Format: Sparkles icon + model name (e.g., "gemini-2.5-flash")
   - Located in results header alongside video metadata
   - Helps users understand which model analyzed their video

4. **Simplified Model Selection**:
   - Application uses gemini-2.5-flash (the best and only available model in Gemini v1beta API)
   - Model selection dropdown removed after discovering only one model is available
   - Cleaner, simpler UI without unnecessary options
   - Backend always uses the best available model

## System Architecture

### Frontend Architecture

**Technology Stack**: React with TypeScript, Vite build tool, Wouter for routing

**UI Framework**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling

**Design System**: 
- Linear-inspired aesthetic focusing on clarity and minimal distraction
- Typography: Inter for UI elements, JetBrains Mono for code/technical content
- Single-column, centered layout optimized for content readability
- Responsive design with mobile-first approach

**State Management**: 
- TanStack React Query for server state and API calls
- React Hook Form with Zod validation for form handling
- Local component state for UI interactions

**Key Components**:
- Form input for Loom URL and optional transcript
- Generated ticket display with card-based layout
- Copy-to-clipboard functionality
- Loading states with progress indicators
- Toast notifications for user feedback

### Backend Architecture

**Runtime**: Node.js with Express.js framework

**Development Strategy**: 
- Separate dev and production entry points (`index-dev.ts` and `index-prod.ts`)
- Development mode integrates Vite middleware for HMR
- Production mode serves pre-built static assets

**API Structure**:
- RESTful endpoints: `POST /api/analyze-video` (single-ticket), `POST /api/analyze-session` (multi-ticket)
- Request validation using Zod schemas shared between client and server
- Error handling with descriptive messages

**Core Services**:

1. **Loom Integration** (`loom.ts`, `loom-scraper.ts`, `loom-video-downloader.ts`):
   - Validates Loom URLs and fetches video metadata via Loom oEmbed API
   - Downloads actual video files using `yt-dlp` (supports up to 250MB)
   - Handles HLS streams, authentication, and format selection automatically
   - Extracts transcripts by scraping video page HTML as fallback
   - Enforces size limits and cleans up temporary files after processing

2. **AI Analysis** (`gemini.ts`, `session-analyzer.ts`):
   - Uses Google Gemini 2.5 Flash model with **vision capabilities** via Gemini Files API
   - Uploads video files to Gemini Files API and waits for processing
   - Analyzes **actual video content** (visual UI, interactions, errors) not just text transcripts
   - Structured output generation using type schemas for consistent ticket format
   - Generates title, description, reproduction steps, expected/actual behavior, environment, and severity
   - **Session Analysis**: Extracts multiple timestamped tickets from longer videos (up to 500MB)
   - Generates Loom URLs with timestamp jump parameters (e.g., `?t=14s`)
   - Properly cleans up uploaded videos from Gemini storage after analysis
   - Falls back to transcript-only analysis if video download/upload fails

3. **Storage** (`storage.ts`):
   - Memory-based storage implementation (placeholder for future database)
   - Interface-based design allows easy swapping to persistent storage
   - Currently includes user management scaffolding

### Data Flow

**Primary Flow (Video Analysis)**:
1. User submits Loom URL (with optional manual transcript)
2. Backend validates URL format and Loom domain
3. System downloads video file using yt-dlp to temporary storage (max 250MB)
4. Video uploaded to Gemini Files API and polls until processing complete
5. Gemini AI with vision analyzes actual video content using structured prompt
6. AI returns typed `Ticket` object with all required fields based on visual observation
7. System cleans up uploaded video from Gemini storage
8. System deletes temporary video file from disk
9. Frontend displays formatted ticket with `analysisMethod: "video"` indicator

**Fallback Flow (Transcript-Only)**:
1. If video download fails (private, oversized, unavailable), system attempts transcript extraction
2. Scrapes video page HTML to extract transcript data
3. If transcript available, Gemini analyzes text-only
4. Frontend displays ticket with `analysisMethod: "transcript"` indicator
5. If both video and transcript fail, returns error to user

### Type Safety & Validation

**Shared Schema** (`shared/schema.ts`):
- Zod schemas define contracts between client and server
- `loomUrlSchema`: Validates input with URL format and Loom domain check
- `ticketSchema`: Defines bug ticket structure with optional fields
- `timestampedTicketSchema`: Extends ticket with timestamp fields and Loom jump URLs
- `analyzeVideoResponseSchema`: Validates single-ticket API response structure
- `analyzeSessionResponseSchema`: Validates multi-ticket session API response structure
- Type inference ensures compile-time safety across codebase

### Configuration & Build

**TypeScript Configuration**:
- Strict mode enabled for maximum type safety
- Path aliases: `@/` for client code, `@shared/` for shared schemas
- ESNext module system with bundler resolution

**Build Pipeline**:
- Vite for client bundling with React plugin
- esbuild for server bundling (production)
- Development mode uses tsx for TypeScript execution
- Output: `dist/public` for frontend, `dist/index.js` for backend

**Styling**:
- Tailwind CSS with custom design tokens
- CSS variables for theming support
- PostCSS for autoprefixing
- shadcn/ui component library with "new-york" style preset

## External Dependencies

### Third-Party Services

1. **Google Gemini AI** (Full API with Files API):
   - Model: `gemini-2.5-flash` with vision capabilities
   - Purpose: **Multimodal video analysis** for visual bug detection and structured data extraction
   - Files API: Uploads videos (up to 2GB supported, 250MB enforced), polls for ACTIVE state
   - Video retention: 48 hours on Gemini servers (up to 20GB total storage)
   - Authentication: Direct API key via `GEMINI_API_KEY` environment variable
   - Base URL: `https://generativelanguage.googleapis.com/v1beta/`
   - Cleanup: Automatically deletes uploaded videos after analysis to prevent quota exhaustion

2. **Loom API & Video Download**:
   - oEmbed endpoint for video metadata (title, duration, thumbnail)
   - yt-dlp: Downloads actual MP4 video files from Loom CDN
   - Supports HLS streams, automatic quality selection, and authentication handling
   - Public API, no authentication required for public videos
   - HTML scraping as fallback for transcript-only analysis

### Database

**Configured for PostgreSQL** (via Drizzle ORM):
- Connection: Neon serverless PostgreSQL driver
- Schema location: `shared/schema.ts`
- Migrations: `./migrations` directory
- Environment variable: `DATABASE_URL`

**Current Status**: Database is configured but not actively used. Storage layer uses in-memory implementation. The schema scaffolding exists for future persistence of tickets, users, or analytics.

### Key NPM Packages

**UI & Components**:
- `@radix-ui/*`: Accessible component primitives (20+ packages)
- `tailwindcss`: Utility-first CSS framework
- `class-variance-authority`: Component variant management
- `lucide-react`: Icon library

**State & Data**:
- `@tanstack/react-query`: Server state management
- `react-hook-form`: Form state and validation
- `zod`: Schema validation and type inference

**HTTP & Scraping**:
- `axios`: HTTP client for external API calls
- `cheerio`: HTML parsing (available but not actively used)

**Development Tools**:
- `vite`: Build tool and dev server
- `tsx`: TypeScript execution for development
- `drizzle-kit`: Database schema management

### Environment Variables Required

- `GEMINI_API_KEY`: Google Gemini API key for video analysis and Files API access (stored in Replit Secrets)
- `DATABASE_URL`: PostgreSQL connection string (optional, not currently used)
- `NODE_ENV`: Environment flag (`development` or `production`)

**Note**: The application previously used Replit AI Integrations (`AI_INTEGRATIONS_GEMINI_API_KEY`) but now uses the full Gemini API with Files API support for video upload and multimodal analysis.