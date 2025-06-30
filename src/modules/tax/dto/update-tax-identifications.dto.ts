import { PartialType } from '@nestjs/mapped-types';
import { CreateTaxIdentificationDto } from './create-tax-identifications.dto';

export class UpdateTaxIdentificationDto extends PartialType(CreateTaxIdentificationDto) {}
