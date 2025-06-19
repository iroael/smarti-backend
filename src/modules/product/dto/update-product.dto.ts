import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class UpdatePriceDto {
  @ApiPropertyOptional({ example: 120000 })
  @IsOptional()
  @IsNumber()
  dpp_beli?: number;

  @ApiPropertyOptional({ example: 150000 })
  @IsOptional()
  @IsNumber()
  dpp_jual?: number;

  @ApiPropertyOptional({ example: 145000 })
  @IsOptional()
  @IsNumber()
  h_jual_b?: number;
}

class UpdateBundleItemDto {
  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  product_id?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  quantity?: number;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'SKU-001-001' })
  @IsOptional()
  @IsString()
  product_code?: string;

  @ApiPropertyOptional({ example: 'Paket Bundling A - Revisi' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Update deskripsi paket' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsInt()
  stock?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_bundle?: boolean;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  supplier_id?: number;

  @ApiPropertyOptional({ type: UpdatePriceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePriceDto)
  price?: UpdatePriceDto;

  @ApiPropertyOptional({ type: [UpdateBundleItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateBundleItemDto)
  bundleItems?: UpdateBundleItemDto[];
}
