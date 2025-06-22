// create-supplier-supplier-access.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class CreateSupplierAccessDto {
  @ApiProperty({ example: 1, description: 'ID supplier yang ingin melihat katalog supplier lain' })
  @IsNumber()
  viewerId: number;

  @ApiProperty({ example: 2, description: 'ID supplier yang produknya dapat dilihat' })
  @IsNumber()
  targetId: number;
}
