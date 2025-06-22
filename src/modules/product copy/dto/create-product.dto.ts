import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PriceDto {
  @ApiProperty({ example: 120000 })
  @IsNumber()
  dpp_beli: number;

  @ApiProperty({ example: 150000 })
  @IsNumber()
  dpp_jual: number;

  @ApiProperty({ example: 145000 })
  @IsNumber()
  h_jual_b: number;
}

class BundleItemDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  product_id: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  quantity: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'SKU-001-001' })
  @IsString()
  @IsNotEmpty()
  product_code: string;

  @ApiProperty({ example: 'Paket Bundling A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Berisi 3 produk pilihan' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  stock: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  is_bundle: boolean;

  @ApiProperty({ example: 1 })
  @IsInt()
  supplier_id: number;

  @ApiProperty({ type: PriceDto })
  @ValidateNested()
  @Type(() => PriceDto)
  price: PriceDto;

  @ApiPropertyOptional({ type: [BundleItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundleItemDto)
  bundleItems?: BundleItemDto[];
}
