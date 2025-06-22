import { Controller, Post, Body, Delete, Param, UseGuards } from '@nestjs/common';
import { AccessService } from './access.service';
import { CreateCustomerAccessDto } from './dto/create-customer-access.dto';
import { CreateSupplierAccessDto } from './dto/create-supplier-access.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

@ApiTags('Access')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('access')
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  @Post('customer')
  async giveCustomerAccess(@Body() dto: CreateCustomerAccessDto) {
    return this.accessService.giveCustomerAccess(dto.customerId, dto.supplierId);
  }

  @Delete('customer/:customerId/:supplierId')
  async removeCustomerAccess(
    @Param('customerId') customerId: number,
    @Param('supplierId') supplierId: number,
  ) {
    return this.accessService.removeCustomerAccess(+customerId, +supplierId);
  }

  @Post('supplier')
  async giveSupplierAccess(@Body() dto: CreateSupplierAccessDto) {
    return this.accessService.giveSupplierAccess(dto.viewerId, dto.targetId);
  }

  @Delete('supplier/:viewerId/:targetId')
  async removeSupplierAccess(
    @Param('viewerId') viewerId: number,
    @Param('targetId') targetId: number,
  ) {
    return this.accessService.removeSupplierAccess(+viewerId, +targetId);
  }
}
