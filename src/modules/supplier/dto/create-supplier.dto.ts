import { IsNotEmpty, IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({
    example: 'PT. Sumber Makmur',
    description: 'Nama supplier',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Jl. Merdeka No. 123, Jakarta',
    description: 'Alamat lengkap supplier',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    example: '081234567890',
    description: 'Nomor telepon supplier',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 'sumbermakmur@example.com',
    description: 'Alamat email supplier',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
