import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Addresses } from 'src/entities/address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(Addresses)
    private readonly addressRepo: Repository<Addresses>,
  ) {}

  async create(dto: CreateAddressDto): Promise<Addresses> {
    const address = this.addressRepo.create({ ...dto });
    return this.addressRepo.save(address);
  }

  async findByOwner(ownerId: number, ownerType: 'customer' | 'supplier'): Promise<Addresses[]> {
    return this.addressRepo.find({
      where: {
        ownerId,
        ownerType,
        is_deleted: false,
      },
    });
  }

  async setDefaultAddress(addressId: number): Promise<Addresses> {
    const address = await this.addressRepo.findOne({
      where: { id: addressId, is_deleted: false },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // Reset semua address lain dari owner ini ke false
    await this.addressRepo.update(
      {
        ownerId: address.ownerId,
        ownerType: address.ownerType,
        is_deleted: false,
      },
      { is_default: false },
    );

    // Set address ini jadi default
    address.is_default = true;
    return this.addressRepo.save(address);
  }

  async update(id: number, dto: UpdateAddressDto): Promise<Addresses> {
    const address = await this.addressRepo.findOne({
      where: { id, is_deleted: false },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    Object.assign(address, dto);
    return this.addressRepo.save(address);
  }

  async remove(id: number): Promise<{ message: string }> {
    const address = await this.addressRepo.findOne({
      where: { id, is_deleted: false },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    address.is_deleted = true;
    await this.addressRepo.save(address);

    return { message: 'Address has been soft-deleted' };
  }
}
