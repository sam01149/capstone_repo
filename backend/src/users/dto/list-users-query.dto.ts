import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ROLE_CODES, type RoleCode } from '../../common/auth/auth.constants.js';

const USER_SORT_FIELDS = ['createdAt', 'name', 'email', 'lastLoginAt'] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;

export type UserSortField = (typeof USER_SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

export class ListUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(254)
  search?: string;

  @IsOptional()
  @IsIn(Object.values(ROLE_CODES), { message: 'Role tidak valid.' })
  role?: RoleCode;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'isActive harus bernilai true atau false.' })
  isActive?: boolean;

  @IsOptional()
  @IsIn(USER_SORT_FIELDS)
  sort: UserSortField = 'createdAt';

  @IsOptional()
  @IsIn(SORT_ORDERS)
  order: SortOrder = 'desc';
}
