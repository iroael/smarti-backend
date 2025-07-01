import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Gunakan enum yang sama dengan CreateProductDto
export enum InventoryType {
  STOCK = 'stock',
  SERVICE = 'service',
  DIGITAL = 'digital',
}

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

  @ApiPropertyOptional({ enum: InventoryType, example: InventoryType.STOCK })
  @IsOptional()
  @IsEnum(InventoryType)
  inventory_type?: InventoryType;

  // ✅ Validasi stock hanya jika inventory_type === STOCK
  @ValidateIf((o) => o.inventory_type === InventoryType.STOCK || o.stock !== undefined)
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

  @ApiPropertyOptional({ type: UpdatePriceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePriceDto)
  price?: UpdatePriceDto;

  // ✅ Validasi hanya jika is_bundle === true (atau jika bundleItems dikirim)
  @ValidateIf((o) => o.is_bundle === true || (o.bundleItems && o.bundleItems.length > 0))
  @ApiPropertyOptional({ type: [UpdateBundleItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateBundleItemDto)
  bundleItems?: UpdateBundleItemDto[];

  @ApiPropertyOptional({ example: [1, 2], description: 'List of tax IDs applied to this product' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  tax_ids?: number[];
}
