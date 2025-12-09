# RAG Demo Chatbot Constitution
<!--
SYNC IMPACT REPORT
==================
Version Change: 1.5.0 → 1.6.0 (MINOR - Dependency Verification Principle)
Date: 2025-12-09

MODIFIED PRINCIPLES:
  - Principle XIII (Dependency Verification): NEW PRINCIPLE ADDED
    Requirement: All dependencies MUST be verified against speckit/plan before installation

REASON FOR CHANGE:
  - Prevent unauthorized dependencies from being added to the project
  - Maintain technology stack integrity and avoid scope creep
  - Ensure all tools are explicitly approved and documented in speckit/plan
  - User explicitly requested: "安裝任何工具前必須先核對/speckit.plan"
  - Recent incident: LangChain dependency was added without approval, violating MVP-First principle

ADDED SECTIONS:
  - Principle XIII: Dependency Verification (Mandatory Pre-Installation Check)

REMOVED SECTIONS: None

TEMPLATES REQUIRING UPDATES:
  ✅ Installation workflows must include dependency verification step
  ✅ requirements.txt/package.json updates require speckit/plan verification
  
FOLLOW-UP TODOs: 
  - Ensure specs/*/plan.md documents all approved dependencies in Technology Stack section
  - Update onboarding documentation with dependency approval process
-->

## Project Identity

**Project Name**: RAG Demo Chatbot  
**Purpose**: Multilingual RAG-powered chatbot demonstrating embedding, vector database, and strict RAG capabilities for AI Engineer portfolio  
**Feature Branch**: `001-multilingual-rag-chatbot`  
**Repository**: RAG_Demo_Chatbot (Owner: Jenhaohsiao)

## Core Principles

### I. Minimum Viable Product (MVP-First)
**NON-NEGOTIABLE**: Every feature MUST start with the simplest possible implementation that delivers value. Avoid over-design and premature optimization. Build only what is needed to satisfy the immediate requirements.

**Rationale**: Reduces development time, minimizes complexity, and enables faster iteration based on real user feedback rather than speculative requirements.

### II. Testability (Mandatory for All Components)
**NON-NEGOTIABLE**: Every component, module, function, and service MUST be independently testable. Design decisions that compromise testability are prohibited.

**Rationale**: Ensures code quality, enables safe refactoring, facilitates debugging, and provides confidence in system behavior.

### III. Ephemeral Data (Session Lifecycle)
**NON-NEGOTIABLE**: All user data MUST be deleted when the session expires. No persistent storage of user-specific data beyond the active session.

**Rationale**: Protects user privacy, reduces data retention liability, and simplifies compliance with data protection regulations.

### IV. Session Isolation (Per-User Collections)
**NON-NEGOTIABLE**: Each user MUST have their own isolated Qdrant collection. Cross-user data contamination is strictly prohibited.

**Rationale**: Ensures data privacy, prevents information leakage between users, and maintains security boundaries.

### V. Strict RAG (No Hallucination)
**NON-NEGOTIABLE**: The system MUST NOT generate responses based on information not present in the vector database. All answers MUST be strictly grounded in retrieved documents.

**Rationale**: Maintains accuracy and trustworthiness of responses, prevents misinformation, and ensures the system operates only within its knowledge base.

### VI. Moderation First (Safety Gate)
**NON-NEGOTIABLE**: All user-uploaded content MUST pass Gemini Safety moderation checks before processing. Content that fails moderation MUST be rejected immediately.

**Rationale**: Protects the system from malicious inputs, ensures safe operation, and prevents processing of harmful or inappropriate content.

### VII. Fixed Technology Stack
**NON-NEGOTIABLE**: The technology stack is fixed and MUST NOT be changed without constitutional amendment:
- **AI/LLM**: Gemini API only
- **Backend**: FastAPI only
- **Frontend**: React only
- **Vector Database**: Qdrant Vector Database (self-hosted) + Qdrant Cloud (managed service)
  - Development/Testing: Qdrant Vector Database (Docker or embedded mode)
  - Production/Demo: Qdrant Cloud (Free Tier: 1GB)

**Rationale**: Maintains consistency, reduces integration complexity, leverages team expertise, and prevents scope creep through technology exploration. Qdrant deployment flexibility allows cost-free development while enabling professional cloud deployment for portfolio demonstration.

### VIII. API Contract Stability
**NON-NEGOTIABLE**: Once defined, API contracts MUST NOT be changed without following a formal deprecation process. Breaking changes require major version increments and migration paths.

**Rationale**: Ensures stability for API consumers, enables independent frontend/backend development, and maintains backward compatibility.

### IX. Secrets Management (Environment-Based)
**NON-NEGOTIABLE**: Sensitive information (API keys, credentials, tokens) MUST be stored in `.env` files and MUST be excluded from version control via `.gitignore`. GitHub commits containing secrets are strictly prohibited.

**Rationale**: Prevents credential leakage, protects API quotas and billing, and maintains security best practices.

### X. Phase-End Integration Testing (Quality Gate)
**NON-NEGOTIABLE**: Every development phase MUST conclude with end-to-end integration testing before proceeding to the next phase. Code that passes unit tests but fails integration testing MUST be fixed before phase completion is declared.

**Testing Requirements**:
- Backend phases: API endpoint testing with real HTTP requests (not mocked)
- Frontend phases: UI component testing with user interaction simulation
- Full-stack phases: Complete user journey testing (frontend → API → backend → database)
- All tests MUST use actual dependencies (databases, APIs) in test/development environment
- Test results MUST be documented and verified before moving to next phase

**Rationale**: Ensures each phase delivers working functionality, prevents accumulation of integration bugs, reduces debugging complexity, and maintains high-quality incremental delivery. Early detection of integration issues is significantly cheaper than late-stage debugging.

### XI. Progress Tracking & Documentation (Mandatory Workflow)
**NON-NEGOTIABLE**: Every task execution MUST follow this exact workflow:
1. **BEFORE starting any work**: Read `docs/PROGRESS.md` to understand current project state
2. **During work**: Execute the planned task
3. **AFTER completing work**: Update `docs/PROGRESS.md` with completion status

**Update Requirements**:
- Mark completed tasks: Change `- [ ]` to `- [x]` in task checklist
- Update completion counts: Increment phase completion counter (e.g., `0/16` → `1/16`)
- Update total progress: Recalculate overall project completion percentage
- Update timestamp: Change "最後更新" (Last Updated) to current date
- Document blockers: Add any issues encountered to "技術債務 & 已知問題" section
- No work can be considered complete until PROGRESS.md is updated

**Rationale**: Maintains accurate project visibility, enables context restoration across sessions, creates audit trail, prevents duplicate work, and ensures progress is never lost. This is critical for AI-assisted development where context does not persist across conversations.

**Enforcement**: Any task marked complete without corresponding PROGRESS.md update is considered incomplete and MUST be redone.

### XII. Chinese Communication (Mandatory Language)
**NON-NEGOTIABLE**: All AI-human interactions in this project MUST be conducted in Traditional Chinese (繁體中文). This applies to:
- Code reviews and feedback
- Progress updates and status reports
- Technical discussions and problem-solving
- Documentation explanations (unless the document itself is in English)
- Error messages and debugging assistance
- Task planning and coordination

**Exceptions**:
- Code comments MUST be in English for international collaboration and code maintainability
- Configuration files (.env, .yaml, .json) MUST use English comments only
- Git commit messages SHOULD be in English for version control clarity
- Technical documentation MAY be bilingual (Chinese + English)
- External API documentation remains in its original language

**Rationale**: Ensures clear communication with the project owner, reduces misunderstandings, aligns with the project's multilingual capabilities, and respects cultural preferences. Chinese communication enables more nuanced technical discussions and faster decision-making. English-only code comments ensure international collaboration and professional code quality.

**Enforcement**: AI assistants MUST respond in Chinese by default. English responses are only acceptable when explicitly requested or when dealing with external technical references.

### XIII. Dependency Verification (Mandatory Pre-Installation Check)
**NON-NEGOTIABLE**: Before installing ANY new dependency, library, package, or tool, the following process MUST be executed:

1. **Verify Against speckit/plan**: Check if the dependency exists in `specs/*/plan.md` (Technology Stack section)
2. **If NOT in the plan**:
   - STOP immediately - DO NOT install
   - Present the proposed dependency to the user with:
     - Package name and version
     - Purpose and use case
     - Why it's needed (justify against MVP-First principle)
     - Alternative solutions considered
   - WAIT for explicit user approval
3. **If approved by user**:
   - Add the dependency to `specs/*/plan.md` Technology Stack section with justification
   - Update version number in plan document
   - Proceed with installation
   - Update `requirements.txt` or `package.json`
4. **If rejected**:
   - Implement alternative solution using existing approved tools
   - Document the decision in `.specify/memory/technical-constraints.md`

**Scope**: This applies to ALL dependency types:
- Python packages (`pip install`, `requirements.txt`)
- Node.js packages (`npm install`, `package.json`)
- System tools and utilities
- Browser extensions or external services
- Any third-party code or libraries

**Rationale**: Prevents unauthorized dependencies from polluting the project, maintains technology stack integrity (Principle VII), avoids licensing issues, reduces security vulnerabilities, and ensures every tool serves a clear, approved purpose. The recent LangChain incident demonstrated the importance of this principle - adding unapproved dependencies violates the MVP-First principle and introduces unnecessary complexity.

**Enforcement**: Any code commit that adds dependencies without updating `specs/*/plan.md` MUST be rejected. Dependencies added without user approval MUST be removed immediately.

## Technology Stack Constraints

The following technologies are mandated for this project:

- **Programming Language**: Python 3.x (backend), JavaScript/TypeScript (frontend)
- **AI/LLM API**: Google Gemini API
- **Web Framework**: FastAPI (backend), React (frontend)
- **Vector Database**: Qdrant Vector Database + Qdrant Cloud
  - Local Development: Qdrant Vector Database (embedded mode via qdrant-client)
  - Integration Testing: Qdrant Vector Database (Docker deployment)
  - Cloud Deployment: Qdrant Cloud (Free Tier: 1GB storage)
- **Testing Framework**: pytest (backend), Jest/React Testing Library (frontend)
- **Version Control**: Git with GitHub
- **CI/CD**: GitHub Actions

Any deviation from this stack requires a constitutional amendment.
## Development Workflow & Quality Gates

### Mandatory Task Execution Workflow
**GATE**: Every task MUST follow this workflow without exception:

**STEP 1: Pre-Execution (Progress Review)**
1. Open and read `docs/PROGRESS.md`
2. Identify current phase and next pending task
3. Verify no blockers or dependencies
4. Confirm task is appropriate to execute now

**STEP 2: Execution (Actual Work)**
1. Perform the planned implementation
2. Write/update tests as required
3. Verify functionality locally

**STEP 3: Post-Execution (Progress Update)**
1. Mark task as complete in `docs/PROGRESS.md`: `- [ ]` → `- [x]`
2. Update phase completion count (e.g., `1/16` → `2/16`)
3. Recalculate total progress percentage
4. Update "最後更新" timestamp to current date
5. Document any issues in "技術債務 & 已知問題" section
6. Commit changes with descriptive message

**CRITICAL**: Steps 1 and 3 are MANDATORY. Skipping progress tracking violates Principle XI.

### Test-First Development
**GATE**: Tests MUST be written and approved BEFORE implementation.

1. Write unit tests for the planned functionality
2. Verify tests fail (Red phase)
3. Implement the minimum code to make tests pass (Green phase)
4. Refactor while keeping tests green (Refactor phase)

### Incremental Execution (Staged Delivery)
**GATE**: Each development phase MUST be completed and verified before proceeding to the next.

- Break features into discrete stages
- Complete one stage fully (code + tests + verification)
- Verify correctness through unit tests and manual validation
- **MANDATORY**: Perform end-to-end integration testing at phase completion
- Document test results and any issues discovered
- Update `docs/PROGRESS.md` with phase completion status
## Development Workflow & Quality Gates

### Test-First Development
**GATE**: Tests MUST be written and approved BEFORE implementation.

1. Write unit tests for the planned functionality
2. Verify tests fail (Red phase)
3. Implement the minimum code to make tests pass (Green phase)
4. Refactor while keeping tests green (Refactor phase)

### Incremental Execution (Staged Delivery)
**GATE**: Each development phase MUST be completed and verified before proceeding to the next.

- Break features into discrete stages
- Complete one stage fully (code + tests + verification)
- Verify correctness through unit tests and manual validation
- **MANDATORY**: Perform end-to-end integration testing at phase completion
- Document test results and any issues discovered
### Unit Test Coverage
**GATE**: Unit tests MUST be added at the completion of each stage.

- All new code MUST have corresponding unit tests
### Versioning Policy
- **MAJOR**: Backward-incompatible governance changes, principle removals or redefinitions
- **MINOR**: New principles added, materially expanded guidance
- **PATCH**: Clarifications, wording fixes, non-semantic refinements

**Version**: 1.3.0 | **Ratified**: 2025-12-07 | **Last Amended**: 2025-12-08

For day-to-day development guidance and implementation details, refer to the files in `.specify/templates/` and `.github/prompts/` which provide mode-specific instructions that operate within the boundaries established by this constitution.
- Full flow: Test complete user journeys from UI to data persistence
- Performance: Basic load testing for critical paths
- Results MUST be documented before declaring phase completes
- Critical paths MUST have >90% code coverage
- Edge cases and error conditions MUST be tested

### CI/CD Validation (GitHub Actions)
**GATE**: All tests MUST pass in GitHub Actions before merging.

- Every pull request MUST trigger automated test runs
- All unit tests MUST pass
- Linting and code quality checks MUST pass
- Coverage reports MUST be generated
- Failed CI builds MUST block merging

## Governance

### Constitutional Authority
This constitution supersedes all other development practices, guidelines, and ad-hoc decisions. In case of conflict between this constitution and any other documentation, the constitution prevails.

### Amendment Process
1. Amendments MUST be proposed with clear justification
2. Impact assessment MUST be documented (affected code, templates, workflows)
3. Migration plan MUST be provided for breaking changes
4. Approval required before implementation
5. All dependent artifacts MUST be updated upon approval

### Compliance Verification
Each development phase conclusion MUST include constitutional compliance review:
- All 13 principles adhered to
- Quality gates passed
- Tests documented and passing
- Progress tracking completed
- Chinese communication maintained
- Dependency verification completed (no unauthorized tools)

### Versioning Policy
- **MAJOR**: Backward-incompatible governance changes, principle removals or redefinitions
- **MINOR**: New principles added, materially expanded guidance
- **PATCH**: Clarifications, wording fixes, non-semantic refinements

---

**Version**: 1.6.0  
**Ratified**: 2025-12-07  
**Last Amended**: 2025-12-09

For day-to-day development guidance and implementation details, refer to the files in `.specify/templates/` and `.github/prompts/` which provide mode-specific instructions that operate within the boundaries established by this constitution.
