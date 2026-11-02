import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class ListRecommendationsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}
