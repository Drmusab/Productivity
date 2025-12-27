import cron from 'node-cron';
import {  db  } from '../utils/database';
import {  triggerAutomation  } from './automation';
import {  sendTaskDueNotification, sendRoutineReminder  } from './notifications';
import {  createRecurringTask  } from './tasks';
import {  generateWeeklyReport, sendReportToN8n  } from './reporting';
import { parseRecurringRule } from '../utils/recurringRule';

// Time constants
const MILLISECONDS_PER_MINUTE = 60 * 1000;
const MILLISECONDS_PER_HOUR = 60 * MILLISECONDS_PER_MINUTE;

// Start the scheduler
const startScheduler = () => {
  console.log('Starting task scheduler...');
  
  // Check for due tasks every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date().toISOString();
      
      // Get tasks that are due or overdue
      db.all(
        'SELECT * FROM tasks WHERE due_date <= ? AND due_date IS NOT NULL',
        [now],
        async (err, tasks) => {
          if (err) {
            console.error('Error checking due tasks:', err);
            return;
          }
          
          for (const task of tasks) {
            const taskAny: any = task;
            const dueDate = new Date(taskAny.due_date);
            const nowDate = new Date();
            const minutesUntilDue = Math.floor((dueDate.getTime() - nowDate.getTime()) / MILLISECONDS_PER_MINUTE);
            
            // Check if task is overdue (more than 1 hour past due date)
            if (nowDate.getTime() - dueDate.getTime() > MILLISECONDS_PER_HOUR) {
              // Trigger automation for overdue task
              triggerAutomation('task_overdue', { taskId: taskAny.id, columnId: taskAny.column_id });
              
              // Send notification for overdue task
              sendTaskDueNotification(task, minutesUntilDue);
            }
            // Check if task is due (within 1 hour of due date)
            else if (nowDate.getTime() - dueDate.getTime() >= 0) {
              // Trigger automation for due task
              triggerAutomation('task_due', { taskId: taskAny.id, columnId: taskAny.column_id });
              
              // Send notification for due task
              sendTaskDueNotification(task, 0);
            }
            // Check if task is due soon (within 1 hour of due date)
            else if (dueDate.getTime() - nowDate.getTime() <= MILLISECONDS_PER_HOUR) {
              // Trigger automation for task due soon
              triggerAutomation('task_due_soon', { taskId: taskAny.id, columnId: taskAny.column_id });
              
              // Send notification for task due soon
              sendTaskDueNotification(task, minutesUntilDue);
            }
          }
        }
      );
    } catch (error) {
      console.error('Error in scheduler:', error);
    }
  });
  
  // Check for recurring tasks daily at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get tasks with recurring rules
      db.all(
        'SELECT * FROM tasks WHERE recurring_rule IS NOT NULL',
        async (err, tasks) => {
          if (err) {
            console.error('Error checking recurring tasks:', err);
            return;
          }
          
          for (const task of tasks) {
            try {
              const taskAny: any = task;
              const recurringRule = parseRecurringRule(taskAny.recurring_rule);
              const lastDueDate = new Date(taskAny.due_date);

              // Check if we need to create a new instance of this recurring task
              if (shouldCreateRecurringTask(lastDueDate, recurringRule, today)) {
                await createRecurringTask(task, recurringRule);
                
                // Send routine reminder for the new instance
                sendRoutineReminder(task);
              }
            } catch (error) {
              const errorAny: any = error;
              const taskAny: any = task;
              console.error(`Error processing recurring task ${taskAny.id}:`, errorAny);
            }
          }
        }
      );
    } catch (error) {
      console.error('Error in recurring task scheduler:', error);
    }
  });

  // Check for routine lead-time notifications every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      db.all(
        'SELECT * FROM tasks WHERE recurring_rule IS NOT NULL AND due_date IS NOT NULL',
        [],
        async (err, tasks) => {
          if (err) {
            console.error('Error checking routine notifications:', err);
            return;
          }

          for (const task of tasks) {
            const taskAny: any = task;
            const recurringRule = parseRecurringRule(taskAny.recurring_rule);

            if (recurringRule.status === 'paused') {
              continue;
            }

            const dueDate = new Date(taskAny.due_date);
            if (Number.isNaN(dueDate.getTime())) {
              continue;
            }

            const minutesUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / MILLISECONDS_PER_MINUTE);
            const shouldNotify = minutesUntilDue <= recurringRule.notificationLeadTime
              && minutesUntilDue >= (recurringRule.notificationLeadTime - 1);

            const alreadyNotified = recurringRule.lastNotificationAt
              && new Date(recurringRule.lastNotificationAt) > new Date(now.getTime() - MILLISECONDS_PER_HOUR);

            if (shouldNotify && !alreadyNotified) {
              try {
                await sendRoutineReminder(task);
                recurringRule.lastNotificationAt = new Date().toISOString();
                await db.run(
                  'UPDATE tasks SET recurring_rule = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                  [JSON.stringify(recurringRule), taskAny.id]
                );
              } catch (error) {
                const errorAny: any = error;
                console.error(`Failed to send routine reminder for task ${taskAny.id}:`, errorAny);
              }
            }
          }
        }
      );
    } catch (error) {
      console.error('Error in routine notification scheduler:', error);
    }
  });
  
  // Generate and send weekly reports to n8n every Monday at 9:00 AM
  cron.schedule('0 9 * * 1', async () => {
    try {
      const report = await generateWeeklyReport();
      await sendReportToN8n(report);
    } catch (error) {
      console.error('Error sending weekly report to n8n:', error);
    }
  });
  
  // Clean up old automation logs weekly
  cron.schedule('0 0 * * 0', async () => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoStr = oneWeekAgo.toISOString();
      
      db.run(
        'DELETE FROM automation_logs WHERE created_at < ?',
        [oneWeekAgoStr],
        function(err) {
          if (err) {
            console.error('Error cleaning up automation logs:', err);
          }
        }
      );
    } catch (error) {
      console.error('Error in log cleanup scheduler:', error);
    }
  });
  
  console.log('Task scheduler started');
};

// Check if a new instance of a recurring task should be created
const shouldCreateRecurringTask = (lastDueDate, recurringRule, today) => {
  const nextDueDate = calculateNextDueDate(lastDueDate, recurringRule);
  return nextDueDate && nextDueDate.toISOString().split('T')[0] === today;
};

// Calculate the next due date for a recurring task
const calculateNextDueDate = (lastDueDate, recurringRule) => {
  if (!(lastDueDate instanceof Date) || Number.isNaN(lastDueDate.getTime())) {
    return null;
  }

  const { frequency, interval, endDate, maxOccurrences } = recurringRule;
  const nextDueDate = new Date(lastDueDate);

  switch (frequency) {
    case 'daily':
      nextDueDate.setDate(nextDueDate.getDate() + (interval || 1));
      break;
    case 'weekly':
      nextDueDate.setDate(nextDueDate.getDate() + ((interval || 1) * 7));
      break;
    case 'monthly':
      nextDueDate.setMonth(nextDueDate.getMonth() + (interval || 1));
      break;
    case 'yearly':
      nextDueDate.setFullYear(nextDueDate.getFullYear() + (interval || 1));
      break;
    default:
      return null;
  }

  // Check if we've reached the end date
  if (endDate && new Date(endDate) < nextDueDate) {
    return null;
  }

  return nextDueDate;
};

export { startScheduler };