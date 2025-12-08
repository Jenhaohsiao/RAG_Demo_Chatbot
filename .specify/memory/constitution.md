# RAG Demo Chatbot Constitution
<!--
SYNC IMPACT REPORT
==================
Version Change: 1.0.0 → 1.1.0 (Minor Amendment - Vector Database Deployment Clarification)
Date: 2025-12-08

MODIFIED PRINCIPLES:
  - Principle VII (Fixed Technology Stack): Clarified Vector Database deployment modes
    OLD: "Vector Database: Qdrant only"
    NEW: "Vector Database: Qdrant Vector Database (self-hosted) + Qdrant Cloud (managed service)"
    
REASON FOR CHANGE:
  - Clarify deployment flexibility for different environments
  - Specify free-tier cloud option for production deployment
  - Enable cost-free development while maintaining production-grade deployment option
  - Better alignment with portfolio demonstration requirements

ADDED SECTIONS:
  - Deployment mode specifications under Technology Stack Constraints
  - Environment-specific Vector Database configuration guidance

REMOVED SECTIONS: None

TEMPLATES REQUIRING UPDATES:
  ✅ plan-template.md - No changes needed (deployment details handled in implementation)
  ✅ spec-template.md - No changes needed (requirements remain technology-agnostic)
  ✅ tasks-template.md - No changes needed (tasks will reference updated stack constraints)

FOLLOW-UP TODOs:
  - Implementation plan should specify environment configuration for Qdrant client
  - .env.example should include both local and cloud Qdrant configuration templates
  - Docker Compose should include Qdrant service for local testing
  - Deployment guide should document Qdrant Cloud setup process
-->

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

## Security & Data Management

### Data Retention Policy
- User sessions MUST have defined expiration times
- All data associated with expired sessions MUST be automatically purged
- Qdrant collections for inactive sessions MUST be deleted

### Content Safety
- All uploads MUST be validated by Gemini Safety API before processing
- Safety check failures MUST result in immediate rejection with appropriate user feedback
- System MUST log all moderation events for audit purposes

### Secrets & Configuration
- `.env` file MUST contain all sensitive configuration
- `.gitignore` MUST include: `.env`, API keys, credentials, local configuration files
- Production secrets MUST be managed via secure environment variables or secret management services

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
- Only then proceed to the next stage

### Unit Test Coverage
**GATE**: Unit tests MUST be added at the completion of each stage.

- All new code MUST have corresponding unit tests
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
- All pull requests MUST verify compliance with constitutional principles
- Code reviews MUST explicitly check for violations
- Complexity that violates principles MUST be justified and documented
- Violations without justification MUST be rejected

### Versioning Policy
- **MAJOR**: Backward-incompatible governance changes, principle removals or redefinitions
- **MINOR**: New principles added, materially expanded guidance
- **PATCH**: Clarifications, wording fixes, non-semantic refinements

**Version**: 1.1.0 | **Ratified**: 2025-12-07 | **Last Amended**: 2025-12-08
For day-to-day development guidance and implementation details, refer to the files in `.github/prompts/` which provide mode-specific instructions that operate within the boundaries established by this constitution.

**Version**: 1.0.0 | **Ratified**: 2025-12-07 | **Last Amended**: 2025-12-07
