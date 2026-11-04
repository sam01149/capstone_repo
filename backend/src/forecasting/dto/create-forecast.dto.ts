import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsUUID,
  IsOptional,
  Matches,
  ValidateNested,
} from 'class-validator';

class EventDto {
  @IsBoolean()
  bazaar!: boolean;

  @IsBoolean()
  miniBazaar!: boolean;
}

class ObservedEventDto extends EventDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  week!: string;
}

export class CreateForecastDto {
  @IsUUID()
  productId!: string;

  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => EventDto)
  futureEvents!: EventDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => ObservedEventDto)
  observedEvents?: ObservedEventDto[];
}
