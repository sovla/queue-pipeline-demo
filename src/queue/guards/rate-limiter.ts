import { Injectable } from '@nestjs/common';

/**
 * Token Bucket Rate Limiter
 *
 * 기존 구현: await sleep(50) — 단순 딜레이
 * 개선: Token Bucket으로 버스트 허용 + 평균 TPS 유지
 */
export interface RateLimiterConfig {
  tps: number;
}

@Injectable()
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(private readonly config: RateLimiterConfig) {
    this.tokens = config.tps;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens > 0) {
      this.tokens--;
      return;
    }

    // 토큰이 없으면 다음 토큰 생성까지 대기
    const waitMs = 1000 / this.config.tps;
    await new Promise((r) => setTimeout(r, waitMs));
    this.refill();
    this.tokens = Math.max(0, this.tokens - 1);
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = Math.floor((elapsed / 1000) * this.config.tps);

    if (newTokens > 0) {
      this.tokens = Math.min(this.config.tps, this.tokens + newTokens);
      this.lastRefill = now;
    }
  }
}
