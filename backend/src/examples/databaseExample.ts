/**
 * @fileoverview Database Engine Example
 * 
 * Demonstrates how to use the Universal Database Engine to create
 * a task management database with multiple views.
 */

import { BlockCRUDEngine } from '../services/blockCRUD';
import { DatabaseService } from '../services/databaseService';
import { PropertyType, ViewType, FilterOperator, AggregationType } from '../types/database';
import { initializeBlockSystem } from '../services/blockSystem';

/**
 * Example: Create a task management database with multiple views
 */
export function createTaskManagementExample() {
  // Initialize block system first
  initializeBlockSystem();
  
  // Initialize services
  const blockEngine = new BlockCRUDEngine();
  const databaseService = new DatabaseService(blockEngine);
  
  console.log('Creating Task Management Database Example...\n');
  
  // 1. Create database with properties
  console.log('1. Creating database...');
  const databaseId = databaseService.createDatabase({
    name: 'Project Tasks',
    description: 'Track project tasks with multiple views',
    icon: '📋',
    properties: [
      {
        id: 'title',
        name: 'Task',
        type: PropertyType.TEXT,
        required: true,
      },
      {
        id: 'status',
        name: 'Status',
        type: PropertyType.SELECT,
        config: {
          options: [
            { id: 'todo', value: 'To Do', color: '#gray' },
            { id: 'inprogress', value: 'In Progress', color: '#blue' },
            { id: 'done', value: 'Done', color: '#green' },
          ],
        },
      },
      {
        id: 'priority',
        name: 'Priority',
        type: PropertyType.SELECT,
        config: {
          options: [
            { id: 'low', value: 'Low', color: '#gray' },
            { id: 'medium', value: 'Medium', color: '#yellow' },
            { id: 'high', value: 'High', color: '#red' },
          ],
        },
      },
      {
        id: 'assignee',
        name: 'Assignee',
        type: PropertyType.SELECT,
        config: {
          options: [
            { id: 'alice', value: 'Alice', color: '#purple' },
            { id: 'bob', value: 'Bob', color: '#orange' },
            { id: 'charlie', value: 'Charlie', color: '#pink' },
          ],
        },
      },
      {
        id: 'duedate',
        name: 'Due Date',
        type: PropertyType.DATE,
        config: {
          includeTime: false,
        },
      },
      {
        id: 'completed',
        name: 'Completed',
        type: PropertyType.CHECKBOX,
      },
    ],
  });
  
  console.log(`   ✓ Database created: ${databaseId}\n`);
  
  // 2. Create sample rows
  console.log('2. Creating sample rows...');
  const rows = [
    {
      title: 'Build database engine',
      status: 'done',
      priority: 'high',
      assignee: 'alice',
      duedate: '2025-01-10',
      completed: true,
    },
    {
      title: 'Implement table view',
      status: 'inprogress',
      priority: 'high',
      assignee: 'bob',
      duedate: '2025-01-15',
      completed: false,
    },
    {
      title: 'Create board view',
      status: 'inprogress',
      priority: 'medium',
      assignee: 'alice',
      duedate: '2025-01-20',
      completed: false,
    },
    {
      title: 'Add calendar view',
      status: 'todo',
      priority: 'medium',
      assignee: 'charlie',
      duedate: '2025-01-25',
      completed: false,
    },
    {
      title: 'Design timeline view',
      status: 'todo',
      priority: 'low',
      assignee: 'bob',
      duedate: '2025-01-30',
      completed: false,
    },
  ];
  
  const rowIds = rows.map(row => databaseService.createRow(databaseId, row));
  console.log(`   ✓ Created ${rowIds.length} rows\n`);
  
  // 3. Create views
  console.log('3. Creating views...');
  
  // Table view
  const tableViewId = databaseService.createView({
    name: 'All Tasks',
    type: ViewType.TABLE,
    databaseId,
    sort: [
      { propertyId: 'duedate', direction: 'ASC' },
    ],
    config: {
      rowHeight: 'normal',
    },
  });
  console.log(`   ✓ Table view created: ${tableViewId}`);
  
  // Board view
  const boardViewId = databaseService.createView({
    name: 'Tasks by Status',
    type: ViewType.BOARD,
    databaseId,
    config: {
      groupByPropertyId: 'status',
      cardProperties: ['priority', 'assignee', 'duedate'],
    },
  });
  console.log(`   ✓ Board view created: ${boardViewId}`);
  
  // Calendar view
  const calendarViewId = databaseService.createView({
    name: 'Task Calendar',
    type: ViewType.CALENDAR,
    databaseId,
    config: {
      datePropertyId: 'duedate',
      layout: 'month',
      showWeekends: true,
    },
  });
  console.log(`   ✓ Calendar view created: ${calendarViewId}`);
  
  // Gallery view
  const galleryViewId = databaseService.createView({
    name: 'Task Gallery',
    type: ViewType.GALLERY,
    databaseId,
    config: {
      cardSize: 'medium',
      previewProperties: ['status', 'priority', 'assignee'],
    },
  });
  console.log(`   ✓ Gallery view created: ${galleryViewId}\n`);
  
  // 4. Query examples
  console.log('4. Running queries...\n');
  
  // Query all tasks
  console.log('   Query: All tasks');
  const allTasks = databaseService.queryRows(databaseId);
  console.log(`   Result: ${allTasks.totalCount} tasks`);
  console.log(`   Rows: ${allTasks.rows.map(r => JSON.parse(r.values).title).join(', ')}\n`);
  
  // Query in-progress tasks
  console.log('   Query: In Progress tasks');
  const inProgressTasks = databaseService.queryRows(databaseId, {
    filter: {
      operator: 'AND',
      conditions: [
        {
          propertyId: 'status',
          operator: FilterOperator.SELECT_EQUALS,
          value: 'inprogress',
        },
      ],
    },
  });
  console.log(`   Result: ${inProgressTasks.totalCount} tasks`);
  console.log(`   Rows: ${inProgressTasks.rows.map(r => JSON.parse(r.values).title).join(', ')}\n`);
  
  // Query high priority tasks
  console.log('   Query: High priority tasks');
  const highPriorityTasks = databaseService.queryRows(databaseId, {
    filter: {
      operator: 'AND',
      conditions: [
        {
          propertyId: 'priority',
          operator: FilterOperator.SELECT_EQUALS,
          value: 'high',
        },
      ],
    },
    sort: [
      { propertyId: 'duedate', direction: 'ASC' },
    ],
  });
  console.log(`   Result: ${highPriorityTasks.totalCount} tasks`);
  console.log(`   Rows: ${highPriorityTasks.rows.map(r => JSON.parse(r.values).title).join(', ')}\n`);
  
  // Query with grouping (for board view)
  console.log('   Query: Group by status');
  const groupedByStatus = databaseService.queryRows(databaseId, {
    groupBy: 'status',
  });
  console.log(`   Result: ${groupedByStatus.groups?.length} groups`);
  groupedByStatus.groups?.forEach(group => {
    console.log(`     - ${group.value}: ${group.count} tasks`);
  });
  console.log('');
  
  // Query with aggregations
  console.log('   Query: Task count by status');
  const taskStats = databaseService.queryRows(databaseId, {
    groupBy: 'status',
    aggregations: [
      { propertyId: 'status', type: AggregationType.COUNT },
    ],
  });
  console.log(`   Result: Aggregations computed`);
  console.log(`   Stats: ${JSON.stringify(taskStats.aggregations)}\n`);
  
  // 5. Database statistics
  console.log('5. Database statistics:');
  const stats = databaseService.getDatabaseStats(databaseId);
  console.log(`   Total rows: ${stats.totalRows}`);
  console.log(`   Active rows: ${stats.activeRows}`);
  console.log(`   Properties: ${stats.properties}`);
  console.log(`   Views: ${stats.views}\n`);
  
  // 6. Export database
  console.log('6. Exporting database...');
  const exportedData = databaseService.exportDatabase(databaseId);
  console.log(`   ✓ Database exported successfully`);
  console.log(`   Database: ${exportedData.database?.name}`);
  console.log(`   Rows: ${exportedData.rows.length}`);
  console.log(`   Views: ${exportedData.views.length}\n`);
  
  console.log('Example completed successfully! ✅');
  
  return {
    databaseId,
    rowIds,
    viewIds: {
      table: tableViewId,
      board: boardViewId,
      calendar: calendarViewId,
      gallery: galleryViewId,
    },
    stats,
  };
}

// Run example if this file is executed directly
if (require.main === module) {
  createTaskManagementExample();
}
