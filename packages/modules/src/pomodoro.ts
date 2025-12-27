import { z } from 'zod';

/**
 * Pomodoro Focus Module
 * Implements the Pomodoro Technique for time management
 */

export const PomodoroSessionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['work', 'short_break', 'long_break']),
  duration: z.number().int().positive(), // in minutes
  completedAt: z.date().nullable().optional(),
  taskId: z.string().uuid().nullable().optional(),
  createdAt: z.date(),
});

export type PomodoroSession = z.infer<typeof PomodoroSessionSchema>;

export const PomodoroConfigSchema = z.object({
  workDuration: z.number().int().positive().default(25),
  shortBreakDuration: z.number().int().positive().default(5),
  longBreakDuration: z.number().int().positive().default(15),
  sessionsBeforeLongBreak: z.number().int().positive().default(4),
  autoStartBreaks: z.boolean().default(false),
  autoStartPomodoros: z.boolean().default(false),
});

export type PomodoroConfig = z.infer<typeof PomodoroConfigSchema>;

export type PomodoroState = 'idle' | 'running' | 'paused' | 'completed';

export class PomodoroModule {
  private config: PomodoroConfig;
  private sessions: PomodoroSession[] = [];
  private currentSession: PomodoroSession | null = null;
  private state: PomodoroState = 'idle';
  private timeRemaining: number = 0; // in seconds
  private timer: NodeJS.Timeout | null = null;
  private listeners: Set<(state: PomodoroState, timeRemaining: number) => void> = new Set();

  constructor(config?: Partial<PomodoroConfig>) {
    this.config = PomodoroConfigSchema.parse(config || {});
    this.timeRemaining = this.config.workDuration * 60;
  }

  /**
   * Start a new Pomodoro session
   */
  start(taskId?: string): void {
    if (this.state === 'running') {
      return;
    }

    if (!this.currentSession) {
      const sessionType = this.getNextSessionType();
      this.currentSession = {
        id: crypto.randomUUID(),
        type: sessionType,
        duration: this.getSessionDuration(sessionType),
        completedAt: null,
        taskId: taskId || null,
        createdAt: new Date(),
      };
      this.timeRemaining = this.currentSession.duration * 60;
    }

    this.state = 'running';
    this.startTimer();
    this.notifyListeners();
  }

  /**
   * Pause the current session
   */
  pause(): void {
    if (this.state !== 'running') {
      return;
    }

    this.state = 'paused';
    this.stopTimer();
    this.notifyListeners();
  }

  /**
   * Resume a paused session
   */
  resume(): void {
    if (this.state !== 'paused') {
      return;
    }

    this.state = 'running';
    this.startTimer();
    this.notifyListeners();
  }

  /**
   * Stop and complete the current session
   */
  complete(): void {
    if (!this.currentSession) {
      return;
    }

    this.currentSession.completedAt = new Date();
    this.sessions.push(this.currentSession);
    this.state = 'completed';
    this.stopTimer();
    this.notifyListeners();

    // Auto-start next session if configured
    setTimeout(() => {
      this.currentSession = null;
      this.state = 'idle';
      
      if (this.shouldAutoStart()) {
        this.start();
      } else {
        this.notifyListeners();
      }
    }, 1000);
  }

  /**
   * Skip the current session
   */
  skip(): void {
    this.stopTimer();
    this.currentSession = null;
    this.state = 'idle';
    this.notifyListeners();
  }

  /**
   * Reset the current session
   */
  reset(): void {
    this.stopTimer();
    if (this.currentSession) {
      this.timeRemaining = this.currentSession.duration * 60;
    }
    this.state = 'idle';
    this.notifyListeners();
  }

  /**
   * Get current state
   */
  getState(): PomodoroState {
    return this.state;
  }

  /**
   * Get time remaining in seconds
   */
  getTimeRemaining(): number {
    return this.timeRemaining;
  }

  /**
   * Get current session
   */
  getCurrentSession(): PomodoroSession | null {
    return this.currentSession;
  }

  /**
   * Get all completed sessions
   */
  getSessions(): PomodoroSession[] {
    return this.sessions;
  }

  /**
   * Get today's sessions
   */
  getTodaySessions(): PomodoroSession[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.sessions.filter((session) => {
      const sessionDate = new Date(session.createdAt);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    });
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalSessions: number;
    workSessions: number;
    breakSessions: number;
    totalWorkTime: number;
    todaySessions: number;
  } {
    const today = this.getTodaySessions();
    
    return {
      totalSessions: this.sessions.length,
      workSessions: this.sessions.filter((s) => s.type === 'work').length,
      breakSessions: this.sessions.filter((s) => s.type !== 'work').length,
      totalWorkTime: this.sessions
        .filter((s) => s.type === 'work')
        .reduce((sum, s) => sum + s.duration, 0),
      todaySessions: today.length,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<PomodoroConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: PomodoroState, timeRemaining: number) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Private methods

  private startTimer(): void {
    this.stopTimer();
    this.timer = setInterval(() => {
      this.timeRemaining--;
      this.notifyListeners();

      if (this.timeRemaining <= 0) {
        this.complete();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback(this.state, this.timeRemaining));
  }

  private getNextSessionType(): 'work' | 'short_break' | 'long_break' {
    const completedWorkSessions = this.sessions.filter((s) => s.type === 'work').length;

    if (completedWorkSessions > 0 && completedWorkSessions % this.config.sessionsBeforeLongBreak === 0) {
      return 'long_break';
    }

    const lastSession = this.sessions[this.sessions.length - 1];
    return lastSession?.type === 'work' ? 'short_break' : 'work';
  }

  private getSessionDuration(type: 'work' | 'short_break' | 'long_break'): number {
    switch (type) {
      case 'work':
        return this.config.workDuration;
      case 'short_break':
        return this.config.shortBreakDuration;
      case 'long_break':
        return this.config.longBreakDuration;
    }
  }

  private shouldAutoStart(): boolean {
    if (!this.currentSession) return false;

    if (this.currentSession.type === 'work') {
      return this.config.autoStartBreaks;
    } else {
      return this.config.autoStartPomodoros;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopTimer();
    this.listeners.clear();
  }
}

export const createPomodoroModule = (config?: Partial<PomodoroConfig>): PomodoroModule => {
  return new PomodoroModule(config);
};
