## Authentication & Authorization

Two types of users exist in the system:

Admin — logs in with username + password, gets a **JWT** token. Can manage contests, problems, monitor students, view all submissions, disqualify students, etc. Student — logs in with their university email + university ID (no registration needed — their data comes from the **CSV** upload). Gets a **JWT** token scoped to student-level permissions only. Every request is role-checked. Students cannot access admin routes. Admins cannot accidentally use student routes. Tokens expire and are validated on every request.

## Contest Lifecycle

A contest goes through a strict state machine:

text

not_started → running → paused → running → ended Create: Admin creates a contest with a title, duration (in minutes), allowed languages, and type (placement or final). Start: Triggers the countdown for all students simultaneously. Only one contest can be running at a time. Pause: Freezes everything — students cannot submit, timers stop. Used for lab emergencies (power outage, network failure). Resume: Unpauses. The system tracks total paused time so students don't lose any contest minutes. End: Terminates the contest. No more submissions accepted. Timer System: The backend calculates remaining time on the server side (not client side) using startedAt, durationMinutes, and totalPausedMs. This prevents any client-side timer manipulation.

Bonus Time: If a specific student's machine crashes, the admin can grant that individual student extra minutes. Only that student's timer is extended — everyone else is unaffected.

## Problem Management

Admins create problems and attach them to a contest. Each problem has:

A letter (A, B, C, D, E), title, and full description Input/Output format descriptions Time limit (seconds) and memory limit (MB) Difficulty tag (easy, medium, hard) A set of test cases Test Cases have two types:

Visible (Sample): Students can see these. They use them to debug their code with the _Run Code_ feature before submitting. Hidden (System): Students never see these. These are used for final judging when they hit _Submit._ This is exactly how **ICPC**/Codeforces works. Draft/Published Flow: Problems start as drafts. The admin publishes them when ready. Students only see published problems. This lets admins prepare all 5 problems before the contest starts without students seeing anything early.

## Code Execution & Judging Engine

This is the core of the platform. Two modes exist:

Run (Debugging Mode):

Student clicks _Run Code_ Their code runs against only the visible sample test cases They immediately see: what they printed vs. what was expected, pass/fail per case No submission is recorded — this is just for practice/debugging Submit (Official Judging):

Student clicks _Submit_ A submission is created with verdict _queued_ The system runs their code against **ALL** test cases (visible + hidden) in the background The verdict is updated to one of: AC (Accepted), WA (Wrong Answer), **TLE** (Time Limit Exceeded), CE (Compilation Error), RE (Runtime Error), **MLE** (Memory Limit Exceeded) The student is notified of the result via WebSocket in real-time Judge Priority Chain:

Local execution (spawns Python/C++/Java process on the server) — fastest, no network dependency Wandbox **API** (free remote compiler) — fallback if local runtime isn't installed JDoodle **API** (optional, needs free **API** key) — second fallback Supported Languages: C++, Python, Java

Concurrency: A queue system limits to 3 simultaneous judge processes to prevent server overload when 75 students submit at once.

## Submissions Tracking

Every submission is permanently recorded with:

Who submitted (student), which problem, which contest The exact code they wrote The language used The verdict and per-test-case results Timestamp of submission and judging How many minutes into the contest it was submitted (for penalty calculation) Students can view their own submission history per problem. Admins can view **ALL** submissions from **ALL** students, filter by verdict/language/student, and click into any submission to read the actual code (for manual review or cheating detection).

## Live Standings

An **ICPC**-style scoreboard computed from all submissions. For each student it shows:

Total problems solved Total penalty time (calculated using **ICPC** rules: time of accepted submission + 20 minutes per wrong attempt before the accepted one) Per-problem status: solved/not solved, number of attempts, time of acceptance Sorting: Primary by problems solved (descending), secondary by penalty time (ascending) — exactly like real **ICPC**.

Caching: Standings are cached and only recomputed when a new accepted submission comes in. This keeps it fast even with hundreds of submissions.

**CSV** Export: Admin can download the final standings as a **CSV** file with all columns (Rank, Name, University ID, Lab, Score, Penalty, per-problem breakdown). This is used to determine the top 70 students after the placement test.

## Student Monitoring (Lab Grid)

The admin dashboard needs to show the status of all **150** students across Labs 5, 6, and 7. The backend supports this through:

Heartbeat System:

The student's browser sends a heartbeat ping every few seconds The backend records the last heartbeat time and the student's current state Students are categorized as: 🟢 Online — heartbeat received within the last 30 seconds 🟡 Idle — heartbeat exists but student switched tabs or lost focus 🔴 Offline — no heartbeat received (disconnected or logged out) Admin Actions on Individual Students:

Send Warning: Pushes a warning message to the student's screen via WebSocket Add Penalty: Manually adds penalty time to the student's score Disqualify: Immediately logs the student out, locks their session, and blocks all further submissions. Disqualification is permanent for that contest. ## Anti-Cheat System The student's browser reports suspicious events to the backend. The backend logs and broadcasts them.

Events Detected:

Student exited full-screen mode Student switched to another browser tab Student attempted to paste content from outside the platform (with character count) How It Works:

The frontend client detects these browser events and sends a report to the backend The backend stores the log with timestamp, student info, and event type The backend immediately broadcasts the alert to all connected admin dashboards via WebSocket Admins see a live feed of alerts and can take action (warn, penalize, disqualify) Post-Contest Plagiarism: The backend stores all submitted code, so a plagiarism comparison can be run after the contest ends by comparing code similarity across students.

## Code Auto-Save (State Persistence)

If a student's machine crashes, loses power, or their internet drops — they don't lose their work.

How It Works:

The frontend periodically sends the student's current code to the backend (auto-save, like Google Docs) Saved per student, per problem, per language When the student logs back in, the frontend can fetch the last saved code and restore it The remaining contest time is calculated server-side, so it's also preserved This fulfills the _Contingency Plan_ requirement from the original project specification.

## Email Automation (Previously Completed)

Handles sending placement test credentials to all **150** students:

**CSV** upload of student data Automated email dispatch with login details, lab assignment, and test date Domain diagnosis (detects Microsoft **365** vs Google Workspace) Retry logic for failed emails Status tracking and progress monitoring ## Real-Time Communication (WebSocket) The backend uses Socket.io to push instant updates without the frontend needing to refresh or poll:

| Event                                | Who Receives          | What It Contains                           |
| ------------------------------------ | --------------------- | ------------------------------------------ |
| New submission created               | Admins                | Student name, problem, language, timestamp |
| Submission judged                    | Admins + that student | Verdict result                             |
| Standings updated                    | Admins                | Full recalculated standings                |
| Contest started/paused/resumed/ended | Everyone              | Contest state change                       |
| Anti-cheat alert                     | Admins                | Student name, violation type, timestamp    |
| Warning sent                         | Specific student      | Warning message from admin                 |
| Time extended                        | Specific student      | Bonus seconds granted                      |

### Data Flow Summary

text

Student logs in → Gets **JWT** → Sees active contest + problems
↓
Writes code → Clicks _Run_ → Sees sample results (no record)
↓
Clicks _Submit_ → Submission queued → Judged in background
↓
Verdict pushed via WebSocket → Standings auto-update
↓
Meanwhile: Heartbeats tracked, anti-cheat events logged
↓
Admin watches everything live on dashboard
↓
Contest ends → Export **CSV** → Top 70 identified
