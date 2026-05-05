# Meetmesh

A modern, real-time meeting platform built with Node.js, Express, Socket.io, and React. Meetmesh enables seamless communication and collaboration with features like interactive participant visualization, role-based access control, and real-time messaging.

## Project Architecture

Meetmesh is organized as a monorepo using pnpm workspaces with the following structure:

```
meetmesh/
├── artifacts/               # Build artifacts and example projects
│   ├── api-server/         # Express API server (Node.js backend)
│   └── meetmesh-frontend/  # React frontend application (Vite)
├── lib/                    # Shared libraries and utilities
│   ├── api-zod/           # Zod schemas for API validation
│   ├── api-spec/          # OpenAPI specification
│   ├── db/                # Database configuration and utilities
│   └── api-client-react/  # React hooks for API communication
├── meetmesh-core/         # Shared Socket.io client and types
├── meetmesh-frontend/     # Main React frontend (Active workspace)
├── meetmesh-api/          # Main Express API server (Active workspace)
└── scripts/               # Utility scripts and tooling
```

## Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.io** - Real-time communication
- **Pino** - Structured logging
- **TypeScript** - Type safety

### Frontend
- **React 19.1.0** - UI library
- **Vite** - Build tool and dev server
- **Framer Motion** - Animation library
- **D3** - Graph visualization
- **TailwindCSS** - Utility-first CSS framework
- **Wouter** - Lightweight router

### Infrastructure
- **pnpm** - Fast, disk space efficient package manager
- **TypeScript** - For type safety across the project

## Prerequisites

- **Node.js** 18.0 or higher
- **pnpm** 8.0 or higher (install with `npm install -g pnpm`)

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Setup

Copy the example environment files:

```bash
cp artifacts/api-server/.env.example artifacts/api-server/.env
cp artifacts/meetmesh-frontend/.env.example artifacts/meetmesh-frontend/.env
```

Edit the files to match your local development setup.

### 3. Build the Project

```bash
pnpm run build
```

This will:
- Run TypeScript checks across all packages
- Build all workspace projects with their respective build scripts

### 4. Development Workflow

#### Start the API Server
```bash
cd artifacts/api-server
pnpm run dev
```

The server will start on the port specified in your `.env` file (default: 3001).

#### Start the Frontend (in another terminal)
```bash
cd artifacts/meetmesh-frontend
pnpm run dev
```

The frontend will be available at `http://localhost:5173` (Vite default).

### 5. Verify Setup

1. Open http://localhost:5173 in your browser
2. You should see the Meetmesh landing page
3. The frontend should connect to the backend API at `http://localhost:3001`

## Key Features

### Real-time Communication
- **Socket.io** integration for instant message delivery
- Live participant updates and status changes
- Emoji reactions and real-time chat

### Meeting Management
- Create and join meetings with unique codes
- Host controls for participant management
- Waiting room support
- Participant roles (host, organizer, speaker, attendee)

### Interactive Visualization
- Spring physics-based node arrangement
- Customizable participant tiers and positioning
- Smooth animations and transitions
- Mobile and desktop responsive design

### Collaboration Tools
- Direct and global messaging
- Real-time participant presence
- Host panel with action controls
- Interactive tooltips and UI

## Project Commands

### Workspace Level
```bash
# Type check all projects
pnpm run typecheck

# Build all projects
pnpm run build

# Type check only libraries
pnpm run typecheck:libs
```

### Individual Workspace Commands
Each workspace (api-server, meetmesh-frontend, etc.) may have its own scripts. Check their `package.json` for available commands.

## Code Quality

This project follows consistent code style and quality standards:

- **ESLint** - Linting and code quality checks (see `.eslintrc.json`)
- **Prettier** - Code formatting (see `prettier.config.js`)
- **TypeScript** - Strict type checking
- **Structured Logging** - Using Pino for consistent logging

## Git Workflow

### Current Branch
Main development branch: `frontend`

### Common Operations
```bash
# Check git status
git status

# View recent commits
git log --oneline -10

# Create a feature branch
git checkout -b feature/your-feature-name
```

## Environment Variables

### API Server (.env)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development, production, test)
- `DEBUG` - Enable verbose logging (true/false)

### Frontend (.env)
- `VITE_HUB_URL` - Backend API URL (default: http://localhost:3001)

**Important**: Never commit `.env` files. Use `.env.example` as a template.

## Project Structure

### Backend (artifacts/api-server)
- `src/index.ts` - Server entry point
- `src/app.ts` - Express app configuration
- `src/routes/` - API route handlers
- `src/lib/` - Shared utilities and helpers

### Frontend (artifacts/meetmesh-frontend)
- `src/main.tsx` - React entry point
- `src/App.tsx` - Root component
- `src/pages/` - Page components
- `src/components/` - Reusable components

### Shared (meetmesh-core, lib/)
- `meetmesh-core/` - Shared Socket.io client and types
- `lib/api-zod/` - Request/response validation schemas
- `lib/db/` - Database utilities
- `lib/api-client-react/` - React hooks for API

## Contributing

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on:
- Code style and formatting
- Commit message conventions
- Pull request process
- Testing requirements

## Troubleshooting

### Build Fails with TypeScript Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Port Already in Use
```bash
# Change PORT in .env to an available port
PORT=3002 pnpm run dev
```

### Frontend Can't Connect to Backend
- Verify backend is running on the correct port
- Check `VITE_HUB_URL` in frontend `.env`
- Ensure CORS is properly configured in backend

## Performance Considerations

- The project uses `pnpm` for efficient dependency management
- Platform-specific binaries are excluded for Linux optimization (see `pnpm-workspace.yaml`)
- Minimum release age is enforced for npm packages for security (1 day)

## Security

- Environment variables are never committed to the repository
- Supply chain attack defense through minimum release age enforcement
- TypeScript for compile-time type safety
- Structured logging for audit trails

## License

MIT (see LICENSE file for details)

## Support

For issues or questions, please check existing GitHub issues or create a new one with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, OS, etc.)
