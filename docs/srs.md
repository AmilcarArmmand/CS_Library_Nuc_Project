# Software Requirements Specification (SRS)

**Project Name:** CS Library Nuc Project

**Team Members:**
- Amilcar Armmand - Project Lead, Hardware Integration, Database, - armmanda1@southernct.edu
- Jose Gaspar Marin - Web Frontend, Backend (Admin and Remote Access) - gasparmarij1@southernct.edu
- Kenny Molina - Web Frontend (Core Kiosk) - molinak4@southernct.edu


**Document Version:** v4.0
**Last Updated:** 5/11/26

---

<!-- PAGEBREAK -->

## 1. Executive Summary

### 1.1 Project Overview

The CS Library Kiosk System is an automated, self-service checkout station designed for the Computer Science Department student lounge library. It replaces the current manual, paper-based system with a touchscreen kiosk that allows students to borrow and return books using barcode scanning and student ID card authentication.

### 1.2 Problem Statement

Computer Science students currently use a manual library system that uses paper checkout slips, provides no real-time inventory tracking, and offers no automated due date management. This leads to lost books, time wasted searching for unavailable resources, and having to manually track checkouts and returns.

### 1.3 Solution Overview

Our solution is a kiosk-first web application with a Raspberry Pi-friendly kiosk client, a cloud-hosted Node.js/Express backend, and a PostgreSQL database. The system provides instant book checkout/return, real-time inventory status, automatic ISBN lookup for cataloging, and a searchable digital catalog accessible through both the kiosk and a companion web portal.

### 1.4 Client Context

Client Organization: Computer Science Department, Southern Connecticut State University
Client Contact: IT Coordinator, Computer Science Department Faculty Advisor
Client Mission/Business: Providing resources and study space for computer science students
Project Sponsor: Faculty Advisor

The Computer Science Department needs an automated library system that reduces administrative burden, improves resource tracking, and provides better service to students. Success means having a reliable, easy-to-use system that operates independently in the student lounge with minimal maintenance requirements.

## 2. User Research & Personas

### 2.1 Research Methods

Research conducted:

- Observation or shadowing of current CS Lounge library usage
- Discussions with students using the CS Lounge
- Review the existing manual checkout workflow


Key Findings:

1. The CS Library shelf has a limited selection of books. There is room to add more books. We can add more books through donations which we plan to implement a way for students to give away CS books that they don't need anymore.
2. The only way to check in and out of books is to fill out a paper with the book name, the check in date and check out date.
3. There is more than enough room in the space to set up the device. There is also space to connect the NUC via Ethernet.

### 2.2 User Personas

Primary User Persona

Name & Role: Taylor, Computer Science Junior
Demographics: 21, Tech-savvy, comfortable with self-service systems, heavy library user
Organization Context: Full-time student, uses library resources for projects and exam preparation

Needs:

- Quick access to programming reference books
- Ability to check availability without searching shelves
- Simple checkout/return process

Pain Points:

- Can't tell if book is available without physically searching
- Manual checkout slips easily lost

Goals:

- Efficiently borrow and return books independently
- Access up-to-date catalog

Secondary User Persona
Name & Role: Professor James, CS Faculty Administrator
Demographics: 43, Faculty Member, strong technical proficiency

Needs:
- The ability to monitor inventory and checkout activity
- A easy way to add and remove books from the system
  
Pain Points:
- Manual tracking of books means there is a chance of missing items
- Can't see who has borrowed books
- The overhead is time-consuming
  
Goals:
- Reduce overhead and manual work of managing the library
- Ensure books are accounted for
- Improve the accessibility of books for students

Third User Persona

Name & Role: Kevin Rivera, Student Book Donor

Demographics: 22, CS Student or Student Alumni

Organization Context: Wants to donate technical books to help current students, interacting with kiosk to register books

Needs:
- Simple and guided way to donate books to CS Lounge using kiosk
- Scan ISBN and have details filled in
- Confirmation that books were donated/checked in to library database
  
Pain Points:
- No tracking of book donations
  
Goals:
- Donate books quick and efficiently
- Confirmation of books being donated in the system


---

## 3. User Stories

### Core User Stories (Must Have)

#### Authentication & User Management

**US001:** As a student, I want to authenticate by scanning my student ID card so that I can use the system without remembering credentials. 

Owner: Kenny

**Acceptance Criteria:**
- [ ] Scanner reader successfully detects student ID card
- [ ] System validates student is authorized to use library against the database within 1 second
- [ ] User profile is created automatically if not present
- [x] User is redirected to main dashboard after login
- [x] UI will display a notification if clear success or error

---

**US002:** As an administrator, I want to log in with username and password so that I can manage the system settings and data.

Owner: Jose

**Acceptance Criteria:**
- [ ] Secure admin login screen accessible from main menu
- [x] Failed login attempts limited to 5 before lockout
- [x] Role-based access to different admin functions
- [x] Using bcrypt to validate the hashed password
- [x] Role-based access to validate user type, admin/student before routing to dashboard

---

#### Book Management

**US003:** As a student, I want to check out a book by scanning its ISBN barcode so that I can borrow it quickly without paperwork.

Owner: Kenny

**Acceptance Criteria:**
- [ ] Barcode scanner reads ISBN successfully on first try 95% of time
- [ ] System displays book details (title, author, cover image) within 1.5 seconds
- [x] Due date automatically set to 14 days from checkout
- [x] Transaction recorded with timestamp and user ID
- [x] Clear confirmation message with return date
- [x] Database updates the book status to checked out instantly upon confirmation

---

**US004:** As a student, I want to return a book by scanning its barcode so that I can complete returns in seconds.

Owner: Kenny

**Acceptance Criteria:**
- [x] System recognizes book as currently checked out
- [x] Scanner reads ISBN and queries the database
- [x] Database book status updates to available instantly upon scan
- [x] Book status updated to "available"
- [x] UI displays confirmation message

---

**US005:** As a student, I want to search the library catalog so that I can find books without browsing shelves.

Owner: Kenny

**Acceptance Criteria:**
- [x] Search by title, author, or keyword
- [x] UI displays results, displaying 12 books per page to prevent any overload
- [x] Status badge outputs available(green) or checked out(red) based on database state



#### User Account Features

**US006:** As a student, I want to view my borrowed books and due dates so that I can manage my returns.

Owner: Kenny

**Acceptance Criteria:**
- [x] Display list of currently checked out books
- [x] UI highlights books where due date less than current date in red
- [ ] Option to renew books (if no holds)
- [ ] Show borrowing history (last 6 months)
- [x] Total books checked out counter
- [x] System restricts the renew button if the current date to already past the due date

#### Administration Features

**US007:** As an administrator, I want to add new books to the system so that the catalog stays current.

Owner: Jose

**Acceptance Criteria:**
- [x] Manual entry form for books without ISBN
- [x] Open Library API request fetches and parses metadata with scan
- [x] ISBN scan auto-populates metadata from API
- [ ] Option to categorize books (programming, theory, etc.)
- [ ] Upload cover images manually if needed
- [x] Confirmation message after successful addition


**US008:** As an administrator, I want to view all checked-out books so that I can track library usage.

Owner: Jose

**Acceptance Criteria:**
- [x] Dashboard showing all active checkouts
- [ ] Filter by due date (today, overdue, upcoming)
- [x] Sort by borrower name or book title
- [x] Export list to CSV for record keeping
- [x] Overdue items highlighted with days overdue


**US009:** As an administrator, I want to manage user accounts so that I can manage library access.

Owner: Jose

**Acceptance Criteria:**

- [ ] Set borrowing limits per user
- [x] View borrowing history per student
- [ ] Reset system for new semester



**US010:** As an administrator, I want to generate usage reports so that I can make data-driven decisions.

Owner: Jose

**Acceptance Criteria:**
- [x] Monthly checkout statistics
- [x] Most popular books report
- [x] Usage patterns by time of day/day of week
- [x] Export reports to CSV format
- [x] Print summary reports

**US011:** As a Book Donor, I want to be able to donate a book using the kiosk by scanning its ISBN, which should add the book to the CS Lounge Library Database.

Owner: Jose

**Acceptance Criteria:**
 - [x] Donor scans book ISBN at kiosk
 - [x] System fills in book metadata from ISBN
 - [x] Donor can also manually enter details if ISBN is invalid or missing
 - [x] Confirmation from system that book has been added to the database successfully
 - [x] Donation is logged with timestamp

**US012:** As a student, I want to reserve books that are currently checked out so that I can get them when returned.

**Acceptance Criteria:**
- [x] Track books that have been checked out
- [x] View currently checked out books marked in the system
- [ ] Schedule a pickup date, if pre-existing days are scheduled from other users
- [ ] Notify the student when the book has been returned, based on scheduled time, for pickup

----

### Should Have (Post-MVP Enhancements)

**US013:** As a student, I want to receive email reminders about due dates so that I don't forget to return books.

Owner: Amilcar

**Acceptance Criteria:**

- [x] Set the system to have a pre-due reminder to notify students that their book is almost due
- [x] System emails them based on the pre-due reminder period set
- [x] If the student does not return the book in time, set the system to create an overdue email to the user

---

### Could Have (Future Considerations)

**US014:** As a department chair, I want to access library statistics from a web dashboard so that I can monitor usage remotely.

Owner: Jose

**Acceptance Criteria:**
- [ ] System must track every action created by the end user (book check ins, book check outs, etc.)
- [ ] Dashboard is created to view statistics
- [ ] Department chair is given admin credentials and access

**US015:** As a student, I want to suggest books for purchase so that the collection meets student needs.

Owner: Jose

**Acceptance Criteria:**
- [x] User fills out a form on the page detailing what books can be purchased
- [x] System collects every form filled out
- [x] Administrators view the form and review it for further consideration

**US016:** As a department administrator, I want the system to support non-book equipment lending so that the same kiosk and web workflow can manage additional CS department resources.

Owner: Future Work

**Acceptance Criteria:**
- [ ] Add an item type field for books, equipment, and other lendable resources
- [ ] Display equipment-specific metadata in the catalog and admin tools
- [ ] Support checkout, return, and reporting for equipment items

**US017:** As a student, I want to leave lightweight reviews or feedback on library items so that other students can discover useful resources.

Owner: Future Work

**Acceptance Criteria:**
- [ ] Student can submit a rating or short review for an item
- [ ] Admin can moderate submitted feedback before it becomes visible
- [ ] Catalog can display approved feedback to support student engagement

---



## 4. Features & Requirements

### 4.1 Core Features

- Touchscreen Kiosk Interface - Touch-optimized UI with larger touch targets designed to allow a complete checkout in 4 or fewer taps.

- Student ID Authentication - Student ID scans are processed through the kiosk workflow and validated against the shared library database.

- Barcode Book Scanning - ISBN scanning integration that reads an retrieves database metadata with each scan

- Real-time Inventory Management - Instant status updates showing book availability, checkout history, and due dates.

- ISBN API Integration - Automatic population of book details (title, author, cover) from online databases.

- Admin Management Dashboard - Comprehensive backend for managing books, users, and generating reports.

- Web Portal Access - Remote browser access for registration, catalog browsing, holds, suggestions, and account management.

- Donation Intake Workflow - Kiosk donation flow with ISBN lookup and manual-entry fallback.

- Automated Due Date Tracking - Automatic calculation of return dates with overdue detection and reporting.

### 4.2 Technical Requirements

#### Authentication & Authorization

- Barcode scanner authentication for students via student ID cards

- Username/password authentication for administrators and web-portal users

- Optional OAuth support for Google and Microsoft sign-in

- Session management with automatic timeout

- Role-based access control (student vs. admin)

#### Data Management (CRUD Operations)

- Create: Add new books, register new users, record transactions, submit holds and suggestions

- Read: Search catalog, view borrowing history, generate reports

- Update: Checkout/return status, user information, book details

- Delete: Remove catalog records for books with no active loans; archival workflows remain future work

#### Database & Storage

- Primary Database: PostgreSQL (department-hosted server)

- Key Data Entities:

    - Users: student_id, name, email, password_hash, google_id, role, active, last_login

    - Books: isbn, title, author, cover, status, shelf

    - Loans: user_id, isbn, checked_out, due_date, returned, returned_date

    - Holds: user_id, isbn, status, pickup_date, created_at

    - Suggestions: user_id, title, author, reason, status, created_at

- Schema Management: Type-safe schema and migrations managed through Drizzle ORM and drizzle-kit

### 4.3 Non-Functional Requirements

#### Performance

- Checkout/return transaction completes within 3 seconds

- Search results display within 2 seconds

- Support for 5+ concurrent users during peak hours

- System boots to ready state within 60 seconds from power on

#### Security

- Student ID numbers stored in the application database and handled as institutional identifiers; additional encryption-at-rest controls depend on the hosting database environment

- No sensitive personal information stored in system

- Input validation on all user inputs

- Protection against SQL injection and XSS attacks

- Physical security measures for Raspberry Pi unit

#### Usability

- Touchscreen-optimized interface with 44px minimum touch targets

- High contrast display readable in various lighting conditions

- Clear audio feedback for successful scans

- Intuitive icon-based navigation

- Minimal training required for new users

- Single barcode scanner for both student IDs and books to simplify user interaction

#### Reliability

- 99% uptime target during library operating hours (8 AM - 10 PM)

- Scheduled backups and deployment recovery scripts for the hosted environment

- Graceful recovery from power interruptions

- Error logging with timestamp and user context

#### Accessibility

- Screen reader compatibility for visually impaired users

- Keyboard navigation support for motor-impaired users

- High contrast mode option

- Adjustable text size (within limits of fixed display)

#### Hardware Requirements

- Single USB barcode scanner compatible with both ISBN barcodes and student ID barcodes

- Raspberry Pi 4 (4GB RAM minimum)

- 7-inch touchscreen display

- Optional receipt printer for transaction records

- Uninterruptible power supply (UPS) for graceful shutdown

---

## 5. System Design

### 5.1 Technology Stack

**Frontend:**

- Web templates: EJS-rendered server views

- Styling: Custom CSS with responsive layouts

- Client-side behavior: Vanilla JavaScript for kiosk and portal interactions

- Architecture: Web Portal and Kiosk Site

**Backend:**

- Runtime: Node.js 20+

- Framework: Express 4 with TypeScript

- Authentication: Student ID sign-in for kiosk, email/password for the web portal, bcrypt password hashing, optional Google/Microsoft OAuth

- Session handling: express-session with PostgreSQL-backed session storage

- ORM / DB access: Drizzle ORM with node-postgres

**Database:**

- Primary Database: PostgreSQL

- Current Schema: users, books, loans, holds, suggestions

- Asset Handling: Remote cover URLs with local static assets for branding/icons

- Migrations: drizzle-kit generate/migrate workflow

**Hardware Integration:**

- Current Input Model: keyboard-style USB scanner input and manual text-entry fallback

- Target Hardware: Raspberry Pi, USB barcode scanner, touchscreen display

- Scanner Strategy: scanner behaves like typed input in the current build, with form fields kept scanner-focused in kiosk workflows

- Power Management: graceful shutdown and backup strategy for the deployment environment

**Deployment:**

- Application Host: Department-managed Linux VM for the shared web app and database-backed API

- Kiosk Client: Raspberry Pi or comparable Linux kiosk device on the local network

- Reverse Proxy: Nginx or equivalent reverse proxy in front of the Node.js app for TLS termination

- Process Management: `npm start` / `tsx` during development, PM2 or systemd suitable for persistent deployment

- Logging: application stdout/stderr plus server logs

- Backup: rsync + cron for automated backups

**Development Tools:**

- Version Control: Git + GitHub

- Package Management: npm

- Environment Management: `.env` configuration files

- Testing Direction: route-level and browser-based smoke testing, with automated TypeScript tests recommended for future maintenance

- IDE: VS Code with SSH remote development

- Debugging: browser devtools, Node.js logs, and remote shell access

- Documentation: Markdown project documentation

**Third-Party Services:**

- ISBN API: Open Library API via `fetch`

- Optional external authentication: Google OAuth 2.0 and Microsoft identity integration

### 5.2 User Interface Design

**Design Principles:**

- Web-First Design: Responsive web application accessible via the Kiosk touchscreen or any remote browser.

- Keyboard/Touch Navigation: Support for both keyboard shortcuts and touch taps

- Modern UI: custom color schemes for readability

- Minimal Information: Display only essential information at each step

- Progressive Disclosure: Advanced options hidden until needed

**Key Screens:**

1. Kiosk Sign-In Screen

  **Purpose:** Authenticate a student for the kiosk workflow

  **Key Elements:**

  - SCSU-branded welcome layout
  - Student ID input with scanner-friendly focus behavior
  - Sign-in confirmation and validation messaging
  - Timestamp / system status display

  **User Actions:**

  - Scan or type a student ID
  - Submit sign-in
  - Continue into the kiosk dashboard

2. Web Portal Sign-In / Registration

  **Purpose:** Support remote access for email/password users

  **Key Elements:**

  - Email and password sign-in form
  - Registration page for new accounts
  - Validation feedback for duplicate or invalid credentials

  **User Actions:**

  - Register a new account
  - Sign in with email and password
  - Navigate to the browse-only dashboard

3. Catalog Dashboard

  **Purpose:** Central navigation hub for browsing and selecting actions

  **Key Elements:**

  - Top navigation tabs (Browse, Checkout, Return, My Books, Search)
  - Book card grid with cover images and availability badges
  - Search toggle and pagination controls
  - User identity and logout controls

  **User Actions:**

  - Browse the collection
  - Search by title or author
  - Switch between major workflow tabs

4. Checkout Workspace

  **Purpose:** Complete one or more checkout transactions

  **Key Elements:**

  - ISBN input for scanner or manual entry
  - Live cart summary
  - Book detail preview and due-date display
  - Checkout confirmation button

  **User Actions:**

  - Scan or type an ISBN
  - Review the cart
  - Confirm checkout

5. Return Workspace

  **Purpose:** Process returned books quickly

  **Key Elements:**

  - Return scan/input field
  - Returned-book cover and title confirmation
  - Status message for successful or invalid returns

  **User Actions:**

  - Scan or type a book barcode / ISBN
  - Confirm the returned item visually

6. My Books Screen

  **Purpose:** Show active loans and borrowing history

  **Key Elements:**

  - Active loan list with due dates
  - Renewal action for eligible books
  - Borrowing history section
  - Hold-related messaging for renewal restrictions

  **User Actions:**

  - Review active and returned books
  - Renew eligible books
  - Monitor due dates

7. Admin Dashboard

  **Purpose:** Manage books, users, reports, suggestions, and circulation data

  **Key Elements:**

  - Book and user management tools
  - Checkout / usage reporting
  - Loan exports and overdue visibility
  - Suggestion review workflow

  **User Actions:**

  - Manage catalog data
  - Review usage and loan activity
  - Maintain user roles and suggestion workflows


### 5.3 Database Schema

```bash
┌─────────┐       ┌─────────┐
│  User   │◄──────┤  Loan   ├──────►│  Book   │
└─────────┘       └─────────┘       └─────────┘
     ▲                 ▲                 ▲
     │                 │                 │
     └────────────┐    │    ┌────────────┘
                  ▼    ▼    ▼
                ┌─────────────┐
                │    Hold     │
                └─────────────┘
```

Entity: User
```bash
{
  "id": "Serial integer (primary key)",
  "student_id": "String (unique, optional for OAuth-first users)",
  "name": "String (required)",
  "email": "String (unique, required)",
  "password_hash": "String (optional for OAuth users)",
  "google_id": "String (unique, optional)",
  "picture": "String (optional)",
  "role": "String (default: 'user')",
  "active": "Boolean (default: true)",
  "last_login": "Timestamp with timezone (optional)",
  "created_at": "Timestamp with timezone",
  "updated_at": "Timestamp with timezone"
}
```

Entity: Book
```bash
{
  "isbn": "String (primary key)",
  "title": "String (required)",
  "author": "String (required)",
  "cover": "String (default empty string)",
  "status": "String (default: 'Available')",
  "shelf": "String (default empty string)"
}
```

Entity: Loan
```bash
{
  "id": "Serial integer (primary key)",
  "user_id": "Integer (ref: users.id, required)",
  "isbn": "String (ref: books.isbn, required)",
  "checked_out": "Timestamp with timezone",
  "due_date": "Timestamp with timezone",
  "returned": "Boolean (default: false)",
  "returned_date": "Timestamp with timezone (optional)"
}
```

Entity: Hold
```bash
{
  "id": "Serial integer (primary key)",
  "user_id": "Integer (ref: users.id, required)",
  "isbn": "String (ref: books.isbn, required)",
  "status": "String (default: 'pending')",
  "pickup_date": "Timestamp with timezone (optional)",
  "created_at": "Timestamp with timezone"
}
```

Entity: Suggestion
```bash
{
  "id": "Serial integer (primary key)",
  "user_id": "Integer (ref: users.id, required)",
  "title": "String (required)",
  "author": "String (default empty string)",
  "reason": "Text (default empty string)",
  "status": "String (default: 'pending')",
  "created_at": "Timestamp with timezone"
}
```

Donation logging, fine tracking, and additional reporting tables remain future schema extensions.

### 5.4 System Architecture

Component Diagram:

```bash
┌──────────────────────┐      ┌───────────────────────────┐
│ Kiosk Browser / Pi   │─────►│ Kiosk Express Client      │
│ + USB Scanner Input  │      │ - local session/cart      │
└──────────────────────┘      │ - proxy to cloud API      │
                              └──────────────┬────────────┘
                                             │
┌──────────────────────┐                     ▼
│ Web Portal Browser   │─────►┌───────────────────────────┐
└──────────────────────┘      │ Node.js + Express App     │
                              │ - auth/session handling   │
                              │ - catalog workflows       │
                              │ - checkout/return/renew   │
                              │ - admin + reports         │
                              └──────────────┬────────────┘
                                             │
                           ┌─────────────────┴─────────────────┐
                           ▼                                   ▼
              ┌───────────────────────────┐      ┌───────────────────────────┐
              │ PostgreSQL Data Layer     │      │ Open Library API          │
              │ users/books/loans/holds/  │      │ metadata and cover data   │
              │ suggestions + sessions    │      └───────────────────────────┘
              └───────────────────────────┘
```

Request/Response Flow:

    Input Event: Student scans or types a student ID / ISBN, or uses the touchscreen / portal UI

    Event Dispatch: The kiosk client or web route receives the request in the Express application

    Business Logic Processing:

        Input helpers normalize student IDs and ISBNs

        Drizzle ORM queries PostgreSQL for users, books, loans, holds, and suggestions

        Open Library metadata is requested when a scanned ISBN is not already in the local catalog

        Checkout, return, renewal, hold, suggestion, and admin workflows update the data model

    UI Update: EJS-rendered pages and client-side JavaScript refresh the current view

    Data Persistence: PostgreSQL commits the transaction on the shared server

    Response: Visual feedback is shown on kiosk or web UI

Security Layer:

    Authentication:

        Student: Student ID validation against the shared users table for kiosk sign-in

        Web/Admin: Email/password authentication with bcrypt hashing

        Optional OAuth: Google and Microsoft sign-in supported when configured

        Admin login lockout: 5 failed attempts trigger a temporary lockout

    Authorization:

        Role-based permissions (student vs. admin)

        Shared route guards for kiosk API, web dashboard, and admin pages

    Input Validation:

        Student ID and ISBN format validation

        SQL injection prevention via parameterized queries

        Input sanitization for all user inputs

        Boundary checking for all numeric inputs

    Data Protection:

        Environment-based secret management

        Secure logging (no sensitive data in logs)

        Session data stored server-side in PostgreSQL

        Reverse-proxy TLS termination in front of the Node.js service

---

## 6. Implementation Plan

### 6.1 Sprint Breakdown (4 Sprints)

#### Sprint 1: Foundation & Authentication (Target: Progress Report 1 - March 2)
**Timeline:** Week 3-6
**Goal:** Project foundation and baseline authentication

**Status:** Complete

**Tasks:**
- Amilcar: Project planning, research, and early hardware investigation
- Kenny: Initial kiosk interface and student sign-in flow
- Jose: Baseline data model, user registration, and authentication support

**Deliverables:**
- Working login and dashboard foundation

---

#### Sprint 2: Core Feature Development
**Timeline:** Week 7-9
**Goal:** Library Workflows and external integrations

**Status:** Complete

**Tasks:**
- Amilcar: Metadata integration planning and workflow validation
- Kenny: Search, manual fallback input, checkout, return, and My Books workflows
- Jose: Registration/login improvements, seed data, and backend circulation support

**Deliverables:**
- Functional checkout / return flow with Open Library metadata support
---

#### Sprint 3: Feature Completion & Enhancement (Target: Progress Report 2 )
**Timeline:** Week 10-12
**Goal:** Polish the prototype for Progress Report II

**Status:** Mostly complete

**Tasks:**
- Amilcar: Continue hardware planning and deployment research
- Kenny: Refine kiosk dashboard flow, renewals, and responsive UI behavior
- Jose: Improve portal auth flow, database persistence, and supporting backend logic

**Deliverables:**
- PR2-ready prototype with kiosk and web portal workflows

---

#### Sprint 4: Testing, Polish & Deployment
**Timeline:** Week 13-14
**Goal:** Final-phase completion and validation

**Status:** Complete with minor post-semester follow-up items

**Tasks:**
- Team: Completed admin dashboard polish, hold and donation workflows, VM deployment, documentation, and final validation; remaining follow-up items are Microsoft SSO verification, broader automated tests, and final kiosk hardware confirmation

---

## 7. Risk Assessment

### Technical Risks

**Risk 1: SD Card Corruption**
- **Impact:** High
- **Likelihood:** Medium
- **Mitigation:** The kiosk device should remain stateless where possible, with primary application data stored on the server-side PostgreSQL database. Raspberry Pi configuration and kiosk assets should still be backed up regularly.

**Risk 2: Network Dependencies and Database Outages**
- **Impact:** High
- **Likelihood:** Medium
- **Mitigation:** The kiosk app should provide graceful failure messaging, fast health checks, and operational restart scripts. Automated backups and service monitoring are required because the current architecture depends on the shared VM and PostgreSQL service.

**Risk 3: Campus IT Approval**
- **Impact:** High
- **Likelihood:** Low
- **Mitigation:** Waiting for SSO credentials from IT, team is using a mock authentication system until IT provides credentials then we swap for integration.

**Risk 4: Barcode Error Hardware Failure**
- **Impact:** Medium
- **Likelihood:** High
- **Mitigation:** The kiosk UI includes manual text-entry fallback. If the physical USB scanner fails, users can continue by typing student IDs and ISBNs directly on the touchscreen.

**Risk 5: Hardware Integration / Delays**
- **Impact:** High
- **Likelihood:** Low
- **Mitigation:** The web app includes manual text input so hardware does not block feature development. The USB scanner behaves like keyboard input, so the kiosk software can still be tested on laptops before final Pi deployment.

## 8. Success Metrics

- System remained deployable as separate web and kiosk services on the school server
- Book checkout and return workflows were implemented as a working end-to-end circulation process
- Core catalog, hold, renewal, suggestion, donation, and admin workflows were completed for final delivery

---
## 9. Testing Strategy

### 9.1 Testing Overview

- The project is tested at three levels: unit, integration, and system.
- The current workflow relies primarily on manual smoke testing of the Node.js routes, kiosk flows, and admin pages against the shared PostgreSQL environment.
- Final-phase validation also included successful TypeScript build verification for both the main web app and the kiosk app.

### 9.2 Unit Testing

Targeted units include:

- student ID and ISBN normalization / validation helpers
- user registration and email authentication logic
- checkout, renewal, and return logic
- catalog lookup and hold logic

Recommended future tooling:

- `vitest` or `jest`
- `supertest`

### 9.3 Integration Testing

Integration tests focus on:

- registration followed by successful authentication
- checkout followed by correct appearance in My Books
- return followed by correct borrowing-history updates
- kiosk login against the shared database
- Open Library lookup when an ISBN is not already in the server catalog

### 9.4 System Testing

System tests cover:

- web portal sign-in page load
- registration page navigation
- kiosk browse / checkout / return workflows
- invalid-input handling
- scanner validation on target hardware

### 9.5 Current PR2 Status

- Manual smoke checks completed for core auth, catalog, checkout, return, renewal, hold, donation, and admin CRUD flows
- Successful build verification completed for both deployable applications
- Automated TypeScript test coverage has not been implemented yet
- Remaining work: broader end-to-end UI coverage, hardware scanner validation on the final Raspberry Pi device, and regression automation

## 10. Appendix

### A. Glossary
- **ISBN:** International Standard Book Number - A unique numeric commercial book identifier
- **EJS:** Embedded JavaScript templating engine used to render server-side views
- **Drizzle ORM:** Type-safe TypeScript ORM used for PostgreSQL access and schema management
- **PostgreSQL:** Relational database used by the current application

### B. References

**Technical References**
- Raspberry Pi Foundation. (2024). Raspberry Pi Documentation. https://www.raspberrypi.com/documentation/
- Open Library API Documentation. https://openlibrary.org/developers/api
- Express Documentation. https://expressjs.com/
- PostgreSQL Documentation. https://www.postgresql.org/docs/
- Drizzle ORM Documentation. https://orm.drizzle.team/

### C. Change Log
| Date | Version | Changes | Author |
|------|---------|---------|--------|
| Feb 6, 2026 | v1.0 | Initial submission | Team |
| Mar 2, 2026 | v2.0 | PR1 revisions and requirement updates | Team |
| Mar 30, 2026 | v3.0 | PR2 revisions, aligned architecture and schema to current prototype, refreshed sprint plan, and added detailed testing strategy | Team |
| Apr 8, 2026 | v3.1 | Updated the document to reflect the Node.js/Express/TypeScript refactor, PostgreSQL deployment model, current schema, and revised testing/deployment language | Team |
| May 8, 2026 | v4.0 | Finalized the SRS to match the delivered system, refreshed testing and implementation status, and aligned requirements with the final project scope | Team |


---

**Document Status:** Final
**Next Review Date:** N/A

Prepared by: CS Library Team
Course: CSC400 - Computer Science Project Seminar 
Semester: Spring 2026 
