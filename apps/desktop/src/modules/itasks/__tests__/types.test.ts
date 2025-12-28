/**
 * @fileoverview Unit tests for iTasks data mapping functions
 */

import {
  mapPriorityToEisenhower,
  calculateQuadrant,
  mapEisenhowerToPriority,
  type ITasksPriority,
  type EisenhowerQuadrant,
} from '../types';

describe('iTasks Data Mapping Functions', () => {
  describe('mapPriorityToEisenhower', () => {
    it('should map "urgent" to do_first quadrant (urgency=true, importance=true)', () => {
      const result = mapPriorityToEisenhower('urgent');
      expect(result).toEqual({ urgency: true, importance: true });
    });

    it('should map "important" to schedule quadrant (urgency=false, importance=true)', () => {
      const result = mapPriorityToEisenhower('important');
      expect(result).toEqual({ urgency: false, importance: true });
    });

    it('should map "not-urgent" to delegate quadrant (urgency=true, importance=false)', () => {
      const result = mapPriorityToEisenhower('not-urgent');
      expect(result).toEqual({ urgency: true, importance: false });
    });

    it('should map "not-important" to eliminate quadrant (urgency=false, importance=false)', () => {
      const result = mapPriorityToEisenhower('not-important');
      expect(result).toEqual({ urgency: false, importance: false });
    });

    it('should default to eliminate quadrant for unknown priority', () => {
      const result = mapPriorityToEisenhower('unknown' as ITasksPriority);
      expect(result).toEqual({ urgency: false, importance: false });
    });
  });

  describe('calculateQuadrant', () => {
    it('should return "do_first" when urgent and important', () => {
      const result = calculateQuadrant(true, true);
      expect(result).toBe('do_first');
    });

    it('should return "schedule" when not urgent but important', () => {
      const result = calculateQuadrant(false, true);
      expect(result).toBe('schedule');
    });

    it('should return "delegate" when urgent but not important', () => {
      const result = calculateQuadrant(true, false);
      expect(result).toBe('delegate');
    });

    it('should return "eliminate" when neither urgent nor important', () => {
      const result = calculateQuadrant(false, false);
      expect(result).toBe('eliminate');
    });
  });

  describe('mapEisenhowerToPriority', () => {
    it('should map do_first quadrant to "urgent"', () => {
      const result = mapEisenhowerToPriority(true, true);
      expect(result).toBe('urgent');
    });

    it('should map schedule quadrant to "important"', () => {
      const result = mapEisenhowerToPriority(false, true);
      expect(result).toBe('important');
    });

    it('should map delegate quadrant to "not-urgent"', () => {
      const result = mapEisenhowerToPriority(true, false);
      expect(result).toBe('not-urgent');
    });

    it('should map eliminate quadrant to "not-important"', () => {
      const result = mapEisenhowerToPriority(false, false);
      expect(result).toBe('not-important');
    });
  });

  describe('Round-trip conversions', () => {
    it('should maintain consistency when converting priority to Eisenhower and back', () => {
      const priorities: ITasksPriority[] = ['urgent', 'important', 'not-urgent', 'not-important'];

      priorities.forEach((priority) => {
        const { urgency, importance } = mapPriorityToEisenhower(priority);
        const result = mapEisenhowerToPriority(urgency, importance);
        expect(result).toBe(priority);
      });
    });

    it('should maintain consistency when converting Eisenhower to priority and back', () => {
      const combinations = [
        { urgency: true, importance: true },
        { urgency: false, importance: true },
        { urgency: true, importance: false },
        { urgency: false, importance: false },
      ];

      combinations.forEach(({ urgency, importance }) => {
        const priority = mapEisenhowerToPriority(urgency, importance);
        const result = mapPriorityToEisenhower(priority);
        expect(result).toEqual({ urgency, importance });
      });
    });
  });
});
