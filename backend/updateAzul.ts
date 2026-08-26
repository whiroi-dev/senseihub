import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.rank.updateMany({
    where: { name: { contains: 'Faixa Azul' } },
    data: { phrase: 'A fluidez e a imensidão do céu e do mar. Sua técnica se torna mais fluida e o espírito mais sereno.', color: '#0000FF' }
  });
}
main().then(() => process.exit(0));
