import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PipelineJobData, QUEUE_NAMES } from '../../types/job.types';

interface CachedToken {
  token: string;
  expiresAt: number;
}

@Processor(QUEUE_NAMES.AUTH)
export class AuthProcessor extends WorkerHost {
  private readonly logger = new Logger(AuthProcessor.name);
  private cachedToken: CachedToken | null = null;

  constructor(
    @InjectQueue(QUEUE_NAMES.REQUEST) private readonly requestQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<PipelineJobData>): Promise<void> {
    const { id } = job.data;

    const token = await this.acquireToken();

    await this.requestQueue.add('request', {
      ...job.data,
      payload: { ...job.data.payload, authToken: token },
    });

    this.logger.log(`[Auth] Job ${id} → request queue`);
  }

  private async acquireToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.token;
    }

    // 실제: 외부 인증 서버 로그인 (form-encoded POST)
    // 와이펫 패턴: https://external-api/login 호출 → 세션 토큰 반환
    const token = `session-${Date.now()}`;

    this.cachedToken = {
      token,
      expiresAt: Date.now() + 30 * 60_000, // 30분 유효
    };

    this.logger.log('[Auth] Token acquired (30min TTL)');
    return token;
  }
}
