import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Addresses } from 'src/entities/address.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

@ApiTags('Address')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  @Roles(Role.Admin, Role.Customer, Role.Supplier)
  @ApiOperation({ summary: 'Create new address' })
  @ApiBody({ type: CreateAddressDto })
  @ApiResponse({ status: 201, description: 'Address created', type: Addresses })
  create(@Body() dto: CreateAddressDto) {
    return this.addressService.create(dto);
  }

  @Get(':id')
  @Roles(Role.Admin, Role.Customer, Role.Supplier)
  @ApiOperation({ summary: 'Get address by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Address found', type: Addresses })
  @ApiResponse({ status: 404, description: 'Address not found' })
  getById(@Param('id') id: number) {
    return this.addressService.getById(id);
  }

  @Patch(':id')
  @Roles(Role.Admin, Role.Customer, Role.Supplier)
  @ApiOperation({ summary: 'Update address by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateAddressDto })
  @ApiResponse({ status: 200, description: 'Address updated', type: Addresses })
  @ApiResponse({ status: 404, description: 'Address not found' })
  update(@Param('id') id: number, @Body() dto: UpdateAddressDto) {
    return this.addressService.update(id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get addresses by ownerId and ownerType' })
  @ApiQuery({ name: 'ownerId', type: Number })
  @ApiQuery({ name: 'ownerType', enum: ['customer', 'supplier'] })
  findByOwner(
    @Query('ownerId') ownerId: number,
    @Query('ownerType') ownerType: 'customer' | 'supplier',
  ) {
    return this.addressService.findByOwner(ownerId, ownerType);
  }

  @Patch(':id/set-default')
  @ApiOperation({ summary: 'Set address as default for a user/supplier' })
  @ApiResponse({ status: 200, description: 'Address updated as default.' })
  @ApiResponse({ status: 404, description: 'Address not found.' })
  setDefault(@Param('id') id: number) {
    return this.addressService.setDefaultAddress(id);
  }


  @Delete(':id')
  @Roles(Role.Admin, Role.Customer, Role.Supplier)
  @ApiOperation({ summary: 'Soft delete address by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Address soft deleted' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  @HttpCode(HttpStatus.OK)
  delete(@Param('id') id: number) {
    return this.addressService.remove(id);
  }
}
