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
import { TaxIdentificationsService } from './tax-identifications.service';
import { CreateTaxIdentificationDto } from './dto/create-tax-identifications.dto';
import { UpdateTaxIdentificationDto } from './dto/update-tax-identifications.dto';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { TaxIdentification } from 'src/entities/tax-identifications.entity';

@ApiTags('Tax Identifications')
@ApiBearerAuth()
@Controller('tax-identifications')
export class TaxIdentificationsController {
  constructor(private readonly service: TaxIdentificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create Tax Identification' })
  @ApiResponse({ status: 201, description: 'Created successfully', type: TaxIdentification })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  create(@Body() dto: CreateTaxIdentificationDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get All Tax Identifications By Owner' })
  @ApiQuery({ name: 'ownerType', enum: ['customer', 'supplier'], required: true })
  @ApiQuery({ name: 'ownerId', type: Number, required: true })
  @ApiResponse({
    status: 200,
    description: 'List of tax identifications',
    type: [TaxIdentification],
  })
  findAllByOwner(
    @Query('ownerType') ownerType: 'customer' | 'supplier',
    @Query('ownerId') ownerId: number,
  ) {
    return this.service.findAllByOwner(ownerType, ownerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Tax Identification By ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Tax identification found',
    type: TaxIdentification,
  })
  @ApiResponse({ status: 404, description: 'Not Found' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update Tax Identification' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Updated successfully',
    type: TaxIdentification,
  })
  @ApiResponse({ status: 404, description: 'Not Found' })
  update(@Param('id') id: string, @Body() dto: UpdateTaxIdentificationDto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete Tax Identification' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Deleted successfully' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }

  // ✅ Set Primary
  @Patch(':id/set-primary')
  @ApiOperation({ summary: 'Set sebagai data pajak utama' })
  @ApiParam({ name: 'id', type: 'number', description: 'Tax Identification ID' })
  @ApiResponse({ status: 200, description: 'Berhasil set sebagai utama', type: CreateTaxIdentificationDto })
  @ApiResponse({ status: 404, description: 'Data tidak ditemukan' })
  async setPrimary(@Param('id') id: number) {
    return this.service.setPrimary(id);
  }

  // ✅ Toggle Active
  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle aktif/nonaktif data pajak' })
  @ApiParam({ name: 'id', type: 'number', description: 'Tax Identification ID' })
  @ApiResponse({ status: 200, description: 'Berhasil toggle aktif/nonaktif', type: CreateTaxIdentificationDto })
  @ApiResponse({ status: 404, description: 'Data tidak ditemukan' })
  async toggleActive(@Param('id') id: number) {
    return this.service.toggleActive(id);
  }
}
