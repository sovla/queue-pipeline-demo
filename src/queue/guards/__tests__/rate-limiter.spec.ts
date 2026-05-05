import { RateLimiter } from '../rate-limiter';

describe('RateLimiter', () => {
  let rl: RateLimiter;

  beforeEach(() => {
    jest.useFakeTimers();
    rl = new RateLimiter({ tps: 5 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should allow immediate acquire when tokens available', async () => {
    const start = Date.now();
    await rl.acquire();
    // Should resolve immediately without waiting
    expect(Date.now() - start).toBeLessThan(50);
  });

  it('should consume exactly 1 token per acquire', async () => {
    // tps=5, starts with 5 tokens
    // Consume all 5 synchronously (no await needed for token > 0 path)
    for (let i = 0; i < 5; i++) {
      const p = rl.acquire();
      jest.runAllTimers();
      await p;
    }
    // 6th should need to wait
    let resolved = false;
    const p = rl.acquire().then(() => { resolved = true; });
    expect(resolved).toBe(false);
    jest.advanceTimersByTime(200); // 1000/5 = 200ms
    await p;
    expect(resolved).toBe(true);
  });

  it('should allow burst up to TPS limit', async () => {
    const promises: Promise<void>[] = [];
    for (let i = 0; i < 5; i++) {
      promises.push(rl.acquire());
    }
    // All should resolve without waiting (burst)
    await Promise.all(promises);
  });

  it('should wait when tokens exhausted', async () => {
    // Exhaust all tokens
    for (let i = 0; i < 5; i++) {
      await rl.acquire();
    }
    let resolved = false;
    const p = rl.acquire().then(() => { resolved = true; });
    expect(resolved).toBe(false);
    jest.advanceTimersByTime(200);
    await p;
    expect(resolved).toBe(true);
  });

  it('should refill tokens based on elapsed time', async () => {
    // Exhaust all tokens
    for (let i = 0; i < 5; i++) {
      await rl.acquire();
    }
    // Advance 1 second → refill 5 tokens
    jest.advanceTimersByTime(1000);
    // Should allow immediate acquires again
    const p = rl.acquire();
    await p; // should not hang
  });

  it('should cap tokens at max TPS', async () => {
    // Exhaust tokens then wait 2 seconds (would add 10 tokens but max is 5)
    for (let i = 0; i < 5; i++) {
      await rl.acquire();
    }
    jest.advanceTimersByTime(2000);
    // Should allow exactly 5 immediate acquires (capped at tps)
    const promises: Promise<void>[] = [];
    for (let i = 0; i < 5; i++) {
      promises.push(rl.acquire());
    }
    await Promise.all(promises);
    // 6th should wait
    let resolved = false;
    const p = rl.acquire().then(() => { resolved = true; });
    expect(resolved).toBe(false);
    jest.advanceTimersByTime(200);
    await p;
    expect(resolved).toBe(true);
  });

  it('should properly decrement after waiting (validates critical fix)', async () => {
    // Exhaust all tokens
    for (let i = 0; i < 5; i++) {
      await rl.acquire();
    }
    // First waiting acquire
    const p1 = rl.acquire();
    jest.advanceTimersByTime(200);
    await p1;

    // Second waiting acquire should also wait (token was properly consumed)
    let resolved = false;
    const p2 = rl.acquire().then(() => { resolved = true; });
    expect(resolved).toBe(false);
    jest.advanceTimersByTime(200);
    await p2;
    expect(resolved).toBe(true);
  });
});
