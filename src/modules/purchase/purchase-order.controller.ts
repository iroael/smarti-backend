import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { PurchaseOrderService } from './purchase-order.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { CreatePurchaseRelateOrderDto } from './dto/create-purchase-relate-order.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { PurchaseOrder } from 'src/entities/purchase/purchase-order.entity';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@Controller('purchase-orders')
export class PurchaseOrderController {
  constructor(private readonly service: PurchaseOrderService) {}

  // ✅ Relate Orders endpoint
  @Post('/from-relate-orders')
  @ApiOperation({ summary: 'Create Purchase Order from Related Orders' })
  @ApiResponse({ status: 201, description: 'Created successfully', type: PurchaseOrder })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async createFromRelateOrders(@Body() dto: CreatePurchaseOrderDto) {
    const result = await this.service.create(dto);
    return {
      message: 'Purchase Order created successfully',
      data: result,
    };
  }


  // 🔧 Optional: regular create if needed later
  @Post()
  @ApiOperation({ summary: 'Create Purchase Order (Manual / Custom)' })
  @ApiResponse({ status: 201, description: 'Created successfully', type: PurchaseOrder })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async create(@Body() dto: CreatePurchaseOrderDto) {
    const result = await this.service.create(dto);
    return {
      message: 'Purchase Order created successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all Purchase Orders' })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'CONFIRMED', 'RECEIVED', 'CANCELLED'] })
  @ApiResponse({ status: 200, description: 'List of purchase orders', type: [PurchaseOrder] })
  async findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Purchase Order by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Purchase Order UUID' })
  @ApiResponse({ status: 200, description: 'Purchase order found', type: PurchaseOrder })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update Purchase Order by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Updated successfully', type: PurchaseOrder })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreatePurchaseOrderDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete Purchase Order by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Deleted successfully' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm Purchase Order' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Purchase order confirmed' })
  async confirm(@Param('id') id: string) {
    return this.service.confirm(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel Purchase Order' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Purchase order cancelled' })
  async cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
