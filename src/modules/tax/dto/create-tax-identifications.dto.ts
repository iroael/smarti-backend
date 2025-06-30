import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateTaxIdentificationDto {
  @ApiProperty({ enum: ['customer', 'supplier'] })
  @IsEnum(['customer', 'supplier'])
  ownerType: 'customer' | 'supplier';

  @ApiProperty()
  @IsNumber()
  ownerId: number;

  @ApiProperty({ enum: ['npwp', 'pkp', 'others'], default: 'npwp' })
  @IsEnum(['npwp', 'pkp', 'others'])
  taxType: 'npwp' | 'pkp' | 'others';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  taxNumber: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  taxName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  registeredAddress?: string;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
