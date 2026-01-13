import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Create a default tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Auto-École Demo',
    },
  });

  console.log('✅ Created tenant:', tenant.name);

  // Create an admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@autoecole.com' },
    update: {},
    create: {
      email: 'admin@autoecole.com',
      password: hashedPassword,
      role: 'ADMIN',
      tenantId: tenant.id,
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Create an instructor user
  const instructorPassword = await bcrypt.hash('instructor123', 10);
  const instructorUser = await prisma.user.upsert({
    where: { email: 'instructor@autoecole.com' },
    update: {},
    create: {
      email: 'instructor@autoecole.com',
      password: instructorPassword,
      role: 'INSTRUCTOR',
      tenantId: tenant.id,
    },
  });

  console.log('✅ Created instructor user:', instructorUser.email);

  // Create a student user
  const studentPassword = await bcrypt.hash('student123', 10);
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@autoecole.com' },
    update: {},
    create: {
      email: 'student@autoecole.com',
      password: studentPassword,
      role: 'STUDENT',
      tenantId: tenant.id,
    },
  });

  console.log('✅ Created student user:', studentUser.email);

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
