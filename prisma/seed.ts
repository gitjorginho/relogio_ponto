import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const name = process.env.DEFAULT_ADMIN_NAME || 'Administrador';
  const email = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@relogioponto.com').toLowerCase();
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@12345';
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log(`Usuário administrador já existe: ${email}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, rounds);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: 'ADMIN',
      registration: 'ADMIN-0001',
      department: 'Administrativo',
      position: 'Administrador',
      active: true,
      schedule: {
        create: {},
      },
    },
  });

  console.log(`Administrador criado com sucesso: ${user.email}`);
  console.log('Altere a senha padrão após o primeiro acesso.');
}

main()
  .catch((error) => {
    console.error('Erro ao executar seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
