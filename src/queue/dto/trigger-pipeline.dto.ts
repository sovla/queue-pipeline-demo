import { IsInt, IsUrl, Min, Max, IsOptional } from 'class-validator';

export class TriggerPipelineDto {
  @IsInt()
  @Min(1)
  @Max(10000)
  count!: number;

  @IsOptional()
  @IsUrl()
  targetUrl?: string;
}
