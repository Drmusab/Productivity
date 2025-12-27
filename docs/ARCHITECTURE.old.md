# Productivity OS Architecture

## Overview

Productivity OS is an Obsidian-style productivity platform that combines note-taking, task management, and productivity modules into a cohesive workspace. The application is designed to be:

- **Offline-first**: All data is stored locally with optional sync
- **Docker-first**: Development and production environments run via Docker
- **Update-friendly**: Versioned migrations and backup/restore capabilities
- **TypeScript end-to-end**: Consistent typing across all layers

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Productivity OS                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐    ┌─────────────────────────┐     │
│  │     Desktop App         │    │     Web Interface       │     │
│  │   (Electron + React)    │    │      (React SPA)        │     │
│  └───────────┬─────────────┘    └───────────┬─────────────┘     │
│              │                              │                    │
│              └──────────────┬───────────────┘                    │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Backend API                             │    │
│  │              (Node.js + Express + TypeScript)             │    │
│  └───────────┬─────────────────────────────────┬───────────┘    │
│              │                                 │                 │
│              ▼                                 ▼                 │
│  ┌─────────────────────┐           ┌─────────────────────┐      │
│  │   SQLite Database   │           │   File Storage      │      │
│  │   (Vault Index)     │           │   (Markdown Notes)  │      │
│  └─────────────────────┘           └─────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
productivity-os/
├── apps/
│   ├── desktop/              # Electron + React frontend
│   │   ├── src/
│   │   │   ├── components/   # React components
│   │   │   ├── pages/        # Page components
│   │   │   ├── services/     # API clients
│   │   │   ├── contexts/     # React contexts
│   │   │   ├── editor/       # Block editor
│   │   │   └── utils/        # Utilities
│   │   ├── public/           # Static assets
│   │   └── package.json
│   │
│   └── backend/              # Node.js API server
│       ├── src/
│       │   ├── routes/       # API routes
│       │   ├── services/     # Business logic
│       │   ├── middleware/   # Express middleware
│       │   ├── utils/        # Utilities
│       │   └── types/        # TypeScript types
│       ├── tests/            # Test files
│       └── package.json
│
├── packages/
│   └── shared/               # Shared types & utilities
│       ├── src/
│       │   ├── types.ts      # Common types
│       │   ├── blocks.ts     # Block definitions
│       │   ├── notes.ts      # Note types
│       │   ├── vault.ts      # Vault types
│       │   └── version.ts    # Version info
│       └── package.json
│
├── infra/
│   └── docker/               # Docker configuration
│       ├── docker-compose.yml
│       ├── Dockerfile.backend.dev
│       ├── Dockerfile.backend.prod
│       ├── Dockerfile.desktop.dev
│       ├── Dockerfile.desktop.prod
│       └── nginx.conf
│
├── scripts/                  # CLI utilities
│   ├── migrate.ts            # Database migrations
│   ├── backup.ts             # Backup/restore
│   └── seed.ts               # Database seeding
│
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md       # This file
│   └── UPDATE_GUIDE.md       # Update instructions
│
├── docker-compose.yml        # Root compose file
├── .env.example              # Environment template
├── .gitignore
└── README.md
```

## Core Concepts

### 1. Vault System

A Vault is a workspace container that holds:
- **Notes**: Markdown files with wiki-links
- **Folders**: Hierarchical organization
- **Tags**: Cross-cutting categorization
- **Attachments**: Media and file attachments
- **Index Database**: SQLite database for search, links, and graph queries

### 2. Block-Based Content

Everything is a block:
- Text, headings, lists, todos
- Kanban boards, columns, cards
- AI-generated content
- Database rows

Block properties:
- `id`: Unique identifier (UUID)
- `type`: Block type enum
- `data`: Type-specific content
- `children`: Ordered child block IDs
- `parentId`: Parent reference
- `metadata`: Permissions, AI hints, UI state

### 3. Graph Intelligence

Notes form a knowledge graph:
- **Outgoing links**: Notes this note references
- **Backlinks**: Notes that reference this note
- **Neighbors**: Notes within N hops
- **Unresolved links**: Missing note references
- **Orphan notes**: Notes with no links

### 4. P.A.R.A. Organization

Content is categorized using the P.A.R.A. method:
- **Projects**: Active work with deadlines
- **Areas**: Ongoing responsibilities
- **Resources**: Reference materials
- **Archive**: Completed/inactive items

## Data Flow

```
User Action
    │
    ▼
Frontend (React)
    │
    ├── Local State Update
    │
    ▼
API Request (IPC/HTTP)
    │
    ▼
Backend (Express)
    │
    ├── Validation
    ├── Business Logic
    │
    ▼
Data Layer
    │
    ├── SQLite (Index, metadata)
    └── File System (Markdown notes)
    │
    ▼
Response
    │
    ▼
Frontend Update
    │
    ▼
UI Re-render
```

## Technology Stack

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Material-UI**: Component library
- **Lexical**: Block editor
- **Yjs**: Collaborative editing

### Backend
- **Node.js**: Runtime
- **Express**: Web framework
- **TypeScript**: Type safety
- **SQLite**: Database
- **Socket.io**: Real-time events

### Infrastructure
- **Docker**: Containerization
- **Docker Compose**: Orchestration

## Security Considerations

- JWT-based authentication
- CSRF protection
- Rate limiting
- Input sanitization
- Secure headers (Helmet)
- No SQL injection (parameterized queries)

## Scalability

The architecture supports:
- Multiple vaults
- Large note collections (SQLite indexes)
- Future: Multi-device sync
- Future: Collaborative editing

## Future Roadmap

1. **Electron Desktop App**: Native desktop experience
2. **Mobile Apps**: React Native apps
3. **Cloud Sync**: Optional encrypted sync
4. **Plugin System**: Extensible architecture
5. **AI Integration**: LLM-powered features
