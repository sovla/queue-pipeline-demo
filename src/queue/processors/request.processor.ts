import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PipelineJobData, QUEUE_NAMES, PIPELINE_CONFIG } from '../../types/job.types';
import { RateLimiter } from '../guards/rate-limiter';
import { CircuitBreaker } from '../guards/circuit-breaker';

@Processor(QUEUE_NAMES.REQUEST)
export class RequestProcessor extends WorkerHost {
  private readonly logger = new Logger(RequestProcessor.name);
  private readonly rateLimiter = new RateLimiter(PIPELINE_CONFIG.RATE_LIMIT_TPS);
  private readonly circuitBreaker = new CircuitBreaker(
    PIPELINE_CONFIG.CIRCUIT_BREAKER_THRESHOLD,
    PIPELINE_CONFIG.CIRCUIT_BREAKER_RESET_MS,
  );

  constructor(
    @InjectQueue(QUEUE_NAMES.RESPONSE) private readonly responseQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DEAD_LETTER) private readonly deadLetterQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<PipelineJobData>): Promise<void> {
    const { id, attempt, maxAttempts } = job.data;

    if (this.circuitBreaker.isOpen()) {
      // Circuit open: 큐에 다시 넣고 대기
      const delay = PIPELINE_CONFIG.CIRCUIT_BREAKER_RESET_MS;
      await job.moveToDelayed(Date.now() + delay);
      this.logger.warn(`[Request] Circuit open — job ${id} delayed ${delay}ms`);
      return;
    }

    await this.rateLimiter.acquire();

    try {
      const response = await this.callExternalApi(job.data);
      this.circuitBreaker.recordSuccess();

      await this.responseQueue.add('response', {
        ...job.data,
        payload: { ...job.data.payload, response },
      });

      this.logger.log(`[Request] Job ${id} → response queue`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown';
      this.circuitBreaker.recordFailure();
      this.logger.error(`[Request] Job ${id} failed (${attempt}/${maxAttempts}): ${message}`);

      if (attempt >= maxAttempts) {
        await this.deadLetterQueue.add('dead-letter', {
          ...job.data,
          payload: { ...job.data.payload, error: message },
        });
      } else {
        const delay = Math.pow(2, attempt) * 1000;
        await this.requestQueue.add('request', {
          ...job.data,
          attempt: attempt + 1,
        }, { delay });
      }
    }
  }

  private get requestQueue(): Queue {
    return (this as any).queue;
  }

  private async callExternalApi(jobData: PipelineJobData): Promise<unknown> {
    const { payload } = jobData;

    // Mock: 실제로는 axios/fetch로 외부 정부 API 호출
    // 타임아웃 6초, SSL 검증 등 설정
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));

    // 30% 실패율 시뮬레이션 (정부 API 불안정성 재현)
    if (Math.random() < 0.3) {
      throw new Error(`External API error: ${payload.targetUrl} timeout`);
    }

    return {
      statusCode: 200,
      body: { id: jobData.id, result: 'processed' },
      timestamp: new Date().toISOString(),
    };
  }
}
