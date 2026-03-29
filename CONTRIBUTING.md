# Contributing to Cerebria

First off, thanks for taking the time to contribute! 🧠✨

## Development Setup

1. Fork and clone the repo.
2. Install dependencies: `npm install`
3. Run tests: `npm test`

## Publishing Workflow (For Maintainers)

### Prerequisites
- Node.js 18+ (for `crypto` module compatibility).
- npm 9+ with Granular Access Token (if 2FA is enabled).

### Release Steps
1. Ensure all tests pass: `npm test`
2. Build the project: `npm run build`
3. Update version: `npm version patch|minor|major`
4. Publish: `npm publish --access public`

### Troubleshooting
- **`ReferenceError: crypto is not defined`**: Ensure you are using `import { randomUUID } from 'node:crypto'`.
- **`E403 Two-factor authentication...`**: Use a **Granular Access Token** with "Publish" permissions.
- **`Provenance not supported`**: Add `provenance=false` to `.npmrc` for local publishing.