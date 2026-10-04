# AI Comment Generation Feature — Cursor Implementation Prompt
## LeadPulse CA — Done Tab Enhancement

---

## CURSOR: READ THIS ENTIRE FILE BEFORE WRITING A SINGLE LINE OF CODE

You are implementing a **new end-to-end feature** on an existing project called **LeadPulse CA** — a Social Post Intelligence & Lead Generation System.

Before implementing anything:
1. **Scan the entire codebase** — understand how posts are fetched, stored, scored, and displayed
2. **Find and read** the existing `PostCard` component, the `FilterBar`, the `/api/posts` route, and the Prisma schema
3. **Understand the current Done/Skip flow** — how `status` is updated via PATCH, how the dashboard re-renders
4. **Only then** start implementing the feature described below

Do NOT assume any file structure. Read what is actually there first.

---

## WHAT THIS PROJECT CURRENTLY DOES (Context)

This system:
- Fetches social media posts from **Facebook, LinkedIn, Quora** using RapidAPI
- Scores each post **1–10 for purchase/relocation intent** using **Gemini AI** (not OpenAI — confirm this in the codebase)
- Shows posts in a **worker dashboard** with filters (platform, score, status)
- Workers can click **"Done"** → post moves to `status = DONE`
- Workers can click **"Skip"** → post moves to `status = SKIPPED`
- Each post card has a **"Visit Post"** button that opens the original URL in a new tab

The current flow **ends** when a worker clicks Done or Skip. The new feature **extends what happens after Done**.

---

## THE FEATURE TO BUILD

### Plain English Summary

When a worker marks a post as **Done**, they are saying:
> "This is a valid lead — I want to engage with this person."

Right now nothing happens after that. We want to:
1. Show all Done posts in a **"Done" tab**
2. Each Done post card should have a **"Generate AI Comment"** button
3. Clicking it calls **Gemini AI** with the post content and generates a **context-aware, helpful comment** that a real estate professional would leave on that post
4. The generated comment appears in an **editable text box** below the post
5. Below the text box: a **"Copy Comment"** button + a **"Go to Post →"** button
6. Worker copies the comment, clicks Go to Post, pastes it manually on the platform

That's it. Simple, clean, professional.

---

## DETAILED FEATURE SPECIFICATION

### 1. Done Tab / Filter

**Current behavior:**
- Dashboard likely has filter options: Pending, Done, Skipped (or similar)
- Find exactly how filtering works in the existing `FilterBar` component

**What to verify in codebase:**
- How does the `status` filter work in `/api/posts`?
- Is there already a "Done" tab or is it just a dropdown filter?
- If it's a dropdown — convert it to **tab-based navigation** (Pending | Done | Skipped) for clarity
- If tabs already exist — leave the structure and just enhance the Done tab cards

**Tab UI Requirements:**
```
[ Pending (234) ]  [ Done (47) ]  [ Skipped (12) ]
```
- Show count badge on each tab
- Active tab is highlighted
- Switching tabs fetches posts with that status from `/api/posts?status=DONE`

---

### 2. Done Post Card — Enhanced UI

Each post card in the Done tab should show everything the current card shows PLUS the new AI comment section.

**Card Layout (Done tab only):**
```
┌─────────────────────────────────────────────────────────┐
│  [Platform Icon]  [Score Badge: 8.2 HIGH]    [Date]     │
│                                                         │
│  Post text excerpt... (expandable)                      │
│                                                         │
│  [keyword pill] [keyword pill] [keyword pill]           │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [ ✨ Generate AI Comment ]    ← NEW BUTTON             │
│                                                         │
│  (After clicking Generate:)                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Great question! As someone familiar with the      │  │
│  │ [City] market, I'd recommend looking at...        │  │
│  │                                                   │  │
│  │ [editable textarea — user can modify]             │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  [ 📋 Copy Comment ]    [ 🔗 Go to Post → ]            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**States of the Generate button:**
- Default: `✨ Generate AI Comment` (blue/accent color)
- Loading: `⏳ Generating...` (disabled, spinner)
- Generated: `🔄 Regenerate` (secondary color — allows regeneration)

**The textarea:**
- Hidden by default — only appears AFTER generation
- Fully editable — worker can tweak the comment before copying
- Auto-resizes to fit content (no fixed height that cuts off text)
- Shows character count (some platforms have limits)

---

### 3. API Route — Generate AI Comment

**Create a new API route:**
```
POST /api/posts/:id/generate-comment
```

**Request body:** (nothing needed — post ID is enough, fetch post from DB)

**What this route does:**
1. Fetch the full post from DB using the `id` from params
2. Extract: `postText`, `platform`, `keywordMatched`, `matchedKeywords`, `intentScore`
3. Build a Gemini prompt (see Section 4 below)
4. Call Gemini API
5. Return the generated comment as JSON

**Response:**
```json
{
  "comment": "Great insight about the [City] market! As a real estate professional...",
  "generatedAt": "2026-05-06T10:30:00Z"
}
```

**Error handling:**
- If Gemini fails → return `{ error: "Failed to generate comment. Please try again." }`
- If post not found → return 404
- Add try/catch around every Gemini call

**Check the existing codebase** to see how Gemini is already initialized and called in this project. Use the EXACT SAME Gemini client setup that already exists — do not create a new one or use a different model.

---

### 4. The Gemini Prompt — THIS IS CRITICAL

The quality of the generated comment depends entirely on the prompt. Use this exact prompt structure:

```
You are a friendly, knowledgeable California real estate professional engaging with potential home buyers and movers on social media.

Your task: Write a helpful, genuine comment for the following social media post.

POST DETAILS:
- Platform: {platform}
- Post Content: {postText}
- Intent Keywords Detected: {matchedKeywords joined by comma}
- Intent Score: {intentScore}/10 (higher = stronger buying intent)

COMMENT REQUIREMENTS:
1. Sound like a real human, not a bot or salesperson
2. Directly address what the person is asking or saying in their post
3. Provide 1-2 genuinely useful pieces of information or advice
4. If appropriate, gently mention that you specialize in California real estate and can help
5. End with a soft call to action (e.g., "Feel free to DM me if you have questions!")
6. Keep it between 60–120 words — long enough to be helpful, short enough to read
7. Do NOT use emojis excessively — maximum 1-2 if they feel natural
8. Do NOT start with "Great post!" or "Wow!" — these sound fake
9. Match the tone of the platform:
   - Facebook/Reddit: conversational and warm
   - LinkedIn: slightly more professional but still human
   - Quora: informative and detailed, like an expert answer

IMPORTANT: Return ONLY the comment text. No explanation, no intro, no "Here is the comment:". Just the comment itself.
```

**Dynamic variables to inject:**
- `{platform}` → post.platform (FACEBOOK, LINKEDIN, QUORA, REDDIT)
- `{postText}` → post.postText (full text, not truncated)
- `{matchedKeywords}` → post.matchedKeywords joined with ", "
- `{intentScore}` → post.intentScore

---

### 5. Frontend Implementation Details

**Where to implement:**
- Find the existing post card component (likely `PostCard.tsx` or similar)
- Create a **separate component** for the AI comment section: `AICommentBox.tsx`
- Import and use `AICommentBox` inside the post card — but ONLY render it when `status === 'DONE'`

**AICommentBox component state:**
```typescript
const [status, setStatus]     = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
const [comment, setComment]   = useState<string>('')
const [copied, setCopied]     = useState<boolean>(false)
```

**Generate button click handler:**
```typescript
async function handleGenerate() {
  setStatus('loading')
  setComment('')
  try {
    const res  = await fetch(`/api/posts/${post.id}/generate-comment`, { method: 'POST' })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    setComment(data.comment)
    setStatus('done')
  } catch (err) {
    setStatus('error')
  }
}
```

**Copy button click handler:**
```typescript
async function handleCopy() {
  await navigator.clipboard.writeText(comment)
  setCopied(true)
  setTimeout(() => setCopied(false), 2500)  // reset after 2.5 seconds
}
```

**Copy button text:**
- Default: `📋 Copy Comment`
- After copy: `✅ Copied!` (for 2.5 seconds, then resets)

**"Go to Post" button:**
```typescript
// Simple anchor tag — do not use router.push for external URLs
<a href={post.sourceUrl} target="_blank" rel="noopener noreferrer">
  🔗 Go to Post →
</a>
```

---

### 6. Database — Optional Enhancement

**Optionally** (implement only if it does not complicate things) — store the generated comment in the DB so it persists across page refreshes.

If you choose to implement this:
- Add a field `generatedComment String? @db.Text` to the `Post` model in `prisma/schema.prisma`
- Run `npx prisma migrate dev --name add_generated_comment`
- After generating, PATCH the post with the comment: `PATCH /api/posts/:id` with `{ generatedComment: "..." }`
- On page load, if `post.generatedComment` exists → pre-fill the textarea and show it (skip the Generate step)

**If this feels complex — skip it for now.** The feature works fine without persistence. Workers can just regenerate if needed.

---

### 7. Styling Requirements

Use the **existing Tailwind classes and design system** already in the project. Do not introduce new UI libraries.

**Generate button:**
```
bg-blue-600 hover:bg-blue-700 text-white
disabled:opacity-50 disabled:cursor-not-allowed
```

**Loading state:**
- Show an inline spinner (CSS animation or a simple rotating border div)
- Disable the button while loading

**Textarea:**
```
w-full border border-gray-200 rounded-lg p-3 text-sm
text-gray-700 resize-none focus:outline-none
focus:ring-2 focus:ring-blue-300
min-h-[100px]
```

**Error state:**
```
text-red-500 text-sm mt-2
"Failed to generate comment. Please try again."
```

**Bottom action row:**
```
flex gap-3 mt-3 items-center
```

**Copy button:**
```
bg-gray-100 hover:bg-gray-200 text-gray-700
border border-gray-300 rounded-lg px-4 py-2 text-sm
```

**Go to Post button:**
```
bg-blue-600 hover:bg-blue-700 text-white
rounded-lg px-4 py-2 text-sm
```

---

### 8. Character Count Display

Different platforms have different comment length limits. Show a character count under the textarea:

```typescript
const PLATFORM_LIMITS: Record<string, number> = {
  FACEBOOK:  8000,
  LINKEDIN:  1250,
  QUORA:     0,     // no known limit
  REDDIT:    10000,
}

const limit = PLATFORM_LIMITS[post.platform] || 0
const count = comment.length
const isOverLimit = limit > 0 && count > limit
```

Display:
```
{count} characters{limit > 0 ? ` / ${limit} limit` : ''}
```
Color: red if `isOverLimit`, gray otherwise.

---

## FILES TO CREATE OR MODIFY

### New Files to Create:
```
src/components/AICommentBox.tsx        ← New component
src/app/api/posts/[id]/generate-comment/route.ts  ← New API route
```

### Files to Modify:
```
src/components/PostCard.tsx            ← Add AICommentBox (Done posts only)
src/app/dashboard/page.tsx             ← Ensure Done tab exists and works
src/app/api/posts/route.ts             ← Verify status filter works correctly
```

### Files to Check but Probably Not Modify:
```
prisma/schema.prisma                   ← Only modify if adding generatedComment field
src/lib/gemini.ts (or wherever Gemini is initialized)  ← Reuse existing client
```

---

## WHAT NOT TO DO

- ❌ Do NOT create a new Gemini client — use whatever already exists in the project
- ❌ Do NOT change the existing Pending post card design
- ❌ Do NOT add the AI comment box to Pending or Skipped cards — DONE only
- ❌ Do NOT use `alert()` for any error messages — use inline error UI
- ❌ Do NOT make the textarea a fixed height that clips long comments
- ❌ Do NOT use `router.push()` for the "Go to Post" button — use a plain `<a>` tag
- ❌ Do NOT introduce new npm packages unless absolutely necessary
- ❌ Do NOT break the existing Done/Skip flow — this feature is additive only
- ❌ Do NOT hardcode the Gemini API key — it must come from environment variables

---

## IMPLEMENTATION ORDER FOR CURSOR

Follow this exact order:

### Step 1 — Analyze (no coding yet)
- Read every existing component file
- Read the existing API routes
- Read the Prisma schema
- Find where Gemini is initialized and how it's called
- Understand the current status filter / tab system
- Write a brief comment at the top of your first file summarizing what you found

### Step 2 — API Route
- Create `src/app/api/posts/[id]/generate-comment/route.ts`
- Test it works (can be tested with a simple curl or Postman before touching UI)

### Step 3 — AICommentBox Component
- Create `src/components/AICommentBox.tsx`
- Build it in isolation first with hardcoded mock data to verify the UI looks right

### Step 4 — Wire into PostCard
- Import `AICommentBox` into the existing `PostCard` component
- Conditionally render it: `{post.status === 'DONE' && <AICommentBox post={post} />}`

### Step 5 — Verify Done Tab
- Make sure the Done tab/filter correctly shows Done posts
- Make sure switching between Pending/Done/Skipped works without page refresh

### Step 6 — End-to-End Test
- Mark a real post as Done
- Switch to Done tab — verify it appears
- Click Generate AI Comment — verify Gemini responds
- Edit the comment in the textarea
- Click Copy — verify clipboard works
- Click Go to Post — verify it opens the correct URL in a new tab

---

## ACCEPTANCE CRITERIA

The feature is complete when ALL of the following are true:

- [ ] Pending tab shows only `status = PENDING` posts (unchanged)
- [ ] Done tab shows only `status = DONE` posts with count badge
- [ ] Each Done post card shows a `✨ Generate AI Comment` button
- [ ] Clicking Generate shows a loading spinner and disables the button
- [ ] After generation, a textarea appears with the AI-generated comment
- [ ] The textarea is editable — worker can modify the text freely
- [ ] Character count is displayed under the textarea
- [ ] `📋 Copy Comment` copies text to clipboard and shows `✅ Copied!` for 2.5s
- [ ] `🔗 Go to Post →` opens the original post URL in a new browser tab
- [ ] If Gemini fails, an inline error message appears (no crash, no alert box)
- [ ] The `🔄 Regenerate` button allows generating a new comment after one exists
- [ ] Existing Pending tab behavior is completely unchanged
- [ ] No console errors in production build

---

## SUMMARY IN ONE SENTENCE FOR CURSOR

> Analyze the existing codebase fully, then add an AI Comment Generation feature to the Done tab — where each Done post card shows a "Generate AI Comment" button that calls Gemini, displays the result in an editable textarea, and provides Copy + Go-to-Post buttons so workers can manually post the AI comment on the original social media platform.
