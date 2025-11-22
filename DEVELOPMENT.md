# Development Guide

This document provides detailed information for developers working on the Loom to Ticket application.

## Table of Contents

1. [Development Setup](#development-setup)
2. [Architecture Deep Dive](#architecture-deep-dive)
3. [Feature Implementation Stages](#feature-implementation-stages)
4. [Code Conventions](#code-conventions)
5. [Testing Strategy](#testing-strategy)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)

## Development Setup

### Prerequisites

- Replit account (application is designed for Replit environment)
- Google Gemini API key
- Node.js 20+ (handled by Replit)

### Environment Configuration

1. **Required Secrets** (add via Replit Secrets):
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
   OR
   ```
   GOOGLE_API_KEY=your_api_key_here
   ```

2. **Optional Configuration**:
   ```
   DATABASE_URL=postgresql://... (for future database features)
   NODE_ENV=development
   ```

### Running Locally

```bash
# Install dependencies (automatically handled by Replit)
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5000` (or your Replit workspace URL).

## Architecture Deep Dive

### Frontend Architecture

**Technology Stack**:
- **React 18**: Component-based UI
- **TypeScript**: Type safety throughout
- **Vite**: Fast development and optimized builds
- **Wouter**: Lightweight routing (no React Router needed)
- **TanStack Query v5**: Server state management
- **shadcn/ui**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling

**Key Patterns**:
- Shared Zod schemas between client/server for type safety
- React Hook Form with Zod validation
- Optimistic updates with query invalidation
- Skeleton states during loading
- Toast notifications for user feedback

**File Organization**:
```
client/src/
├── pages/           # Route components
│   ├── home.tsx    # Single-ticket mode (/)
│   └── session.tsx # Session analysis (/session)
├── components/ui/  # shadcn components (don't modify)
├── lib/
│   └── queryClient.ts # TanStack Query configuration
└── App.tsx         # Root component with routing
```

### Backend Architecture

**Technology Stack**:
- **Express.js**: RESTful API server
- **TypeScript**: Compiled with tsx/esbuild
- **Zod**: Runtime validation
- **Drizzle ORM**: Database abstraction (configured but unused)

**Services**:

1. **Loom Integration** (`server/loom.ts`, `server/loom-scraper.ts`, `server/loom-video-downloader.ts`):
   - oEmbed API for metadata
   - HTML scraping for transcript fallback
   - yt-dlp wrapper for video downloads
   - Handles authentication, HLS streams, format selection

2. **AI Analysis** (`server/gemini.ts`):
   - Single-ticket extraction
   - Structured output using Gemini's schema feature
   - Video upload to Files API
   - Polling for processing completion
   - Automatic cleanup

3. **Session Analysis** (`server/session-analyzer.ts`):
   - Multi-ticket extraction
   - Timestamp identification
   - Loom URL generation with jump parameters
   - Fallback to transcript-only analysis

**File Organization**:
```
server/
├── index-dev.ts          # Development entry point (Vite middleware)
├── index-prod.ts         # Production entry point (static assets)
├── routes.ts             # API endpoints
├── gemini.ts             # Single-ticket AI service
├── session-analyzer.ts   # Multi-ticket AI service
├── loom.ts               # Loom API client
├── loom-scraper.ts       # Transcript extraction
├── loom-video-downloader.ts # Video download
└── storage.ts            # Storage interface (in-memory)
```

### Shared Code

**Schema Definitions** (`shared/schema.ts`):
- All Zod schemas for validation
- Type inference for TypeScript
- Single source of truth for data shapes
- Used by both frontend forms and backend validation

## Feature Implementation Stages

### Stage 1: Single-Ticket Analysis (Complete)

**Timeline**: Initial implementation

**Features**:
- Basic Loom URL validation
- Video metadata fetching via oEmbed API
- Video file download using yt-dlp
- Gemini Files API integration
- AI-powered video analysis with vision
- Structured ticket generation
- Transcript extraction fallback
- Frontend form with validation
- Copy-to-clipboard functionality
- Error handling and loading states

**Technical Decisions**:
- Chose yt-dlp over direct API for better Loom compatibility
- Implemented Files API polling instead of webhooks (simpler)
- Used structured output to guarantee JSON format
- Added cleanup to prevent quota exhaustion

**Challenges Solved**:
- Loom video download authentication
- HLS stream handling
- Gemini Files API polling strategy
- Proper file cleanup on errors
- Fallback when video unavailable

### Stage 2: Multi-Ticket Session Analysis (Complete)

**Timeline**: Follow-up implementation

**Features**:
- New `/session` route and UI
- Increased video size limit (500MB)
- Multi-ticket extraction from single video
- Timestamp identification (seconds + display format)
- Loom URL generation with jump parameters (`?t=Xs`)
- Session analysis service
- Timestamped ticket display
- "Jump to this moment" links
- Individual ticket copy functionality
- Empty state for sessions without bugs

**Technical Decisions**:
- Separate endpoint instead of extending existing one (clearer separation)
- Prompt engineering for multi-ticket extraction
- URL format: `{baseUrl}?t={seconds}s` (Loom's standard)
- Reused AI infrastructure from single-ticket mode
- Same cleanup patterns applied

**Challenges Solved**:
- Prompting AI to identify distinct issues
- Timestamp extraction from both video and transcript
- URL parameter generation
- UI for displaying multiple tickets with timestamps
- Navigation between modes

### Future Stages (Planned)

**Stage 3: Persistence & History** (Not Implemented):
- Database integration for ticket storage
- User session tracking
- Historical analysis retrieval
- Search functionality

**Stage 4: Integrations** (Not Implemented):
- Jira integration
- Linear integration
- GitHub Issues export
- Slack notifications

**Stage 5: Advanced Features** (Not Implemented):
- Batch processing multiple videos
- Custom ticket templates
- Team collaboration
- Analytics dashboard

## Code Conventions

### TypeScript

**Strict Mode**: Enabled
- No implicit any
- Strict null checks
- No unused locals/parameters

**Type Patterns**:
```typescript
// Always infer types from Zod schemas
const ticketSchema = z.object({ /* ... */ });
type Ticket = z.infer<typeof ticketSchema>;

// Use satisfies for type checking without widening
const config = {
  maxSize: 250_000_000
} satisfies Config;
```

### React Components

**Conventions**:
- Functional components only
- TypeScript interfaces for props
- Use `data-testid` attributes for testing
- Prefer composition over prop drilling

**Example**:
```typescript
interface TicketCardProps {
  ticket: Ticket;
  onCopy: (text: string) => void;
}

export function TicketCard({ ticket, onCopy }: TicketCardProps) {
  return (
    <Card data-testid={`ticket-card-${ticket.title}`}>
      {/* ... */}
    </Card>
  );
}
```

### API Routes

**Conventions**:
- Validate all inputs with Zod
- Return typed responses
- Handle errors gracefully
- Always clean up resources

**Example**:
```typescript
app.post("/api/analyze-video", async (req, res) => {
  try {
    // Validate input
    const { url, transcript } = loomUrlSchema.parse(req.body);
    
    // Process
    const result = await analyzeVideo(url, transcript);
    
    // Return typed response
    res.json(analyzeVideoResponseSchema.parse(result));
  } catch (error) {
    // Handle errors
    res.status(400).json({ error: error.message });
  }
});
```

### Error Handling

**Patterns**:
```typescript
// Always use try/finally for cleanup
let tempFile: string | null = null;
try {
  tempFile = await downloadVideo(url);
  const result = await processVideo(tempFile);
  return result;
} finally {
  if (tempFile) {
    await fs.unlink(tempFile);
  }
}
```

## Testing Strategy

### Manual Testing Checklist

**Single-Ticket Mode**:
- [ ] Valid Loom URL submits successfully
- [ ] Invalid URL shows error
- [ ] Loading state displays during analysis
- [ ] Ticket fields populated correctly
- [ ] Copy button works
- [ ] Analysis method badge shows correct value
- [ ] Navigation to session mode works

**Session Analysis Mode**:
- [ ] Valid Loom URL submits successfully
- [ ] Loading state shows progress message
- [ ] Multiple tickets display with timestamps
- [ ] Jump links have correct format
- [ ] Each ticket has copy button
- [ ] Empty state shows when no bugs found
- [ ] Navigation back to single-ticket works

### Automated Testing

**E2E Testing** (using Playwright via `run_test` tool):
- Full user flow tests
- Browser interaction validation
- API integration tests
- Visual regression checks

**Example Test Coverage**:
- Homepage form submission
- Session analysis workflow
- Error state handling
- Navigation between modes
- Copy functionality

### Testing AI Responses

**Important Considerations**:
- Gemini responses are non-deterministic
- Same video may yield different results
- Tests should accommodate variability
- Focus on structure, not exact content

**Test Patterns**:
```typescript
// Bad: Expects exact content
expect(ticket.title).toBe("Specific bug title");

// Good: Validates structure
expect(ticket).toHaveProperty("title");
expect(typeof ticket.title).toBe("string");
expect(ticket.severity).toMatch(/^(low|medium|high|critical)$/);
```

## Deployment

### Replit Deployment (Publishing)

The application is designed to run on Replit:

1. Ensure all secrets are configured
2. Test in development mode
3. Click "Publish" in Replit
4. Application will be built and deployed automatically

**Build Process**:
- Frontend: Vite builds to `dist/public`
- Backend: esbuild compiles to `dist/index.js`
- Production mode serves static assets

### Environment-Specific Behavior

**Development**:
- Vite middleware for HMR
- Source maps enabled
- Detailed error messages

**Production**:
- Pre-built static assets
- Minified JavaScript
- Error tracking (if configured)

## Troubleshooting

### Common Issues

**1. Video Download Fails**
```
Error: Could not download video from Loom
```
**Solutions**:
- Verify video is public (not private)
- Check video size < limit (250MB or 500MB)
- Ensure yt-dlp is installed (Replit handles this)
- Try with transcript-only mode

**2. Gemini API Quota Exceeded**
```
Error: 429 - Quota exceeded
```
**Solutions**:
- Wait for quota reset (usually 60 seconds)
- Check API usage at https://ai.dev/usage
- Verify using correct model (gemini-2.5-flash)
- Ensure cleanup is working (prevents accumulation)

**3. Files API Upload Fails**
```
Error: File upload failed
```
**Solutions**:
- Check video file size
- Verify API key is valid
- Ensure proper cleanup of old files
- Check Gemini storage quota (20GB limit)

**4. Transcript Extraction Fails**
```
Could not extract transcript
```
**Solutions**:
- This is normal for some videos
- System will fall back to video-only analysis
- User can manually paste transcript

**5. Empty Ticket Results**
```
Analysis returned no issues
```
**Solutions**:
- This is normal AI behavior (non-deterministic)
- Try running analysis again
- Video may genuinely not show bugs
- Check if video content is clear

### Debugging Tips

**Enable Verbose Logging**:
```typescript
// In server files, add console logs
console.log("Video download started:", videoId);
console.log("Gemini response:", JSON.stringify(result, null, 2));
```

**Check Workflow Logs**:
- View logs in Replit console
- Look for error messages
- Check file cleanup confirmations

**Inspect Network Requests**:
- Open browser DevTools
- Check Network tab for API calls
- Verify request/response payloads

**Test API Directly**:
```bash
# Test single-ticket endpoint
curl -X POST http://localhost:5000/api/analyze-video \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.loom.com/share/YOUR_VIDEO_ID"}'

# Test session endpoint
curl -X POST http://localhost:5000/api/analyze-session \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.loom.com/share/YOUR_VIDEO_ID"}'
```

## Contributing Guidelines

### Code Review Checklist

- [ ] TypeScript strict mode compliance
- [ ] All inputs validated with Zod
- [ ] Proper error handling
- [ ] Resource cleanup (files, API uploads)
- [ ] Loading states implemented
- [ ] Data-testid attributes added
- [ ] Documentation updated

### Git Workflow

**Branch Strategy**:
- `main`: Production-ready code
- Feature branches for new development

**Commit Messages**:
```
feat: Add session analysis mode
fix: Resolve video cleanup issue
docs: Update API documentation
refactor: Simplify Gemini integration
```

## Performance Considerations

### Optimization Strategies

**Frontend**:
- Code splitting by route (automatic with Vite)
- Lazy loading of heavy components
- Debounced form inputs
- Query caching with TanStack Query

**Backend**:
- Streaming responses for large payloads
- File cleanup to prevent disk bloat
- Connection pooling (when database used)
- Rate limiting on API endpoints

**AI Analysis**:
- Model selection (Flash vs Pro for speed/quality)
- Structured output reduces parsing overhead
- Parallel processing when possible
- Cleanup prevents quota exhaustion

## Security Considerations

### API Key Management

- **Never** commit API keys to repository
- Use Replit Secrets exclusively
- Rotate keys periodically
- Monitor usage for anomalies

### Input Validation

- All user inputs validated with Zod
- URL format verification
- File size limits enforced
- Sanitize video metadata before display

### File Handling

- Temporary files in `/tmp` (automatic cleanup)
- No persistent storage of user videos
- Immediate deletion after processing
- Proper error handling to prevent leaks

---

**Last Updated**: November 2025
**Maintainers**: Replit Agent Development Team
