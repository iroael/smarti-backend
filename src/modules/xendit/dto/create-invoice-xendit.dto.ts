import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty({
    example: 'invoice-test-123456',
    description: 'External ID untuk invoice. Biasanya ID dari sistem internal kamu (order id, dll).',
  })
  @IsNotEmpty()
  @IsString()
  externalId: string;

  @ApiProperty({
    example: 1800000,
    description: 'Jumlah total tagihan dalam IDR',
  })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty({
    example: 'customer@domain.com',
    description: 'Email customer yang menerima invoice',
  })
  @IsNotEmpty()
  @IsEmail()
  payerEmail: string;

  @ApiProperty({
    example: 'Invoice untuk Order #123',
    description: 'Deskripsi invoice',
  })
  @IsNotEmpty()
  @IsString()
  description: string;
}
