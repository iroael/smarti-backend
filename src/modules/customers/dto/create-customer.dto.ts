import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: '081234567890' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: '09.123.456.7-890.000' })
  @IsOptional()
  @IsString()
  npwp: string;

  @ApiProperty({ example: 'Bandung' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ example: 'Jawa Barat' })
  @IsNotEmpty()
  @IsString()
  province: string;

  @ApiProperty({ example: 'Jl. Merdeka No. 123' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ example: '40111' })
  @IsNotEmpty()
  @IsString()
  postalcode: string;
}
