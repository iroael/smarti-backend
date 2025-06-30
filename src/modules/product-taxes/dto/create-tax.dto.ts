// src/product-tax/dto/create-tax.dto.ts
import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaxDto {
  @ApiProperty({
    example: 'PPN 11%',
    description: 'Nama jenis pajak',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 11.0,
    description: 'Persentase pajak (maks 100.00)',
  })
  @IsNumber()
  rate: number;

  @ApiProperty({
    example: 'Pajak pertambahan nilai sebesar 11 persen',
    description: 'Deskripsi tambahan tentang pajak',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: true,
    description: 'Status apakah pajak ini aktif',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
