import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsString } from 'class-validator'

export class CheckCostDto {
  @ApiProperty({ example: '31555' })
  @IsNotEmpty()
  @IsString()
  origin: string;

  @ApiProperty({ example: '68423' })
  @IsNotEmpty()
  @IsString()
  destination: string;

  @ApiProperty({ example: 1000 })
  @IsNotEmpty()
  @IsNumber()
  weight: number;

  @ApiProperty({
    example: 'jne:sicepat:jnt:pos',
    description: 'Daftar kurir dipisahkan dengan tanda titik dua ":"',
  })
  @IsNotEmpty()
  @IsString()
  courier: string;

  @ApiProperty({ example: 'lowest', description: 'Harga terendah atau lainnya' })
  @IsNotEmpty()
  @IsString()
  price: string;
}
