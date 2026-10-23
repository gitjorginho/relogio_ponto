import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  registration: string | null;
  department: string | null;
  position: string | null;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}
