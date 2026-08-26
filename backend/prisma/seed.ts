import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando Seeding de Dados Estruturais...');

  const dojo = await prisma.dojo.create({
    data: {
      name: 'Dojo Principal - Matriz',
      president: 'Sensei Fundador'
    }
  });

  const password = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      dojoId: dojo.id,
      name: 'Administrador do Sistema',
      email: 'admin@senseihub.com',
      password,
      role: Role.ADMIN,
    }
  });

  const ranks = [
    { name: 'Faixa Branca (7º Kyu)', color: '#FFFFFF', minHours: 0, minDays: 0, sortOrder: 1 },
    { name: 'Faixa Amarela (6º Kyu)', color: '#FFD700', minHours: 40, minDays: 90, sortOrder: 2 },
    { name: 'Faixa Vermelha (5º Kyu)', color: '#FF0000', minHours: 60, minDays: 120, sortOrder: 3 },
    { name: 'Faixa Laranja (4º Kyu)', color: '#FF8C00', minHours: 80, minDays: 150, sortOrder: 4 },
    { name: 'Faixa Verde (3º Kyu)', color: '#008000', minHours: 100, minDays: 180, sortOrder: 5 },
    { name: 'Faixa Roxa (2º Kyu)', color: '#800080', minHours: 120, minDays: 200, sortOrder: 6 },
    { name: 'Faixa Marrom (1º Kyu)', color: '#8B4513', minHours: 140, minDays: 250, sortOrder: 7 },
    { name: 'Faixa Preta (1º Dan)', color: '#000000', minHours: 300, minDays: 365, sortOrder: 8 },
  ];

  for (const rank of ranks) {
    await prisma.rank.create({
      data: {
        dojoId: dojo.id,
        createdById: admin.id,
        updatedById: admin.id,
        ...rank,
      }
    });
  }

  console.log('✅ Seed finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
