# Visual Trip
A school field trip management web app where teachers request trips, admins approve them, bus companies submit quotes, and parents sign permission forms, all in one place.
 
## Tech Stack
- Backend: Node.js 22, Express.js
- Frontend: Plain HTML, CSS, vanilla JavaScript (no frameworks)
- Data: JSON files at ./data/ (users.json, trips.json, rosters.json, companies.json, permissions.json)
- Port: 3000
## Commands
- Start server: node server.js
- Install dependencies: npm install  # installs Express.js
## Architecture
- server.js: Express server and all API routes
- public/: Static files (HTML pages, style.css, app.js)
- data/: JSON data storage (one file per entity)
## Conventions
- Use ES modules (import/export), not require()
- API routes return JSON: { data, error } shape
- Never expose stack traces to the client
- CSS: mobile-first, no frameworks, plain CSS with CSS variables for theming
- Role-based UI: same HTML shell, content rendered based on session role stored in localStorage
- Sessions managed via a simple token stored in localStorage (no external auth library)
- All emails simulated as console.log statements labeled [EMAIL SIMULATION]
- Google Maps route links constructed via maps.google.com URL (no API key required)
- Bus count calculated as Math.ceil(studentCount / busCapacity)
- Signatures stored as base64 data URLs in permissions.json
- Seed ./data/ on first run with: 1 admin, 2 teachers, 2 bus companies, 2 classes with 5 students each, and 1 sample trip in "pending" status
## Pages & Routes
 
### Served HTML Pages
- GET /               — redirects to login
- GET /login          — login page (all roles)
- GET /dashboard      — role-aware dashboard (different view per role)
- GET /trips/new      — teacher: new trip request form
- GET /trips/:id      — trip detail page (role-aware content)
- GET /trips/:id/permission — parent-facing permission + signature form
- GET /admin/rosters  — admin: manage class rosters
- GET /admin/companies — admin: manage pre-approved bus companies
### Auth API
- POST /api/auth/login   — authenticates user, returns role + session token
- POST /api/auth/logout  — clears session
### Trips API
- GET    /api/trips                    — returns all trips (filtered by role)
- POST   /api/trips                    — teacher creates a new trip request
- GET    /api/trips/:id                — returns single trip with full details
- PATCH  /api/trips/:id/approve-1      — admin Approval #1 (triggers bus company email simulation)
- PATCH  /api/trips/:id/reject         — admin rejects with notes
- PATCH  /api/trips/:id/approve-2      — admin Approval #2, selects winning quote
- PATCH  /api/trips/:id/checklist      — teacher updates planning checklist items
### Quotes API
- GET  /api/trips/:id/quotes  — returns all quotes for a trip
- POST /api/trips/:id/quotes  — bus company submits a quote
### Rosters API
- GET    /api/rosters                              — returns all classes
- GET    /api/rosters/:classId                     — returns full student roster for a class
- POST   /api/rosters                              — admin creates a class
- POST   /api/rosters/:classId/students            — admin adds a student to a class
- DELETE /api/rosters/:classId/students/:studentId — admin removes a student
### Bus Companies API
- GET    /api/companies      — returns all pre-approved bus companies
- POST   /api/companies      — admin adds a bus company
- DELETE /api/companies/:id  — admin removes a bus company
### Permissions API
- GET  /api/trips/:id/permissions         — returns all permission form responses for a trip
- POST /api/trips/:id/permissions         — parent submits signed permission form + chaperone opt-in
- GET  /api/trips/:id/permissions/status  — returns signed vs unsigned counts for teacher dashboard
## Data Model
 
### User
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "passwordHash": "string",
  "role": "teacher | admin | bus_company | parent",
  "companyId": "uuid (if bus_company, else null)",
  "studentIds": ["uuid (if parent, else empty array)"],
  "createdAt": "ISO string"
}
```
 
### Trip
```json
{
  "id": "uuid",
  "title": "string",
  "destination": "string",
  "date": "ISO string",
  "returnTime": "ISO string",
  "teacherId": "uuid",
  "classId": "uuid",
  "students": ["uuid"],
  "status": "pending | approved_1 | quoted | approved_2 | confirmed | rejected",
  "adminNotes": "string",
  "checklist": [
    { "item": "string", "completed": "boolean", "custom": "boolean" }
  ],
  "selectedQuoteId": "uuid | null",
  "routeSuggestion": {
    "mapUrl": "string",
    "distanceMiles": "number",
    "estimatedBuses": "number"
  },
  "createdAt": "ISO string"
}
```
 
### Quote
```json
{
  "id": "uuid",
  "tripId": "uuid",
  "companyId": "uuid",
  "price": "number",
  "busCount": "number",
  "busCapacity": "number",
  "availability": "boolean",
  "notes": "string",
  "submittedAt": "ISO string"
}
```
 
### Roster / Class
```json
{
  "id": "uuid",
  "className": "string",
  "gradeLevel": "string",
  "teacherId": "uuid",
  "students": [
    { "id": "uuid", "name": "string", "parentEmail": "string" }
  ]
}
```
 
### Bus Company
```json
{
  "id": "uuid",
  "name": "string",
  "contactEmail": "string",
  "phone": "string",
  "userId": "uuid",
  "preApproved": "boolean",
  "addedByAdminId": "uuid",
  "createdAt": "ISO string"
}
```
 
### Permission Form Response
```json
{
  "id": "uuid",
  "tripId": "uuid",
  "studentId": "uuid",
  "parentName": "string",
  "parentEmail": "string",
  "signatureDataUrl": "base64 string",
  "chaperoneOptIn": "boolean",
  "signedAt": "ISO string"
}
```
 
## UI Components
- Top navbar: TripTrack logo, current user name + role badge, logout button
- Role-aware dashboard: teacher sees their trips + status pipeline; admin sees all pending approvals; bus company sees trips needing quotes
- Trip request form: destination input, date/time pickers, class selector (click → auto-populates roster), additional notes
- Trip status tracker: visual pipeline showing current stage (Submitted → Approved → Quoted → Confirmed)
- Auto-generated planning checklist with editable items and custom item input
- Quote submission form (bus company view): price, bus count, capacity, availability, notes
- Quote comparison panel (admin view): side-by-side quote cards with "Select this quote" button
- Permission form page: trip details summary, parent name input, canvas-based e-signature pad, chaperone opt-in checkbox, submit button
- Permission status dashboard (teacher view): table of students with Signed / Unsigned / Chaperone badges
- Roster manager (admin): class cards, expandable student lists, add/remove student forms
- Bus company manager (admin): list of pre-approved companies, add company form with email invite
- Route info card on trip detail: estimated distance, map link, recommended bus count
- Empty states and loading indicators on all list views
- Toast notifications for key actions (approval sent, quote submitted, form signed, etc.)
- Mobile-responsive: single column layout on screens under 768px
