import { IsEmail, IsEnum, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from 'src/common/enums/role.enum';

export class CreateAccountDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Nama lengkap user',
  })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'johndoe',
    description: 'Username untuk login',
  })
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'Email yang valid dan unik',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'SecureP@ss123',
    description: 'Password minimal 6 karakter',
  })
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: Role.Admin,
    enum: Role,
    description: 'Peran pengguna dalam sistem',
  })
  @IsEnum(Role)
  role: Role;
}
