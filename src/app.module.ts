import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PipelineModule } from './queue/pipeline.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    PipelineModule,
  ],
})
export class AppModule {}
