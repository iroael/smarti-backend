import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrderPaymentService } from './order-payment.service';
import { CreateOrderPaymentDto } from './dto/create-order-payment.dto';
import { UpdateOrderPaymentDto } from './dto/update-order-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { OrderPayment } from 'src/entities/orders/order-payment.entity';

@ApiTags('Order Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('order-payments')
export class OrderPaymentController {
  constructor(private readonly orderPaymentService: OrderPaymentService) {}

  /**
   * ✅ Create Payment
   */
  @Post()
  @Roles(Role.Admin, Role.Customer)
  @ApiOperation({ summary: 'Create new order payment' })
  @ApiResponse({ status: 201, description: 'Payment created successfully', type: OrderPayment })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async create(@Body() createOrderPaymentDto: CreateOrderPaymentDto) {
    const result = await this.orderPaymentService.create(createOrderPaymentDto);
    return {
      success: true,
      message: 'Payment created successfully',
      data: result,
    };
  }

  /**
   * ✅ Get All Payments
   */
  @Get()
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'List all order payments (admin only)' })
  @ApiResponse({ status: 200, description: 'List of payments', type: [OrderPayment] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findAll() {
    const result = await this.orderPaymentService.findAll();
    return {
      success: true,
      message: 'Payments retrieved successfully',
      data: result,
    };
  }

  /**
   * ✅ Get Payment by ID
   */
  @Get(':id')
  @Roles(Role.Admin, Role.Customer)
  @ApiOperation({ summary: 'Get order payment by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Payment found', type: OrderPayment })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async findOne(@Param('id') id: number) {
    const result = await this.orderPaymentService.findOne(id);
    if (!result) throw new NotFoundException('Payment not found');

    return {
      success: true,
      message: 'Payment retrieved successfully',
      data: result,
    };
  }

  /**
   * ✅ Update Payment
   */
  @Patch(':id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Update order payment' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Payment updated successfully', type: OrderPayment })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async update(
    @Param('id') id: number,
    @Body() updateOrderPaymentDto: UpdateOrderPaymentDto,
  ) {
    const result = await this.orderPaymentService.update(id, updateOrderPaymentDto);
    return {
      success: true,
      message: 'Payment updated successfully',
      data: result,
    };
  }

  /**
   * ✅ Delete Payment
   */
  @Delete(':id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Delete order payment' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Payment deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: number) {
    await this.orderPaymentService.remove(id);
    return {
      success: true,
      message: 'Payment deleted successfully',
    };
  }
}
