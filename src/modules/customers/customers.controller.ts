import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Put,
  Delete,
  Patch,
  NotFoundException,
  UseGuards,
  ParseIntPipe,
  Request,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { Customer } from '../../entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { AddCustomerAddressDto } from './dto/add-customer-address.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  private readonly logger = new Logger(CustomersController.name);

  constructor(private readonly customersService: CustomersService) {}

  private sanitizeCustomer(customer: Customer) {
    // const { customer_id, ...rest } = customer;
    return customer;
  }

  private validateAccess(requestUser: any, targetUserId: number) {
    if (requestUser.role !== Role.Admin && requestUser.customerId !== targetUserId) {
      this.logger.warn(`Unauthorized access attempt by user ${requestUser.customerId}`);
      throw new ForbiddenException('Access denied');
    }
  }

  @Get()
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Get all customers (admin only)' })
  @ApiResponse({ status: 200, description: 'List of customers', type: [Customer] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll() {
    const customers = await this.customersService.findAll();
    return { data: customers.map(this.sanitizeCustomer) };
  }

  @Get('me')
  @Roles(Role.Customer)
  @ApiOperation({ summary: 'Get currently logged-in customer' })
  @ApiResponse({ status: 200, description: 'Current customer', type: Customer })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@Request() req) {
    const customer = await this.customersService.findOne(req.user.customerId);
    if (!customer) throw new NotFoundException('Customer not found');

    // Ambil addresses yang is_deleted = false
    const addresses = await this.customersService.getActiveAddresses(customer.id);

    // Gantikan addresses yang lama
    customer.addresses = addresses;
    return {data : this.sanitizeCustomer(customer)};
  }

  @Get(':id')
  @Roles(Role.Admin, Role.Customer)
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer found', type: Customer })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.validateAccess(req.user, id);
    const customer = await this.customersService.findOne(id);
    if (!customer) throw new NotFoundException('Customer not found');
    return this.sanitizeCustomer(customer);
  }

  @Post()
  @ApiOperation({ summary: 'Create new customer' })
  @ApiResponse({ status: 201, description: 'Customer created', type: Customer })
  async create(@Body() dto: CreateCustomerDto) {
    const customer = await this.customersService.create(dto);
    return this.sanitizeCustomer(customer);
  }

  @Put(':id')
  @Roles(Role.Admin, Role.Customer)
  @ApiOperation({ summary: 'Update customer by ID' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer updated', type: Customer })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
    @Request() req,
  ) {
    this.validateAccess(req.user, id);
    const existing = this.customersService.findOne(id);
    if (!existing) throw new NotFoundException('Customer not found');
    const updated = this.customersService.update(id, dto);
    return updated;
  }

  @Delete(':id')
  @Roles(Role.Admin, Role.Customer)
  @ApiOperation({ summary: 'Delete customer by ID' })
  @ApiResponse({ status: 200, description: 'Customer deleted' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.validateAccess(req.user, id);
    const existing = this.customersService.findOne(id);
    if (!existing) throw new NotFoundException('Customer not found');
    return this.customersService.remove(id);
  }

  @Post(':id/addresses')
  @Roles(Role.Admin, Role.Customer)
  @ApiOperation({ summary: 'Add a new address for customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 201, description: 'Address added' })
  async addAddress(
    @Param('id', ParseIntPipe) customerId: number,
    @Body() dto: AddCustomerAddressDto,
    @Request() req,
  ) {
    this.validateAccess(req.user, customerId);
    return this.customersService.addAddress(customerId, dto);
  }

  @Patch(':customerId/addresses/:addressId/default')
  @Roles(Role.Admin, Role.Customer)
  @ApiOperation({ summary: 'Set customer address as default' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiParam({ name: 'addressId', description: 'Address ID' })
  @ApiResponse({ status: 200, description: 'Default address updated' })
  async setDefaultAddress(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Param('addressId', ParseIntPipe) addressId: number,
    @Request() req,
  ) {
    this.validateAccess(req.user, customerId);
    return this.customersService.setDefaultAddress(customerId, addressId);
  }

  @Delete('addresses/:id')
  @Roles(Role.Admin, Role.Customer)
  @ApiOperation({ summary: 'Soft delete a customer address' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({ status: 200, description: 'Address soft-deleted' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async softDeleteAddress(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.customersService.softDelete(id);
  }
}
