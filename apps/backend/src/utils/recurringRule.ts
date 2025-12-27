type RecurringRuleStatus = 'active' | 'paused';
type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringRule {
  frequency: RecurringFrequency;
  interval: number;
  maxOccurrences?: number;
  endDate?: string;
  notificationLeadTime: number;
  status: RecurringRuleStatus;
  lastNotificationAt?: string | null;
  [key: string]: any;
}

const SUPPORTED_FREQUENCIES: RecurringFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

const coercePositiveInteger = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

const coerceOptionalPositiveInteger = (value: unknown): number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return undefined;
};

const isValidDateString = (value: unknown): value is string => {
  if (typeof value !== 'string') {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

/**
 * Parse and sanitize a recurring rule JSON string/object to ensure downstream
 * schedulers and APIs can safely consume the data even when values are
 * malformed or missing.
 */
export const parseRecurringRule = (ruleInput: unknown): RecurringRule => {
  try {
    const parsed = typeof ruleInput === 'string'
      ? JSON.parse(ruleInput)
      : (ruleInput || {});

    const frequency: RecurringFrequency = SUPPORTED_FREQUENCIES.includes(parsed.frequency)
      ? parsed.frequency
      : 'daily';

    const interval = coercePositiveInteger(parsed.interval, 1);
    const notificationLeadTime = coercePositiveInteger(parsed.notificationLeadTime, 60);
    const status: RecurringRuleStatus = parsed.status === 'paused' ? 'paused' : 'active';
    const endDate = isValidDateString(parsed.endDate) ? parsed.endDate : undefined;

    const maxOccurrences = coerceOptionalPositiveInteger(parsed.maxOccurrences ?? parsed.occurrences);
    const lastNotificationAt = isValidDateString(parsed.lastNotificationAt)
      ? parsed.lastNotificationAt
      : null;

    return {
      ...parsed,
      frequency,
      interval,
      notificationLeadTime,
      status,
      endDate,
      maxOccurrences,
      lastNotificationAt,
    };
  } catch (error) {
    return {
      frequency: 'daily',
      interval: 1,
      notificationLeadTime: 60,
      status: 'active',
      lastNotificationAt: null,
    };
  }
};
