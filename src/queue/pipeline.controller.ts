import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { PipelineService } from './pipeline.service';

@Controller('pipeline')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Post('trigger')
  async trigger(@Body() body: { count: number; targetUrl?: string }) {
    const { count, targetUrl = 'https://api.example.gov/data' } = body;
    return this.pipelineService.triggerBatch(count, targetUrl);
  }

  @Get('progress/:batchId')
  getProgress(@Param('batchId') batchId: string) {
    return this.pipelineService.getProgress(batchId) ?? { error: 'Batch not found' };
  }
}
