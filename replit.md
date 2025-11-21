# Loom to Ticket - AI-Powered Bug Ticket Generator

## Overview

Loom to Ticket is a web application that transforms Loom video transcripts into structured bug tickets using AI. Users submit a Loom video URL, and the application automatically extracts the video transcript, analyzes it with Google's Gemini AI, and generates a comprehensive bug ticket with title, description, steps to reproduce, expected/actual behavior, and severity level.

The application focuses on developer productivity by converting informal video bug reports into formal, structured documentation that can be immediately used in issue tracking systems.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- RESTful endpoint: `POST /api/analyze-video`
- Request validation using Zod schemas shared between client and server
- Error handling with descriptive messages

**Core Services**:

1. **Loom Integration** (`loom.ts`, `loom-scraper.ts`):
   - Validates Loom URLs
   - Fetches video metadata via Loom oEmbed API
   - Extracts transcripts by scraping video page HTML
   - Parses JSON-embedded transcript data from page source

2. **AI Analysis** (`gemini.ts`):
   - Uses Google Gemini 2.5 Flash model via Replit AI Integrations service
   - Structured output generation using type schemas
   - Analyzes transcript to extract bug details systematically
   - Generates title, description, reproduction steps, behaviors, and severity

3. **Storage** (`storage.ts`):
   - Memory-based storage implementation (placeholder for future database)
   - Interface-based design allows easy swapping to persistent storage
   - Currently includes user management scaffolding

### Data Flow

1. User submits Loom URL (with optional manual transcript)
2. Backend validates URL format and Loom domain
3. System attempts automatic transcript extraction via HTML scraping
4. If extraction fails and no manual transcript provided, returns error
5. Gemini AI analyzes transcript with structured prompt
6. AI returns typed `Ticket` object with all required fields
7. Frontend displays formatted ticket with copy functionality

### Type Safety & Validation

**Shared Schema** (`shared/schema.ts`):
- Zod schemas define contracts between client and server
- `loomUrlSchema`: Validates input with URL format and Loom domain check
- `ticketSchema`: Defines bug ticket structure with optional fields
- `analyzeVideoResponseSchema`: Validates API response structure
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

1. **Google Gemini AI** (via Replit AI Integrations):
   - Model: `gemini-2.5-flash`
   - Purpose: Natural language processing and structured data extraction
   - Authentication: Environment variable `AI_INTEGRATIONS_GEMINI_API_KEY`
   - Base URL: `AI_INTEGRATIONS_GEMINI_BASE_URL`

2. **Loom API**:
   - oEmbed endpoint for video metadata (title, duration, thumbnail)
   - Public API, no authentication required
   - HTML scraping as fallback for transcript extraction

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

- `AI_INTEGRATIONS_GEMINI_API_KEY`: Gemini API authentication
- `AI_INTEGRATIONS_GEMINI_BASE_URL`: Gemini service endpoint
- `DATABASE_URL`: PostgreSQL connection string (optional, not currently used)
- `NODE_ENV`: Environment flag (`development` or `production`)