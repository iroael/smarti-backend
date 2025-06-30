import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { CreateShippingDto } from './dto/create-shipping.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';
import { Shipping } from 'src/entities/shipping.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Shipping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shippings')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post()
  @ApiOperation({ summary: 'Create new shipping record' })
  @ApiResponse({
    status: 201,
    description: 'Shipping created successfully',
    type: Shipping,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  create(@Body() dto: CreateShippingDto) {
    return this.shippingService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all shipping records' })
  @ApiResponse({
    status: 200,
    description: 'List of shipping records',
    type: [Shipping],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll() {
    const shipping = await this.shippingService.findAll();
    return { data: shipping };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shipping record by ID' })
  @ApiResponse({
    status: 200,
    description: 'Shipping record found',
    type: Shipping,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Shipping not found' })
  findOne(@Param('id') id: string) {
    return this.shippingService.findOne(+id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update shipping record by ID' })
  @ApiResponse({
    status: 200,
    description: 'Shipping updated successfully',
    type: Shipping,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Shipping not found' })
  update(@Param('id') id: string, @Body() dto: UpdateShippingDto) {
    return this.shippingService.update(+id, dto);
  }

  @Get('/getByOrder/:orderId')
  @ApiOperation({ summary: 'Get shipping by order ID' })
  @ApiResponse({ status: 200, description: 'Shipping record(s) found' })
  @ApiResponse({ status: 404, description: 'Shipping record not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  findByOrderId(@Param('orderId') orderId: string) {
    return this.shippingService.findByOrderId(orderId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete shipping record by ID' })
  @ApiResponse({ status: 200, description: 'Shipping deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Shipping not found' })
  remove(@Param('id') id: string) {
    return this.shippingService.remove(+id);
  }
}
