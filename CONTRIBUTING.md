# Contributing to Agent Debugger

Thank you for your interest in contributing to Agent Debugger! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

---

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow. Please be respectful and constructive in all interactions.

---

## Getting Started

### Prerequisites

- Node.js 18+ (for frontend development)
- Python 3.8+ (for Python SDK development)
- Git
- npm or yarn

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/agent-debugger.git
   cd agent-debugger
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/erpan/agent-debugger.git
   ```

---

## Development Setup

### Frontend (Electron + React)

```bash
# Install dependencies
npm install

# Start development server
npm run electron:dev
```

The app will open automatically. Hot reload is enabled for React components.

### Python SDK

```bash
cd sdk/python

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -e ".[dev]"

# Run tests
pytest
```

### TypeScript SDK

```bash
cd sdk/typescript

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

---

## Project Structure

```
agent-debugger/
├── electron/                 # Electron main process
│   ├── main.ts              # Main process entry
│   ├── preload.ts           # Preload scripts
│   └── services/            # Backend services
│       ├── WebSocketServer.ts
│       └── StoreService.ts
├── src/                     # React frontend
│   ├── components/          # UI components
│   │   ├── ThoughtFlowGraph/
│   │   ├── ThoughtTimeline/
│   │   └── Layout/
│   ├── pages/               # Page components
│   │   ├── Dashboard.tsx
│   │   ├── ThoughtFlow.tsx
│   │   ├── ToolTrace.tsx
│   │   ├── TokenAnalysis.tsx
│   │   ├── MessageLog.tsx
│   │   └── Settings.tsx
│   ├── stores/              # Zustand stores
│   │   ├── sessionStore.ts
│   │   └── agentStore.ts
│   ├── hooks/               # Custom hooks
│   ├── utils/               # Utility functions
│   └── styles/              # CSS styles
├── sdk/                     # SDKs
│   ├── python/              # Python SDK
│   │   ├── agent_debugger/
│   │   ├── tests/
│   │   └── pyproject.toml
│   └── typescript/          # TypeScript SDK
│       ├── src/
│       ├── tests/
│       └── package.json
├── examples/                # Example projects
│   ├── python-agent/
│   ├── langchain-agent/
│   └── typescript-agent/
├── docs/                    # Documentation
└── tests/                   # Integration tests
```

---

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-error-tracking` - New features
- `fix/websocket-connection` - Bug fixes
- `docs/update-readme` - Documentation changes
- `refactor/optimize-rendering` - Code refactoring

### Commit Messages

Follow this format:
```
type(scope): description

[optional body]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
```
feat(thought-flow): add search functionality
fix(websocket): handle connection timeout
docs(readme): update installation instructions
```

---

## Submitting Changes

### Pull Request Process

1. Update your branch with upstream:
   ```bash
   git fetch upstream
   git merge upstream/main
   ```

2. Push your changes:
   ```bash
   git push origin your-branch-name
   ```

3. Create a Pull Request on GitHub

4. Fill in the PR template:
   - Description of changes
   - Related issue (if any)
   - Testing performed
   - Screenshots (if applicable)

5. Wait for review and address feedback

### PR Requirements

- All tests must pass
- Code must follow style guidelines
- Documentation must be updated (if applicable)
- No merge conflicts

---

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint rules
- Use meaningful variable names
- Add JSDoc comments for public functions
- Prefer functional components with hooks

### Python

- Follow PEP 8 style guide
- Use type hints
- Add docstrings for public functions
- Maximum line length: 100 characters

### CSS

- Use CSS modules or separate CSS files
- Follow existing naming conventions
- Use dark theme colors from variables

---

## Testing

### Frontend Tests

```bash
npm test
```

### Python SDK Tests

```bash
cd sdk/python
pytest
```

### Manual Testing

1. Start the Electron app
2. Run example agents from `examples/`
3. Verify all features work correctly

---

## Documentation

### Updating Documentation

- Update README.md for user-facing changes
- Update CHANGELOG.md for version changes
- Add inline comments for complex code
- Update API documentation for SDK changes

### Documentation Style

- Use clear, concise language
- Include code examples
- Add screenshots for UI features
- Link to related documentation

---

## Getting Help

- Open an issue for bugs or feature requests
- Join discussions in existing issues
- Check existing documentation

---

## Recognition

Contributors will be listed in:
- README.md contributors section
- Release notes for significant contributions

Thank you for contributing to Agent Debugger! 🎉