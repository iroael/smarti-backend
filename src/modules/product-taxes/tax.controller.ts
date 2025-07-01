// src/tax/tax.controller.ts
import {
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TaxService } from './tax.service';
import { Tax } from 'src/entities/tax.entity';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateProductTaxDto } from './dto/update-tax.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';


@ApiTags('Product Tax')
@ApiBearerAuth() // ← Tambahkan ini untuk Swagger bearer token input
@UseGuards(JwtAuthGuard) // ← Guard JWT agar Swagger bisa simulasikan auth
@Controller('taxes')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tax' })
  @ApiResponse({ status: 201, description: 'Tax successfully created', type: Tax })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  create(@Body() createTaxDto: CreateTaxDto) {
    return this.taxService.create(createTaxDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all taxes' })
  @ApiResponse({ status: 200, description: 'List of taxes', type: [Tax] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  async findAll() {
    const taxes = await this.taxService.findAll();
    return {
      data: taxes, // ✅ Format sesuai kebutuhan frontend
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tax by ID' })
  @ApiResponse({ status: 200, description: 'Tax found', type: Tax })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tax not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  findOne(@Param('id') id: string) {
    return this.taxService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tax by ID' })
  @ApiResponse({ status: 200, description: 'Tax updated successfully', type: Tax })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tax not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  update(@Param('id') id: string, @Body() updateTaxDto: UpdateProductTaxDto) {
    return this.taxService.update(+id, updateTaxDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete tax by ID' })
  @ApiResponse({ status: 200, description: 'Tax deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tax not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  remove(@Param('id') id: string) {
    return this.taxService.remove(+id);
  }
}
