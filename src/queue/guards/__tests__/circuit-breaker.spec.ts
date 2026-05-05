import { CircuitBreaker } from '../circuit-breaker';

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    jest.useFakeTimers();
    cb = new CircuitBreaker({ threshold: 3, resetMs: 5000 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should start in closed state', () => {
    expect(cb.getState()).toBe('closed');
    expect(cb.isOpen()).toBe(false);
  });

  it('should remain closed after fewer than threshold failures', () => {
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('closed');
    expect(cb.isOpen()).toBe(false);
  });

  it('should transition to open after threshold consecutive failures', () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('open');
    expect(cb.isOpen()).toBe(true);
  });

  it('should reset failure count on success', () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();
    expect(cb.getState()).toBe('closed');
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('closed');
  });

  it('should remain open before resetMs elapses', () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    jest.advanceTimersByTime(4999);
    expect(cb.isOpen()).toBe(true);
  });

  it('should transition to half-open after resetMs', () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    jest.advanceTimersByTime(5000);
    // First call: transitions to half-open and allows one probe
    expect(cb.isOpen()).toBe(false);
    expect(cb.getState()).toBe('half-open');
  });

  it('should transition to closed on success in half-open', () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    jest.advanceTimersByTime(5000);
    cb.isOpen(); // transition to half-open, consume probe
    cb.recordSuccess();
    expect(cb.getState()).toBe('closed');
    expect(cb.isOpen()).toBe(false);
  });

  it('should transition to open on failure in half-open', () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    jest.advanceTimersByTime(5000);
    cb.isOpen(); // transition to half-open, consume probe
    cb.recordFailure();
    expect(cb.getState()).toBe('open');
    expect(cb.isOpen()).toBe(true);
  });

  it('should allow exactly 1 probe in half-open state', () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    jest.advanceTimersByTime(5000);
    // First isOpen call: half-open, probe allowed → returns false
    expect(cb.isOpen()).toBe(false);
    // Second isOpen call: probe already consumed → returns true
    expect(cb.isOpen()).toBe(true);
  });
});
