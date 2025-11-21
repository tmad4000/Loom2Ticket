# Design Guidelines: Loom to Ticket

## Design Approach
**System**: Linear-inspired productivity tool aesthetic
**Rationale**: Developer-focused utility tool requiring efficiency, clarity, and minimal distraction. Drawing from Linear's clean typography, generous spacing, and focus on content over decoration.

## Typography System
**Font Family**: 
- Primary: Inter (Google Fonts) - for UI elements, labels, body text
- Monospace: JetBrains Mono (Google Fonts) - for generated ticket content, code snippets, technical details

**Type Scale**:
- Page Title: text-3xl font-semibold
- Section Headers: text-xl font-semibold  
- Form Labels: text-sm font-medium
- Body Text: text-base
- Generated Ticket Content: text-sm font-mono
- Helper Text: text-xs text-muted

## Layout System
**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16
- Micro spacing (form elements): p-2, gap-2
- Component spacing: p-4, gap-4, mb-6
- Section spacing: p-8, gap-8, mb-12
- Page margins: p-12, container max-w-4xl

**Grid Structure**:
- Single column layout centered on page
- Form container: max-w-2xl
- Ticket display: max-w-3xl for optimal reading width

## Component Library

### Primary Form Section
- URL input field with full-width design
- Clear label "Loom Video URL" with helper text below
- Validation feedback inline
- Primary action button "Analyze Video & Generate Ticket" - prominent, full-width on mobile, inline on desktop
- Loading state with spinner and progress text

### Generated Ticket Display
**Structure** (appears after analysis):
- Card-based layout with subtle border
- Section divisions for:
  - Ticket Title (large, bold, editable state indication)
  - Priority/Severity tags (inline badges)
  - Description (formatted prose)
  - Steps to Reproduce (numbered list with monospace formatting)
  - Expected Behavior (distinct section)
  - Actual Behavior (distinct section)
  - Environment Details (if detected: browser, OS, etc.)
  
**Actions Bar**:
- Copy to Clipboard button (primary action)
- Edit button
- Export options (secondary actions)

### Status & Feedback Components
- Processing overlay during video analysis
- Progress indicator showing analysis stages
- Success/error toast notifications
- Empty state when no ticket generated yet

### Navigation
- Minimal header with app logo/name "Loom to Ticket"
- Optional secondary actions (History, Settings) right-aligned
- No complex navigation needed - single-purpose tool

## Icons
**Library**: Heroicons (outline style for consistency)
- Video/play icon for Loom input
- Clipboard icon for copy action
- Check/X icons for validation
- Loading spinner

## Layout Specifications

**Main Container**:
- Centered layout with max-w-4xl
- Vertical flow: Header → Form → Results
- Background: subtle gradient or solid neutral

**Form Section**:
- Generous padding (p-8)
- Clear visual hierarchy
- Input fields with ample click/touch targets (h-12 minimum)

**Results Section**:
- Appears below form with smooth transition
- Sticky action bar when scrolling long tickets
- Clear visual separation between ticket sections using borders/spacing

## Interaction Patterns
- No distracting animations
- Instant feedback on form validation
- Smooth content reveal for generated ticket (fade-in)
- Copy confirmation (subtle toast, 2s duration)
- Focus management for accessibility

## Responsive Behavior
- Desktop (lg): Side-by-side action buttons, wider containers
- Tablet (md): Stacked layout, full-width buttons
- Mobile: Single column, touch-friendly targets (minimum 44px height)

## Images
**No hero image required** - this is a utility tool, not a marketing page. Focus on functional clarity over visual impact.