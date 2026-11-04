import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsBoolean,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';

class DemandWeekDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  week!: string;

  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,3})?$/)
  quantity!: string;

  @IsBoolean()
  bazaar!: boolean;

  @IsBoolean()
  miniBazaar!: boolean;
}

export class ImportHistoryDto {
  @Equals(true)
  confirmedComplete!: boolean;

  @IsUUID()
  productId!: string;

  @Matches(/^[a-f0-9]{64}$/)
  sourceHash!: string;

  @IsInt()
  @Min(1)
  @Max(10000)
  sourceProductCount!: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  sourceStartWeek!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  sourceEndWeek!: string;

  @IsArray()
  @ArrayMaxSize(1000)
  @ArrayUnique()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true })
  unrecordedWeeks!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => DemandWeekDto)
  weeks!: DemandWeekDto[];
}
