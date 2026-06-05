# Chronos Notes AI — Jira-Style Production Readiness Plan

> **Project Key:** CHR  
> **Current State:** Feature-rich SPA prototype (React 19 + Gemini AI) with localStorage-only persistence, no auth, no tests, no CI/CD, no deployment.  
> **Goal:** Ship a production-grade SaaS product that serves real users.

---

## Roadmap Overview

| Phase | Epic | Timeline | Priority |
|-------|------|----------|----------|
| 1 | Foundation & Developer Experience | Weeks 1–2 | P0 |
| 2 | Backend & Data Layer | Weeks 3–5 | P0 |
| 3 | Authentication & Multi-Tenancy | Weeks 4–6 | P0 |
| 4 | Security & Reliability | Weeks 5–7 | P0 |
| 5 | Production Deployment & CI/CD | Weeks 7–9 | P0 |
| 6 | UX Polish & Accessibility | Weeks 8–10 | P1 |
| 7 | Monetization & Growth | Weeks 10–14 | P1 |
| 8 | Scale & Observability | Weeks 12–16 | P2 |

---

## Epic 1: Foundation & Developer Experience

**Goal:** Establish code quality, testing, and development workflows that a team can build on.

---

### CHR-101 | Set up linting, formatting, and code quality tooling
| Field | Value |
|---|---|
| **Type** | Task |
| **Priority** | P0 — Blocker |
| **Story Points** | 3 |
| **Assignee** | — |
| **Labels** | `devex`, `foundation` |

**Description:**  
No linting or formatting tools exist. Configure ESLint (with TypeScript + React rules), Prettier, and a pre-commit hook (Husky + lint-staged) to enforce consistent code quality from day one.

**Acceptance Criteria:**
- [ ] ESLint configured with `@typescript-eslint` and `eslint-plugin-react-hooks`
- [ ] Prettier configured with project-wide rules
- [ ] Husky pre-commit hook runs `lint` + `format --check` on staged files
- [ ] `npm run lint` and `npm run format` scripts available
- [ ] All existing code passes lint with zero errors

---

### CHR-102 | Replace Tailwind CDN with compiled Tailwind
| Field | Value |
|---|---|
| **Type** | Task |
| **Priority** | P0 — Blocker |
| **Story Points** | 2 |
| **Labels** | `devex`, `performance` |

**Description:**  
Tailwind is loaded via CDN `<script>` tag, which is not suitable for production (no tree-shaking, runtime overhead, external dependency). Migrate to PostCSS-compiled Tailwind integrated with the Vite build.

**Acceptance Criteria:**
- [ ] `tailwindcss`, `postcss`, `autoprefixer` installed as dev dependencies
- [ ] `tailwind.config.js` with content paths configured
- [ ] CDN script removed from `index.html`
- [ ] Tailwind CSS imported via `@tailwind` directives in a CSS entry file
- [ ] Production build produces purged CSS (< 20KB)

---

### CHR-103 | Set up testing infrastructure with Vitest + React Testing Library
| Field | Value |
|---|---|
| **Type** | Task |
| **Priority** | P0 — Blocker |
| **Story Points** | 3 |
| **Labels** | `testing`, `foundation` |

**Description:**  
Zero tests exist. Set up Vitest with React Testing Library and establish test patterns for services and components. Write initial unit tests for `storageService` and `geminiService`.

**Acceptance Criteria:**
- [ ] Vitest configured with `jsdom` environment
- [ ] `@testing-library/react` and `@testing-library/jest-dom` installed
- [ ] `npm test` and `npm run test:coverage` scripts available
- [ ] Unit tests for `storageService.ts` (CRUD operations, edge cases)
- [ ] Unit tests for `geminiService.ts` (with mocked API calls)
- [ ] Coverage threshold set: 60% minimum for `services/`
- [ ] CI runs tests on push (see CHR-501)

---

### CHR-104 | Set up client-side routing with React Router
| Field | Value |
|---|---|
| **Type** | Story |
| **Priority** | P0 — Critical |
| **Story Points** | 5 |
| **Labels** | `architecture`, `ux` |

**Description:**  
As a user, I want to use browser navigation (back/forward, bookmarks, deep links) so that I can quickly return to specific notes or views.

Currently, navigation is handled via a `ViewMode` state enum in `App.tsx`. There are no URLs, so refreshing loses context and sharing links is impossible.

**Acceptance Criteria:**
- [ ] React Router v7 installed and configured
- [ ] Routes: `/notes`, `/notes/:id`, `/graph`, `/stats`, `/chat`
- [ ] Browser back/forward buttons work across all views
- [ ] Direct URL access (deep linking) loads the correct view and note
- [ ] `NoteList`, `NoteEditor`, `GraphView`, `StatsView` rendered via route outlets
- [ ] Existing navigation UI (sidebar, mobile bottom nav) updates to use `<Link>`/`useNavigate`
- [ ] Unit tests for route rendering

**Dependencies:** CHR-101 (linting must pass first)

---

### CHR-105 | Implement React Error Boundaries
| Field | Value |
|---|---|
| **Type** | Task |
| **Priority** | P1 — High |
| **Story Points** | 2 |
| **Labels** | `reliability`, `ux` |

**Description:**  
No error boundaries exist. An unhandled error in any component crashes the entire app. Add granular error boundaries around major views with user-friendly fallback UIs.

**Acceptance Criteria:**
- [ ] Error boundary component wrapping each major view (editor, graph, stats)
- [ ] Friendly fallback UI with "Something went wrong" message and retry button
- [ ] Errors logged to a monitoring service (see CHR-801)
- [ ] Unit test verifying boundary catches thrown errors

---

## Epic 2: Backend & Data Layer

**Goal:** Move data out of localStorage into a real database with an API layer, enabling sync, backup, and multi-device access.

---

### CHR-201 | Design and implement the database schema
| Field | Value |
|---|---|
| **Type** | Story |
| **Priority** | P0 — Blocker |
| **Story Points** | 5 |
| **Labels** | `backend`, `data` |

**Description:**  
As the product team, we need a relational database schema that supports multi-tenant notes with time tracking, tags, AI metadata, and future collaboration features.

**Proposed Schema (PostgreSQL):**
- `users` — id (UUID), email, name, avatar_url, plan, created_at
- `notes` — id (UUID), user_id (FK), title, content, status, category, tags (JSONB), ai_summary, ai_suggestion, total_focus_time, created_at, updated_at, deleted_at (soft delete)
- `focus_sessions` — id, note_id (FK), started_at, ended_at, duration_seconds
- `ai_conversations` — id, user_id (FK), note_id (FK, nullable), messages (JSONB), created_at
- `attachments` — id, note_id (FK), file_url, file_type, file_size, created_at

**Acceptance Criteria:**
- [ ] Schema designed with proper indexes (user_id, note_id, created_at, status)
- [ ] Migration files created and runnable
- [ ] Soft-delete strategy documented and implemented via `deleted_at`
- [ ] Schema supports > 10K notes per user without degradation

---

### CHR-202 | Build REST API server
| Field | Value |
|---|---|
| **Type** | Epic (parent) |
| **Priority** | P0 — Blocker |
| **Story Points** | 13 |
| **Labels** | `backend`, `api` |

**Description:**  
Build a backend API server to replace direct localStorage access. Recommended stack: **Node.js + Express (or Fastify) + Prisma ORM + PostgreSQL**.

**Sub-tasks:**

| ID | Summary | Points |
|---|---|---|
| CHR-202a | Project scaffold (Express/Fastify, TypeScript, Prisma) | 3 |
| CHR-202b | CRUD endpoints for `/api/notes` with pagination | 3 |
| CHR-202c | CRUD endpoints for `/api/notes/:id/sessions` (focus tracking) | 2 |
| CHR-202d | Endpoints for `/api/conversations` (AI chat history) | 2 |
| CHR-202e | Request validation (Zod) on all endpoints | 2 |
| CHR-202f | API integration tests with Supertest | 1 |

**Acceptance Criteria:**
- [ ] All endpoints return consistent JSON responses with proper status codes
- [ ] Pagination on list endpoints (cursor-based preferred)
- [ ] All inputs validated with Zod schemas
- [ ] Rate limiting on all endpoints
- [ ] API documentation (OpenAPI/Swagger) auto-generated
- [ ] Integration test suite with >80% endpoint coverage

---

### CHR-203 | Migrate frontend from localStorage to API client
| Field | Value |
|---|---|
| **Type** | Story |
| **Priority** | P0 — Critical |
| **Story Points** | 8 |
| **Labels** | `frontend`, `data` |
| **Dependencies** | CHR-202 |

**Description:**  
As a user, I want my notes stored in the cloud so I can access them from any device.

Replace `storageService.ts` (localStorage) with an API client that talks to the new backend. Implement optimistic updates for a snappy UI, with rollback on failure.

**Acceptance Criteria:**
- [ ] `apiClient.ts` service with typed methods matching current `storageService` interface
- [ ] All `App.tsx` state management updated to use API calls
- [ ] Optimistic updates with rollback on API errors
- [ ] Loading states and error states displayed in UI
- [ ] Offline detection with queued sync (stretch goal)
- [ ] localStorage data migration tool (export from old → import to new)
- [ ] Existing component tests updated and passing

---

### CHR-204 | Implement data export and import
| Field | Value |
|---|---|
| **Type** | Story |
| **Priority** | P1 — High |
| **Story Points** | 3 |
| **Labels** | `data`, `ux` |

**Description:**  
As a user, I want to export all my notes as JSON/Markdown so I have a portable backup and am not locked in.

**Acceptance Criteria:**
- [ ] Export all notes as JSON (full fidelity) and Markdown (readable)
- [ ] Import notes from JSON export file
- [ ] Conflict handling on import (duplicate IDs)
- [ ] Export accessible from settings menu

---

## Epic 3: Authentication & Multi-Tenancy

**Goal:** Secure user accounts with proper authentication so each user's data is private and persistent.

---

### CHR-301 | Implement authentication with OAuth + email/password
| Field | Value |
|---|---|
| **Type** | Story |
| **Priority** | P0 — Blocker |
| **Story Points** | 8 |
| **Labels** | `auth`, `security` |
| **Dependencies** | CHR-202 (backend must exist) |

**Description:**  
As a user, I want to sign up and log in securely so that my notes are private and accessible only to me.

Recommended: Use a managed auth provider (Clerk, Auth0, or Lucia Auth) to avoid rolling custom auth crypto.

**Acceptance Criteria:**
- [ ] Sign up / log in with email + password
- [ ] OAuth login with Google (primary) and GitHub (secondary)
- [ ] Session management with secure HTTP-only cookies
- [ ] Password reset flow via email
- [ ] Email verification on sign-up
- [ ] Session expiry and refresh token rotation
- [ ] All API endpoints require valid auth token (401 on missing/invalid)
- [ ] `user_id` scoping on all database queries (no cross-tenant access possible)

---

### CHR-302 | Build user profile and settings page
| Field | Value |
|---|---|
| **Type** | Story |
| **Priority** | P1 — High |
| **Story Points** | 3 |
| **Labels** | `auth`, `ux` |
| **Dependencies** | CHR-301 |

**Description:**  
As a user, I want to manage my account settings (name, avatar, theme, notification preferences) so I can personalize my experience.

**Acceptance Criteria:**
- [ ] Profile page with editable name, avatar, timezone
- [ ] Account settings: change password, connected OAuth accounts
- [ ] Danger zone: delete account with confirmation (GDPR right to erasure)
- [ ] Theme toggle (light/dark)

---

### CHR-303 | Proxy Gemini API calls through backend
| Field | Value |
|---|---|
| **Type** | Task |
| **Priority** | P0 — Blocker |
| **Story Points** | 5 |
| **Labels** | `security`, `backend` |
| **Dependencies** | CHR-202, CHR-301 |

**Description:**  
The Gemini API key is currently exposed in the browser bundle. Move all Gemini API calls to the backend, where the API key is stored as a server-side secret. The frontend calls internal endpoints like `/api/ai/categorize`, `/api/ai/summarize`, etc.

This also enables per-user rate limiting and usage tracking for monetization.

**Acceptance Criteria:**
- [ ] All 11 Gemini API methods moved to backend endpoints
- [ ] API key stored in server environment variables only
- [ ] Frontend `geminiService.ts` refactored to call internal API endpoints
- [ ] Per-user rate limiting (configurable by plan tier)
- [ ] Usage tracking (token counts, request counts) per user
- [ ] Streaming support for chat and long-running generation

---

## Epic 4: Security & Reliability

**Goal:** Harden the application against attacks and ensure data integrity.

---

### CHR-401 | Security audit and hardening
| Field | Value |
|---|---|
| **Type** | Task |
| **Priority** | P0 — Blocker |
| **Story Points** | 5 |
| **Labels** | `security` |

**Description:**  
Perform a full security audit and implement fixes for all findings.

**Acceptance Criteria:**
- [ ] All user input sanitized (DOMPurify for rendered markdown/HTML)
- [ ] Content Security Policy headers configured
- [ ] CORS restricted to production domain(s)
- [ ] Helmet.js (or equivalent) security headers on all responses
- [ ] SQL injection prevention verified (Prisma parameterized queries)
- [ ] XSS prevention verified on all rendered user content
- [ ] CSRF protection on all state-changing endpoints
- [ ] Dependency audit (`npm audit`) — zero high/critical vulnerabilities
- [ ] Secrets scan configured (no API keys in code)
- [ ] Penetration test findings documented and addressed

---

### CHR-402 | Implement data validation and schema enforcement
| Field | Value |
|---|---|
| **Type** | Task |
| **Priority** | P1 — High |
| **Story Points** | 3 |
| **Labels** | `reliability`, `data` |

**Description:**  
Notes are currently saved to localStorage with zero validation. Implement Zod schemas shared between frontend and backend to enforce data integrity.

**Acceptance Criteria:**
- [ ] Shared Zod schemas for Note, FocusSession, Conversation types
- [ ] Frontend validates before API calls
- [ ] Backend validates on receipt (defense in depth)
- [ ] Invalid data returns clear 400 errors with field-level messages
- [ ] Migration script to validate and clean any existing malformed data

---

### CHR-403 | Replace native `confirm()` dialogs
| Field | Value |
|---|---|
| **Type** | Task |
|---|---|
| **Priority** | P2 — Medium |
| **Story Points** | 2 |
| **Labels** | `ux` |

**Description:**  
The delete action uses `window.confirm()`, which is jarring and non-customizable. Replace with an accessible modal dialog component.

**Acceptance Criteria:**
- [ ] Reusable `ConfirmDialog` component with accessible markup (`role="alertdialog"`)
- [ ] Used for note deletion, account deletion, and any destructive action
- [ ] Keyboard navigable (Escape to cancel, Enter to confirm)
- [ ] Styled consistently with the app design

---

## Epic 5: Production Deployment & CI/CD

**Goal:** Automate build, test, and deployment pipelines for reliable releases.

---

### CHR-501 | Set up GitHub Actions CI pipeline
| Field | Value |
|---|---|
| **Type** | Task |
| **Priority** | P0 — Blocker |
| **Story Points** | 3 |
| **Labels** | `ci-cd`, `devex` |

**Description:**  
No CI exists. Configure GitHub Actions to run linting, type-checking, tests, and builds on every push and pull request.

**Acceptance Criteria:**
- [ ] CI pipeline runs on push to `main` and on PRs
- [ ] Steps: install → lint → typecheck → test → build
- [ ] Build artifacts uploaded on success
- [ ] Branch protection: `main` requires passing CI
- [ ] Test coverage report generated and uploaded

---

### CHR-502 | Containerize with Docker
| Field | Value |
|---|---|
| **Type** | Task |
| **Priority** | P0 — Critical |
| **Story Points** | 3 |
| **Labels** | `ci-cd`, `deployment` |

**Description:**  
Create Dockerfiles for the frontend and backend services, plus a `docker-compose.yml` for local development.

**Acceptance Criteria:**
- [ ] Multi-stage Dockerfile for frontend (build → nginx)
- [ ] Dockerfile for backend API server
- [ ] `docker-compose.yml` with frontend, backend, PostgreSQL, Redis
- [ ] Environment variable configuration via `.env.example`
- [ ] `docker compose up` starts the full stack locally
- [ ] Health check endpoints on all containers

---

### CHR-503 | Deploy to production
| Field | Value |
|---|---|
| **Type** | Story |
| **Priority** | P0 — Critical |
| **Story Points** | 8 |
| **Labels** | `deployment`, `infrastructure` |
| **Dependencies** | CHR-501, CHR-502 |

**Description:**  
As the product team, we need a production deployment that serves real users with acceptable performance and uptime.

**Recommended Stack:**
- **Frontend:** Vercel or Cloudflare Pages (static, edge-cached)
- **Backend:** Railway, Fly.io, or AWS ECS (containerized)
- **Database:** Supabase (PostgreSQL + storage) or Neon (serverless PostgreSQL)
- **CDN:** Cloudflare (for frontend assets and media)
- **File storage:** S3 or R2 (for attachments, generated images)

**Acceptance Criteria:**
- [ ] Frontend deployed to CDN with immutable asset caching
- [ ] Backend deployed with auto-scaling (minimum 2 instances)
- [ ] PostgreSQL with automated daily backups
- [ ] SSL/TLS on all endpoints
- [ ] Custom domain configured (e.g., `chronosnotes.ai`)
- [ ] Staging environment mirrors production
- [ ] Deployment pipeline: merge to `main` → auto-deploy to staging → manual promote to production
- [ ] Rollback procedure documented and tested

---

### CHR-504 | Add PWA support with offline capability
| Field | Value |
|---|---|
| **Type** | Story |
| **Priority** | P1 — High |
| **Story Points** | 5 |
| **Labels** | `ux`, `pwa` |

**Description:**  
As a user, I want to use the app offline and install it as a native-like app so I can take notes without internet access.

**Acceptance Criteria:**
- [ ] PWA manifest with proper icons and metadata
- [ ] Service worker caching frontend assets (stale-while-revalidate)
- [ ] Offline mode: view and edit cached notes, queue sync for when online
- [ ] "Install App" prompt on supported browsers
- [ ] Background sync when connection restored

---

## Epic 6: UX Polish & Accessibility

**Goal:** Make the product delightful and accessible to all users.

---

### CHR-601 | Implement dark mode
| Field | Value |
|---|---|
| **Type** | Story |
| **Priority** | P1 — High |
| **Story Points** | 3 |
| **Labels** | `ux`, `design` |

**Description:**  
As a user, I want to switch between light and dark themes so I can use the app comfortably in any lighting condition.

**Acceptance Criteria:**
- [ ] System preference detection (`prefers-color-scheme`)
- [ ] Manual toggle persisted to user preferences
- [ ] All components themed in both modes
- [ ] Graph view colors adapt to theme

---

### CHR-602 | Accessibility audit (WCAG 2.1 AA)
| Field | Value |
|---|---|
| **Type** | Task |
| **Priority** | P1 — High |
| **Story Points** | 8 |
| **Labels** | `accessibility`, `ux` |

**Description:**  
Conduct a full accessibility audit and remediate all WCAG 2.1 AA violations.

**Acceptance Criteria:**
- [ ] All interactive elements keyboard-navigable
- [ ] ARIA labels on all icon buttons and non-text elements
- [ ] Color contrast ratios meet AA (4.5:1 text, 3:1 UI)
- [ ] Screen reader testing passes on NVDA + Chrome and VoiceOver + Safari
- [ ] Focus indicators visible on all interactive elements
- [ ] Form inputs have associated labels
- [ ] axe-core automated scan: zero critical/serious violations

---

### CHR-603 | Optimize Knowledge Graph performance
| Field | Value |
|---|---|
| **Type** | Task |
| **Priority** | P2 — Medium |
| **Story Points** | 3 |
| **Labels** | `performance` |

**Description:**  
The force-directed graph simulation runs indefinitely via `requestAnimationFrame` even after stabilization, wasting CPU. Implement a damping threshold and optimize rendering.

**Acceptance Criteria:**
- [ ] Simulation stops when kinetic energy drops below threshold
- [ ] Simulation restarts on data change or user interaction
- [ ] Canvas rendering (or WebGL) for graphs with >100 nodes
- [ ] Smooth 60fps on mid-range hardware with 200+ notes

---

### CHR-604 | Add collaborative editing (future)
| Field | Value |
|---|---|
| **Type** | Epic |
| **Priority** | P2 — Future |
| **Story Points** | 21 |
| **Labels** | `collaboration`, `feature` |

**Description:**  
As a user, I want to share notes with others and collaborate in real-time.

**Sub-stories (future sprint):**
- CHR-604a: Share notes via link (read-only)
- CHR-604b: Invite collaborators (read/write)
- CHR-604c: Real-time collaborative editing (Y.js or Automerge CRDT)
- CHR-604d: Comment threads on notes
- CHR-604e: Activity feed / audit log per note

---

## Epic 7: Monetization & Growth

**Goal:** Build a sustainable business model around the product.

---

### CHR-701 | Implement usage-based tiered pricing
| Field | Value |
|---|---|
| **Type** | Story |
| **Priority** | P1 — High |
| **Story Points** | 8 |
| **Labels** | `monetization`, `backend` |

**Description:**  
As a business, we need a freemium model that lets users try AI features and upgrade for more.

**Proposed Tiers:**

| Feature | Free | Pro ($9/mo) | Team ($19/user/mo) |
|---|---|---|---|
| Notes | 50 | Unlimited | Unlimited |
| AI requests/day | 10 | 200 | 500 |
| Focus tracking | Basic | Full | Full |
| Knowledge graph | Yes | Yes | Yes |
| Image generation | 5/day | 50/day | 100/day |
| Collaborators | 0 | 3 | Unlimited |
| Storage | 100MB | 5GB | 20GB |
| Export | JSON only | JSON + MD | JSON + MD |

**Acceptance Criteria:**
- [ ] Stripe integration for subscription management
- [ ] Usage tracking middleware (increment counters per AI request)
- [ ] Rate limiting per tier
- [ ] Upgrade/downgrade flow with prorated billing
- [ ] Free tier soft-limits with upgrade prompts (not hard blocks)
- [ ] Billing portal for invoice history and payment method management

---

### CHR-702 | Build onboarding flow
| Field | Value |
|---|---|
| **Type** | Story |
| **Priority** | P1 — High |
| **Story Points** | 5 |
| **Labels** | `ux`, `growth` |

**Description:**  
As a new user, I want a guided onboarding experience so I quickly understand the app's value and create my first note.

**Acceptance Criteria:**
- [ ] Welcome screen with 3-step interactive tutorial
- [ ] Create first note with AI categorization demo
- [ ] Seed 2-3 example notes to showcase features (graph, timer, AI)
- [ ] Onboarding dismissal — don't show again
- [ ] Onboarding completion tracked for analytics

---

### CHR-703 | Add analytics and product metrics
| Field | Value |
|---|---|
| **Type** | Task |
| **Priority** | P1 — High |
| **Story Points** | 3 |
| **Labels** | `growth`, `observability` |

**Description:**  
Integrate product analytics (PostHog or Mixpanel) to track user behavior, feature adoption, and conversion funnels.

**Acceptance Criteria:**
- [ ] Track: sign-up, note creation, AI feature usage, session duration, retention
- [ ] Funnels: sign-up → first note → first AI use → upgrade prompt
- [ ] Dashboard for DAU/WAU/MAU, feature adoption rates
- [ ] Privacy-compliant (cookie consent, GDPR opt-out)

---

## Epic 8: Scale & Observability

**Goal:** Ensure the system can handle growth and issues are detected before users report them.

---

### CHR-801 | Set up monitoring, alerting, and error tracking
| Field | Value |
|---|---|
| **Type** | Task |
| **Priority** | P0 — Critical |
| **Story Points** | 5 |
| **Labels** | `observability`, `reliability` |

**Description:**  
Implement comprehensive monitoring so the team is alerted to issues before users notice.

**Acceptance Criteria:**
- [ ] Error tracking: Sentry (frontend + backend) with source maps
- [ ] Uptime monitoring: UptimeRobot or Better Stack (5-min intervals)
- [ ] APM: Request latency, error rate, throughput dashboards
- [ ] Structured logging (JSON) with correlation IDs across frontend → backend → DB
- [ ] Alert rules: error rate > 1%, p99 latency > 3s, API down > 2 min
- [ ] Database query performance monitoring (slow query log)

---

### CHR-802 | Implement caching layer
| Field | Value |
|---|---|
| **Type** | Task |
| **Priority** | P2 — Medium |
| **Story Points** | 5 |
| **Labels** | `performance`, `backend` |

**Description:**  
Add Redis caching for frequently accessed data (note lists, AI responses) to reduce database load and improve response times.

**Acceptance Criteria:**
- [ ] Redis caching for note list queries (invalidate on write)
- [ ] Cache AI responses (same input → same output within TTL)
- [ ] Cache-aside pattern with configurable TTLs
- [ ] Cache hit rate > 40% under normal load

---

### CHR-803 | Database indexing and query optimization
| Field | Value |
|---|---|
| **Type** | Task |
| **Priority** | P2 — Medium |
| **Story Points** | 3 |
| **Labels** | `performance`, `backend` |

**Description:**  
Review and optimize database indexes and queries for performance at scale.

**Acceptance Criteria:**
- [ ] Indexes on: `notes(user_id, updated_at)`, `notes(user_id, status)`, `focus_sessions(note_id)`
- [ ] Full-text search index on `notes.title` and `notes.content` (pg_trgm or similar)
- [ ] All queries analyzed with `EXPLAIN ANALYZE` — no sequential scans on large tables
- [ ] Pagination uses cursor-based approach (no OFFSET on large tables)

---

## Summary: Critical Path to Launch

```
CHR-101 Lint/Format ─┐
CHR-102 Tailwind ─────┤
CHR-103 Testing ──────┤
                      ▼
CHR-104 Routing ──────┐
CHR-201 DB Schema ────┤
                      ▼
CHR-202 REST API ─────┐
                      ▼
CHR-301 Auth ─────────┤
CHR-303 AI Proxy ─────┤
                      ▼
CHR-203 API Client ───┤
CHR-401 Security ─────┤
                      ▼
CHR-501 CI ───────────┤
CHR-502 Docker ───────┤
                      ▼
CHR-503 Deploy ───────┤
CHR-801 Monitoring ───┤
                      ▼
              ╔══════════════╗
              ║  LAUNCH v1.0 ║
              ╚══════════════╝
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
  CHR-701 Pricing  CHR-602 A11y  CHR-504 PWA
  CHR-702 Onboard  CHR-601 Dark  CHR-604 Collab
```

**Estimated total for MVP (Epics 1–5 + CHR-801):** ~70 story points, ~9 weeks with 2 engineers.  
**Full plan (all epics):** ~120 story points, ~16 weeks with 2–3 engineers.
