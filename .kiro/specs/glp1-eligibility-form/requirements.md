# Requirements Document

## Introduction

PhoenixLabs GLP-1 Medication Eligibility Screening Form — a full-stack monorepo application that guides patients through a 15-screen medical questionnaire, computes BMI, evaluates eligibility using a pure function evaluator with branching logic, and returns one of three outcomes: "Eligible", "Ineligible", or "Requires Clinical Review". The system supports session persistence, early-exit terminal states, and meets WCAG 2.1 AA accessibility standards.

## Glossary

- **Form_Application**: The complete full-stack system comprising the Backend API, Frontend UI, and PostgreSQL database
- **Backend_API**: The NestJS 11 REST API server responsible for session management, answer persistence, branching resolution, and eligibility evaluation
- **Frontend_UI**: The Next.js 15 application with App Router that renders the questionnaire screens and displays results
- **Eligibility_Evaluator**: A pure function with zero framework dependencies that accepts patient answers and returns an eligibility determination
- **Session**: A persistent record representing a single patient's progression through the questionnaire, stored in PostgreSQL
- **Screen**: One step in the 15-screen questionnaire, defined by the Form Schema JSON
- **Form_Schema**: A JSON document defining all 15 screens including input types, validation rules, options, and branching logic
- **BMI**: Body Mass Index, computed as weight (kg) divided by height (m) squared
- **Early_Exit**: A terminal branching condition that ends the questionnaire before all 15 screens are completed
- **Session_Store**: The Zustand-based client-side state store with localStorage persistence for session resume on refresh
- **Progress_Bar**: A visual indicator showing the patient's current position within the questionnaire flow

## Requirements

### Requirement 1: Monorepo Project Structure

**User Story:** As a developer, I want the project organized as an npm workspaces monorepo, so that the backend and frontend share a single repository with coordinated tooling.

#### Acceptance Criteria

1. THE Form_Application SHALL use npm workspaces with workspace paths "apps/web" and "apps/api"
2. THE Form_Application SHALL provide a root package.json with scripts for dev, test, and test:e2e that delegate to the appropriate workspace
3. THE Form_Application SHALL include a root .gitignore excluding node_modules, .env, dist, .next, coverage, playwright-report, and test-results

### Requirement 2: Database Infrastructure

**User Story:** As a developer, I want a containerized PostgreSQL database, so that session and answer data persists reliably across application restarts.

#### Acceptance Criteria

1. THE Form_Application SHALL provide a Docker Compose configuration running PostgreSQL 15 Alpine
2. THE Form_Application SHALL expose PostgreSQL on port 5432 with a health check using pg_isready
3. THE Form_Application SHALL use a named volume for PostgreSQL data persistence

### Requirement 3: Backend API Server

**User Story:** As a developer, I want a NestJS 11 API server with validation and CORS, so that the frontend can communicate securely with the backend.

#### Acceptance Criteria

1. THE Backend_API SHALL run on a configurable port defaulting to 4000
2. THE Backend_API SHALL use the global prefix "api" for all routes
3. THE Backend_API SHALL apply a global ValidationPipe with whitelist and transform enabled
4. THE Backend_API SHALL enable CORS for origin "http://localhost:3000"

### Requirement 4: Database Schema

**User Story:** As a developer, I want a well-defined database schema for sessions and answers, so that patient progress is reliably stored and queryable.

#### Acceptance Criteria

1. THE Backend_API SHALL store sessions with fields: id (UUID), createdAt, updatedAt, currentScreen (default 1), isComplete (default false), result (nullable), and resultReason (nullable)
2. THE Backend_API SHALL store answers with fields: id (UUID), sessionId, screenId, value (JSON), and createdAt
3. THE Backend_API SHALL enforce a unique constraint on the combination of sessionId and screenId in the Answer model
4. WHEN a Session is deleted, THE Backend_API SHALL cascade-delete all associated Answer records

### Requirement 5: Session Management API

**User Story:** As a patient, I want to start, resume, and progress through a screening session, so that my answers are saved and I can continue where I left off.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/session/start, THE Backend_API SHALL create a new Session record and return the sessionId, currentScreen (1), and the first screen definition
2. WHEN a GET request is made to /api/session/:id with a valid session ID, THE Backend_API SHALL return the session state including sessionId, currentScreen, isComplete, result, resultReason, answers, and the current screen definition
3. WHEN a GET request is made to /api/session/:id with a non-existent session ID, THE Backend_API SHALL return a 404 Not Found error
4. WHEN a POST request is made to /api/session/answer with a valid sessionId, screenId, and value, THE Backend_API SHALL persist the answer and return the next screen or final result
5. IF an answer is submitted for a session that is already complete, THEN THE Backend_API SHALL return a 400 Bad Request error

### Requirement 6: Form Schema Definition

**User Story:** As a developer, I want a single JSON schema defining all 15 screens, so that both frontend and backend reference one source of truth for form structure and branching.

#### Acceptance Criteria

1. THE Form_Schema SHALL define 15 screens, each with id, title, prompt, inputType, and branch fields
2. THE Form_Schema SHALL support inputType values of "number", "radio", "checkbox", "computed", and "evaluation"
3. THE Form_Schema SHALL define validation rules (min, max, required) for number inputs
4. THE Form_Schema SHALL define options arrays for radio and checkbox inputs
5. THE Form_Schema SHALL define branch arrays with condition, action, screen (for next), result, and reason (for end) fields
6. THE Form_Schema SHALL define computation metadata (formula, dependsOn) for computed screens

### Requirement 7: Server-Side Branching Resolution

**User Story:** As a system architect, I want the server to be the authoritative source for branching decisions, so that clients cannot bypass eligibility logic.

#### Acceptance Criteria

1. WHEN an answer is submitted for Screen 1 (Age), THE Backend_API SHALL end the session with "Ineligible" if age is less than 18
2. WHEN an answer is submitted for Screen 1 (Age), THE Backend_API SHALL end the session with "Requires Clinical Review" if age is greater than 75
3. WHEN an answer is submitted for Screen 3 (Height), THE Backend_API SHALL compute BMI from the stored weight and submitted height
4. WHEN BMI is computed as less than 25, THE Backend_API SHALL end the session with "Ineligible" and reason "BMI Too Low"
5. WHEN BMI is computed as 40 or greater, THE Backend_API SHALL end the session with "Requires Clinical Review" and reason "High BMI"
6. WHEN an answer of "Yes" is submitted for Screen 5 (Pregnancy Status), THE Backend_API SHALL end the session with "Ineligible" and reason "Pregnancy Contraindication"
7. WHEN an answer of "Yes" is submitted for Screen 7 (Diabetes History), THE Backend_API SHALL advance to Screen 8 (HbA1c)
8. WHEN an answer of "No" is submitted for Screen 7 (Diabetes History), THE Backend_API SHALL skip Screen 8 and advance to Screen 9
9. WHEN an HbA1c value greater than 9.0 is submitted for Screen 8, THE Backend_API SHALL end the session with "Ineligible" and reason "Uncontrolled Diabetes"
10. WHEN medications including "GLP-1 receptor agonist" are submitted for Screen 10, THE Backend_API SHALL end the session with "Requires Clinical Review" and reason "Already On GLP-1 Therapy"
11. WHEN Screen 14 (Dietary Habits) is answered and the next screen is 15, THE Backend_API SHALL run the Eligibility_Evaluator with all collected answers and store the final result

### Requirement 8: Eligibility Evaluator Pure Function

**User Story:** As a developer, I want a pure function evaluator with zero framework dependencies, so that eligibility logic is independently testable and portable.

#### Acceptance Criteria

1. THE Eligibility_Evaluator SHALL accept a FormAnswers object and return an EligibilityReason containing result and reason
2. THE Eligibility_Evaluator SHALL have zero dependencies on NestJS, Prisma, React, or any framework
3. THE Eligibility_Evaluator SHALL check immediate ineligibility conditions first: age less than 18, BMI less than 25, pregnant equals "Yes", and HbA1c greater than 9.0 when diabetic
4. THE Eligibility_Evaluator SHALL check automatic clinical review conditions second: age greater than 75, BMI 40 or greater, Stage 2 Hypertension with Diabetes, Hypertensive Crisis, 3 or more comorbid conditions, and already on GLP-1 therapy
5. THE Eligibility_Evaluator SHALL check optional clinical review conditions third: Stage 1 Hypertension with Sedentary lifestyle and High sugar intake, and Daily alcohol with risk factors (BMI 30 or greater, any comorbid condition, or smoking)
6. WHEN no ineligibility or clinical review conditions are met, THE Eligibility_Evaluator SHALL return "Eligible" with reason "All criteria met"
7. THE Eligibility_Evaluator SHALL evaluate conditions in strict priority order: immediate ineligibility, then automatic clinical review, then optional clinical review, then eligible

### Requirement 9: BMI Computation

**User Story:** As a patient, I want my BMI calculated automatically from my weight and height, so that I do not need to compute it manually.

#### Acceptance Criteria

1. THE Eligibility_Evaluator SHALL export a computeBMI function that accepts weight in kilograms and height in centimeters
2. WHEN computeBMI is called, THE Eligibility_Evaluator SHALL return weight divided by the square of height in meters
3. THE Form_Schema SHALL define Screen 4 as a computed screen with formula "weight / ((height / 100) ** 2)" depending on Screen 2 (weight) and Screen 3 (height)

### Requirement 10: Frontend Application Structure

**User Story:** As a patient, I want a responsive web application with clear navigation, so that I can complete the screening questionnaire on any device.

#### Acceptance Criteria

1. THE Frontend_UI SHALL use Next.js 15 with App Router
2. THE Frontend_UI SHALL provide routes: / (landing page), /form (questionnaire), and /form/result (result display)
3. THE Frontend_UI SHALL use Tailwind CSS for styling
4. THE Frontend_UI SHALL render form screens dynamically based on the Form_Schema JSON

### Requirement 11: Dynamic Form Rendering

**User Story:** As a patient, I want each screen to display the appropriate input type, so that I can provide my answers in the correct format.

#### Acceptance Criteria

1. WHEN a screen has inputType "number", THE Frontend_UI SHALL render a numeric input field with min and max validation
2. WHEN a screen has inputType "radio", THE Frontend_UI SHALL render radio button options within a fieldset with a legend
3. WHEN a screen has inputType "checkbox", THE Frontend_UI SHALL render checkbox options within a fieldset with a legend
4. WHEN a screen has inputType "computed", THE Frontend_UI SHALL display the computed value and auto-advance to the next screen
5. WHEN a screen has inputType "evaluation", THE Frontend_UI SHALL redirect to the /form/result page

### Requirement 12: Session Persistence and Resume

**User Story:** As a patient, I want my progress saved automatically, so that I can resume the questionnaire after a page refresh without losing my answers.

#### Acceptance Criteria

1. THE Session_Store SHALL persist the current sessionId and screen state to localStorage
2. WHEN the Frontend_UI loads the /form page and a sessionId exists in localStorage, THE Frontend_UI SHALL fetch the session state from the Backend_API and resume at the stored currentScreen
3. WHEN a session is complete, THE Session_Store SHALL clear the persisted session data from localStorage

### Requirement 13: Progress Indicator

**User Story:** As a patient, I want to see how far along I am in the questionnaire, so that I know how many steps remain.

#### Acceptance Criteria

1. THE Progress_Bar SHALL display the current screen number relative to the total number of screens
2. THE Progress_Bar SHALL use role="progressbar" with aria-valuenow, aria-valuemin, and aria-valuemax attributes
3. THE Progress_Bar SHALL visually update as the patient advances through screens

### Requirement 14: Result Display

**User Story:** As a patient, I want to see my eligibility result clearly, so that I understand the outcome of the screening.

#### Acceptance Criteria

1. WHEN the result is "Eligible", THE Frontend_UI SHALL display a success visual state with the result and reason
2. WHEN the result is "Ineligible", THE Frontend_UI SHALL display a rejection visual state with the result and reason
3. WHEN the result is "Requires Clinical Review", THE Frontend_UI SHALL display a review visual state with the result and reason

### Requirement 15: Accessibility Compliance

**User Story:** As a patient with disabilities, I want the application to meet WCAG 2.1 AA standards, so that I can complete the screening using assistive technologies.

#### Acceptance Criteria

1. THE Frontend_UI SHALL support full keyboard navigation from start to finish without requiring a mouse
2. THE Frontend_UI SHALL associate all form inputs with visible labels using the label element or aria-label
3. THE Frontend_UI SHALL group related inputs (radio buttons, checkboxes) within fieldset elements with legend elements
4. WHEN a form input has a validation error, THE Frontend_UI SHALL set aria-invalid="true" on the input
5. WHEN a validation error message is displayed, THE Frontend_UI SHALL use role="alert" to announce the error to screen readers
6. THE Frontend_UI SHALL use aria-live="polite" for dynamic content updates and aria-busy for loading states
7. THE Frontend_UI SHALL maintain a minimum color contrast ratio of 4.5:1 for all text content
8. THE Frontend_UI SHALL include data-testid attributes on all interactive elements for automated testing

### Requirement 16: Unit Testing

**User Story:** As a developer, I want comprehensive unit tests, so that I can verify correctness of the eligibility evaluator, schema validation, and API controllers.

#### Acceptance Criteria

1. THE Form_Application SHALL use Vitest as the unit test framework for both backend and frontend
2. THE Form_Application SHALL achieve 100% branch coverage on the Eligibility_Evaluator function
3. THE Form_Application SHALL include unit tests validating the Form_Schema structure (all 15 screens present, valid inputTypes, valid branch conditions)
4. THE Form_Application SHALL include unit tests for the session controller endpoints

### Requirement 17: End-to-End Testing

**User Story:** As a developer, I want E2E tests covering critical user flows, so that I can verify the full system works correctly from the patient's perspective.

#### Acceptance Criteria

1. THE Form_Application SHALL use Playwright for end-to-end testing
2. THE Form_Application SHALL include an E2E test for the happy path (eligible patient completing all screens)
3. THE Form_Application SHALL include an E2E test for mid-flow refresh (verifying session resume)
4. THE Form_Application SHALL include E2E tests for terminal states (underage, low BMI, pregnancy, uncontrolled diabetes, GLP-1 medication)
5. THE Form_Application SHALL use data-testid selectors exclusively in all Playwright tests

### Requirement 18: CI/CD Pipeline

**User Story:** As a developer, I want automated CI checks on every push, so that regressions are caught before merging.

#### Acceptance Criteria

1. THE Form_Application SHALL provide a GitHub Actions workflow that runs on push and pull request events
2. THE Form_Application SHALL run unit tests for both backend and frontend in the CI pipeline
3. THE Form_Application SHALL run E2E tests with Playwright in the CI pipeline
4. THE Form_Application SHALL start PostgreSQL as a service in the CI environment

### Requirement 19: Documentation

**User Story:** As a reviewer, I want a WRITEUP.md documenting trade-offs and decisions, so that I can understand the reasoning behind implementation choices.

#### Acceptance Criteria

1. THE Form_Application SHALL include a WRITEUP.md at the repository root
2. THE WRITEUP.md SHALL document at least 3 trade-offs made during implementation
3. THE WRITEUP.md SHALL describe what the developer would do differently given more time
4. THE WRITEUP.md SHALL list AI tools used during development
5. THE WRITEUP.md SHALL document spec ambiguities encountered and how they were resolved
