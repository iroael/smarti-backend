import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Logger,
  HttpStatus,
  NotFoundException,
  UseGuards,
  Res,
  Req,
} from '@nestjs/common';
import { AccurateService } from './accurate.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { CreateItemDto } from './dto/create-item.dto';

@ApiTags('Accurate')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accurate')
export class AccurateController {
  private readonly logger = new Logger(AccurateController.name);

  constructor(private readonly accurateService: AccurateService) {}

  /**
   * ✅ Get Accurate Auth Info
   */
  @Get('auth-info')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Get Accurate Auth Info from Bearer Token' })
  @ApiQuery({ name: 'token', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Auth info retrieved' })
  @ApiResponse({ status: 400, description: 'Token is required' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (role)' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async getAuthInfo(
    @Query('token') token: string,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<any> {
    if (!token) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Token is required',
      });
    }

    try {
      const data = await this.accurateService.getAuthInfo(token);

      if (!data) {
        throw new NotFoundException('Auth info not found');
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Auth info retrieved successfully',
        data,
      });
    } catch (error) {
      this.logger.error(
        `❌ Error getting auth info (user: ${req.user})`,
        error.stack || error.message,
      );

      return res
        .status(error?.status || HttpStatus.INTERNAL_SERVER_ERROR)
        .json({
          success: false,
          message: error.message || 'Internal server error',
        });
    }
  }

  /**
   * ✅ Save Group Item
   */
  @Post('item/save')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Save Group Item to Accurate' })
  @ApiBody({ type: CreateItemDto })
  async createGroupItem(@Body() dto: CreateItemDto, @Req() req) {
    console.log('🚀 RAW BODY:', req.body); // 👈 Tampilkan raw payload
    console.log('📦 DTO:', dto); // 👈 Harusnya hasil dari transformasi
    console.log('✅ instanceof CreateItemDto:', dto instanceof CreateItemDto);

    const result = await this.accurateService.saveItem(dto);
    return {
      success: true,
      message: 'Group item saved to Accurate',
      data: result,
    };
  }
}
