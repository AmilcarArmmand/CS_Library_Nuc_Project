# Software Requirements Specification (SRS)

**Project Name:** CS Library Nuc Project

**Team Members:**
- Amilcar Armmand - [Role/Responsibilities]
- Jose Gaspar Marin - [Role/Responsibilities]
- Kenny Molina - [Role/Responsibilities]


**Document Version:** Draft v1.0
**Last Updated:** 1/31/26

---

## 1. Executive Summary

### 1.1 Project Overview

The CS Library Kiosk System is an automated, self-service checkout station designed for the Computer Science Department student lounge library. It replaces the current manual, paper-based system with a touchscreen kiosk that allows students to borrow and return books using barcode scanning and student ID card authentication.

### 1.2 Problem Statement

Computer Science students currently use a manual library system that uses paper checkout slips, provides no real-time inventory tracking, and offers no automated due date management. This leads to lost books, time wasted searching for unavailable resources, and having to manually track checkouts and returns.

### 1.3 Solution Overview

Our solution is a standalone Raspberry Pi-based kiosk with integrated barcode and RFID card scanners that automates the entire library management process. The system provides instant book checkout/return, real-time inventory status, automatic ISBN lookup for cataloging, and a searchable digital catalog accessible through an intuitive touchscreen interface.

### 1.4 Client Context

Client Organization: Computer Science Department, Southern Connecticut State University
Client Contact: [IT Coordinat], IT Coordinator
Client Mission/Business: Providing resources and study space for computer science students
Project Sponsor: Faculty Advisor

The Computer Science Department needs an automated library system that reduces administrative burden, improves resource tracking, and provides better service to students. Success means having a reliable, easy-to-use system that operates independently in the student lounge with minimal maintenance requirements.

## 2. User Research & Personas

### 2.1 Research Methods

Research conducted:

- [ ] Client discovery interviews ([number] conducted)
- [ ] End-user interviews ([number] conducted)
- [X] Observation/shadowing
- [ ] Survey ([number] responses)
- [ ] Competitive analysis
- [ ] Other: [describe]

Key Findings:

1. [Finding with supporting evidence]
2. [Finding with supporting evidence]
3. [Finding with supporting evidence]

### 2.2 User Personas

Primary User Persona

Name & Role: Taylor, Computer Science Junior
Demographics: 21, Tech-savvy, comfortable with self-service systems, heavy library user
Organization Context: Full-time student, uses library resources for projects and exam preparation

Needs:

- Quick access to programming reference books[Another need]
- Ability to check availability without searching shelves
- Simple checkout/return process

Pain Points:

- Can't tell if book is available without physically searching
- Manual checkout slips easily lost

Goals:

- Efficiently borrow and return books independently
- Access up-to-date catalog

Technology Context: [Devices and tools they currently use]

Secondary User Persona
Name & Role: [e.g., "David Chen, Executive Director"]
Demographics: [Age, background, technical proficiency level]
Needs:
- [What they're trying to accomplish]
Pain Points:
- [Current challenges]
Goals:
- [What success looks like]

Third User Persona

Name & Role: [e.g., "Kevin Rivera, Student Book Donor"]

Demographics: [22, CS Student or Student Alumni]

Organization Context: [ Wants to donate technical books to help current students, interacting with kiosk to register books]

Needs:
- [Simple and guided way to donate books to CS Lounge using kiosk]
- [Scan ISBN and have details filled in]
- [Confirmation that books were donated/checked in to library database]
  
Pain Points:
- [No tracking of book donations]
  
Goals:
- [Donate books quick and efficiently]
- [Confirmation of books being donated in the system]


---

## 3. User Stories

### Format
> **As a** [type of user], **I want** [some goal] **so that** [some benefit].

### Core User Stories (Must Have)

#### Authentication & User Management

**US001:** As a student, I want to authenticate by scanning my student ID card so that I can use the system without remembering credentials.

**Acceptance Criteria:**
- [ ] Scanner reader successfully detects student ID card
- [ ] ystem validates student is authorized to use library
- [ ] User profile is created automatically
- [ ] User is redirected to main dashboard after login

---

**US002:** As an administrator, I want to log in with username and password so that I can manage the system settings and data.

**Acceptance Criteria:**
- [ ] Secure admin login screen accessible from main menu
- [ ] Failed login attempts limited to 5 before lockout
- [ ] Role-based access to different admin functions

---

#### Book Mangaement

**US003:** As a student, I want to check out a book by scanning its ISBN barcode so that I can borrow it quickly without paperwork.

**Acceptance Criteria:**
- [ ] Barcode scanner reads ISBN successfully on first try 95% of time
- [ ] System displays book details (title, author, cover image)
- [ ] Due date automatically set to 14 days from checkout
- [ ] Transaction recorded with timestamp and user ID
- [ ] Clear confirmation message with return date

---

**US004:** As a student, I want to return a book by scanning its barcode so that I can complete returns in seconds.

**Acceptance Criteria:**
- [ ] System recognizes book as currently checked out
- [ ] Return transaction recorded with timestamp
- [ ] Book status updated to "available"
- [ ] Confirmation message displayed

---

**US005:** As a student, I want to search the library catalog so that I can find books without browsing shelves.

**Acceptance Criteria:**
- [ ] Search by title, author, or keyword
- [ ] Real-time search results as user types
- [ ] Results show availability status clearly
- [ ] Detailed book view accessible from results


#### User Account Features

**US006:** As a student, I want to view my borrowed books and due dates so that I can manage my returns.

**Acceptance Criteria:**
- [ ] Display list of currently checked out books
- [ ] Show due dates with overdue items highlighted
- [ ] Option to renew books (if no holds)
- [ ] Show borrowing history (last 6 months)
- [ ] Total books checked out counter

#### Administration Features

**US007:** As an administrator, I want to add new books to the system so that the catalog stays current.

**Acceptance Criteria:**
- [ ] Manual entry form for books without ISBN
- [ ] ISBN scan auto-populates metadata from API
- [ ] Option to categorize books (programming, theory, etc.)
- [ ] Upload cover images manually if needed
- [ ] Confirmation message after successful addition


**US008:** As an administrator, I want to view all checked-out books so that I can track library usage.

**Acceptance Criteria:**
- [ ] Dashboard showing all active checkouts
- [ ] Filter by due date (today, overdue, upcoming)
- [ ] Sort by borrower name or book title
- [ ] Export list to CSV for record keeping
- [ ] Overdue items highlighted with days overdue


**US009:** As an administrator, I want to manage user accounts so that I can manage library access.

**Acceptance Criteria:**

- [ ] Set borrowing limits per user
- [ ] View borrowing history per student
- [ ] Reset system for new semester



**US010:** As an administrator, I want to generate usage reports so that I can make data-driven decisions.

**Acceptance Criteria:**
- [ ] Monthly checkout statistics
- [ ] Most popular books report
- [ ] Usage patterns by time of day/day of week
- [ ] Export reports to CSV format
- [ ] Print summary reports

---

### Should Have (Post-MVP Enhancements)

**US011:** As a student, I want to reserve books that are currently checked out so that I can get them when returned.

**US012:** As a student, I want to receive email reminders about due dates so that I don't forget to return books.

---

### Could Have (Future Considerations)

**US013:** As a department chair, I want to access library statistics from a web dashboard so that I can monitor usage remotely.

**US014:** As a student, I want to suggest books for purchase so that the collection meets student needs.

---

## 4. Features & Requirements

### 4.1 Core Features

- Touchscreen Kiosk Interface - Responsive, intuitive interface designed for quick transactions with large touch targets and clear visual feedback.

- Student ID Authentication - Barcode scanning of student ID cards for instant student identification without manual input.

- Barcode Book Scanning - Quick ISBN scanning for checkout/return with automatic metadata retrieval, using the same scanner as student authentication.

- Real-time Inventory Management - Instant status updates showing book availability, checkout history, and due dates.

- ISBN API Integration - Automatic population of book details (title, author, cover) from online databases.

- Admin Management Dashboard - Comprehensive backend for managing books, users, and generating reports.

- Offline Operation Mode - Core functionality continues during network outages with sync when reconnected.

- Automated Due Date Tracking - Automatic calculation of return dates with overdue detection and reporting.

### 4.2 Technical Requirements

#### Authentication & Authorization

- Barcode scanner authentication for students via student ID cards

- Username/password authentication for administrators

- Session management with automatic timeout

- Role-based access control (student vs. admin vs. super-admin)

#### Data Management (CRUD Operations)

- Create: Add new books, register new users, record transactions

- Read: Search catalog, view borrowing history, generate reports

- Update: Checkout/return status, user information, book details

- Delete: Archive old records, remove lost books (soft delete)

#### Database & Storage

- Primary Database: SQLite (lightweight, suitable for Raspberry Pi)

- Key Data Entities:

    - Users: student_id, name, email, department, is_active, date_joined

    - Books: isbn, title, author, publisher, year, category, status, date_added

    - Transactions: transaction_id, user_id, book_id, checkout_date, due_date, return_date, is_overdue

    - SystemLogs: log_id, action, timestamp, user_id, details

### 4.3 Non-Functional Requirements

#### Performance

- Checkout/return transaction completes within 3 seconds

- Search results display within 2 seconds

- Support for 5+ concurrent users during peak hours

- System boots to ready state within 60 seconds from power on

#### Security

- Student ID numbers stored encrypted at rest

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

- 99% uptime during library operating hours (8 AM - 10 PM)

- Daily automated database backups

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

- Terminal-based UI: ncurses (python-ncurses library)

- Python Frameworks: urwid (alternative to ncurses for more complex UIs)

- Graphical Options (if needed): PyGame, Tkinter, or Kivy for simple GUIs

- Touchscreen Support: evdev for touch input handling

- Display Management: fbcp (Framebuffer copy) for secondary display support

**Backend:**

- Runtime: Python 3.11+ (optimized for Raspberry Pi 5)

- Framework: Custom service architecture with asyncio

- Authentication: Custom barcode authentication system

- Validation: Pydantic for data validation

- Web Framework (Optional): FastAPI for admin web interface

**Database:**

- Primary Database: SQLite with aiosqlite for async operations

- Alternative: PostgreSQL with asyncpg for larger deployments

- Cache Layer: Redis (optional for performance)

**Hardware Integration:**

- Raspberry Pi GPIO: RPi.GPIO or gpiozero library

- USB Device Management: pyusb / libusb for scanner control

- Barcode Scanning: python-barcode / pyzbar for barcode decoding

- Touchscreen: evdev for touch input

- Power Management: python-raspi for system monitoring

**Deployment:**

- Platform: Raspberry Pi 5 (on-premise)

- OS: Raspberry Pi OS (64-bit) Lite

- Process Management: Systemd for daemon management

- Service Orchestration: Supervisor or systemd services

- Logging: journald (systemd journal) with Python logging integration

- Backup: rsync + cron for automated backups

**Development Tools:**

- Version Control: Git + GitHub

- Package Management: pip + uv (faster Python package installer)

- Environment Management: pipenv or poetry

- Testing: pytest + pytest-asyncio

- IDE: VS Code with SSH remote development

- Debugging: pdb++, remote debugging with VS Code

- Documentation: Sphinx for API documentation

**Third-Party Services:**

- ISBN API: Open Library API via aiohttp

- Fallback API: Google Books API

- No external authentication (self-contained system)

### 5.2 User Interface Design

**Design Principles:**

- Terminal-First Design: Optimized for 7-inch touchscreen with terminal interface

- Keyboard/Touch Navigation: Support for both keyboard shortcuts and touch taps

- High Contrast: Black/white or custom color schemes for readability

- Minimal Information: Display only essential information at each step

- Progressive Disclosure: Advanced options hidden until needed

**Key Screens:**

1. Welcome/Login Screen

  **Purpose:** Initial screen for user authentication

  **Key Elements:**

  - System header with library name

  - "Scan Student ID" prompt with blinking cursor

  - Admin login shortcut (Ctrl+A)

  - System status indicators (network, time)

  **User Actions:**

  - Scan student ID barcode

  - Press Ctrl+A for admin login

  - Tap screen to focus scanner input

2. Main Menu Screen

  **Purpose:** Central navigation hub

  **Key Elements:**

  - User greeting line

  - Numbered menu options (1. Checkout, 2. Return, 3. Search, 4. My Books)

  - Status bar with current time and logout option

  - Quick stats (books checked out)

  **User Actions:**

  - Type menu number or tap corresponding area

  - Press 'L' to logout

  - Press 'Q' to quit to terminal

3. Checkout Screen

  **Purpose:** Complete book checkout transaction

  **Key Elements:**

  - Current step indicator (Step 1/2: Scan Book)

  - Book details panel (appears after scan)

  - Confirmation prompt with (Y/N)

  - Transaction summary

  **User Actions:**

  - Scan book ISBN barcode

  - Press Y to confirm, N to cancel

  - Press ESC to return to main menu

4. Return Screen

  **Purpose:** Complete book return transaction

  **Key Elements:**

  - Scan prompt with animation

  - Return confirmation display

  - Receipt option (print or display)

  - Success/failure message

  **User Actions:**

  - Scan book barcode

  - Confirm return

  - Choose receipt option

5. Search Screen

  **Purpose:** Find books in library catalog

  **Key Elements:**

  - Search input field

  - Filter toggles (Title/Author/Category)

  - Results list with scrollable window

  - Book details pane (on selection)

  **User Actions:**

  - Type search query

  - Navigate results with arrow keys or touch

  - Select book for details

  - Press B to check out selected book

6. My Books Screen

  **Purpose:** View personal borrowing status

  **Key Elements:**

  - Current checkouts list with due dates

  - Overdue indicator (!)

  - Renew option (R) for eligible books

  - Borrowing history (last 10 transactions)

  **User Actions:**

  - View current checkouts

  - Press R to renew eligible books

  - Scroll through history

7. Admin Dashboard

  **Purpose:** System management (accessed via Ctrl+A)

  **Key Elements:**

  - Admin menu (1. Manage Books, 2. Manage Users, 3. Reports, 4. System)

  - Quick stats (total books, active users, today's checkouts)

  - System status indicators

  - Activity log window

  **User Actions:**

  - Select admin function

  - View system logs

  - Generate reports

  - Manage system settings

Terminal UI Mockup:


```bash
┌─────────────────────────────────────────┐
│   🏛️  CS LIBRARY KIOSK v1.0             │
│   ====================================  │
│                                         │
│   Please scan your student ID           │
│   ████████████████████████████████████  │
│   [Scanner ready...]                    │
│                                         │
│   Press Ctrl+A for Admin Login          │
│                                         │
│   Network: ✓   Time: 14:30   Date: 3/12 │
└─────────────────────────────────────────┘
```


### 5.3 Database Schema

```bash
┌─────────┐      ┌──────────────┐      ┌─────────┐
│  User   │ ◄────┤ Transaction  ├─────►│  Book   │
│         │      │              │      │         │
└─────────┘      └──────────────┘      └─────────┘
     │                  │                     │
     │                  │                     │
     ▼                  ▼                     ▼
┌─────────┐      ┌──────────────┐      ┌──────────┐
│  Logs   │      │   Reports    │      │ Category │
└─────────┘      └──────────────┘      └──────────┘
```

### 5.4 System Architecture

Component Diagram:

```bash
┌─────────────────────────────────────────────────────────────────────┐
│                    Raspberry Pi 5 Hardware Layer                    │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐   │
│  │  7" Touch   │  │ USB Barcode │  │   GPIO      │  │   Power   │   │
│  │  Display    │  │   Scanner   │  │   Pins      │  │  Supply   │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Device Driver Layer                              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │  evdev      │  │  libusb     │  │  RPi.GPIO   │                  │
│  │ (Touch)     │  │ (Scanner)   │  │   (GPIO)    │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                    Application Layer                                │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                 Main Application Service                    │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────┐   │    │
│  │  │   UI      │  │  Scanner  │  │   DB      │  │   API   │   │    │
│  │  │ Manager   │  │  Service  │  │  Service  │  │ Client  │   │    │
│  │  │ (ncurses) │  │           │  │ (SQLite)  │  │         │   │    │
│  │  └───────────┘  └───────────┘  └───────────┘  └─────────┘   │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Data Layer                                       │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │   SQLite    │  │   Config    │  │   Log       │                  │
│  │  Database   │  │   Files     │  │   Files     │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘

```

Request/Response Flow:

    Hardware Event: Student scans barcode or touches screen

    Driver Processing: evdev (touch) or libusb (scanner) captures input

    Event Dispatch: Main application service receives hardware event

    Business Logic Processing:

        Scanner Service decodes barcode

        DB Service queries database

        API Service fetches external data (if needed)

        Transaction Service processes checkout/return logic

    UI Update: UI Manager updates terminal display via ncurses

    Data Persistence: DB Service commits transaction to SQLite

    Logging: System logs event to both database and file system

    Response: Visual feedback shown on terminal display

Security Layer:

    Authentication:

        Student: Barcode validation against database

        Admin: Password authentication with bcrypt hashing

        Session timeout after 15 minutes of inactivity

        Failed attempt logging and lockout (5 attempts)

    Authorization:

        Role-based permissions (student vs. admin)

        Function-level access control

        Command authorization checks

    Input Validation:

        Barcode format validation (ISBN, student ID patterns)

        SQL injection prevention via parameterized queries

        Input sanitization for all user inputs

        Boundary checking for all numeric inputs

    Data Protection:

        SQLite database encryption (SQLCipher optional)

        Configuration file encryption

        Secure logging (no sensitive data in logs)

        Automated encrypted backups

        File system permissions (restricted access to data files)

---

## 6. Implementation Plan

### 6.1 Sprint Breakdown (4 Sprints)

#### Sprint 1: Foundation & Authentication
**Timeline:** [Week 7-8]
**Goal:** User authentication and basic project setup

**User Stories:**
- US001: Google OAuth login
- US002: User sessions
- Basic project structure and database setup

**Deliverables:**
- Working authentication system
- User dashboard (basic version)
- Deployed to GCP

---

#### Sprint 2: Core Feature Development
**Timeline:** [Week 9-10]
**Goal:** [Main feature implementation]

**User Stories:**
- US003: 
- US004: 
- US005: 

**Deliverables:**
- [List specific working features]
- Database models for core entities
- Basic UI for main workflows

---

#### Sprint 3: Feature Completion & Enhancement
**Timeline:** [Week 11-12]
**Goal:** [Complete remaining features and polish]

**User Stories:**
- US006-US008: [Remaining features]
- UI/UX improvements
- Error handling

**Deliverables:**
- All core features complete
- Responsive design implementation
- Improved user experience

---

#### Sprint 4: Testing, Polish & Deployment
**Timeline:** [Week 13-14]
**Goal:** Production-ready application

**Tasks:**
- User acceptance testing
- Bug fixes and refinements
- Performance optimization
- Final deployment and documentation

**Deliverables:**
- Fully tested application
- Production deployment
- User documentation
- Presentation materials

---

### 5.2 Team Member Responsibilities

**[Team Member 1]:**
- Authentication system
- User profile management
- [Other responsibilities]

**[Team Member 2]:**
- [Core feature] implementation
- Database design and models
- [Other responsibilities]

**[Team Member 3]:**
- UI/UX design and frontend
- [Core feature] implementation
- [Other responsibilities]

> **Tip:** Assign responsibilities based on team member strengths and learning goals.

### 5.3 Testing Strategy

**Testing Approaches:**
- **Manual Testing:** Test all user workflows before each sprint review
- **User Acceptance Testing:** Get feedback from potential users
- **Browser Testing:** Verify functionality on Chrome, Firefox, Safari
- **Mobile Testing:** Ensure responsive design works on various devices
- **Security Testing:** Verify authentication and data protection

**Success Criteria:**
- All user stories meet acceptance criteria
- No critical bugs in core workflows
- Application loads and performs within requirements
- Positive feedback from user testing

### 5.4 Deployment Strategy

**Development Environment:**
- Local development with hot reload
- SQLite/MongoDB local database

**Production Environment:**
- Google Cloud Platform VM
- PM2 process manager
- Nginx reverse proxy
- Production database (MongoDB Atlas / PostgreSQL)

**Deployment Process:**
1. Test locally
2. Commit to GitHub
3. Pull on GCP VM
4. Install dependencies
5. Restart PM2 process
6. Verify deployment

---

## 6. Risk Assessment

### Technical Risks

**Risk 1: [e.g., "OAuth integration complexity"]**
- **Impact:** High
- **Likelihood:** Medium
- **Mitigation:** Start authentication early, use proven libraries, allocate extra time

**Risk 2: [e.g., "Database performance with complex queries"]**
- **Impact:** Medium
- **Likelihood:** Low
- **Mitigation:** Design efficient schema, use database indexes, test with realistic data

**Risk 3: [Your specific technical risk]**
- **Impact:** [High/Medium/Low]
- **Likelihood:** [High/Medium/Low]
- **Mitigation:** [Your plan to address it]

### Project Risks

**Risk 1: [e.g., "Scope creep - too many features"]**
- **Impact:** High
- **Likelihood:** Medium
- **Mitigation:** Strict MVP focus, prioritize must-have features, defer nice-to-have items

**Risk 2: [e.g., "Team member availability"]**
- **Impact:** Medium
- **Likelihood:** Medium
- **Mitigation:** Clear task assignments, early communication, pair programming for critical features

---

## 7. Success Metrics

### User Metrics
- [Metric] - [Target] (e.g., "Users complete first task within 5 minutes")
- [Metric] - [Target] (e.g., "70% of users return within one week")

### Technical Metrics
- Page load time: < 3 seconds
- API response time: < 500ms
- Uptime: > 99% during testing period

### Team Metrics
- All sprint goals completed on time
- All team members contribute code
- Positive peer feedback on collaboration

---

## Appendix

### A. Glossary
- **Term 1:** [Definition]
- **Term 2:** [Definition]

### B. References

- [User Research Summary](link)

### C. Change Log
| Date | Version | Changes | Author |
|------|---------|---------|--------|
| [Date] | v1.0 | Initial draft | [Team] |
| [Date] | v1.1 | [Description] | [Name] |

---

**Document Status:** Draft / Review / Final
**Next Review Date:** [Date]
