import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findFirst({ where: { email: 'admin@senseihub.com' } });
  console.log('User exists?', !!user);
  if (user) {
    const isValid = await bcrypt.compare('admin123', user.password);
    console.log('Password valid?', isValid);
  }
}
test().then(() => process.exit(0));
