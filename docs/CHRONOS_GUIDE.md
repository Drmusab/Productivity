# Chronos Time Intelligence System

## Overview

Chronos is a comprehensive time management system integrated into the Kanban Routine Manager. It combines intentional planning (Time Blocking), automated tracking (Time Tracking), and intelligent analytics (Time Intelligence) into one seamless workflow.

## Features

### 1. Time Blocking (Planner Mode)
- **Weekly Calendar View**: Visual weekly calendar with drag-and-drop time blocks
- **Smart Scheduling**: AI-powered optimal time suggestions based on historical performance
- **Conflict Detection**: Automatic warnings for overlapping time blocks
- **Buffer Time**: Configurable buffer periods between blocks
- **Color Coding**: Visual categorization with customizable colors
- **Templates**: Create and reuse recurring time block patterns

### 2. Time Tracking (Tracker Mode)
- **Active Session Tracking**: Start, pause, resume, and stop time sessions
- **Real-time Timer**: Live countdown with elapsed time display
- **Session Quality Metrics**: Rate energy level, focus quality, and productivity
- **Interruption Tracking**: Monitor and log distractions
- **Pomodoro Integration**: Built-in Pomodoro timer support
- **Session History**: View recent tracking sessions with details

### 3. Analytics (Analyst Mode)
- **Productivity Score**: Comprehensive score based on completion rate and quality metrics
- **Planned vs Actual**: Compare planned time blocks with actual time spent
- **Category Breakdown**: Pie chart showing time distribution across categories
- **Energy Patterns**: Line chart showing energy and focus levels by hour of day
- **Focus Analysis**: Statistics on focus quality and interruptions
- **Time Range Filtering**: View analytics for 7, 14, or 30 days

### 4. Daily View
- **Today's Schedule**: Hour-by-hour breakdown of current day's time blocks
- **Progress Tracking**: Visual indicators showing completed, in-progress, and pending blocks
- **Quick Actions**: One-click "Start" buttons for each time block
- **Completion Statistics**: Daily summary cards with key metrics

## API Endpoints

### Time Blocks
- `GET /api/chronos/time-blocks` - Get time blocks for date range
- `POST /api/chronos/time-blocks` - Create new time block
- `PUT /api/chronos/time-blocks/:id` - Update time block
- `DELETE /api/chronos/time-blocks/:id` - Delete time block

### Time Sessions
- `GET /api/chronos/time-sessions` - Get all time sessions
- `GET /api/chronos/time-sessions/active` - Get currently active session
- `POST /api/chronos/time-sessions/start` - Start new session
- `POST /api/chronos/time-sessions/:id/pause` - Pause active session
- `POST /api/chronos/time-sessions/:id/resume` - Resume paused session
- `POST /api/chronos/time-sessions/:id/stop` - Stop and complete session

### Analytics
- `GET /api/chronos/analytics/weekly` - Get weekly analytics data
- `GET /api/chronos/analytics/productivity-score` - Get productivity score

### Templates
- `GET /api/chronos/templates` - Get all time templates
- `POST /api/chronos/templates` - Create time template
- `DELETE /api/chronos/templates/:id` - Delete template

### Settings
- `GET /api/chronos/settings` - Get Chronos settings
- `PUT /api/chronos/settings` - Update settings

### Integration
- `POST /api/chronos/integrate/task-to-block` - Create time block from task
- `POST /api/chronos/integrate/auto-schedule-tasks` - Auto-schedule multiple tasks
- `GET /api/chronos/integrate/daily-blocks/:date` - Sync with daily planner

## Database Schema

### chronos_time_blocks
Stores planned time blocks with details about scheduling, categorization, and linking to tasks/projects.

### chronos_time_sessions
Records actual time tracking sessions with quality metrics and productivity ratings.

### chronos_time_templates
Defines recurring time block patterns for automated scheduling.

### chronos_analytics
Stores computed metrics and insights for performance analysis.

### chronos_settings
User preferences for work hours, Pomodoro durations, and feature toggles.

### chronos_pomodoro_sessions
Dedicated tracking for Pomodoro technique sessions.

### chronos_focus_sessions
Records dedicated focus time periods with quality ratings.

### chronos_break_records
Tracks breaks and well-being activities.

## Configuration

Settings can be customized through the Chronos Settings dialog or via API:

```javascript
{
  "work_hours_start": "09:00",
  "work_hours_end": "17:00",
  "default_block_duration": 60,
  "default_break_duration": 15,
  "pomodoro_work_duration": 25,
  "pomodoro_break_duration": 5,
  "pomodoro_long_break": 15,
  "auto_schedule_enabled": false,
  "conflict_warnings_enabled": true,
  "buffer_time_enabled": true,
  "default_buffer_minutes": 5,
  "focus_mode_default": false,
  "break_reminders_enabled": true,
  "idle_timeout_minutes": 5
}
```

## Usage Examples

### Creating a Time Block
```bash
curl -X POST http://localhost:3001/api/chronos/time-blocks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Deep Work Session",
    "date": "2025-01-20",
    "start_time": "09:00",
    "end_time": "11:00",
    "category": "deep_work",
    "energy_required": "high"
  }'
```

### Starting a Time Session
```bash
curl -X POST http://localhost:3001/api/chronos/time-sessions/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Writing Documentation",
    "category": "creative"
  }'
```

### Getting Analytics
```bash
curl http://localhost:3001/api/chronos/analytics/weekly \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Integration with Other Features

### Eisenhower Matrix Integration
- Convert tasks to time blocks automatically
- Link time blocks to GTD/Eisenhower tasks
- Track time spent on projects and goals

### Daily Planner Integration
- Sync time blocks with daily priorities
- View combined schedule in one place
- Track progress across both systems

### Habits Integration
- Schedule habit sessions as time blocks
- Track time spent on habits
- Analyze habit completion patterns

## Smart Features

### AI-Powered Scheduling
The system analyzes historical performance data to suggest optimal times for different types of work:
- Tracks energy levels by hour of day
- Monitors focus quality patterns
- Recommends scheduling based on past success

### Automatic Buffer Time
Configurable buffer periods are automatically added between blocks based on:
- Category-specific multipliers (meetings need more buffer)
- User-defined default buffer duration
- Can be toggled on/off in settings

### Conflict Detection
Real-time conflict detection prevents scheduling overlaps:
- Warns before creating conflicting blocks
- Visual indicators in the planner view
- Can be configured to block or warn

## Testing

Run the Chronos test suite:

```bash
cd backend
npm test tests/chronos.test.js
```

## Future Enhancements

- **Focus Mode**: Distraction blocking during deep work sessions
- **Break Reminders**: Automated notifications for breaks
- **Calendar Sync**: Two-way sync with Google Calendar, Outlook
- **Predictive Estimation**: Machine learning for time estimation
- **Team Scheduling**: Collaborative time blocking
- **Mobile App**: Native mobile time tracking

## Support

For issues or questions about Chronos:
- GitHub Issues: https://github.com/Drmusab/Kanban-Routine-Manager/issues
- Documentation: See main README.md for general setup

## License

Same as parent project (MIT License)
