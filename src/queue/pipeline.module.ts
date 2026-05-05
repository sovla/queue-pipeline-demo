import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES, PIPELINE_CONFIG } from '../types/job.types';
import { FilterProcessor } from './processors/filter.processor';
import { AuthProcessor } from './processors/auth.processor';
import { RequestProcessor } from './processors/request.processor';
import { ResponseProcessor } from './processors/response.processor';
import { DeadLetterProcessor } from './processors/dead-letter.processor';
import { PipelineProgressService } from './pipeline-progress.service';
import { PipelineController } from './pipeline.controller';
import { PipelineService } from './pipeline.service';
import { NotificationModule } from '../notification/notification.module';
import { CircuitBreaker } from './guards/circuit-breaker';
import { RateLimiter } from './guards/rate-limiter';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.FILTER },
      { name: QUEUE_NAMES.AUTH },
      { name: QUEUE_NAMES.REQUEST },
      { name: QUEUE_NAMES.RESPONSE },
      { name: QUEUE_NAMES.DEAD_LETTER },
    ),
    NotificationModule,
  ],
  controllers: [PipelineController],
  providers: [
    PipelineService,
    PipelineProgressService,
    FilterProcessor,
    AuthProcessor,
    RequestProcessor,
    ResponseProcessor,
    DeadLetterProcessor,
    {
      provide: CircuitBreaker,
      useFactory: () => new CircuitBreaker({
        threshold: PIPELINE_CONFIG.CIRCUIT_BREAKER_THRESHOLD,
        resetMs: PIPELINE_CONFIG.CIRCUIT_BREAKER_RESET_MS,
      }),
    },
    {
      provide: RateLimiter,
      useFactory: () => new RateLimiter({ tps: PIPELINE_CONFIG.RATE_LIMIT_TPS }),
    },
  ],
})
export class PipelineModule {}
