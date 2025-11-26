# Kanban App - n8n Custom Node
## Comprehensive Installation and User Guide

[![n8n](https://img.shields.io/badge/n8n-workflow%20automation-ff6d5a.svg)](https://n8n.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful n8n custom node that integrates the **Kanban Task Management Application** with n8n's workflow automation platform. This node enables seamless automation of task creation, updates, board management, and real-time synchronization with your Kanban backend.

---

## 📑 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Requirements](#system-requirements)
- [Installation](#installation)
  - [Method 1: Docker Installation (Recommended)](#method-1-docker-installation-recommended)
  - [Method 2: Manual Installation](#method-2-manual-installation)
  - [Method 3: Development Installation](#method-3-development-installation)
- [Configuration](#configuration)
  - [Setting Up Credentials](#setting-up-credentials)
  - [Authentication Methods](#authentication-methods)
- [User Guide](#user-guide)
  - [Kanban App Node](#kanban-app-node)
  - [Kanban App Trigger Node](#kanban-app-trigger-node)
- [Node Reference](#node-reference)
  - [Resources and Operations](#resources-and-operations)
  - [Task Operations](#task-operations)
  - [Board Operations](#board-operations)
  - [Synchronization Operations](#synchronization-operations)
- [Workflow Examples](#workflow-examples)
- [Troubleshooting](#troubleshooting)
- [API Integration](#api-integration)
- [Development](#development)
- [License](#license)

---

## Overview

The **Kanban App n8n Custom Node** provides a comprehensive integration between n8n and the Kanban Task Management Application. It consists of two node types:

1. **Kanban App Node** - Execute operations on tasks, boards, and sync data
2. **Kanban App Trigger Node** - Monitor and react to changes in real-time

These nodes enable you to build powerful automation workflows such as:
- Automatically create tasks from emails, forms, or other systems
- Sync tasks between multiple project management tools
- Send notifications when high-priority tasks are created
- Generate reports and analytics from task data
- Trigger workflows based on task status changes

---

## Features

### Core Capabilities

✅ **Complete CRUD Operations**
- Create, read, update, and delete tasks
- Manage boards and their configurations
- Full support for all task properties (title, description, priority, tags, etc.)

✅ **Real-time Synchronization**
- Poll for changes using the Kanban App Trigger node
- Filter events by type (task created, updated, deleted, etc.)
- Configurable polling intervals
- Resume from last processed event

✅ **Advanced Task Management**
- Support for priorities (low, medium, high)
- Due dates and recurring tasks
- Task assignments and tracking
- Tags and swimlanes
- Position management

✅ **Secure Authentication**
- API key-based authentication
- JWT token support
- Secure credential storage in n8n

✅ **Production Ready**
- Error handling and retry logic
- Pagination support for large datasets
- Batch operations
- Comprehensive logging

---

## System Requirements

### For Docker Installation
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 1.29 or higher
- **RAM**: Minimum 2GB available
- **Disk Space**: 500MB for images and data

### For Manual Installation
- **n8n**: Version 0.200.0 or higher
- **Node.js**: Version 16.x or higher
- **npm**: Version 7.x or higher
- **Kanban Backend**: Running instance accessible via HTTP/HTTPS

### Network Requirements
- Access to Kanban backend API (typically http://localhost:3001)
- n8n instance must be able to reach Kanban backend

---

## Installation

### Method 1: Docker Installation (Recommended)

This is the easiest and recommended method. The custom node is automatically included in the Docker setup.

#### Step 1: Prerequisites

Ensure Docker and Docker Compose are installed:
```bash
docker --version
docker-compose --version
```

If not installed, download from [Docker's official site](https://www.docker.com/products/docker-desktop).

#### Step 2: Clone the Repository

```bash
git clone https://github.com/Drmusab/Kanban-style-task.git
cd Kanban-style-task
```

#### Step 3: Start the Stack

```bash
docker-compose up -d
```

This command will:
- Build the Kanban backend, frontend, and n8n containers
- Automatically build and install the Kanban App custom node in n8n
- Start all services with proper networking

**Note:** The n8n custom node is pre-built and included in the Docker image. If you make changes to the node, rebuild it first with `cd n8n && ./build.sh` before running `docker-compose up --build`.

#### Step 4: Access n8n

Open your browser and navigate to:
```
http://localhost:5678
```

On first launch, you'll be prompted to set up your n8n account.

#### Step 5: Verify Installation

1. Click the "+" icon to add a new node to a workflow
2. Search for "Kanban App"
3. You should see both **Kanban App** and **Kanban App Trigger** nodes

✅ **Success!** The custom node is now installed and ready to use.

---

### Method 2: Manual Installation

Install the custom node into an existing n8n installation.

#### Step 1: Build the Custom Node

Navigate to the n8n directory and build the node:

```bash
cd Kanban-style-task/n8n

# Option 1: Use the build script (recommended)
./build.sh

# Option 2: Manual build
npm install
npm run build
```

This creates compiled JavaScript files in the `dist/` directory and type definitions that n8n can load directly from the package entry point.

#### Step 2: Copy to n8n Custom Nodes Directory

Copy the **entire** package (including `package.json`) so n8n can resolve the `dist/index.js` entry point.

**On Linux/macOS:**
```bash
# Create custom nodes directory if it doesn't exist
mkdir -p ~/.n8n/custom/n8n-nodes-kanban-app

# Copy the package manifest and build output
cp package.json ~/.n8n/custom/n8n-nodes-kanban-app/
cp -r dist ~/.n8n/custom/n8n-nodes-kanban-app/dist
```

**On Windows:**
```powershell
# Create custom nodes directory
New-Item -Path "$env:USERPROFILE\.n8n\custom" -ItemType Directory -Force

# Copy the built node and manifest
New-Item -Path "$env:USERPROFILE\.n8n\custom\n8n-nodes-kanban-app" -ItemType Directory -Force
Copy-Item -Path "package.json" -Destination "$env:USERPROFILE\.n8n\custom\n8n-nodes-kanban-app" -Force
Copy-Item -Path "dist" -Destination "$env:USERPROFILE\.n8n\custom\n8n-nodes-kanban-app" -Recurse -Force
```

#### Step 3: Restart n8n

If n8n is running, restart it to load the new node:

```bash
# If running via npm
n8n stop
n8n start

# If running as a service (systemd)
sudo systemctl restart n8n

# If running via PM2
pm2 restart n8n
```

#### Step 4: Verify Installation

1. Open n8n in your browser
2. Create a new workflow
3. Search for "Kanban App" in the node palette
4. The custom node should appear in the search results

---

### Method 3: Development Installation

For developers who want to modify or extend the custom node.

#### Step 1: Set Up Development Environment

```bash
cd Kanban-style-task/n8n
npm install
```

#### Step 2: Build in Watch Mode

```bash
npm run build -- --watch
```

This automatically rebuilds the node when you make changes to the TypeScript source files.

#### Step 3: Link to n8n

Create a symbolic link for live development:

**On Linux/macOS:**
```bash
# Create custom nodes directory
mkdir -p ~/.n8n/custom

# Create symlink to the package root so n8n sees package.json and dist
ln -s "$(pwd)" ~/.n8n/custom/n8n-nodes-kanban-app
```

**On Windows (as Administrator):**
```powershell
# Create symlink
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.n8n\custom\n8n-nodes-kanban-app" -Target "$(Get-Location)"
```

#### Step 4: Restart n8n

Restart n8n to load the linked node. Changes to TypeScript files will be automatically compiled and available after restarting n8n.

---

## Configuration

### Setting Up Credentials

Before using the Kanban App nodes, you must configure authentication credentials.

#### Step 1: Add New Credentials

1. In n8n, click on **Credentials** in the left sidebar
2. Click **+ Add Credential**
3. Search for "Kanban App API"
4. Click on **Kanban App API**

#### Step 2: Configure Credentials

Fill in the required fields:

| Field | Description | Example | Required |
|-------|-------------|---------|----------|
| **Base URL** | URL of your Kanban backend API | `http://localhost:3001` | Yes |
| **API Key** | Authentication key for secured endpoints | `your-api-key-here` | Conditional* |

**Note:** *API Key is **required** if your Kanban backend has the `N8N_API_KEY` environment variable configured. If the backend does not require API key authentication (local development environments), this field can be left empty.

**Examples:**

**For Docker Setup:**
```
Base URL: http://kanban-backend:3001
API Key: (leave empty if not configured)
```

**For Local Development:**
```
Base URL: http://localhost:3001
API Key: (copy from backend/.env N8N_API_KEY)
```

**For Production:**
```
Base URL: https://kanban.yourcompany.com
API Key: your-secure-api-key
```

#### Step 3: Test the Connection

1. After entering credentials, click **Save**
2. The credentials will be validated
3. If successful, you'll see a confirmation message

#### Step 4: Use Credentials in Nodes

When adding a Kanban App node to a workflow:
1. Click on the **Credential to connect with** dropdown
2. Select your saved credentials
3. Or click **Create New** to add credentials inline

---

### Authentication Methods

The Kanban App node supports multiple authentication methods:

#### 1. API Key Authentication (Recommended)

**Backend Configuration:**
Set `N8N_API_KEY` in your backend `.env` file:
```env
N8N_API_KEY=your-secure-random-key
```

Generate a secure key:
```bash
openssl rand -base64 32
```

**Node Configuration:**
Enter the same API key in the credentials.

#### 2. JWT Token Authentication

If your Kanban backend uses JWT authentication, the API key field can accept a JWT token.

#### 3. No Authentication

If running in a trusted local environment, you can leave the API Key field empty. However, this is **not recommended** for production use.

---

## User Guide

### Kanban App Node

The **Kanban App** node is an action node that performs operations on your Kanban backend.

#### Adding to Workflow

1. Click the **+** icon on your workflow canvas
2. Search for "Kanban App"
3. Click **Kanban App** (not Kanban App Trigger)
4. The node will be added to your canvas

#### Basic Configuration

Every Kanban App node requires:
1. **Credentials** - Select your Kanban App API credentials
2. **Resource** - Choose what to work with (Task, Board, or Synchronization)
3. **Operation** - Select the action to perform

#### Node Interface Overview

```
┌─────────────────────────────────────┐
│      Kanban App Node                │
├─────────────────────────────────────┤
│ Credentials: [Select credentials]   │
│ Resource: [Task ▼]                  │
│ Operation: [Create ▼]               │
│ ─────────────────────────────────── │
│ [Resource-specific parameters]      │
└─────────────────────────────────────┘
```

---

### Kanban App Trigger Node

The **Kanban App Trigger** node monitors your Kanban backend for changes and triggers workflows automatically.

#### Adding to Workflow

1. When creating a new workflow, the first node must be a trigger
2. Click the **+** icon on a new workflow
3. Search for "Kanban App Trigger"
4. Click **Kanban App Trigger**

#### Configuration

| Parameter | Description | Default | Range |
|-----------|-------------|---------|-------|
| **Event Types** | Types of events to monitor | All events | Multiple selection |
| **Polling Interval** | How often to check for new events (seconds) | 15 | 5-3600 |
| **Initial Lookback** | On first run, how far back to look (minutes) | 10 | 0-1440 |
| **Maximum Events** | Maximum events to fetch per poll | 100 | 1-500 |

#### Event Types

- **Task Created** - New task added
- **Task Updated** - Task modified
- **Task Deleted** - Task removed
- **Board Created** - New board added
- **Board Updated** - Board modified
- **Board Deleted** - Board removed

#### How It Works

1. The trigger polls the Kanban backend at regular intervals
2. It requests events since the last poll
3. Events are filtered by selected event types
4. Each matching event triggers a workflow execution
5. The workflow receives event data in JSON format

#### Best Practices

- Set **Polling Interval** based on required responsiveness (15-60 seconds typical)
- Use **Event Types** filter to reduce unnecessary workflow executions
- Set **Maximum Events** conservatively to avoid overwhelming your workflow
- Use **Initial Lookback** carefully - large values may trigger many workflows on first activation

---

## Node Reference

### Resources and Operations

The Kanban App node supports three main resources:

```
Kanban App Node
├── Task
│   ├── Create
│   ├── Get
│   ├── Get Many
│   ├── Update
│   └── Delete
├── Board
│   ├── Create
│   ├── Get
│   ├── Get Many
│   ├── Update
│   └── Delete
└── Synchronization
    └── Get Updates
```

---

### Task Operations

#### Create Task

**Required Parameters:**
- **Title** (string) - Task name
- **Column ID** (number) - Target column identifier

**Additional Fields:**
- **Description** (string) - Task details (supports Markdown)
- **Priority** (options) - `low`, `medium`, `high`
- **Due Date** (string) - ISO 8601 date string (e.g., `2025-01-15`)
- **Assigned To** (number) - User ID
- **Tags** (string) - Comma-separated tag IDs
- **Swimlane ID** (number) - Swimlane identifier
- **Position** (number) - Position within column
- **Pinned** (boolean) - Pin to top of column
- **Recurring Rule** (string) - iCal format recurring pattern
- **Created By** (number) - User ID of creator

**Example Configuration:**
```
Resource: Task
Operation: Create
Title: "Implement user authentication"
Column ID: 1
Additional Fields:
  - Priority: high
  - Due Date: "2025-02-01"
  - Description: "Add JWT-based authentication system"
  - Tags: "1,3,5"
```

**Output:**
```json
{
  "id": 42,
  "title": "Implement user authentication",
  "column_id": 1,
  "priority": "high",
  "due_date": "2025-02-01",
  "description": "Add JWT-based authentication system",
  "created_at": "2025-01-15T10:30:00.000Z",
  "tags": [1, 3, 5]
}
```

---

#### Get Task

Retrieve a single task by ID.

**Required Parameters:**
- **Task ID** (number) - ID of the task to retrieve

**Output:**
```json
{
  "id": 42,
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication system",
  "column_id": 1,
  "priority": "high",
  "status": "in_progress",
  "due_date": "2025-02-01",
  "created_at": "2025-01-15T10:30:00.000Z",
  "updated_at": "2025-01-16T14:20:00.000Z",
  "tags": [1, 3, 5],
  "subtasks": [
    {"id": 1, "title": "Research auth libraries", "completed": true},
    {"id": 2, "title": "Implement login endpoint", "completed": false}
  ]
}
```

---

#### Get Many Tasks

Retrieve multiple tasks with optional filtering.

**Parameters:**
- **Return All** (boolean) - Get all tasks or limit results
- **Limit** (number) - Maximum tasks to return (if Return All = false)

**Output:** Array of task objects

**Note:** Use query parameters in expressions to filter tasks by board, column, priority, etc.

---

#### Update Task

Modify an existing task.

**Required Parameters:**
- **Task ID** (number) - ID of task to update

**Additional Fields:** (at least one required)
- All fields from Create Task operation
- **Title** (string) - Update task title
- **Updated By** (number) - User ID performing the update

**Example:**
```
Resource: Task
Operation: Update
Task ID: 42
Additional Fields:
  - Priority: medium
  - Status: completed
```

**Output:** Updated task object

---

#### Delete Task

Remove a task permanently.

**Required Parameters:**
- **Task ID** (number) - ID of task to delete

**Additional Fields:**
- **Deleted By** (number) - User ID performing deletion

**Output:**
```json
{
  "success": true
}
```

---

### Board Operations

#### Create Board

**Required Parameters:**
- **Board Name** (string) - Name of the board

**Board Additional Fields:**
- **Description** (string) - Board description
- **Template Board** (boolean) - Mark as reusable template
- **Created By** (number) - User ID of creator

**Example:**
```
Resource: Board
Operation: Create
Board Name: "Q1 2025 Sprint"
Board Additional Fields:
  - Description: "First quarter development sprint"
```

**Output:**
```json
{
  "id": 5,
  "name": "Q1 2025 Sprint",
  "description": "First quarter development sprint",
  "created_at": "2025-01-15T10:30:00.000Z"
}
```

---

#### Get Board

Retrieve board details including columns and swimlanes.

**Required Parameters:**
- **Board ID** (number) - Board identifier

**Output:**
```json
{
  "id": 5,
  "name": "Q1 2025 Sprint",
  "description": "First quarter development sprint",
  "columns": [
    {"id": 1, "name": "To Do", "color": "#FF5722"},
    {"id": 2, "name": "In Progress", "color": "#2196F3"},
    {"id": 3, "name": "Done", "color": "#4CAF50"}
  ],
  "swimlanes": [
    {"id": 1, "name": "Frontend", "color": "#9C27B0"},
    {"id": 2, "name": "Backend", "color": "#FF9800"}
  ]
}
```

---

#### Get Many Boards

Retrieve all boards or a limited set.

**Parameters:**
- **Return All** (boolean) - Get all boards or limit
- **Limit** (number) - Maximum boards (if Return All = false)

**Output:** Array of board objects

---

#### Update Board

Modify board properties.

**Required Parameters:**
- **Board ID** (number) - Board to update

**Board Additional Fields:** (at least one required)
- **Name** (string) - New board name
- **Description** (string) - New description
- **Template Board** (boolean) - Toggle template status

---

#### Delete Board

Remove a board and all associated data.

**Required Parameters:**
- **Board ID** (number) - Board to delete

**Output:**
```json
{
  "success": true
}
```

**⚠️ Warning:** This permanently deletes the board, all columns, swimlanes, and tasks!

---

### Synchronization Operations

#### Get Updates

Poll the backend for recent changes.

**Parameters:**
- **Event Types** (multi-select) - Filter specific event types
- **Initial Lookback** (number) - Minutes to look back on first poll (0-1440)
- **Last Event ID** (string) - Resume from specific event
- **Maximum Events** (number) - Limit results (1-500)

**Output:** Array of event objects

**Event Object Structure:**
```json
{
  "id": "evt_123456",
  "resource": "task",
  "action": "updated",
  "task_id": 42,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "changes": {
    "priority": "high",
    "status": "in_progress"
  },
  "user_id": 1
}
```

**Use Cases:**
- Polling-based synchronization
- Change detection
- Audit logging
- Building event-driven workflows

---

## Workflow Examples

### Example 1: Create Task from Email

**Scenario:** Automatically create a Kanban task when receiving an email.

**Workflow:**
```
Email Trigger → Kanban App (Create Task)
```

**Configuration:**

**Email Trigger Node:**
- Monitor specific inbox
- Filter: Subject contains "[TASK]"

**Kanban App Node:**
- Resource: Task
- Operation: Create
- Title: `{{ $json.subject }}`
- Column ID: 1 (To Do)
- Description: `{{ $json.body }}`
- Priority: medium

---

### Example 2: Notify on High-Priority Tasks

**Scenario:** Send Slack notification when high-priority task is created.

**Workflow:**
```
Kanban App Trigger → IF (Filter) → Slack
```

**Kanban App Trigger:**
- Event Types: Task Created
- Polling Interval: 30 seconds

**IF Node:**
- Condition: `{{ $json.priority }}` equals `high`

**Slack Node:**
- Message: `⚠️ High priority task created: {{ $json.title }}`
- Channel: #urgent-tasks

---

### Example 3: Sync Tasks to Google Sheets

**Scenario:** Export completed tasks to Google Sheets daily.

**Workflow:**
```
Schedule Trigger → Kanban App (Get Many) → Filter → Google Sheets
```

**Schedule Trigger:**
- Interval: Daily at 6:00 PM

**Kanban App Node:**
- Resource: Task
- Operation: Get Many
- Return All: true

**Filter Node:**
- Keep items where: `{{ $json.status }}` equals `completed`
- And: `{{ $json.updated_at }}` is today

**Google Sheets Node:**
- Operation: Append rows
- Map task data to columns

---

### Example 4: Recurring Weekly Report

**Scenario:** Generate and email a weekly task summary.

**Workflow:**
```
Schedule → Kanban App (Get Many) → Aggregate → Email
```

**Schedule Trigger:**
- Cron: `0 9 * * 1` (Every Monday at 9 AM)

**Kanban App Node:**
- Resource: Task
- Operation: Get Many
- Return All: true

**Aggregate Node:**
- Group tasks by status
- Count tasks in each group

**Email Node:**
- Subject: "Weekly Kanban Report"
- Body: Template with task statistics

---

### Example 5: Auto-move Completed Tasks

**Scenario:** Automatically move tasks to "Done" when all subtasks are completed.

**Workflow:**
```
Kanban App Trigger → IF (Check Subtasks) → Kanban App (Update)
```

**Kanban App Trigger:**
- Event Types: Task Updated

**IF Node:**
- Condition: Value 1: `{{ $json.subtasks }}`
- Operation: Is not empty
- Add a second IF or use a Function node to check completion:
```javascript
// In a Function node
const subtasks = $input.item.json.subtasks;
return subtasks && subtasks.length > 0 && subtasks.filter(st => !st.completed).length === 0;
```

**Kanban App Update Node:**
- Resource: Task
- Operation: Update
- Task ID: `{{ $json.id }}`
- Additional Fields:
  - Column ID: 3 (Done column ID)

---

### Example 6: Create Board from Template

**Scenario:** Clone a board structure for new projects.

**Workflow:**
```
Webhook → Kanban App (Get Board) → Kanban App (Create Board) → Kanban App (Create Columns)
```

**Webhook Trigger:**
- Receive project details

**Get Template Board:**
- Resource: Board
- Operation: Get
- Board ID: 1 (template board)

**Create New Board:**
- Resource: Board
- Operation: Create
- Board Name: `{{ $json.webhook.project_name }}`

**Create Columns:**
- Loop through template columns
- Create each column in new board

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Kanban App node not found"

**Symptoms:** Cannot find Kanban App in node search

**Solutions:**
1. Verify node is built:
   ```bash
   cd n8n
   ls -la dist/
   ```
   Should show compiled .js files

2. Check n8n custom nodes directory:
   ```bash
   ls -la ~/.n8n/custom/
   ```

3. Restart n8n completely:
   ```bash
   # Docker
   docker-compose restart n8n
   
   # Manual
   n8n stop && n8n start
   ```

4. Check n8n logs for errors:
   ```bash
   # Docker
   docker-compose logs n8n
   
   # Manual
   n8n start --log-level=debug
   ```

---

#### Issue: "Connection failed" or "401 Unauthorized"

**Symptoms:** Cannot connect to Kanban backend, authentication errors

**Solutions:**

1. **Verify Backend is Running:**
   ```bash
   curl http://localhost:3001/api/boards
   ```
   Should return board data or authentication error

2. **Check Base URL:**
   - Must not have trailing slash: ✅ `http://localhost:3001`
   - Wrong: ❌ `http://localhost:3001/`
   - Include protocol: ✅ `http://` or `https://`

3. **Verify API Key:**
   - Check backend `.env` file for `N8N_API_KEY`
   - Ensure same key is in n8n credentials
   - Key is case-sensitive

4. **Network Connectivity:**
   ```bash
   # From n8n container
   docker exec -it kanban-n8n ping kanban-backend
   ```

5. **Docker Networking:**
   - Use service name: `http://kanban-backend:3001`
   - Not localhost from inside container

---

#### Issue: "Task ID required" or missing parameters

**Symptoms:** Error about missing required fields

**Solutions:**

1. **Check Required Fields:**
   - Create Task: Title and Column ID required
   - Update/Delete: Task ID required
   - Get Board: Board ID required

2. **Verify Data Types:**
   - IDs must be numbers, not strings
   - Convert if needed: `{{ parseInt($json.id) }}`

3. **Use Expressions:**
   - Reference previous node data: `{{ $node["Previous Node"].json["id"] }}`
   - Access array items: `{{ $json.tasks[0].id }}`

---

#### Issue: Trigger not firing

**Symptoms:** Kanban App Trigger doesn't execute workflow

**Solutions:**

1. **Activate Workflow:**
   - Toggle must be ON (blue)
   - Check workflow execution list

2. **Check Polling Interval:**
   - Minimum 5 seconds
   - Events must occur within polling window

3. **Verify Event Types:**
   - At least one event type selected
   - Create a test task to generate event

4. **Check Backend Events:**
   ```bash
   curl http://localhost:3001/api/sync/events
   ```
   Should return event array

5. **Review Trigger Settings:**
   - Initial Lookback: Set to 60+ minutes for testing
   - Maximum Events: Set to 100+
   - Last Event ID: Clear for fresh start

---

#### Issue: "Too many events" or performance problems

**Symptoms:** Slow execution, timeouts, high resource usage

**Solutions:**

1. **Reduce Polling Frequency:**
   - Increase Polling Interval to 60+ seconds
   - Reduces backend load

2. **Limit Events:**
   - Set Maximum Events to 50 or less
   - Filter Event Types to only needed events

3. **Use Pagination:**
   - For Get Many operations, set Return All = false
   - Use Limit parameter

4. **Optimize Workflows:**
   - Add filters early in workflow
   - Use IF nodes to skip unnecessary processing
   - Batch operations where possible

---

#### Issue: TypeScript compilation errors

**Symptoms:** Build fails with TypeScript errors

**Solutions:**

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Check Node Version:**
   ```bash
   node --version  # Should be 16.x or higher
   ```

3. **Clear and Rebuild:**
   ```bash
   npm run clean  # If script exists
   rm -rf dist/
   npm run build
   ```

4. **Check tsconfig.json:**
   - Ensure proper paths and includes
   - Verify TypeScript version compatibility

---

### Debug Mode

Enable detailed logging for troubleshooting:

**n8n Environment Variable:**
```bash
export N8N_LOG_LEVEL=debug
n8n start
```

**Docker:**
```yaml
# docker-compose.yml
services:
  n8n:
    environment:
      - N8N_LOG_LEVEL=debug
```

**View Logs:**
```bash
# Docker
docker-compose logs -f n8n

# Manual
tail -f ~/.n8n/logs/n8n.log
```

---

### Getting Help

If issues persist:

1. **Check Documentation:**
   - Main README: `/README.md`
   - API docs in main README
   - n8n official docs: https://docs.n8n.io

2. **Review Backend Logs:**
   ```bash
   docker-compose logs backend
   ```

3. **Test API Manually:**
   ```bash
   # Test backend connection
   curl -H "x-api-key: YOUR_KEY" http://localhost:3001/api/boards
   ```

4. **Create GitHub Issue:**
   - Include error messages
   - Workflow configuration
   - Environment details
   - Steps to reproduce

---

## API Integration

The Kanban App nodes use the backend REST API. Below are the endpoints accessed by the nodes.

### Base URL
All requests are prefixed with the credentials Base URL (e.g., `http://localhost:3001`)

### Authentication
Requests include headers:
```
Authorization: Bearer {API_KEY}
X-API-Key: {API_KEY}
Content-Type: application/json
```

### Endpoints Used

**Tasks:**
- `GET /api/tasks` - List all tasks
- `GET /api/tasks/:id` - Get task by ID
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

**Boards:**
- `GET /api/boards` - List all boards
- `GET /api/boards/:id` - Get board by ID
- `POST /api/boards` - Create board
- `PUT /api/boards/:id` - Update board
- `DELETE /api/boards/:id` - Delete board

**Synchronization:**
- `GET /api/sync/events` - Get event stream

### Query Parameters

**Sync Events:**
```
GET /api/sync/events?since=2025-01-15T00:00:00.000Z&limit=100&lastEventId=evt_123
```

Parameters:
- `since` - ISO timestamp to fetch events after
- `limit` - Maximum events to return
- `lastEventId` - Resume from specific event

### Request Examples

**Create Task:**
```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "title": "New Task",
    "column_id": 1,
    "priority": "high",
    "description": "Task details"
  }'
```

**Get Events:**
```bash
curl -X GET "http://localhost:3001/api/sync/events?limit=50" \
  -H "X-API-Key: your-api-key"
```

---

## Development

### Project Structure

```
n8n/
├── credentials/
│   └── KanbanAppApi.credentials.ts    # Credential definition
├── nodes/
│   └── KanbanApp/
│       ├── KanbanApp.node.ts          # Main action node
│       ├── KanbanAppTrigger.node.ts   # Trigger node
│       ├── GenericFunctions.ts        # Shared utilities
│       └── kanbanApp.svg              # Node icon
├── types/                              # TypeScript definitions
├── index.ts                            # Exports for n8n
├── package.json                        # Dependencies
├── tsconfig.json                       # TypeScript config
└── README.md                           # This file
```

### Building from Source

**Install Dependencies:**
```bash
npm install
```

**Build:**
```bash
npm run build
```

This compiles TypeScript to JavaScript in `dist/` and copies assets.

**Watch Mode:**
```bash
npm run build -- --watch
```

Auto-rebuilds on file changes.

### TypeScript Configuration

The project uses strict TypeScript settings:
- Target: ES2019
- Module: CommonJS
- Strict mode enabled
- Source maps generated

### Adding New Operations

1. **Define Operation:**
   Edit `nodes/KanbanApp/KanbanApp.node.ts` properties array:
   ```typescript
   {
     name: 'New Operation',
     value: 'newOp',
     action: 'Perform new operation'
   }
   ```

2. **Add Parameters:**
   ```typescript
   {
     displayName: 'Parameter Name',
     name: 'paramName',
     type: 'string',
     default: '',
     displayOptions: {
       show: {
         operation: ['newOp']
       }
     }
   }
   ```

3. **Implement Handler:**
   Add case in `handleTaskOperation()` or `handleBoardOperation()`:
   ```typescript
   if (operation === 'newOp') {
     const param = this.getNodeParameter('paramName', itemIndex);
     return kanbanApiRequest.call(this, 'POST', '/api/endpoint', { param });
   }
   ```

4. **Build and Test:**
   ```bash
   npm run build
   # Restart n8n
   # Test in workflow
   ```

### Testing

**Manual Testing:**
1. Build the node
2. Create test workflow in n8n
3. Execute and verify output

**Automated Testing:**
Create test workflows and use n8n CLI:
```bash
n8n execute --file test-workflow.json
```

### Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-operation`
3. Make changes and test
4. Commit: `git commit -m 'Add new operation'`
5. Push: `git push origin feature/new-operation`
6. Create Pull Request

---

## License

This project is licensed under the MIT License. See the main repository LICENSE file for details.

---

## Support

For questions, issues, or contributions:

- **GitHub Issues:** [Create an issue](https://github.com/Drmusab/Kanban-style-task/issues)
- **Documentation:** See main repository README
- **n8n Community:** https://community.n8n.io/

---

**Happy Automating! 🚀**

*Built with ❤️ for the n8n and Kanban communities*
