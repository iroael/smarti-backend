import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  ApiTags,
  ApiResponse,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Order } from 'src/entities/order.entity';
import { Request } from 'express';
import { Req } from '@nestjs/common';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

@ApiTags('Orders')
@ApiBearerAuth() // Swagger support for JWT
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully', type: Order })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  // create(@Body() dto: CreateOrderDto): Promise<Order> {
  async create(@Body() dto: CreateOrderDto): Promise<{ order: Order; snapToken: string }> {
    return this.ordersService.create(dto);
  }

  @Get()
  @Roles(Role.Admin, Role.Customer)
  @ApiOperation({ summary: 'List all orders (admin) or own orders (customer)' })
  @ApiResponse({
    status: 200,
    description: 'List of orders',
    schema: {
      example: {
        data: [
          {
            id: 1,
            orderNumber: 'ORD-20250616-00001',
            orderDate: '2025-06-16T10:00:00.000Z',
            status: 'pending',
            total: 50000,
            customer: {
              id: 3,
              name: 'John Doe',
              email: 'john@example.com',
            },
            items: [
              {
                id: 1,
                quantity: 2,
                price: 25000,
                product: {
                  id: 1,
                  name: 'Product A',
                  price: 25000,
                },
              },
            ],
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden Resource' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  async findAll(@Req() req: Request) {
    const user = req.user as any;

    if (!user || !user.role) {
      throw new UnauthorizedException('Invalid token');
    }

    if (user.role === Role.Admin || user.role === Role.Superadmin) {
      return this.ordersService.findAll(); // Admin gets all orders
    }

    if (user.role === Role.Customer && user.customerId) {
      return this.ordersService.findAllByCustomer(user.customerId); // Customer gets only their orders
    }

    throw new UnauthorizedException('Role not allowed');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order found', type: Order })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Order> {
    return this.ordersService.findOne(id);
  }
}
