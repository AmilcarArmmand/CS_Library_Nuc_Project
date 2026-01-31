# Software Requirements Specification (SRS)

**Project Name:** CS Library Nuc Project

**Team Members:**
- Amilcar Armmand - [Role/Responsibilities]
- Kenny Molina - [Role/Responsibilities]
- Jose Gaspar Marin - [Role/Responsibilities]

**Document Version:** Draft v1.0
**Last Updated:** [Date]

---

## 1. Executive Summary

### 1.1 Project Overview
[2-3 sentences describing the problem your application solves. Be specific about who has the problem and why it matters.]

**Example:** "College students struggle to coordinate group study sessions because they use multiple calendar apps and messaging platforms, leading to missed meetings and wasted time planning instead of studying."

### 1.2 Solution Overview
[2-3 sentences describing what your application does to solve the problem. Focus on the core value proposition.]

**Example:** "Our platform provides a unified study group scheduler that integrates with popular calendar apps, automatically finds common availability, and sends reminders through students' preferred messaging platforms."

### 1.3 Target Users

**Primary User Persona:**
- **Name & Role:** [e.g., "Alex, 21, Computer Science Junior"]
- **Needs:** [What they're trying to accomplish]
- **Pain Points:** [Current challenges they face]
- **Goals:** [What success looks like for them]

**Secondary User Persona (if applicable):**
- **Name & Role:** [e.g., "Jordan, 20, Biology Sophomore"]
- **Needs:** [What they're trying to accomplish]
- **Pain Points:** [Current challenges they face]
- **Goals:** [What success looks like for them]

---

## 2. User Stories

### Format
> **As a** [type of user], **I want** [some goal] **so that** [some benefit].

### Core User Stories (Must Have)

#### Authentication & User Management

**US001:** As a new user, I want to sign in with my Google account so that I can start using the app immediately without creating a password.

**Acceptance Criteria:**
- [ ] User can click "Sign in with Google" button
- [ ] Google OAuth authentication completes successfully
- [ ] User profile is created automatically
- [ ] User is redirected to main dashboard after login

---

**US002:** As a returning user, I want to stay logged in so that I can access my data without re-authenticating every time.

**Acceptance Criteria:**
- [ ] User session persists for 7 days
- [ ] User can manually log out
- [ ] Session expires after 30 days of inactivity

---

#### Core Feature User Stories

**US003:** [Your first core feature]

**Acceptance Criteria:**
- [ ] [Specific testable requirement]
- [ ] [Specific testable requirement]
- [ ] [Specific testable requirement]

---

**US004:** [Your second core feature]

**Acceptance Criteria:**
- [ ] [Specific testable requirement]
- [ ] [Specific testable requirement]
- [ ] [Specific testable requirement]

---

**US005:** [Your third core feature]

**Acceptance Criteria:**
- [ ] [Specific testable requirement]
- [ ] [Specific testable requirement]
- [ ] [Specific testable requirement]

---

> **Tip:** Add 5-10+ more user stories covering all your core features. Group them by feature area (e.g., "Data Management", "Search & Discovery", "Notifications").

---

## 3. Features & Requirements

### 3.1 Core Features
1. **[Feature Name]** - [Brief description of what it does and why it matters]
2. **[Feature Name]** - [Brief description]
3. **[Feature Name]** - [Brief description]
4. **[Feature Name]** - [Brief description]
5. **[Feature Name]** - [Brief description]

### 3.2 Technical Requirements

#### Authentication & Authorization
- Google OAuth 2.0 Single Sign-On (SSO)
- User profile creation and management
- Session management (7-day persistence, 30-day expiration)
- [Add any role-based access requirements if applicable]

#### Data Management (CRUD)
- **Create:** [What users can create - e.g., "Users can create study groups"]
- **Read:** [What users can view - e.g., "Users can view all available study times"]
- **Update:** [What users can modify - e.g., "Users can update their availability"]
- **Delete:** [What users can remove - e.g., "Users can delete past study sessions"]

#### Database & Storage
- **Primary Database:** [MongoDB / PostgreSQL]
- **Key Data Entities:**
  - [Entity 1 - e.g., "Users (profile, preferences, auth tokens)"]
  - [Entity 2 - e.g., "Study Groups (name, members, schedule)"]
  - [Entity 3 - e.g., "Availability (user, time slots, recurring patterns)"]

### 3.3 Non-Functional Requirements

#### Performance
- Page load times under 3 seconds
- API response times under 500ms for standard queries
- Support for [number] concurrent users

#### Security
- HTTPS encryption for all data transmission
- Secure storage of authentication tokens
- Input validation and sanitization
- Protection against common vulnerabilities (SQL injection, XSS, CSRF)

#### Usability
- Responsive design (works on desktop and mobile)
- Intuitive navigation with clear labels
- Helpful error messages
- Accessibility compliance (keyboard navigation, screen reader support)

---

## 4. System Design

### 4.1 Technology Stack

**Frontend:**
- HTML/CSS/JavaScript
- EJS templating
- Bootstrap or Tailwind CSS for styling

**Backend:**
- Node.js
- Express.js framework
- Passport.js for OAuth authentication

**Database:**
- [MongoDB / PostgreSQL]
- [ODM/ORM if applicable]

**Deployment:**
- Google Cloud Platform (GCP)
- PM2 for process management
- Nginx for reverse proxy

**Third-Party Services:**
- Google OAuth 2.0
- [Any other APIs or services you'll use]

### 4.2 User Interface Design

**Key Screens:**
1. **Landing Page** - [Brief description of what users see and can do]
2. **Dashboard** - [Main interface after login]
3. **[Core Feature Screen]** - [Description]
4. **[Core Feature Screen]** - [Description]
5. **Profile/Settings** - [User account management]

> **Tip:** Include wireframes or mockups here. Can be hand-drawn and scanned, or created with Figma/Draw.io.

### 4.3 Database Schema

**Entity: User**
```
{
  _id: ObjectId,
  googleId: String,
  email: String,
  name: String,
  profilePicture: String,
  createdAt: Date,
  lastLogin: Date
}
```

**Entity: [Your Main Entity]**
```
{
  _id: ObjectId,
  [field]: [type],
  [field]: [type],
  createdBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

> **Tip:** Add all your main data entities with their fields and relationships.

### 4.4 System Architecture

**Architecture Pattern:** MVC (Model-View-Controller)

**Request Flow:**
1. User makes request (browser)
2. Nginx reverse proxy forwards to Express
3. Express routes request to appropriate controller
4. Controller interacts with database models
5. Data rendered through EJS templates
6. Response sent back to user

> **Tip:** Include an architecture diagram showing how components connect.

---

## 5. Implementation Plan

### 5.1 Sprint Breakdown (4 Sprints)

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
- US003: [Core feature]
- US004: [Core feature]
- US005: [Core feature]

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
- [AI Confidence Framework](link)
- [Design Brief](link-to-your-design-brief)
- [User Research Summary](link)

### C. Change Log
| Date | Version | Changes | Author |
|------|---------|---------|--------|
| [Date] | v1.0 | Initial draft | [Team] |
| [Date] | v1.1 | [Description] | [Name] |

---

**Document Status:** Draft / Review / Final
**Next Review Date:** [Date]
