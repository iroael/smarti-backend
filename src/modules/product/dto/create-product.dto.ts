import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Inventory type enum
export enum InventoryType {
  STOCK = 'stock',
  SERVICE = 'service',
  DIGITAL = 'digital',
}

// DTO for product price
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

// DTO for bundled item
class BundleItemDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  product_id: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  quantity: number;
}

// Main DTO for product creation
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

  @IsEnum(InventoryType)
  @ApiProperty({ example: 'stock', enum: InventoryType })
  inventory_type: InventoryType;

  // ✅ Only validate stock if inventory_type is 'stock'
  @ValidateIf((o) => o.inventory_type === InventoryType.STOCK)
  @ApiProperty({ example: 10, required: false })
  @IsInt()
  stock?: number;

  @ApiPropertyOptional({ example: 1.5, description: 'Berat produk dalam kilogram' })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ example: 10, description: 'Panjang produk dalam cm' })
  @IsOptional()
  @IsNumber()
  length?: number;

  @ApiPropertyOptional({ example: 20, description: 'Tinggi produk dalam cm' })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ example: 20, description: 'Lebar produk dalam cm' })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ example: '10x20x30', description: 'Dimensi produk dalam format bebas' })
  @IsOptional()
  @IsString()
  dimension?: string;

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

  // ✅ bundleItems hanya jika is_bundle === true
  @ValidateIf((o) => o.is_bundle === true)
  @ApiPropertyOptional({ type: [BundleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundleItemDto)
  bundleItems?: BundleItemDto[];

  // Optional tax IDs
  @ApiPropertyOptional({ example: [1, 2], description: 'List of tax IDs applied to this product' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  tax_ids?: number[];
}
