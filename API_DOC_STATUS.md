# CRM API Documentation and Status

## Purpose
This document lists all APIs found under app/api, shows which APIs are fully formed vs not fully formed, and describes what parameters are required when calling each API.

## Status Legend
- FORMED: Endpoint is implemented with clear behavior, validation and/or DB logic.
- PARTIALLY FORMED: Endpoint exists but behaves like demo/testing/placeholder, or has route-design mismatch.

## Quick Summary
- Total route files: 25
- Total endpoint handlers (method + path): 35
- FORMED: 31
- PARTIALLY FORMED: 4

## Endpoints Matrix

| Method | Path | Status | Notes |
|---|---|---|---|
| GET | /api | PARTIALLY FORMED | Demo hello endpoint using query name |
| GET | /api/agents | PARTIALLY FORMED | Demo classifier test + static response |
| POST | /api/agents | PARTIALLY FORMED | Only logs input, does not persist |
| GET | /api/audit-log | FORMED | Complaint audit timeline with filters + pagination |
| GET | /api/complaint | FORMED | List complaints or fetch by id query |
| POST | /api/complaint | FORMED | Validated complaint creation |
| GET | /api/complaint/assign | FORMED | Guidance response to use id route |
| POST | /api/complaint/assign | FORMED | Create complaint assignment |
| PATCH | /api/complaint/assign | FORMED | Update assignment outcome/performance note |
| GET | /api/complaint/assign/:id | FORMED | Get complaint + available officers |
| PATCH | /api/complaint/assign/:id | FORMED | Update assigned officer/status |
| GET | /api/complaint/resolve/:id | PARTIALLY FORMED | Route has :id but GET returns all unresolved complaints |
| PATCH | /api/complaint/resolve/:id | FORMED | Mark complaint resolved by path id |
| GET | /api/cron/escalate | FORMED | Health check for cron endpoint |
| POST | /api/cron/escalate | FORMED | Trigger escalation check, optional secret header |
| GET | /api/dashboard/stats | FORMED | Aggregated counts and trends |
| GET | /api/department | FORMED | Department list with filters + pagination |
| POST | /api/department | FORMED | Create department |
| GET | /api/department/:id | FORMED | Get one department |
| PATCH | /api/department/:id | FORMED | Update department |
| DELETE | /api/department/:id | FORMED | Delete department (blocked if officers exist) |
| GET | /api/feedback | FORMED | Feedback list by complaint + stats |
| POST | /api/feedback | FORMED | Submit feedback with validation |
| GET | /api/health | FORMED | DB connectivity health check |
| GET | /api/notifications | FORMED | Notifications list with filters + pagination |
| PATCH | /api/notifications/:id/read | FORMED | Mark notification read |
| GET | /api/officer | FORMED | Officers list by status/department |
| GET | /api/officer/leave | FORMED | Leave list with filters + pagination |
| POST | /api/officer/leave | FORMED | Create leave request |
| PATCH | /api/officer/leave/:id | FORMED | Update/approve leave request |
| GET | /api/secure-api-route | PARTIALLY FORMED | Auth utility endpoint; returns only userId |
| GET | /api/users | FORMED | Users list with filters + pagination |
| POST | /api/users | FORMED | Create user |
| GET | /api/users/:id | FORMED | Get one user |
| PATCH | /api/users/:id | FORMED | Update user |
| DELETE | /api/users/:id | FORMED | Delete user |
| GET | /api/users/sync | FORMED | Check signed-in Clerk user in DB |
| POST | /api/users/sync | FORMED | Create signed-in Clerk user in DB if missing |
| GET | /api/worker | FORMED | Workers list with filters + pagination |
| POST | /api/worker | FORMED | Create worker/officer |
| GET | /api/worker/:id | FORMED | Get one worker |
| PATCH | /api/worker/:id | FORMED | Update worker |
| DELETE | /api/worker/:id | FORMED | Delete worker |
| GET | /api/worker/sync | FORMED | Check signed-in Clerk worker in DB |
| POST | /api/worker/sync | FORMED | Create signed-in Clerk worker in DB if missing |

## Parameter Reference (What to send while calling API)

## 1) GET /api
- Query:
  - name (optional, string)

## 2) /api/agents
### GET /api/agents
- No parameters required.

### POST /api/agents
- Body (JSON):
  - name (optional)
  - description (optional)

## 3) GET /api/audit-log
- Query:
  - complaintId (required, string CUID)
  - updatedBy (optional, string)
  - action (optional, string)
  - page (optional, integer, default 1)
  - limit (optional, integer, default 50, max 200)

## 4) /api/complaint
### GET /api/complaint
- Query:
  - id (optional, complaint id; if provided returns matching complaint list)
  - citizenId (optional, string)
  - page (optional, integer, default 1)
  - limit (optional, integer, default 20, max 100)

### POST /api/complaint
- Body (JSON):
  - citizenId (required, CUID)
  - category (required, ComplaintCategory enum)
  - title (required, string 3-150 chars)
  - description (required, string 10-4000 chars)
  - priority (optional, Priority enum, default MEDIUM)
  - locationAddress (optional, string)
  - locationLat (optional, number -90 to 90)
  - locationLng (optional, number -180 to 180)
  - ward (optional, string)
  - pincode (optional, string)
  - photosUrls (optional, array of URL strings)
  - videoUrls (optional, array of URL strings)
  - tags (optional, array of strings)
  - isPublic (optional, boolean, default true)

## 5) /api/complaint/assign
### GET /api/complaint/assign
- No parameters required.

### POST /api/complaint/assign
- Accepts either query params or body (body takes precedence).
- Required:
  - complaintId (CUID)
  - officerId (CUID)
- Optional:
  - assignedBy (string)

### PATCH /api/complaint/assign
- Body (JSON):
  - assignmentId (required, CUID)
  - outcome (optional, AssignmentOutcome enum)
  - performanceNote (optional, string or null, max 2000)
- Rule: at least one of outcome or performanceNote must be provided.

## 6) /api/complaint/assign/:id
### GET /api/complaint/assign/:id
- Path:
  - id (required, complaint id)

### PATCH /api/complaint/assign/:id
- Path:
  - id (required, complaint id)
- Body (JSON, at least one field):
  - officerIds (optional, array of CUIDs; only single officer supported currently)
  - primaryOfficerId (optional, CUID)
  - status (optional, ComplaintStatus enum)

## 7) /api/complaint/resolve/:id
### GET /api/complaint/resolve/:id
- No effective parameters used (path id is ignored by current GET implementation).

### PATCH /api/complaint/resolve/:id
- Path:
  - id (required, complaint id)
- Body:
  - none required.

## 8) /api/cron/escalate
### GET /api/cron/escalate
- No parameters required.

### POST /api/cron/escalate
- Header:
  - x-cron-secret (required only when server has CRON_SECRET set)
- Body:
  - none required.

## 9) GET /api/dashboard/stats
- No parameters required.

## 10) /api/department
### GET /api/department
- Query:
  - isActive (optional, true/false)
  - search (optional, string)
  - page (optional, integer, default 1)
  - limit (optional, integer, default 20, max 100)

### POST /api/department
- Body (JSON):
  - name (required, DepartmentName enum)
  - description (optional, string max 500)
  - isActive (optional, boolean, default true)
  - locationLat (optional, number)
  - locationLng (optional, number)
  - addressLine (optional, string)
  - city (optional, string)
  - pincode (optional, string)

## 11) /api/department/:id
### GET /api/department/:id
- Path:
  - id (required, department id)

### PATCH /api/department/:id
- Path:
  - id (required, department id)
- Body (JSON, all optional):
  - description
  - isActive
  - locationLat
  - locationLng
  - addressLine
  - city
  - pincode

### DELETE /api/department/:id
- Path:
  - id (required, department id)

## 12) /api/feedback
### GET /api/feedback
- Query:
  - complaintId (required, CUID)
  - userId (optional, CUID)
  - page (optional, integer, default 1)
  - limit (optional, integer, default 20, max 100)

### POST /api/feedback
- Body (JSON):
  - userId (required, CUID)
  - complaintId (required, CUID)
  - rating (required, integer 1 to 5)
  - comment (optional, string max 2000)
  - tags (optional, array of FeedbackTag enum)
  - isAnonymous (optional, boolean, default false)

## 13) GET /api/health
- No parameters required.

## 14) GET /api/notifications
- Query:
  - userId (required, CUID)
  - unreadOnly (optional, true/false)
  - type (optional, NotificationType enum)
  - page (optional, integer, default 1)
  - limit (optional, integer, default 20, max 100)

## 15) PATCH /api/notifications/:id/read
- Path:
  - id (required, notification id)
- Body:
  - none required.

## 16) GET /api/officer
- Query:
  - status (optional, OfficerStatus enum)
  - departmentId (optional, department id)

## 17) /api/officer/leave
### GET /api/officer/leave
- Query:
  - officerId (optional, CUID)
  - approved (optional, true/false)
  - upcoming (optional, true/false)
  - page (optional, integer, default 1)
  - limit (optional, integer, default 20, max 100)

### POST /api/officer/leave
- Body (JSON):
  - officerId (required, CUID)
  - startDate (required, ISO date)
  - endDate (required, ISO date, must be >= startDate)
  - reason (optional, string max 500)

## 18) PATCH /api/officer/leave/:id
- Path:
  - id (required, leave record id)
- Body (JSON, at least one field required):
  - approved (optional, boolean)
  - startDate (optional, ISO date)
  - endDate (optional, ISO date)
  - reason (optional, string max 500)

## 19) GET /api/secure-api-route
- Requires authenticated Clerk session.
- No explicit request params required.

## 20) /api/users
### GET /api/users
- Query:
  - role (optional, Role enum)
  - isActive (optional, true/false)
  - search (optional, string)
  - page (optional, integer, default 1)
  - limit (optional, integer, default 20, max 100)

### POST /api/users
- Body (JSON):
  - email (required, valid email)
  - name (required, string)
  - role (optional, Role enum)
  - phone (optional, string)
  - avatarUrl (optional, string)

## 21) /api/users/:id
### GET /api/users/:id
- Path:
  - id (required, user id)

### PATCH /api/users/:id
- Path:
  - id (required, user id)
- Body (JSON, any subset):
  - email (optional, valid email)
  - name (optional, string)
  - role (optional, Role enum)
  - phone (optional, string or null)
  - avatarUrl (optional, string or null)
  - isActive (optional, boolean)

### DELETE /api/users/:id
- Path:
  - id (required, user id)

## 22) /api/users/sync
### GET /api/users/sync
- Requires authenticated Clerk session.
- No request body/query required.

### POST /api/users/sync
- Requires authenticated Clerk session.
- No request body/query required.

## 23) /api/worker
### GET /api/worker
- Query:
  - status (optional, OfficerStatus enum)
  - position (optional, Position enum)
  - departmentId (optional, CUID)
  - search (optional, string)
  - page (optional, integer, default 1)
  - limit (optional, integer, default 20, max 100)

### POST /api/worker
- Body (JSON):
  - name (required, string 2-120)
  - email (required, valid email)
  - phone (required, string 7-20)
  - departmentId (required, CUID)
  - passwordHash (optional, string)
  - avatarUrl (optional, URL)
  - bio (optional, string max 500)
  - position (optional, Position enum)
  - status (optional, OfficerStatus enum, default ACTIVE)
  - maxConcurrentComplaints (optional, integer 1-100, default 10)

## 24) /api/worker/:id
### GET /api/worker/:id
- Path:
  - id (required, worker id)

### PATCH /api/worker/:id
- Path:
  - id (required, worker id)
- Body (JSON, any subset):
  - email (optional, valid email)
  - name (optional, string)
  - phone (optional, string or null)
  - passwordHash (optional, string or null)
  - avatarUrl (optional, URL or null)
  - bio (optional, string or null)
  - departmentId (optional, CUID)
  - position (optional, Position enum or null)
  - status (optional, OfficerStatus enum)
  - maxConcurrentComplaints (optional, integer 1-100)

### DELETE /api/worker/:id
- Path:
  - id (required, worker id)

## 25) /api/worker/sync
### GET /api/worker/sync
- Requires authenticated Clerk session.
- No request body/query required.

### POST /api/worker/sync
- Requires authenticated Clerk session.
- Body (JSON):
  - departmentId (required, CUID)
  - phone (required, string 7-20)
  - passwordHash (optional, string)
  - position (optional, Position enum)
  - status (optional, OfficerStatus enum, default ACTIVE)
  - maxConcurrentComplaints (optional, integer 1-100, default 10)
  - bio (optional, string max 500)

## Enum Values Reference

### Role
- ADMIN
- MANAGER
- USER
- WORKER

### ComplaintStatus
- SUBMITTED
- ASSIGNED
- IN_PROGRESS
- RESOLVED
- CLOSED
- REJECTED

### Priority
- CRITICAL
- HIGH
- MEDIUM
- LOW
- MINIMAL

### ComplaintCategory
- POTHOLE
- STREETLIGHT
- GARBAGE
- WATER_SUPPLY
- SANITATION
- NOISE_POLLUTION
- ROAD_DAMAGE
- ILLEGAL_CONSTRUCTION
- OTHER

### DepartmentName
- ADVERTISEMENT
- BUILDING_DEPARTMENT
- DIRECTORATE_OF_INQUIRY
- ELECTION_DEPARTMENT
- FINANCE_DEPARTMENT
- INFORMATION_TECHNOLOGY
- LAW_DEPARTMENT
- PUBLIC_HEALTH_DEPARTMENT
- TOLL_TAX
- ARCHITECTURE_DEPARTMENT
- CENTRAL_ESTABLISHMENT
- DIRECTORATE_OF_PRESS_AND_INFORMATION
- ENGINEERING_DEPARTMENT
- HACKNEY_CARRIAGE
- LABOUR_WELFARE_DEPARTMENT
- LICENSING_DEPARTMENT
- REMUNERATIVE_PROJECT_CELL
- VETERINARY
- ASSESSMENT_AND_COLLECTION_DEPARTMENT
- COMMITTEE_AND_CORPORATION
- DEPARTMENT_OF_ENVIRONMENTAL_MANAGEMENT
- ELECTRICAL_AND_MECHANICAL_DEPARTMENT
- HORTICULTURE_DEPARTMENT
- LAND_AND_ESTATE
- MUNICIPAL_SECRETARY_OFFICE
- STATUTORY_AUDIT_DEPARTMENT
- VIGILANCE
- AYUSH_DEPARTMENT
- COMMUNITY_SERVICES
- EDUCATION
- FACTORY_LICENSE
- HOSPITAL_ADMINISTRATION
- LANGUAGE_DEPARTMENT
- ORGANIZATION_AND_METHOD_DEPARTMENT
- TOWN_PLANNING

### OfficerStatus
- ACTIVE
- ON_LEAVE
- INACTIVE

### Position
- JUNIOR
- SENIOR
- SUPERVISOR
- MANAGER
- DIRECTOR

### NotificationType
- COMPLAINT_SUBMITTED
- COMPLAINT_ASSIGNED
- COMPLAINT_UPDATED
- COMPLAINT_RESOLVED
- COMPLAINT_REJECTED
- ESCALATION_ALERT
- SLA_BREACH_WARNING
- SYSTEM_ANNOUNCEMENT

### FeedbackTag
- RESOLVED_QUICKLY
- GOOD_COMMUNICATION
- PROFESSIONAL
- NEEDS_IMPROVEMENT
- UNRESPONSIVE
- REOPEN_NEEDED

### AssignmentOutcome
- REASSIGNED
- ESCALATED
- RESOLVED
- SELF_WITHDRAWN
- ADMIN_REMOVED
