// src/product-tax/dto/update-tax.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateTaxDto } from './create-tax.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductTaxDto extends PartialType(CreateTaxDto) {
  @ApiPropertyOptional({
    example: 'PPN 10%',
    description: 'Nama pajak yang baru',
  })
  name?: string;

  @ApiPropertyOptional({
    example: 10.0,
    description: 'Persentase pajak yang diperbarui',
  })
  rate?: number;

  @ApiPropertyOptional({
    example: 'Update deskripsi pajak',
    description: 'Deskripsi pajak yang diperbarui',
  })
  description?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Status aktif/tidaknya pajak',
  })
  is_active?: boolean;
}
