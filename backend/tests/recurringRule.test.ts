import { parseRecurringRule } from '../src/utils/recurringRule';

describe('parseRecurringRule', () => {
  it('returns safe defaults when the input cannot be parsed', () => {
    const result = parseRecurringRule('not-json');

    expect(result).toMatchObject({
      frequency: 'daily',
      interval: 1,
      notificationLeadTime: 60,
      status: 'active',
      lastNotificationAt: null,
    });
  });

  it('sanitizes unsupported or malformed values', () => {
    const result = parseRecurringRule({
      frequency: 'sometimes',
      interval: -5,
      notificationLeadTime: 'abc',
      status: 'stuck',
      endDate: 'not-a-date',
      maxOccurrences: '0',
      lastNotificationAt: 'invalid-date',
    });

    expect(result).toEqual(
      expect.objectContaining({
        frequency: 'daily',
        interval: 1,
        notificationLeadTime: 60,
        status: 'active',
        endDate: undefined,
        maxOccurrences: undefined,
        lastNotificationAt: null,
      })
    );
  });

  it('retains valid values while coercing numeric strings', () => {
    const result = parseRecurringRule({
      frequency: 'weekly',
      interval: '3',
      notificationLeadTime: 45,
      status: 'paused',
      endDate: '2024-01-01T00:00:00Z',
      occurrences: '5',
      lastNotificationAt: '2024-01-02T00:00:00Z',
    });

    expect(result).toEqual(
      expect.objectContaining({
        frequency: 'weekly',
        interval: 3,
        notificationLeadTime: 45,
        status: 'paused',
        endDate: '2024-01-01T00:00:00Z',
        maxOccurrences: 5,
        lastNotificationAt: '2024-01-02T00:00:00Z',
      })
    );
  });
});
