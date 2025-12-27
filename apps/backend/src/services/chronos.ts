/**
 * @fileoverview Chronos Time Intelligence Service
 * Provides business logic for time blocking, analytics, AI optimization, and smart scheduling
 * @module services/chronos
 */

import {  allAsync, runAsync, getAsync  } from '../utils/database';

/**
 * Check for time block conflicts
 * @param {number} userId - User ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @param {number} excludeBlockId - Block ID to exclude from conflict check (for updates)
 * @returns {Promise<Array>} Array of conflicting blocks
 */
async function checkConflicts(userId, date, startTime, endTime, excludeBlockId = null) {
  let query = `
    SELECT * FROM chronos_time_blocks
    WHERE created_by = ? AND date = ?
    AND ((start_time < ? AND end_time > ?)
    OR (start_time < ? AND end_time > ?)
    OR (start_time >= ? AND end_time <= ?))
  `;
  const params = [userId, date, endTime, startTime, endTime, startTime, startTime, endTime];

  if (excludeBlockId) {
    query += ' AND id != ?';
    params.push(excludeBlockId);
  }

  return await allAsync(query, params);
}

/**
 * Calculate optimal time for a task based on historical data
 * @param {number} userId - User ID
 * @param {string} category - Task category
 * @param {string} energyRequired - Energy level required
 * @returns {Promise<Object>} Suggested time slot
 */
async function suggestOptimalTime(userId, category, energyRequired = 'medium') {
  // Analyze historical performance by hour
  const energyPatterns = await allAsync(`
    SELECT
      CAST(strftime('%H', start_time) AS INTEGER) as hour,
      AVG(energy_level) as avg_energy,
      AVG(focus_quality) as avg_focus,
      AVG(productivity_rating) as avg_productivity,
      COUNT(*) as session_count
    FROM chronos_time_sessions
    WHERE created_by = ? AND category = ? AND status = 'completed'
    GROUP BY hour
    HAVING session_count >= 3
    ORDER BY avg_productivity DESC, avg_focus DESC
    LIMIT 5
  `, [userId, category]);

  if (energyPatterns.length === 0) {
    // Default suggestions if no historical data
    const defaults = {
      high: { hour: 9, reason: 'Morning typically offers peak energy' },
      medium: { hour: 14, reason: 'Afternoon suitable for moderate tasks' },
      low: { hour: 16, reason: 'Late afternoon for lighter tasks' }
    };
    return defaults[energyRequired] || defaults.medium;
  }

  return {
    hour: energyPatterns[0].hour,
    avgProductivity: energyPatterns[0].avg_productivity,
    avgFocus: energyPatterns[0].avg_focus,
    sampleSize: energyPatterns[0].session_count,
    reason: `Based on ${energyPatterns[0].session_count} previous sessions`
  };
}

/**
 * Calculate buffer time based on category and user settings
 * @param {number} userId - User ID
 * @param {string} category - Task category
 * @returns {Promise<Object>} Buffer time in minutes
 */
async function calculateBufferTime(userId, category) {
  const settings = await getAsync(
    'SELECT buffer_time_enabled, default_buffer_minutes FROM chronos_settings WHERE user_id = ?',
    [userId]
  );

  if (!settings || !settings.buffer_time_enabled) {
    return { before: 0, after: 0 };
  }

  const baseBuffer = settings.default_buffer_minutes || 5;

  // Adjust buffer based on category
  const categoryMultipliers = {
    meeting: 1.5,
    deep_work: 1.2,
    admin: 0.8,
    break: 0,
    general: 1.0
  };

  const multiplier = categoryMultipliers[category] || 1.0;
  const bufferTime = Math.round(baseBuffer * multiplier);

  return { before: bufferTime, after: bufferTime };
}

/**
 * Find available time slots for a given date
 * @param {number} userId - User ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {number} duration - Required duration in minutes
 * @returns {Promise<Array>} Available time slots
 */
async function findAvailableSlots(userId, date, duration) {
  // Get user's work hours
  const settings = await getAsync(
    'SELECT work_hours_start, work_hours_end FROM chronos_settings WHERE user_id = ?',
    [userId]
  );

  const workStart = settings?.work_hours_start || '09:00';
  const workEnd = settings?.work_hours_end || '17:00';

  // Get existing blocks for the date
  const existingBlocks = await allAsync(`
    SELECT start_time, end_time FROM chronos_time_blocks
    WHERE created_by = ? AND date = ?
    ORDER BY start_time
  `, [userId, date]);

  // Calculate available slots
  const availableSlots = [];
  let currentTime = workStart;

  for (const block of existingBlocks) {
    // Check if there's a gap before this block
    const gapMinutes = getMinutesDifference(currentTime, block.start_time);
    if (gapMinutes >= duration) {
      availableSlots.push({
        start_time: currentTime,
        end_time: addMinutes(currentTime, duration),
        duration_available: gapMinutes
      });
    }
    currentTime = block.end_time;
  }

  // Check for slot after last block
  const finalGapMinutes = getMinutesDifference(currentTime, workEnd);
  if (finalGapMinutes >= duration) {
    availableSlots.push({
      start_time: currentTime,
      end_time: addMinutes(currentTime, duration),
      duration_available: finalGapMinutes
    });
  }

  return availableSlots;
}

/**
 * Auto-schedule a task into available time slots
 * @param {number} userId - User ID
 * @param {Object} taskDetails - Task details including duration, category, priority
 * @param {string} preferredDate - Preferred date (optional)
 * @returns {Promise<Object>} Suggested time block
 */
async function autoScheduleTask(userId, taskDetails, preferredDate = null) {
  const { duration, category, energy_required, title } = taskDetails;

  // Get optimal time suggestion
  const optimalTime = await suggestOptimalTime(userId, category, energy_required);

  // Find suitable date
  let targetDate = preferredDate || new Date().toISOString().split('T')[0];
  let attempts = 0;
  const maxAttempts = 7; // Try up to 7 days ahead

  while (attempts < maxAttempts) {
    const availableSlots = await findAvailableSlots(userId, targetDate, duration);

    if (availableSlots.length > 0) {
      // Find slot closest to optimal time
      let bestSlot = availableSlots[0];
      let minDiff = Math.abs(
        parseInt(availableSlots[0].start_time.split(':')[0]) - optimalTime.hour
      );

      for (const slot of availableSlots) {
        const slotHour = parseInt(slot.start_time.split(':')[0]);
        const diff = Math.abs(slotHour - optimalTime.hour);
        if (diff < minDiff) {
          minDiff = diff;
          bestSlot = slot;
        }
      }

      return {
        date: targetDate,
        start_time: bestSlot.start_time,
        end_time: bestSlot.end_time,
        title,
        category,
        energy_required,
        suggested_reason: optimalTime.reason
      };
    }

    // Try next day
    targetDate = new Date(new Date(targetDate).getTime() + 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    attempts++;
  }

  throw new Error('No available slots found in the next 7 days');
}

/**
 * Generate daily time intelligence insights
 * @param {number} userId - User ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {Promise<Object>} Daily insights
 */
async function generateDailyInsights(userId, date) {
  const blocks = await allAsync(
    'SELECT * FROM chronos_time_blocks WHERE created_by = ? AND date = ? ORDER BY start_time',
    [userId, date]
  );

  const sessions = await allAsync(`
    SELECT * FROM chronos_time_sessions
    WHERE created_by = ? AND DATE(start_time) = ? AND status = 'completed'
  `, [userId, date]);

  const totalPlannedMinutes = blocks.reduce((sum, block) => {
    const minutes = getMinutesDifference(block.start_time, block.end_time);
    return sum + minutes;
  }, 0);

  const totalActualMinutes = sessions.reduce((sum, session) => {
    return sum + (session.total_duration || 0);
  }, 0);

  const avgFocus = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + (s.focus_quality || 0), 0) / sessions.length
    : 0;

  const avgProductivity = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + (s.productivity_rating || 0), 0) / sessions.length
    : 0;

  return {
    date,
    plannedBlocks: blocks.length,
    completedSessions: sessions.length,
    totalPlannedMinutes,
    totalActualMinutes,
    completionRate: blocks.length > 0 ? (sessions.length / blocks.length) * 100 : 0,
    avgFocus: avgFocus.toFixed(2),
    avgProductivity: avgProductivity.toFixed(2),
    timeVariance: totalActualMinutes - totalPlannedMinutes,
    insights: generateInsightMessages(blocks, sessions, avgFocus, avgProductivity)
  };
}

/**
 * Generate insight messages based on data
 */
function generateInsightMessages(blocks, sessions, avgFocus, avgProductivity) {
  const insights = [];

  if (sessions.length === 0 && blocks.length > 0) {
    insights.push({ type: 'warning', message: 'You had time blocks planned but no sessions tracked' });
  }

  if (avgFocus >= 4) {
    insights.push({ type: 'success', message: 'Excellent focus today! Keep up the great work.' });
  } else if (avgFocus < 2.5 && sessions.length > 0) {
    insights.push({ type: 'info', message: 'Focus was lower today. Consider using Focus Mode or Pomodoro technique.' });
  }

  if (avgProductivity >= 4) {
    insights.push({ type: 'success', message: 'High productivity achieved today!' });
  }

  const totalInterruptions = sessions.reduce((sum, s) => sum + (s.interruptions || 0), 0);
  if (totalInterruptions > 10) {
    insights.push({ type: 'warning', message: `${totalInterruptions} interruptions recorded. Try to minimize distractions.` });
  }

  return insights;
}

/**
 * Utility: Calculate minutes difference between two time strings
 */
function getMinutesDifference(startTime, endTime) {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  return (endHour * 60 + endMin) - (startHour * 60 + startMin);
}

/**
 * Utility: Add minutes to a time string
 */
function addMinutes(timeStr, minutes) {
  const [hour, min] = timeStr.split(':').map(Number);
  const totalMinutes = hour * 60 + min + minutes;
  const newHour = Math.floor(totalMinutes / 60) % 24;
  const newMin = totalMinutes % 60;
  return `${String(newHour).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`;
}

/**
 * Utility: Add days to a date string
 */
function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export { checkConflicts };
export { suggestOptimalTime };
export { calculateBufferTime };
export { findAvailableSlots };
export { autoScheduleTask };
export { generateDailyInsights };
export { getMinutesDifference };
export { addMinutes };
export { addDays };
