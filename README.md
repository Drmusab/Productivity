# Productivity OS

An Obsidian-style productivity platform combining note-taking, task management, and productivity modules into a cohesive workspace. Built with TypeScript end-to-end, Docker-first architecture, and offline-first design.

> **Note**: This is a refactored version of the AI-Integrated Task Manager, restructured as a unified "Productivity OS" with proper monorepo organization.

---

## 🚀 Quick Start

### Prerequisites
- Docker 20.10+ and Docker Compose
- Node.js 18+ (for local development)

### Development Mode

```bash
# Clone the repository
git clone https://github.com/Drmusab/AI-Integrated-Task-Manager.git
cd AI-Integrated-Task-Manager

# Copy environment file
cp .env.example .env

# Start development environment
docker compose --profile dev up

# Access the application
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
```

### Production Mode

```bash
# Start production environment
docker compose --profile prod up -d

# Check status
docker compose ps
```

---

## 📁 Project Structure

```
productivity-os/
├── apps/
│   ├── desktop/          # React frontend (Electron-ready)
│   └── backend/          # Node.js API server
├── packages/
│   └── shared/           # Shared TypeScript types
├── infra/
│   └── docker/           # Docker configuration
├── scripts/              # CLI utilities (migrate, backup, seed)
├── docs/                 # Documentation
└── docker-compose.yml    # Root compose file
```

---

## 📑 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Update & Backup](#update--backup)
- [Development Guide](#development-guide)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Features

### Vault System (Obsidian-style)
- **Wiki-links**: `[[Note Title]]` syntax for linking notes
- **Backlinks Panel**: See all notes that reference the current note
- **Unresolved Links**: Track missing notes that should be created
- **Daily Notes**: Auto-generated notes with customizable templates
- **Graph Intelligence**: Query note relationships without visualization

### Block-Based Editor (Notion-style)
- **Block Types**: Paragraph, heading, todo, list, quote, code, callout, embed
- **Nested Blocks**: Full tree structure with parent-child relationships
- **Drag & Drop**: Reorder blocks within and across notes
- **Block → Note Linking**: Reference specific blocks in other notes

### Productivity Modules
- **Kanban Boards**: Full-featured task management
- **Pomodoro Focus**: Configurable work/break cycles with session logging
- **Thought Organizer**: Brain dump with categorization (Facts, Interpretations, Emotions, Assumptions, Actions, Questions)
- **P.A.R.A. Method**: Projects, Areas, Resources, Archive organization
- **Time Blocking**: Schedule-based productivity tracking

### Core Kanban Features
- **Customizable Boards**: Create unlimited boards with custom names and descriptions
- **Flexible Columns**: Define your workflow stages with customizable columns, colors, and icons
- **Swimlanes**: Organize tasks horizontally across columns for better categorization
- **Drag-and-Drop**: Intuitive drag-and-drop interface for moving tasks between columns and swimlanes
- **Rich Task Management**: 
  - Markdown support for task descriptions
  - Tags for categorization
  - Subtasks/checklists
  - File attachments
  - Due dates and priorities
  - Task assignment
- **Task History**: Complete audit trail of all task changes

### AI-Powered Features ✨ NEW
- **Natural Language Commands**: Control your tasks using plain English
  - "Create high priority task 'Deploy application' in To Do"
  - "List tasks in In Progress"
  - "Show weekly report"
- **Intelligent Notifications**: Automated notifications sent to n8n webhooks
  - Task due date alerts
  - Overdue task notifications
  - Routine task reminders
- **Automated Reporting**: Comprehensive analytics and productivity reports
  - Weekly automated reports to n8n
  - Custom date range analysis
  - Productivity metrics and trends
  - Task completion analytics

### Advanced Features
- **Automation Engine**: Create custom automation rules triggered by task events
- **n8n Integration**: Three specialized integration nodes
  - **AI Agent Node**: Natural language command processing
  - **Notification Node**: Real-time event notifications
  - **Reporting Node**: Automated analytics and reporting
- **Recurring Tasks**: Set up time-based recurring task patterns with automated reminders
- **Real-time Sync**: Server-Sent Events for live updates across clients
- **Analytics Dashboard**: Visualize task metrics, completion rates, and productivity trends
- **Offline-First**: Works without internet connection using local SQLite database
- **Backup & Restore**: Built-in data backup functionality
- **Theming**: Customizable appearance and accessibility features
- **Secure API**: API key authentication for webhook and automation endpoints

---

## AI Integration

This application features comprehensive AI integration designed for use with n8n workflows. See the [AI Integration Guide](./docs/AI_INTEGRATION_GUIDE.md) for detailed documentation.

### Quick Examples

**Natural Language Task Management:**
```bash
# Create tasks with priority
curl -X POST http://localhost:3001/api/ai/command \
  -H "Content-Type: application/json" \
  -d '{"command": "Create high priority task \"Deploy to production\" in To Do"}'

# List tasks by column
curl -X POST http://localhost:3001/api/ai/command \
  -H "Content-Type: application/json" \
  -d '{"command": "List tasks in In Progress"}'

# Generate reports
curl -X POST http://localhost:3001/api/ai/command \
  -H "Content-Type: application/json" \
  -d '{"command": "Show weekly report"}'
```

**Automated Notifications:**
- Automatically sends notifications to n8n webhooks for due tasks
- Routine reminders for recurring tasks
- Custom event notifications with rich metadata

**Intelligent Reporting:**
- Weekly automated reports every Monday at 9 AM
- Custom date range analytics
- Productivity metrics (completion rates, velocity, user stats)

See the [AI Integration Guide](./docs/AI_INTEGRATION_GUIDE.md) for:
- Complete command reference
- n8n workflow examples
- Notification payload structures
- Report customization

---

## Technology Stack

### Frontend
- **React 18.2**: Modern UI framework with hooks
- **Material-UI (MUI) 5**: Comprehensive component library
- **React Beautiful DnD**: Drag-and-drop functionality
- **Axios**: HTTP client for API communication
- **React Router**: Client-side routing
- **Recharts**: Analytics and data visualization
- **Notistack**: Toast notifications

### Backend
- **Node.js**: JavaScript runtime
- **Express 4**: Web application framework
- **SQLite 3**: Embedded database
- **JWT**: Token-based authentication
- **Multer**: File upload handling
- **Node-Cron**: Task scheduling
- **Helmet**: Security middleware
- **Express Rate Limit**: API rate limiting

### Infrastructure
- **Docker & Docker Compose**: Containerization and orchestration
- **n8n**: Workflow automation (optional)

---

## System Requirements

### For Docker Installation (Recommended)
- **Operating System**: Windows 10/11, macOS 10.14+, or Linux
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 1.29 or higher
- **RAM**: Minimum 2GB available
- **Disk Space**: Minimum 500MB for application and data

### For Development Installation
- **Node.js**: Version 16.x or higher
- **npm**: Version 7.x or higher
- **Operating System**: Windows, macOS, or Linux
- **RAM**: Minimum 4GB recommended
- **Disk Space**: Minimum 1GB

---

## Installation

### Quick Start with Docker

This is the recommended installation method for most users.

#### Step 1: Install Docker

If you don't have Docker installed:

- **Windows/Mac**: Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**: Follow the [official Docker installation guide](https://docs.docker.com/engine/install/)

Verify Docker installation:
```bash
docker --version
docker-compose --version
```

#### Step 2: Clone the Repository

```bash
git clone https://github.com/Drmusab/Kanban-style-task.git
cd Kanban-style-task
```

#### Step 3: Configure Environment

Create your environment configuration file:
```bash
cp .env.example .env
```

Edit the `.env` file if needed (optional - defaults work for local use):
```bash
# Backend Configuration
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Security (recommended to set for webhook security)
N8N_API_KEY=your-secure-api-key-here
JWT_SECRET=your-secret-key-here

# Database
DB_PATH=./data/kanban.db

# File Upload
UPLOAD_DIR=./attachments
MAX_FILE_SIZE=10485760  # 10MB
```

#### Step 4: Start the Application

```bash
docker-compose up -d
```

This command will:
- Build the frontend and backend Docker images
- Start all services (frontend, backend, n8n)
- Initialize the SQLite database
- Set up persistent volumes for data storage

#### Step 5: Access the Application

Once the containers are running, open your web browser and navigate to:

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **n8n Automation Platform**: http://localhost:5678 (optional)

**Default Login Credentials:**
- Username: `demo`
- Password: `demo123`

> **Note**: Change the default password after first login via Settings > Profile

#### Step 6: Verify Installation

Check that all services are running:
```bash
docker-compose ps
```

You should see three containers running:
- `kanban-frontend`
- `kanban-backend`
- `kanban-n8n`

To view logs:
```bash
docker-compose logs -f
```

#### Managing the Application

**Stop the application:**
```bash
docker-compose down
```

**Stop and remove all data (⚠️ Warning: This deletes all tasks and boards):**
```bash
docker-compose down -v
```

**Restart the application:**
```bash
docker-compose restart
```

**Update to latest version:**
```bash
git pull origin main
docker-compose down
docker-compose up -d --build
```

---

### Development Installation

For developers who want to contribute or run the application without Docker.

#### Prerequisites

Ensure you have Node.js and npm installed:
```bash
node --version  # Should be 16.x or higher
npm --version   # Should be 7.x or higher
```

#### Step 1: Clone the Repository

```bash
git clone https://github.com/Drmusab/Kanban-style-task.git
cd Kanban-style-task
```

#### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

#### Step 3: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

#### Step 4: Configure Environment

Create environment files:
```bash
# In the root directory
cp .env.example .env
```

Edit the `.env` file as needed.

#### Step 5: Initialize Database

The database will be automatically initialized when you start the backend.

#### Step 6: Start Backend Server

In the `backend` directory:
```bash
npm run dev
```

The backend API will start on http://localhost:3001

#### Step 7: Start Frontend Development Server

In a new terminal, from the `frontend` directory:
```bash
npm start
```

The frontend will automatically open in your browser at http://localhost:3000

---

## Configuration

### Environment Variables

The application is configured through environment variables in the `.env` file:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | Backend server port | `3001` | No |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` | No |
| `N8N_API_KEY` | API key for webhook authentication | _(empty)_ | Recommended |
| `JWT_SECRET` | Secret for JWT token generation | `your-secret-key-here` | Yes |
| `JWT_EXPIRES_IN` | JWT token expiration | `7d` | No |
| `DB_PATH` | SQLite database file path | `./data/kanban.db` | No |
| `UPLOAD_DIR` | Directory for file attachments | `./attachments` | No |
| `MAX_FILE_SIZE` | Maximum upload file size in bytes | `10485760` (10MB) | No |
| `NOTIFICATION_ENABLED` | Enable notifications | `true` | No |
| `BACKUP_ENABLED` | Enable automatic backups | `true` | No |
| `BACKUP_INTERVAL` | Backup frequency | `daily` | No |
| `BACKUP_DIR` | Backup directory | `./backups` | No |

### Security Configuration

For production use or when exposing webhooks:

1. **Set a strong JWT secret:**
   ```bash
   JWT_SECRET=$(openssl rand -base64 32)
   ```

2. **Configure API key for webhooks:**
   ```bash
   N8N_API_KEY=$(openssl rand -base64 32)
   ```

3. **Enable rate limiting** (already configured in backend)

---

## User Guide

### Getting Started

#### First Login

1. Navigate to http://localhost:3000
2. Log in with default credentials:
   - Username: `demo`
   - Password: `demo123`
3. You'll be redirected to the Boards page

#### Changing Your Password

1. Click on **Settings** in the navigation menu
2. Select **Profile** tab
3. Enter your current password and new password
4. Click **Update Password**

---

### Managing Boards

#### Creating a New Board

1. Navigate to **Boards** page
2. Click the **+ Create Board** button
3. Enter board details:
   - **Name**: Give your board a descriptive name
   - **Description**: Optional description of the board's purpose
   - **Template**: Optionally select a pre-configured template
4. Click **Create**

Your new board will appear in the boards list.

#### Using Board Templates

Templates provide pre-configured column layouts:

- **Simple**: Basic To Do, In Progress, Done columns
- **Software Development**: Backlog, Ready, In Progress, Review, Testing, Done
- **Bug Tracking**: Reported, Confirmed, In Progress, Testing, Resolved
- **Custom**: Start with a blank board

#### Opening a Board

Click on any board card to open the board view where you can manage columns, swimlanes, and tasks.

#### Editing a Board

1. Open the board
2. Click the **Board Settings** icon (⚙️)
3. Update name or description
4. Click **Save**

#### Deleting a Board

1. From the Boards page, click the **Delete** icon on the board card
2. Confirm deletion

> **Warning**: Deleting a board permanently removes all associated columns, swimlanes, and tasks.

---

### Working with Columns

#### Adding a Column

1. Open a board
2. Click **+ Add Column** button
3. Configure the column:
   - **Name**: Column title (e.g., "In Progress")
   - **Color**: Choose a color for visual identification
   - **Icon**: Select an icon (optional)
   - **WIP Limit**: Set work-in-progress limit (optional)
4. Click **Create**

#### Reordering Columns

Drag and drop column headers to reorder them.

#### Editing a Column

1. Click the **Edit** icon (✏️) on the column header
2. Modify column properties
3. Click **Save**

#### Deleting a Column

1. Click the **Delete** icon on the column header
2. Confirm deletion

> **Note**: You cannot delete a column that contains tasks. Move or delete tasks first.

---

### Working with Swimlanes

Swimlanes provide horizontal organization across columns.

#### Adding a Swimlane

1. Open a board
2. Click **+ Add Swimlane** button
3. Configure:
   - **Name**: Swimlane title (e.g., "Priority", "Team A")
   - **Color**: Choose a color
4. Click **Create**

#### Reordering Swimlanes

Drag and drop swimlane headers to reorder them.

---

### Working with Tasks

#### Creating a Task

1. Click the **+ Add Task** button in any column
2. Fill in task details:
   - **Title**: Task name (required)
   - **Description**: Detailed description with Markdown support
   - **Priority**: Low, Medium, High, or Critical
   - **Due Date**: Optional deadline
   - **Assigned To**: Select a team member
   - **Tags**: Add categorization tags
   - **Swimlane**: Assign to a swimlane (if applicable)
3. Add subtasks (optional):
   - Click **Add Subtask**
   - Enter subtask description
4. Add attachments (optional):
   - Click **Attach Files**
   - Select files (max 10MB per file)
5. Click **Create Task**

#### Viewing Task Details

Click on any task card to open the task detail modal showing:
- Full description
- All metadata (priority, due date, assignee)
- Subtasks with completion tracking
- Attachments
- Comment history
- Change history

#### Editing a Task

1. Click on a task to open details
2. Click **Edit** button
3. Modify any field
4. Click **Save**

All changes are automatically logged in task history.

#### Moving Tasks

**Drag and Drop:**
- Click and hold a task card
- Drag to desired column or swimlane
- Release to drop

**Via Edit Dialog:**
1. Open task details
2. Click **Edit**
3. Change **Column** or **Swimlane**
4. Click **Save**

#### Deleting a Task

1. Open task details
2. Click **Delete** button
3. Confirm deletion

#### Using Markdown in Descriptions

Task descriptions support GitHub-flavored Markdown:

```markdown
# Heading
## Subheading

**Bold text**
*Italic text*

- Bullet list
1. Numbered list

[Link](https://example.com)

`code`

```
code block
```
```

#### Task Filters

Filter tasks by:
- **Search**: Text search across titles and descriptions
- **Priority**: Filter by priority level
- **Tags**: Filter by one or more tags
- **Assigned To**: Filter by assignee
- **Due Date**: Overdue, due today, due this week

Access filters via the **Filter** button in the board toolbar.

---

### Automation & Integrations

#### Setting Up Automation Rules

1. Navigate to **Settings** → **Automation**
2. Click **+ Add Rule**
3. Configure the automation:
   - **Name**: Rule identifier
   - **Trigger**: When to execute
     - Task Created
     - Task Updated
     - Task Moved
     - Task Completed
     - Due Date Approaching
   - **Conditions**: Optional filters
     - Column
     - Priority
     - Tags
   - **Actions**: What to do
     - Send Webhook
     - Send Notification
     - Move Task
     - Update Task Field
     - Create New Task
4. Click **Save**

#### Example Automation Rules

**Notify on High Priority Tasks:**
- Trigger: Task Created
- Condition: Priority = High
- Action: Send Notification

**Auto-move completed tasks:**
- Trigger: All Subtasks Completed
- Action: Move Task to "Done" column

**Recurring Daily Standup Task:**
- Trigger: Daily at 9:00 AM
- Action: Create Task "Daily Standup" in "To Do" column

#### Setting Up n8n Integration

n8n is a powerful workflow automation tool included with this application.

1. Access n8n at http://localhost:5678
2. Create **Kanban App API** credentials using your backend URL and `N8N_API_KEY`
3. Add the **Kanban App** node to perform actions (create/update tasks and boards) or the **Kanban App Trigger** node to poll for updates
4. Configure the node parameters (resource, operation, polling interval, filters) to match your use case
5. Connect downstream nodes to build your automation logic and activate the workflow

For installation options and manual setup of the custom node package, see [n8n Custom Node Setup](./docs/N8N_CUSTOM_NODE_SETUP.md).

#### Using Webhooks

Send authenticated requests to automation endpoints:

```bash
# Create a task via webhook
curl -X POST http://localhost:3001/api/tasks/create \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "title": "Task from Webhook",
    "description": "Created via API",
    "column_id": 1,
    "priority": "medium"
  }'
```

Available webhook endpoints:
- `POST /api/tasks/create` - Create task
- `POST /api/tasks/update` - Update task
- `POST /api/tasks/delete` - Delete task

---

### Analytics & Reporting

#### Accessing Analytics

Navigate to **Analytics** from the main menu to view:

**Overview Dashboard:**
- Total tasks across all boards
- Tasks by status (To Do, In Progress, Done)
- Completion rate percentage
- Overdue tasks count

**Charts & Visualizations:**
- **Task Distribution**: Pie chart showing task status breakdown
- **Completion Trends**: Line chart showing daily completion rates
- **Priority Breakdown**: Bar chart of tasks by priority
- **Board Performance**: Tasks per board comparison

**Time-Based Metrics:**
- Average completion time
- Velocity (tasks completed per week)
- Burndown charts (for sprint boards)

#### Exporting Data

1. Navigate to **Analytics**
2. Click **Export** button
3. Choose format (CSV, JSON)
4. Select date range
5. Click **Download**

---

## Code Documentation

### Comprehensive Code Documentation

For detailed documentation of every code file, function, and API in this application, see:

📖 **[Complete Code Documentation](./docs/CODE_DOCUMENTATION.md)**

This comprehensive guide includes:

- **Backend Documentation**
  - All utilities (database, logging, history tracking)
  - All middleware (authentication, error handling, performance monitoring)
  - All services (tasks, webhooks, notifications, reporting, automation, event bus, scheduler)
  - All routes (tasks, boards, users, integrations, automation, sync, AI, reports, routines, settings)
  
- **Frontend Documentation**
  - All components (TaskCard, TaskDialog, ColumnDialog, ErrorBoundary, etc.)
  - All pages (Board, Boards, Analytics, Calendar, Login, Routines, Settings)
  - All services (API client, task service, board service, automation service, etc.)
  - All contexts (AuthContext, NotificationContext)
  - All utilities (board utilities, date helpers)

- **API Documentation**
  - Complete REST API endpoint reference
  - Request/response schemas
  - Authentication methods
  - Error codes and handling

- **Additional Resources**
  - Database schema documentation
  - Testing documentation
  - Deployment guide
  - Security features
  - Performance optimization

### Inline Code Documentation

All code files include comprehensive JSDoc comments with:
- File-level `@fileoverview` descriptions
- Function-level `@param`, `@returns`, and `@throws` documentation
- Usage examples with `@example` tags
- Type annotations for parameters and return values
- Detailed explanations of complex algorithms

---

## API Documentation

### Base URL

```
http://localhost:3001/api
```

### Authentication

Most endpoints require authentication. Include the JWT token in requests:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Endpoints

#### Authentication

**Login**
```http
POST /api/users/login
Content-Type: application/json

{
  "username": "demo",
  "password": "demo123"
}

Response: {
  "token": "jwt_token_here",
  "user": { "id": 1, "username": "demo", "email": "demo@example.com" }
}
```

**Get Current User**
```http
GET /api/users/me
Authorization: Bearer YOUR_JWT_TOKEN

Response: {
  "id": 1,
  "username": "demo",
  "email": "demo@example.com"
}
```

#### Boards

**List All Boards**
```http
GET /api/boards

Response: [
  {
    "id": 1,
    "name": "My Project",
    "description": "Project board",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

**Get Board by ID**
```http
GET /api/boards/:id

Response: {
  "id": 1,
  "name": "My Project",
  "description": "Project board",
  "columns": [...],
  "swimlanes": [...]
}
```

**Create Board**
```http
POST /api/boards
Content-Type: application/json

{
  "name": "New Board",
  "description": "Board description",
  "template": "simple"
}

Response: { "id": 2, "name": "New Board", ... }
```

**Update Board**
```http
PUT /api/boards/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Delete Board**
```http
DELETE /api/boards/:id

Response: { "message": "Board deleted successfully" }
```

#### Columns

**Get Board Columns**
```http
GET /api/boards/:boardId/columns

Response: [
  {
    "id": 1,
    "board_id": 1,
    "name": "To Do",
    "color": "#FF5722",
    "position": 0
  }
]
```

**Create Column**
```http
POST /api/boards/:boardId/columns
Content-Type: application/json

{
  "name": "In Review",
  "color": "#2196F3",
  "wip_limit": 5
}
```

#### Tasks

**List Tasks**
```http
GET /api/tasks?board_id=1&column_id=2&priority=high

Response: [
  {
    "id": 1,
    "title": "Task Title",
    "description": "Task description",
    "priority": "high",
    "status": "in_progress",
    "due_date": "2025-01-15",
    "tags": ["frontend", "bug"],
    "subtasks": [...]
  }
]
```

**Get Task by ID**
```http
GET /api/tasks/:id
```

**Create Task**
```http
POST /api/tasks
Content-Type: application/json

{
  "title": "New Task",
  "description": "Task description",
  "column_id": 1,
  "priority": "medium",
  "due_date": "2025-01-15",
  "tags": ["feature"],
  "subtasks": [
    { "title": "Subtask 1", "completed": false }
  ]
}
```

**Update Task**
```http
PUT /api/tasks/:id
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "completed"
}
```

**Delete Task**
```http
DELETE /api/tasks/:id
```

#### Webhook Endpoints (Require API Key)

**Create Task via Webhook**
```http
POST /api/tasks/create
x-api-key: YOUR_API_KEY
Content-Type: application/json

{
  "title": "Task from Webhook",
  "column_id": 1
}
```

**Update Task via Webhook**
```http
POST /api/tasks/update
x-api-key: YOUR_API_KEY
Content-Type: application/json

{
  "id": 1,
  "status": "completed"
}
```

**Delete Task via Webhook**
```http
POST /api/tasks/delete
x-api-key: YOUR_API_KEY
Content-Type: application/json

{
  "id": 1
}
```

#### AI Commands ✨ NEW

**Execute Natural Language Command**
```http
POST /api/ai/command
Content-Type: application/json

{
  "command": "Create high priority task \"Deploy application\" in To Do"
}

Response: {
  "action": "create",
  "success": true,
  "taskId": 123,
  "priority": "high",
  "message": "Created high priority task \"Deploy application\" in To Do"
}
```

**Get Command Patterns**
```http
GET /api/ai/patterns

Response: {
  "examples": [
    "Create task \"Write release notes\" in Done",
    "List tasks in To Do",
    "Show weekly report"
  ],
  "supportedActions": [
    "create", "move", "complete", "set_due", "set_priority", "list", "report"
  ]
}
```

#### Reports & Analytics ✨ NEW

**Weekly Report**
```http
GET /api/reports/weekly

Response: {
  "period": { "start": "...", "end": "...", "days": 7 },
  "summary": {
    "tasksCreated": 25,
    "tasksCompleted": 18,
    "tasksOverdue": 3,
    "completionRate": "72.00%",
    "avgCompletionTimeHours": "24.50"
  },
  "tasksByColumn": [...],
  "tasksByPriority": [...],
  "activeBoards": [...]
}
```

**Custom Date Range Report**
```http
GET /api/reports/custom?startDate=2024-11-01T00:00:00Z&endDate=2024-11-30T23:59:59Z

Response: {
  "period": { ... },
  "summary": { ... },
  "tasksByColumn": [...]
}
```

**Productivity Analytics**
```http
GET /api/reports/analytics?days=30

Response: {
  "period": { "days": 30, ... },
  "dailyCompletions": [...],
  "userProductivity": [...],
  "velocity": [...]
}
```

**Send Report to n8n**
```http
POST /api/reports/weekly/send-to-n8n

Response: {
  "success": true,
  "message": "Report sent to 2 of 2 webhooks"
}
```

```http
POST /api/reports/custom/send-to-n8n
Content-Type: application/json

{
  "startDate": "2024-11-01T00:00:00Z",
  "endDate": "2024-11-30T23:59:59Z"
}
```

#### Integrations

**List Integrations**
```http
GET /api/integrations
```

**Create Integration**
```http
POST /api/integrations
Content-Type: application/json

{
  "name": "My n8n Webhook",
  "type": "n8n",
  "config": {
    "webhook_url": "https://n8n.example.com/webhook/...",
    "api_key": "secret_key"
  }
}
```

**Test n8n Webhook**
```http
POST /api/integrations/test-n8n-webhook
Content-Type: application/json

{
  "webhook_url": "https://n8n.example.com/webhook/..."
}
```

#### Automation

**List Automation Rules**
```http
GET /api/automation
```

**Create Automation Rule**
```http
POST /api/automation
Content-Type: application/json

{
  "name": "Notify on High Priority",
  "trigger": "task_created",
  "conditions": {
    "priority": "high"
  },
  "actions": [
    {
      "type": "notification",
      "config": { "message": "High priority task created" }
    }
  ]
}
```

**Trigger Automation Manually**
```http
POST /api/automation/:id/trigger
```

#### Sync Events

**Get Recent Events**
```http
GET /api/sync/events?since=2025-01-01T00:00:00.000Z

Response: [
  {
    "type": "task_updated",
    "task_id": 1,
    "timestamp": "2025-01-15T10:30:00.000Z",
    "changes": { "status": "completed" }
  }
]
```

**Stream Real-time Events (SSE)**
```http
GET /api/sync/stream

Response: (Server-Sent Events stream)
event: task_created
data: {"task_id": 1, "title": "New Task"}

event: task_updated
data: {"task_id": 1, "status": "in_progress"}
```

---

## Development Guide

### Project Structure

```
Kanban-style-task/
├── backend/                # Node.js/Express backend
│   ├── src/
│   │   ├── app.js         # Express app configuration
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Custom middleware
│   │   └── utils/         # Utilities and database
│   ├── tests/             # Backend tests
│   ├── Dockerfile
│   └── package.json
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   ├── contexts/      # React contexts
│   │   └── utils/         # Utility functions
│   ├── public/            # Static assets
│   ├── Dockerfile
│   └── package.json
├── n8n/                   # n8n automation
│   ├── nodes/             # Custom n8n nodes
│   └── Dockerfile
├── docker-compose.yml     # Docker orchestration
├── .env.example           # Environment template
└── README.md             # This file
```

### Running Tests

**Backend Tests:**
```bash
cd backend
npm test
```

**Frontend Tests:**
```bash
cd frontend
npm test
```

**Run specific test file:**
```bash
npm test -- tasks.test.js
```

**Run tests with coverage:**
```bash
npm test -- --coverage
```

### Database Schema

The SQLite database includes these main tables:

- `users` - User accounts and authentication
- `boards` - Board definitions
- `columns` - Column definitions within boards
- `swimlanes` - Swimlane definitions
- `tasks` - Task records
- `tags` - Tag definitions
- `task_tags` - Many-to-many task-tag relationships
- `subtasks` - Subtask/checklist items
- `attachments` - File attachment metadata
- `task_history` - Audit log of task changes
- `integrations` - External integration configurations
- `automation_rules` - Automation rule definitions
- `automation_logs` - Automation execution logs

### Adding New Features

1. **Backend API Endpoint:**
   - Add route in `backend/src/routes/`
   - Implement business logic in `backend/src/services/`
   - Add tests in `backend/tests/`

2. **Frontend Component:**
   - Create component in `frontend/src/components/` or `frontend/src/pages/`
   - Add API service method in `frontend/src/services/`
   - Add tests in component test file

3. **Database Migration:**
   - Add migration logic in `backend/src/utils/migrate.js`
   - Run migration: `npm run migrate`

### Code Style

This project follows standard JavaScript/React conventions:

- **ESLint**: Linting is configured via `.eslintrc`
- **Prettier**: Code formatting (if configured)
- **Naming**: camelCase for variables/functions, PascalCase for components

### Building for Production

**Frontend Build:**
```bash
cd frontend
npm run build
```

Creates optimized production build in `frontend/build/`

**Docker Production Build:**
```bash
docker-compose build
docker-compose up -d
```

---

## Troubleshooting

### Common Issues

#### Docker containers won't start

**Problem**: `docker-compose up` fails or containers exit immediately

**Solutions:**
1. Check Docker is running: `docker ps`
2. Check logs: `docker-compose logs`
3. Ensure ports 3000, 3001, 5678 are not in use
4. Try rebuilding: `docker-compose up -d --build --force-recreate`

#### npm ci fails during Docker build

**Problem**: Docker build fails with error: `The npm ci command can only install with an existing package-lock.json`

**Solutions:**
1. Ensure you have the latest code from the repository:
   ```bash
   git pull origin main
   ```
2. Verify that `package-lock.json` files exist in `frontend/`, `backend/`, and `n8n/` directories:
   ```bash
   ls -la frontend/package-lock.json backend/package-lock.json n8n/package-lock.json
   ```
3. If the files are missing, regenerate them:
   ```bash
   (cd frontend && npm install)
   (cd backend && npm install)
   (cd n8n && npm install)
   ```
4. Commit the generated `package-lock.json` files:
   ```bash
   git add frontend/package-lock.json backend/package-lock.json n8n/package-lock.json
   git commit -m "Add package-lock.json files"
   ```
5. Rebuild Docker images:
   ```bash
   docker-compose build --no-cache
   docker-compose up -d
   ```

**On Windows**: If you see PowerShell execution policy errors when running npm commands:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Cannot connect to backend

**Problem**: Frontend shows connection errors

**Solutions:**
1. Verify backend is running: `docker-compose ps`
2. Check backend logs: `docker-compose logs backend`
3. Ensure `REACT_APP_API_URL` matches backend URL
4. Check CORS configuration in `.env`

#### Tasks not saving

**Problem**: Changes to tasks don't persist

**Solutions:**
1. Check database file permissions
2. Verify disk space available
3. Check backend logs for database errors
4. Ensure SQLite database file exists in `data/kanban.db`

#### Drag and drop not working

**Problem**: Cannot drag tasks between columns

**Solutions:**
1. Clear browser cache
2. Try a different browser
3. Check console for JavaScript errors
4. Ensure react-beautiful-dnd is properly installed

#### Authentication issues

**Problem**: Cannot log in or session expires immediately

**Solutions:**
1. Verify `JWT_SECRET` is set in `.env`
2. Clear browser local storage
3. Check token expiration setting
4. Verify system clock is correct

#### Webhook authentication failing

**Problem**: Webhooks return 401 Unauthorized

**Solutions:**
1. Verify `N8N_API_KEY` is set in `.env`
2. Include API key in request headers: `x-api-key: YOUR_KEY`
3. Check backend logs for authentication errors

### Database Issues

**Reset database (⚠️ Warning: Deletes all data):**
```bash
# Using Docker
docker-compose down -v
docker-compose up -d

# Development mode
rm backend/data/kanban.db
npm run dev  # Database will be recreated
```

**Backup database:**
```bash
# Copy database file
cp data/kanban.db data/kanban-backup-$(date +%Y%m%d).db
```

**Restore database:**
```bash
cp data/kanban-backup-YYYYMMDD.db data/kanban.db
```

### Performance Issues

**Slow task loading:**
1. Check number of tasks per board (consider archiving old tasks)
2. Optimize filters and queries
3. Check system resources (RAM, CPU)

**High memory usage:**
1. Restart containers: `docker-compose restart`
2. Limit task history retention
3. Clean up old automation logs

### Getting Help

If you encounter issues not covered here:

1. Check existing GitHub issues
2. Review application logs
3. Create a new issue with:
   - Description of the problem
   - Steps to reproduce
   - Error messages/logs
   - System information

---

## Update & Backup

### Updating to a New Version

```bash
# 1. Create a backup first
npm run backup

# 2. Pull latest changes
git pull origin main

# 3. Rebuild containers
docker compose --profile prod build --no-cache

# 4. Run migrations
docker compose --profile prod up -d
docker compose exec api-prod npm run migrate

# 5. Verify everything works
docker compose ps
```

### Backup Commands

```bash
# Full backup (database + vault)
npm run backup

# List available backups
npm run backup:list

# Restore from backup
npm run restore backups/backup-YYYYMMDD-HHMMSS.tar.gz
```

### Rollback

```bash
# Rollback last migration
npm run migrate:rollback

# Restore from backup
npm run restore backups/<backup-file>.tar.gz
```

For detailed update and backup procedures, see [docs/UPDATE_GUIDE.md](./docs/UPDATE_GUIDE.md).

---

## Architecture

The application follows a monorepo structure with clear separation:

- **apps/desktop**: React frontend (Electron-ready)
- **apps/backend**: Node.js + Express + TypeScript API
- **packages/shared**: Shared TypeScript types and utilities
- **infra/docker**: Docker configuration with dev/prod profiles

For detailed architecture documentation, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

---

## Contributing

We welcome contributions! To contribute:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Run tests**: `npm test`
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Development Guidelines

- Write tests for new features
- Follow existing code style
- Update documentation
- Keep commits focused and atomic
- Write clear commit messages

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Acknowledgments

- Built with React, Node.js, and Material-UI
- Drag and drop powered by react-beautiful-dnd
- Automation powered by n8n
- Icons from Material-UI Icons

---

## Support

For support and questions:
- GitHub Issues: [Create an issue](https://github.com/Drmusab/Kanban-style-task/issues)
- Documentation: This README and `/docs` directory

---

**Happy Task Managing! 🚀**
