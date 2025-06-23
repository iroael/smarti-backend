import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
} from 'class-validator';

export enum OwnerType {
  CUSTOMER = 'customer',
  SUPPLIER = 'supplier',
}

export class CreateAddressDto {
  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '08123456789' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Jl. Sudirman No. 1' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ example: 'Jakarta' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ example: 'DKI Jakarta' })
  @IsNotEmpty()
  @IsString()
  province: string;

  @ApiProperty({ example: '12345' })
  @IsNotEmpty()
  @IsString()
  postalcode: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  is_deleted?: boolean;

  @ApiProperty({ enum: OwnerType, example: OwnerType.CUSTOMER })
  @IsNotEmpty()
  @IsEnum(OwnerType)
  ownerType: OwnerType;

  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsNumber()
  ownerId: number;
}
