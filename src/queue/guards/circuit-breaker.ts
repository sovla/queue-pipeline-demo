import { Injectable } from '@nestjs/common';

/**
 * Circuit Breaker
 *
 * 연속 N회 실패 시 회로를 열어 외부 API 호출을 차단.
 * resetMs 후 half-open 상태에서 1회 시도 → 성공 시 closed, 실패 시 다시 open.
 *
 * 기존 구현: health check cron만 존재 (5분 간격)
 * 개선: 실시간 Circuit Breaker로 즉각 차단 + 자동 복구
 */
export interface CircuitBreakerConfig {
  threshold: number;
  resetMs: number;
}

@Injectable()
export class CircuitBreaker {
  private failureCount = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private openedAt = 0;
  private halfOpenProbeAllowed = false;

  constructor(private readonly config: CircuitBreakerConfig) {}

  isOpen(): boolean {
    if (this.state === 'open') {
      if (Date.now() - this.openedAt >= this.config.resetMs) {
        // Transition to half-open: allow exactly 1 probe by consuming it here
        this.state = 'half-open';
        this.halfOpenProbeAllowed = false;
        this.openedAt = Infinity; // prevent re-entry
        return false;
      }
      return true;
    }
    if (this.state === 'half-open') {
      if (this.halfOpenProbeAllowed) {
        this.halfOpenProbeAllowed = false;
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
    this.halfOpenProbeAllowed = false;
  }

  recordFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.config.threshold) {
      this.state = 'open';
      this.openedAt = Date.now();
      this.halfOpenProbeAllowed = false;
    }
  }

  getState(): string {
    return this.state;
  }
}
