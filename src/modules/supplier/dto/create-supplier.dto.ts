import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  ValidateNested,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

enum TaxType {
  NPWP = 'npwp',
  PKP = 'pkp',
  OTHERS = 'others',
}

export enum KategoriEnum {
  Admin = 'Admin',
  KSO = 'KSO',
  Vendor = 'Vendor',
  Provider = 'Provider',
  ISP = 'ISP',
}

class TaxDto {
  @ApiProperty({
    example: TaxType.NPWP,
    enum: TaxType,
    required: false,
    default: TaxType.NPWP,
  })
  @IsOptional()
  @IsEnum(TaxType)
  taxType?: TaxType;

  @ApiProperty({ example: '012345678999000' })
  @IsNotEmpty()
  @IsString()
  taxNumber: string;

  @ApiProperty({ example: 'PT Maju Jaya' })
  @IsNotEmpty()
  @IsString()
  taxName: string;

  @ApiProperty({ example: 'Jl. Pajak No. 45, Jakarta', required: false })
  @IsOptional()
  @IsString()
  registeredAddress?: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: false, required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

class BankAccountDto {
  @ApiProperty({ example: 'Bank BCA' })
  @IsNotEmpty()
  @IsString()
  bankName: string;

  @ApiProperty({ example: '1234567890' })
  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @ApiProperty({ example: 'PT Sumber Makmur' })
  @IsNotEmpty()
  @IsString()
  accountName: string;

  @ApiProperty({ example: 'Cabang Sudirman', required: false })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiProperty({ example: false, required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

class AddSupplierAddressDto {
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

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiProperty({ example: false, required: false, default: false })
  @IsOptional()
  @IsBoolean()
  is_deleted?: boolean;
}

export class CreateSupplierDto {
  @ApiProperty({ enum: KategoriEnum, example: KategoriEnum.Vendor })
  @IsNotEmpty()
  @IsEnum(KategoriEnum)
  kategori: KategoriEnum;

  @ApiProperty({ example: 'PT. Sumber Makmur' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Jl. Merdeka No. 123, Jakarta' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ example: '081234567890' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'sumbermakmur@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Bandung' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ example: 'Jawa Barat' })
  @IsNotEmpty()
  @IsString()
  province: string;

  @ApiProperty({ example: '40111' })
  @IsNotEmpty()
  @IsString()
  postalcode: string;

  @ApiProperty({ type: () => AddSupplierAddressDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddSupplierAddressDto)
  addresses?: AddSupplierAddressDto[];

  @ApiProperty({ type: () => TaxDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TaxDto)
  tax?: TaxDto[];

  @ApiProperty({ type: () => [BankAccountDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BankAccountDto)
  bankAccounts?: BankAccountDto[];

  @ApiProperty({ example: '123456789011234' })
  @IsOptional()
  @IsString()
  npwp: string;

  @ApiProperty({ example: '123456789011234' })
  @IsOptional()
  @IsString()
  accurate_id: string;

  @ApiProperty({ example: '123456789011234' })
  @IsOptional()
  @IsString()
  accurate_sc: string;
  @ApiProperty({ example: '123456789011234' })
  @IsOptional()
  @IsString()
  xendit_id: string;

  @ApiProperty({ example: '123456789011234' })
  @IsOptional()
  @IsString()
  xendit_sc: string;

  @ApiProperty({ example: 'false' })
  @IsOptional()
  @IsBoolean()
  astat: boolean;

  @ApiProperty({ example: 'false' })
  @IsOptional()
  @IsBoolean()
  xstat: boolean;
}
