# RAG Demo Chatbot Constitution
<!--
SYNC IMPACT REPORT
==================
Version Change: 1.8.0 → 1.9.0 (MINOR - Temporary Files Management Principle)
Date: 2025-12-15

MODIFIED PRINCIPLES:
  - Principle XV (Temporary Files Management): NEW PRINCIPLE ADDED
    Requirement: "暫存檔/短期筆記，在任務達成後請刪除" - Clean workspace by removing temporary files upon task completion
  - Principle XVI: Renumbered from XV (Testing Framework Standardization)

REASON FOR CHANGE:
  - User explicitly requested: "請在constitution中加入. '暫存檔/短期筆記, 在任務達成後請刪除.'"
  - Maintain clean workspace and prevent repository bloat
  - Reduce confusion about which files are current vs temporary
  - Make navigation easier for future developers
  - Observed issue: Accumulation of debugging files, outdated docs, and temporary artifacts

ADDED SECTIONS:
  - Principle XV: Temporary Files Management (Clean-As-You-Go)
    - Requirements for removing debugging files, interim docs, test artifacts
    - File types to remove vs exceptions for permanent files
    - Enforcement through task completion reviews

REMOVED SECTIONS: None

TEMPLATES REQUIRING UPDATES:
  ✅ Task completion workflows must include workspace cleanup verification
  ✅ Pull request reviews must check for temporary file removal
  
FOLLOW-UP TODOs: 
  - AI assistants should verify clean workspace before marking tasks complete
  - Document temporary file identification guidelines
  - Update development workflow to emphasize cleanup responsibility
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

### XIV. Terminal Session Management (Reuse Over Create)
**NON-NEGOTIABLE**: When executing commands in terminals, AI assistants MUST reuse existing terminal sessions instead of creating new ones. New terminals should only be created when:
- Running multiple concurrent processes that must remain separate (e.g., backend + frontend)
- Existing terminals have different working directories that would require navigation
- Explicit user request to create a new terminal

**Requirements**:
- **Before creating a new terminal**: Check if an appropriate existing terminal can be reused
- **For long-running processes** (servers, watchers): Use a dedicated terminal and keep it running
- **For sequential commands**: Reuse the same terminal for multiple related operations
- **Track terminal purpose**: Name terminals clearly (e.g., "powershell backend", "powershell tests")
- **Avoid port conflicts**: Never start duplicate server instances on the same port
- **Clean shutdown**: Stop processes properly before restarting them

**Common Violations to Avoid**:
- Starting backend server in a new terminal when one is already running
- Creating new terminal for every test run instead of reusing test terminal
- Spinning up multiple instances of the same service
- Abandoning terminals with running processes

**Rationale**: Prevents terminal proliferation, reduces resource consumption, avoids port conflicts, maintains clear process tracking, and keeps the development environment organized. Multiple instances of the same server create confusion about which one is actually serving requests and waste system resources. This principle is especially critical for AI-assisted development where the AI may not have perfect memory of previous terminal creations.

**Enforcement**: Before invoking `run_in_terminal` with `isBackground=true`, AI MUST verify no existing terminal is running the same or similar process. Repeated violations of this principle indicate need for workflow adjustment.

### XV. Temporary Files Management (Clean-As-You-Go)
**NON-NEGOTIABLE**: 暫存檔/短期筆記，在任務達成後請刪除。All temporary files, interim notes, debugging artifacts, and short-term documentation MUST be removed upon task completion. Only permanent, valuable documentation should remain in the repository.

**Requirements**:
- **Temporary debugging files**: Delete immediately after issue resolution
- **Interim documentation**: Remove duplicates, outdated guides, and work-in-progress notes
- **Test artifacts**: Remove temporary test files, outdated test results, and diagnostic scripts
- **Development notes**: Clean up TODO comments, debug print statements, and temporary code
- **Documentation cleanup**: Consolidate overlapping documents, remove superseded versions
- **Before task completion**: Verify no temporary files remain in the workspace

**File Types to Remove**:
- Debugging scripts (diagnose_*.py, test_*.py for temporary use)
- Outdated documentation (superseded guides, old versions)
- Temporary configuration files (.env.backup, config.temp)
- Work-in-progress notes (WIP_*, TEMP_*, debugging logs)
- Duplicate or redundant files serving the same purpose

**Exceptions (Permanent Files)**:
- Core documentation (README.md, setup guides)
- Production configuration templates
- Established test files (part of test suite)
- Historical records with lasting value (PROGRESS.md, constitution.md)

**Rationale**: Maintains clean workspace, reduces confusion about which files are current, prevents repository bloat, makes navigation easier for future developers, and ensures only valuable artifacts remain. Temporary files accumulate quickly during development and create clutter that makes it harder to find important resources.

**Enforcement**: Task completion reviews MUST include workspace cleanup verification. Pull requests MUST not contain temporary files unless explicitly justified as permanent additions.

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

### XVI. Testing Framework Standardization (Unified, No Mixed Styles)
**NON-NEGOTIABLE**: All test files in the project MUST use the same testing framework. Mixed testing styles (pytest + custom frameworks in the same project) waste development time and create confusion during test execution and debugging.

**Framework Choice**: `pytest` for Python backend, `Jest/Vitest` for TypeScript frontend

**Requirements**:
- **Backend**: ALL test files MUST follow pytest conventions
  - Test files named `test_*.py` or `*_test.py`
  - Test functions named `def test_*(...)`
  - Use pytest fixtures, parametrization, and assertions
  - Custom test runners or classes (without `def test_` functions) are **PROHIBITED**
  - If a custom testing module is needed, wrap it with pytest rather than creating separate test runners
- **Frontend**: ALL test files MUST follow Jest conventions
  - Test files named `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`
  - Test functions using `describe()` and `it()` blocks
  - No custom testing frameworks mixed with Jest

**Common Violation to Avoid**:
- ❌ `test_phase2.py`: Print statements, manual test execution (no `def test_` functions)
- ❌ `test_phase5_rag_query.py`: Class with `if __name__ == "__main__"` block (custom runner)
- ✅ Convert ALL such tests to proper pytest format IMMEDIATELY

**Enforcement**:
- Code review MUST reject any test files that don't follow the chosen framework
- Before implementing tests, declare the testing framework choice
- If switching frameworks mid-project, update ALL existing tests (not just new ones)
- This principle applies retroactively: all existing Phase 1-5 tests MUST be converted to pytest format by next amendment

**Rationale**: 
- Consistent testing framework allows AI agents to execute tests predictably
- Eliminates confusion about test execution patterns
- Reduces debugging time when tests fail
- Enables automation of test runs in CI/CD pipelines
- Prevents "forgetting" to run certain tests because they use a different framework

---

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

### Phase Completion Testing Requirements (Mandatory Gate)
**NON-NEGOTIABLE**: Each development phase MUST NOT be marked as complete until BOTH the following conditions are met:

**Condition 1: Automated Testing in GitHub Actions**
- Unit tests MUST be implemented for all new code
- Unit tests MUST pass 100% locally before pushing
- GitHub Actions CI/CD MUST run automated test suite on pull request
- GitHub Actions test results MUST show all tests passing (0 failures)
- Code coverage report MUST be generated and reviewed
- Coverage for critical paths MUST exceed 90%
- All GitHub Actions checks MUST be passing before merge is allowed
- Test results MUST be documented in PROGRESS.md with date and execution time

**Condition 2: Manual User Testing**
- Automated tests alone do NOT satisfy phase completion
- Manual user testing scenarios MUST be planned and documented
- Each phase MUST have test checklist (checkboxes in PROGRESS.md)
- Tester (AI or human) MUST verify all manual test scenarios pass
- Manual test results MUST be documented with verification date
- Any failed manual tests MUST be fixed before proceeding to next phase

**Progress Tracking Requirement**:
- PROGRESS.md MUST show BOTH columns satisfied:
  - `Automated Testing`: ✅ PASS (X/Y tests) - dated verification
  - `User Testing`: ✅ PASS - dated verification
- Phase status MUST be marked ✅ COMPLETE only when both columns show ✅ PASS
- If either column shows ⏳ Pending or ❌ FAIL, phase is NOT complete
- Phase cannot advance to next phase until both testing conditions pass

**Specific Phase Gating**:
```
Phase X Completion = (Automated Tests: 100% Pass) + (Manual Tests: 100% Pass)
Status := COMPLETE ✅ only when both = TRUE
Otherwise := IN_PROGRESS ⏳ or BLOCKED ❌
```

**Rationale**: Automated tests verify code correctness and prevent regressions. Manual user testing verifies the feature works as intended in real-world scenarios and catches issues that automated tests cannot detect (UI/UX, performance, integration edge cases). Requiring both ensures high quality and prevents incomplete features from advancing. This is critical for portfolio demonstration where quality matters more than speed.
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

**GitHub Actions Workflow Requirements**:
- Every pull request MUST trigger automated test runs automatically
- All unit tests MUST pass in CI environment (not just locally)
- Linting and code quality checks MUST pass
- Test coverage reports MUST be generated and archived
- Failed CI builds MUST block merging (branch protection enabled)
- CI/CD pipeline MUST be documented in `.github/workflows/` directory

**Phase Completion CI/CD Requirements**:
- When phase is declared complete, all CI/CD checks MUST be passing
- Test execution must be verified in GitHub Actions UI
- Build logs MUST be reviewed to confirm no hidden failures
- Coverage metrics MUST meet minimum thresholds (90% for critical code)
- CI/CD validation is mandatory gate - no exceptions

**Documentation Requirement**:
- PROGRESS.md MUST include: "Automated Testing: ✅ PASS (X/Y tests) - Verified on GitHub Actions YYYY-MM-DD"
- Link to GitHub Actions workflow run is recommended
- If CI/CD not yet configured, mark as "⏳ CI/CD Setup Pending" and make this blocking for phase completion

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
Each development phase conclusion MUST include constitutional compliance review AND testing verification:
- All 14 principles adhered to
- Quality gates passed
- **Automated Tests**: ✅ All tests pass in GitHub Actions (dated verification required)
- **Manual User Tests**: ✅ All scenarios pass (dated verification required)
- Tests documented in PROGRESS.md with both Automated and User Testing columns showing ✅ PASS
- Progress tracking completed
- Chinese communication maintained
- Dependency verification completed (no unauthorized tools)
- Terminal management followed (no unnecessary proliferation)

### Versioning Policy
- **MAJOR**: Backward-incompatible governance changes, principle removals or redefinitions
- **MINOR**: New principles added, materially expanded guidance
- **PATCH**: Clarifications, wording fixes, non-semantic refinements

---

**Version**: 1.9.0  
**Ratified**: 2025-12-07  
**Last Amended**: 2025-12-15

---

## LATEST AMENDMENT (2025-12-15)

**Amendment Type**: MINOR (Temporary Files Management Principle)

**Changes Made**:
1. **New Principle XV**: "暫存檔/短期筆記，在任務達成後請刪除" - Added comprehensive temporary files management requirements
2. **Principle Renumbering**: Testing Framework Standardization moved from XV to XVI
3. **Workspace Cleanup Requirements**: Explicit guidelines for removing debugging files, interim documentation, and temporary artifacts
4. **Task Completion Enhancement**: Added workspace cleanup verification to task completion reviews

**Rationale**: 
- User explicitly requested inclusion of temporary files cleanup principle
- Workspace cleanliness is essential for maintainable projects
- Temporary files accumulate quickly during development and create confusion
- Clean repositories are more professional and easier to navigate
- Prevents repository bloat and makes CI/CD pipelines more efficient

**Impact**:
- Task completion workflows now include mandatory cleanup verification
- Pull requests must demonstrate removal of temporary files
- AI assistants must verify clean workspace before marking tasks complete
- No breaking changes to existing code
- Applies immediately to all ongoing and future development

**Migration Plan**:
- Immediate application: Current docs folder cleanup already demonstrates this principle
- Future tasks: MUST include cleanup verification before completion
- Repository audit: Periodic review recommended to identify accumulated temporary files
