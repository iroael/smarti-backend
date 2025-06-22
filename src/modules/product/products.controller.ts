import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ProductService, ProductViewType } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Products not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiResponse({ status: 501, description: 'Service Unavailable' })
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  /**
   * MENU PRODUCT SAYA - Menampilkan produk milik supplier sendiri
   */
  @Get('my')
  @ApiOperation({ summary: 'Get my products (supplier only)' })
  @ApiResponse({ status: 200, description: 'List of my products' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Products not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findMyProducts(@Request() req) {
    const user = req.user;
    console.log('📥 [my-products] User:', user);

    return this.productService.findProducts(user, {
      viewType: ProductViewType.MY_PRODUCTS
    });
  }

  /**
   * MENU KATALOG - Menampilkan produk dari supplier lain berdasarkan akses
   */
  @Get('catalog')
  @ApiOperation({ summary: 'Get catalog products (based on access permissions)' })
  @ApiResponse({ status: 200, description: 'List of catalog products' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Products not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findCatalogProducts(@Request() req) {
    const user = req.user;
    console.log('📥 [catalog] User:', user);

    return this.productService.findProducts(user, {
      viewType: ProductViewType.CATALOG
    });
  }

  /**
   * ORIGINAL ENDPOINT - Untuk backward compatibility
   * Default behavior: MY_PRODUCTS untuk supplier, CATALOG untuk customer
   */
  @Get()
  @ApiOperation({ summary: 'Get products (default behavior by role)' })
  @ApiResponse({ status: 200, description: 'List of products' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Products not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiResponse({ status: 501, description: 'Service Unavailable' })
  @ApiQuery({ name: 'view', required: false, enum: ['my', 'catalog', 'all'], description: 'View type for products' })
  @ApiQuery({ name: 'supplier', required: false, type: 'number', description: 'Specific supplier ID' })
  async findAll(
    @Request() req,
    @Query('view') view?: string,
    @Query('supplier') supplier?: string
  ) {
    const user = req.user;
    console.log('📥 [findAll] User:', user, 'Query params:', { view, supplier });

    // Jika ada query parameter, gunakan itu
    if (view || supplier) {
      let viewType = ProductViewType.MY_PRODUCTS;
      let specificSupplierId: number | undefined;

      if (view === 'catalog') {
        viewType = ProductViewType.CATALOG;
      } else if (view === 'all') {
        viewType = ProductViewType.ALL;
      } else if (view === 'supplier' && supplier) {
        viewType = ProductViewType.SPECIFIC_SUPPLIER;
        specificSupplierId = +supplier;
      }

      return this.productService.findProducts(user, {
        viewType,
        specificSupplierId
      });
    }

    // Default behavior berdasarkan role
    const defaultViewType = user.role === Role.Supplier 
      ? ProductViewType.MY_PRODUCTS 
      : ProductViewType.CATALOG;

    return this.productService.findProducts(user, {
      viewType: defaultViewType
    });
  }

  /**
   * ADMIN ONLY - Get all products
   */
  @Get('admin/all')
  @Roles(Role.Admin) // Assuming you have Admin role
  @ApiOperation({ summary: 'Get all products (admin only)' })
  @ApiResponse({ status: 200, description: 'List of all products' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findAllForAdmin(@Request() req) {
    const user = req.user;
    console.log('📥 [admin-all] User:', user);

    return this.productService.findProducts(user, {
      viewType: ProductViewType.ALL
    });
  }

  /**
   * Get products from specific supplier (with access validation)
   */
  @Get('supplier/:supplierId')
  @ApiOperation({ summary: 'Get products from specific supplier' })
  @ApiResponse({ status: 200, description: 'List of products from supplier' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied to this supplier' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findProductsBySupplier(
    @Param('supplierId', ParseIntPipe) supplierId: number,
    @Request() req
  ) {
    const user = req.user;
    console.log('📥 [supplier-specific] User:', user, 'Supplier ID:', supplierId);

    return this.productService.findProducts(user, {
      viewType: ProductViewType.SPECIFIC_SUPPLIER,
      specificSupplierId: supplierId
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Products not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiResponse({ status: 501, description: 'Service Unavailable' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Products not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiResponse({ status: 501, description: 'Service Unavailable' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Products not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiResponse({ status: 501, description: 'Service Unavailable' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productService.remove(id);
  }
}