# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Application Overview

College Admissions Management System - allows applicants to submit applications for degree programs and admissions officers to review/reject/accept applications.

## Technology Stack

**Frontend (port 3000):** React 18, Vite, React Router, Tailwind CSS
**Backend (port 3001):** Node.js, Express, sql.js (SQLite in-memory with file persistence)
**Authentication:** JWT with bcrypt password hashing

## Development Commands

```bash
# Start both servers (if init.sh exists)
./init.sh

# Start servers manually
cd server && npm run dev    # Backend (port 3001)
cd client && npm run dev    # Frontend (port 3000)

# Build frontend for production
cd client && npm run build

# Frontend runs on localhost:3000, API on localhost:3001
# CORS is configured for frontend origin
```

## Architecture

### Database Schema (sqlite - `college_admissions.db`)
- **users** - id, email, password_hash, name, role (admin/officer/applicant)
- **programs** - degree programs (bachelors/masters/phd) with capacity
- **applications** - student applications linked to programs and users
- **documents** - uploaded files for applications (transcripts, essays, recommendations)
- **ai_sessions** - AI onboarding conversation history

### API Authentication
JWT tokens expire after 24 hours. Sessions tracked in `activeSessions` Map with concurrent session limits. Token invalidation uses `sessionTokenVersions` Map for session fixation protection.

### Security Middleware
- `validateSession()` - verifies JWT and session validity
- Rate limiting on login attempts
- Input sanitization (XSS patterns, HTML entity encoding)
- Security headers (X-Frame-Options, CSP, HSTS)

### User Roles
- **admin** - full system access, user management
- **officer** - review and manage applications
- **applicant** - submit applications and documents

## Key File Locations

| Path | Purpose |
|------|---------|
| `server/index.js` | Express app with all routes, auth, database init |
| `client/src/App.jsx` | Route definitions with ProtectedRoute/AdminRoute wrappers |
| `client/src/context/AuthContext.jsx` | Authentication state management |
| `app_spec.txt` | Full project specification |
| `features.db` | Feature tracking database |

## Feature-Driven Workflow

This project uses `features.db` as single source of truth. Use MCP feature tools (not bash):
- `feature_get_stats` - get passing/total counts
- `feature_get_next` - get highest-priority feature
- `feature_get_for_regression` - get 3 passing features for regression
- `feature_mark_passing` - mark verified feature (passes=true)
- `feature_skip` - skip blocked feature (moves to end)

**Before new work:** Run regression tests on passing features.
**Never:** Delete features, edit descriptions, modify steps, reorder, or skip due to difficulty.

## Critical Verification Rules

1. **Browser automation only** - no curl/testing shortcuts
2. **No mock data** - verify with grep: `mockData\|fakeData\|sampleData\|TODO\|hardcoded\|placeholder`
3. **Zero console errors** - check with browser_console_messages
4. **Security enforced** - test unauthorized access blocked
5. **Real data verification** - create unique test data, verify persistence

## Email Functionality (Dev Mode)

Password reset/verification links logged to server terminal, not sent via email. Check server logs for generated links.