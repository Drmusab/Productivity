// @ts-nocheck
import express from 'express';
const router = express.Router();

import {  subscribe, getEventsSince  } from '../services/eventBus';
import {  db  } from '../utils/database';

const writeEvent = (res, event) => {
  res.write(`id: ${event.id}\n`);
  res.write(`event: ${event.resource}.${event.action}\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
};

router.get('/events', async (req, res) => {
  const { since, lastEventId, limit, events, board_id, priority } = req.query;
  let filteredEvents = getEventsSince({ since, lastEventId, limit });
  
  // Filter by event types if specified
  if (events) {
    const eventTypes = events.split(',').map(e => e.trim());
    filteredEvents = filteredEvents.filter(event => {
      // Event type format in n8n: 'task.created', 'task.updated', etc.
      // Event format in backend: { resource: 'task', action: 'created' }
      const eventType = `${event.resource}.${event.action}`;
      return eventTypes.includes(eventType);
    });
  }
  
  // Filter by board_id if specified
  if (board_id) {
    const boardIdNum = parseInt(board_id, 10);
    
    // Collect all unique column IDs from task events to batch query
    const columnIds = new Set();
    filteredEvents.forEach(event => {
      if (event.resource === 'task' && event.data && event.data.task && event.data.task.column_id) {
        const colId = parseInt(event.data.task.column_id, 10);
        // Only add valid integer column IDs
        if (!isNaN(colId)) {
          columnIds.add(colId);
        }
      }
    });
    
    // Batch query to get column->board mappings
    const columnToBoardMap = {};
    if (columnIds.size > 0) {
      const columnIdArray = Array.from(columnIds);
      const placeholders = columnIdArray.map(() => '?').join(',');
      const columns = await new Promise((resolve, reject) => {
        db.all(
          `SELECT id, board_id FROM columns WHERE id IN (${placeholders})`,
          columnIdArray,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
      columns.forEach(col => {
        columnToBoardMap[col.id] = col.board_id;
      });
    }
    
    // Now filter events using the pre-computed map
    filteredEvents = filteredEvents.filter(event => {
      // For board events, check the board.id directly
      if (event.resource === 'board' && event.data && event.data.board) {
        return event.data.board.id === boardIdNum;
      }
      
      // For task events, use the pre-computed column->board mapping
      if (event.resource === 'task' && event.data && event.data.task) {
        const boardId = columnToBoardMap[event.data.task.column_id];
        return boardId === boardIdNum;
      }
      
      // For other event types, check if data.board_id exists
      return event.data && event.data.board_id === boardIdNum;
    });
  }
  
  // Filter by priority if specified
  if (priority) {
    filteredEvents = filteredEvents.filter(event => 
      event.data && event.data.task && event.data.task.priority === priority
    );
  }
  
  res.json(filteredEvents);
});

router.get('/stream', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  res.flushHeaders();

  const { since, lastEventId, limit } = req.query;
  const headerLastEventId = req.get('last-event-id');
  const backlog = getEventsSince({
    since,
    lastEventId: headerLastEventId || lastEventId,
    limit,
  });

  backlog.forEach((event) => writeEvent(res, event));

  const unsubscribe = subscribe((event) => {
    writeEvent(res, event);
  });

  const heartbeat = setInterval(() => {
    res.write(`event: heartbeat\n`);
    res.write('data: {}\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

export = router;
