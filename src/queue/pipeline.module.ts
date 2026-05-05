import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../types/job.types';
import { FilterProcessor } from './processors/filter.processor';
import { AuthProcessor } from './processors/auth.processor';
import { RequestProcessor } from './processors/request.processor';
import { ResponseProcessor } from './processors/response.processor';
import { DeadLetterProcessor } from './processors/dead-letter.processor';
import { PipelineProgressService } from './pipeline-progress.service';
import { PipelineController } from './pipeline.controller';
import { PipelineService } from './pipeline.service';
import { NotificationService } from '../notification/notification.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.FILTER },
      { name: QUEUE_NAMES.AUTH },
      { name: QUEUE_NAMES.REQUEST },
      { name: QUEUE_NAMES.RESPONSE },
      { name: QUEUE_NAMES.DEAD_LETTER },
    ),
  ],
  controllers: [PipelineController],
  providers: [
    PipelineService,
    PipelineProgressService,
    NotificationService,
    FilterProcessor,
    AuthProcessor,
    RequestProcessor,
    ResponseProcessor,
    DeadLetterProcessor,
  ],
})
export class PipelineModule {}
