import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum'; // ✅ FIX HERE

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // console.log('RolesGuard: requiredRoles', requiredRoles);
    // console.log('RolesGuard: user', user);

    if (!requiredRoles) return true;

    return requiredRoles.includes(user.role); // match against Role.Customer, etc.
  }
}
