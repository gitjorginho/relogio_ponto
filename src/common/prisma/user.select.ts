import { Prisma } from '@prisma/client';

export const scheduleSelect = {
  id: true,
  startTime: true,
  endTime: true,
  breakMinutes: true,
  workdays: true,
  toleranceMinutes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WorkScheduleSelect;

export const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  registration: true,
  document: true,
  department: true,
  position: true,
  phone: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  schedule: { select: scheduleSelect },
} satisfies Prisma.UserSelect;

export const userListSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  registration: true,
  department: true,
  position: true,
  phone: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
  schedule: { select: scheduleSelect },
} satisfies Prisma.UserSelect;
