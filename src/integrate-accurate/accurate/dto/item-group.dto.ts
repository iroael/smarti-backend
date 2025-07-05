import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class ItemGroupDto {
  @ApiPropertyOptional({ example: 'new', description: 'Status of the group detail (new, update, delete)' })
  @IsString()
  @IsOptional()
  _status: string;

  @ApiPropertyOptional({ example: 'Item A', description: 'Name of the item in group' })
  @IsString()
  @IsOptional()
  detailName: string;

  @ApiPropertyOptional({ example: 'ITM-001', description: 'Item code/number' })
  @IsString()
  @IsOptional()
  itemNo: string;

  @ApiPropertyOptional({ example: 'pcs', description: 'Unit name used for the item' })
  @IsString()
  @IsOptional()
  itemUnitName: string;

  @ApiPropertyOptional({ example: 5, description: 'Quantity of the item in the group' })
  @IsNumber()
  @IsOptional()
  quantity: number;
}
