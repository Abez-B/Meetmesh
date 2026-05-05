# Contributing to Meetmesh

Thank you for your interest in contributing to Meetmesh! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions with the community.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/Meetmesh.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Push to your fork and submit a pull request

## Development Setup

```bash
# Install dependencies
pnpm install

# Create your environment files
cp artifacts/api-server/.env.example artifacts/api-server/.env
cp artifacts/meetmesh-frontend/.env.example artifacts/meetmesh-frontend/.env

# Start development
pnpm run build  # Build all packages
cd artifacts/api-server && pnpm run dev  # Terminal 1: Backend
cd artifacts/meetmesh-frontend && pnpm run dev  # Terminal 2: Frontend
```

## Code Style

We use **ESLint** and **Prettier** to maintain consistent code style:

```bash
# Format code with Prettier
pnpm exec prettier --write src/

# Check linting (ESLint configuration in .eslintrc.json)
pnpm exec eslint src/
```

### Style Guidelines

- **2-space indentation** (not tabs)
- **Double quotes** for strings
- **Semicolons** required
- **Trailing commas** in multi-line objects/arrays
- **Arrow functions** for callbacks
- **const/let** (no var)
- **Meaningful variable names** (no single letters except for indices)

### TypeScript

- Use strict type checking
- Avoid `any` type when possible
- Export types explicitly: `export type MyType = ...`
- Add JSDoc comments for complex functions

Example:
```typescript
/**
 * Creates a new meeting and returns the meeting code
 * @param eventName - Name of the event
 * @param hostPeerId - Peer ID of the host
 * @returns Meeting code for joining
 */
export function createMeeting(eventName: string, hostPeerId: string): string {
  // implementation
}
```

## Commit Message Conventions

Write clear, descriptive commit messages:

```
<type>: <subject>

<body>

<footer>
```

### Types
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `test:` - Test additions/changes
- `chore:` - Build process, dependencies, etc.

### Examples
```
feat: Add emoji reactions to meeting view

Implement real-time emoji reactions for participants with animation

Fixes #123
```

```
fix: Correct socket.io room broadcasting

Use proper Array.from() for iterating sockets in a room

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

## Pull Request Process

1. **Before submitting:**
   - Run `pnpm run build` to ensure it compiles
   - Run type checking: `pnpm run typecheck`
   - Test your changes locally

2. **PR Title and Description:**
   - Clear title describing the change
   - Explain what you're changing and why
   - Reference any related issues (#123)
   - List any breaking changes

3. **PR Checklist:**
   - [ ] Code follows the style guidelines
   - [ ] Changes are well-documented
   - [ ] No console.log/error statements (use logger instead)
   - [ ] Environment variables don't leak into commits
   - [ ] TypeScript compilation succeeds
   - [ ] No new warnings introduced

4. **After submitting:**
   - Respond to review feedback
   - Keep the PR focused on a single feature/fix
   - Rebase on main if there are conflicts

## Testing

While automated testing is not yet enforced, please:

- Manually test your changes
- Test on both mobile and desktop views
- Test with different browsers if possible
- Report any issues you find

## Logging

Use the **Pino logger** for logging (not console.log):

```typescript
import { logger } from "./lib/logger";

// Good
logger.info({ userId: "123" }, "User logged in");
logger.error({ error }, "Failed to create meeting");

// Bad
console.log("User logged in");
console.error("Error:", error);
```

## File Organization

- **Keep related files together** - Components with their styles/tests
- **Use meaningful names** - `MeetingParticipant` not `MP`
- **Create index files** for public exports from directories
- **Separate concerns** - Logic, UI, styling, types

Example structure:
```
src/components/
├── MeetingView/
│   ├── index.ts           # Exports MeetingView
│   ├── MeetingView.tsx    # Component
│   └── MeetingView.css    # Styles
└── ParticipantCard/
    ├── index.ts
    ├── ParticipantCard.tsx
    └── ParticipantCard.css
```

## Documentation

- **README.md** - Project overview and setup
- **Code comments** - Complex logic, non-obvious decisions
- **JSDoc** - Public functions and exports
- **Type definitions** - Use TypeScript interfaces/types

## Issues

### Reporting Bugs

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/videos if applicable
- Environment (Node version, browser, OS)

### Feature Requests

Include:
- Clear description of the feature
- Use case and benefits
- Possible implementation approach
- Examples or mockups if applicable

## Questions?

- Check existing issues and PRs
- Read the README and documentation
- Create a discussion or issue with the `question` label

## Recognition

Contributors will be recognized in:
- Git commit history
- Pull request discussions
- Future CONTRIBUTORS.md file

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Meetmesh! 🎉
