import { IsUUID } from 'class-validator';

export class CreatePurchaseRelateOrderDto {
  @IsUUID()
  orderId: string;
}
