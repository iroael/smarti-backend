import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsOptional,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ItemGroupDto } from './item-group.dto'; // Sesuaikan path jika perlu

export class DetailOpenBalanceDto {
  @ApiPropertyOptional({ example: '08/07/2025', description: 'Tanggal saldo awal' })
  @IsOptional()
  @IsString()
  asOf: string;

  @ApiPropertyOptional({ example: 'pcs' })
  @IsOptional()
  @IsString()
  itemUnitName: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ example: 15000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 }, { message: 'unitCost maksimal 6 digit desimal' })
  // Optional tambahan validasi maksimum
  @Max(999_000_000_000, { message: 'unitCost tidak boleh lebih dari 999 miliar' })
  @Transform(({ value }) => parseFloat(value))
  unitCost: number;

  @ApiPropertyOptional({ example: 'Utama' })
  @IsOptional()
  @IsString()
  warehouseName: string;
}

export class CreateItemDto {
  @ApiPropertyOptional({ example: 'GROUP', description: 'Item type, must be "GROUP"' })
  @IsOptional()
  @IsString()
  itemType: string;

  @ApiPropertyOptional({ example: 'Nomor Item', description: 'Number of the group item' })
  @IsOptional()
  @IsString()
  no: string;

  @ApiPropertyOptional({ example: 'Sample Group Item', description: 'Name of the group item' })
  @IsOptional()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: true, description: 'Calculate price of group based on detail items' })
  @IsOptional()
  @IsBoolean()
  calculateGroupPrice: boolean;

  @ApiPropertyOptional({ example: true, description: 'Enable stock control' })
  @IsOptional()
  @IsBoolean()
  controlQuantity: boolean;

  @ApiPropertyOptional({ example: '10', description: 'Default discount (in percentage or value)' })
  @IsOptional()
  @IsString()
  defaultDiscount: string;

  @ApiPropertyOptional({ example: 10, description: 'Depth dimension of the item' })
  @IsOptional()
  @IsNumber()
  dimDepth: number;

  @ApiPropertyOptional({ example: 5, description: 'Height dimension of the item' })
  @IsOptional()
  @IsNumber()
  dimHeight: number;

  @ApiPropertyOptional({ example: 15, description: 'Width dimension of the item' })
  @IsOptional()
  @IsNumber()
  dimWidth: number;

  @ApiPropertyOptional({ example: 85000, description: 'Vendor price for this item' })
  @IsOptional()
  @IsNumber()
  vendorPrice: number;

  @ApiPropertyOptional({ example: 'pcs', description: 'Vendor unit name' })
  @IsOptional()
  @IsString()
  vendorUnitName: string;

  @ApiPropertyOptional({ example: 2.5, description: 'Weight of the item' })
  @IsOptional()
  @IsNumber()
  weight: number;

  @ApiPropertyOptional({ example: 'pcs', description: 'Unit 1 name' })
  @IsOptional()
  @IsString()
  unit1Name: string;

  @ApiPropertyOptional({ example: 100000, description: 'Base unit price' })
  @IsOptional()
  @IsNumber()
  unitPrice: number;

  @ApiPropertyOptional({ example: true, description: 'Use PPN for this item' })
  @IsOptional()
  @IsBoolean()
  usePpn: boolean;

  @ApiPropertyOptional({ example: 'Bundling item for promo', description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes: string;

  @ApiPropertyOptional({ type: [DetailOpenBalanceDto], description: 'Detail open balance for the item' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetailOpenBalanceDto)
  detailOpenBalance: DetailOpenBalanceDto[];

  @ApiPropertyOptional({ type: [ItemGroupDto], description: 'List of items included in the group' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemGroupDto)
  detailGroup: ItemGroupDto[];

  // @ApiPropertyOptional({ example: 'GT-001', description: 'Good Transit GL account number' })
  // @IsOptional()
  // @IsString()
  // goodTransitGlAccountNo: string;

  // @ApiPropertyOptional({ example: 'INV-001', description: 'Inventory GL account number' })
  // @IsOptional()
  // @IsString()
  // inventoryGlAccountNo: string;

  // @ApiPropertyOptional({ example: 'Bundling', description: 'Item category name' })
  // @IsOptional()
  // @IsString()
  // itemCategoryName: string;

  // @ApiPropertyOptional({ example: true, description: 'Enable expired date management' })
  // @IsOptional()
  // @IsBoolean()
  // manageExpired: boolean;

  // @ApiPropertyOptional({ example: true, description: 'Enable serial number management' })
  // @IsOptional()
  // @IsBoolean()
  // manageSN: boolean;

  // @ApiPropertyOptional({ example: 1, description: 'Minimum stock quantity' })
  // @IsOptional()
  // @IsNumber()
  // minimumQuantity: number;

  // @ApiPropertyOptional({ example: 3, description: 'Minimum reorder quantity' })
  // @IsOptional()
  // @IsNumber()
  // minimumQuantityReorder: number;

  // @ApiPropertyOptional({ example: 'GRP-12345', description: 'Group item number/code' })
  // @IsOptional()
  // @IsString()
  // no: string;

  // @ApiPropertyOptional({ example: 100, description: 'Percentage of tax applied to the item' })
  // @IsOptional()
  // @IsNumber()
  // percentTaxable: number;

  // @ApiPropertyOptional({ example: 'Vendor XYZ', description: 'Preferred vendor name' })
  // @IsOptional()
  // @IsString()
  // preferedVendorName: string;

  // @ApiPropertyOptional({ example: true, description: 'Print detail group on invoice' })
  // @IsOptional()
  // @IsBoolean()
  // printDetailGroup: boolean;

  // @ApiPropertyOptional({ example: 'PUR-RET-001', description: 'Purchase return GL account number' })
  // @IsOptional()
  // @IsString()
  // purchaseRetGlAccountNo: string;

  // @ApiPropertyOptional({ example: 1, description: 'Unit ratio 2' })
  // @IsOptional()
  // @IsNumber()
  // ratio2: number;

  // @ApiPropertyOptional({ example: 1, description: 'Unit ratio 3' })
  // @IsOptional()
  // @IsNumber()
  // ratio3: number;

  // @ApiPropertyOptional({ example: 'DISC-001', description: 'Sales discount GL account number' })
  // @IsOptional()
  // @IsString()
  // salesDiscountGlAccountNo: string;

  // @ApiPropertyOptional({ example: 'SAL-001', description: 'Sales GL account number' })
  // @IsOptional()
  // @IsString()
  // salesGlAccountNo: string;

  // @ApiPropertyOptional({ example: 'SAL-RET-001', description: 'Sales return GL account number' })
  // @IsOptional()
  // @IsString()
  // salesRetGlAccountNo: string;

  // @ApiPropertyOptional({ example: 'BATCH', description: 'Serial number type (BATCH or INDIVIDUAL)' })
  // @IsOptional()
  // @IsString()
  // serialNumberType: string;

  // @ApiPropertyOptional({ example: false, description: 'Is this item a substitute' })
  // @IsOptional()
  // @IsBoolean()
  // substituted: boolean;

  // @ApiPropertyOptional({ example: 'PPN', description: 'First tax name' })
  // @IsOptional()
  // @IsString()
  // tax1Name: string;

  // @ApiPropertyOptional({ example: 1, description: 'Auto number type (0: manual, 1: auto)' })
  // @IsOptional()
  // @IsNumber()
  // typeAutoNumber: number;

  // @ApiPropertyOptional({ example: 'UNBILL-001', description: 'Unbilled GL account number' })
  // @IsOptional()
  // @IsString()
  // unBilledGlAccountNo: string;

  // @ApiPropertyOptional({ example: false, description: 'Use wholesale price logic' })
  // @IsOptional()
  // @IsBoolean()
  // useWholesalePrice: boolean;
}
