import { PrismaClient, RoleName } from '@prisma/client';
import bcrypt from 'bcrypt';
import { PERMISSIONS, ROLE_PERMISSIONS } from '@estoque/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm },
      update: {},
      create: { key: perm, description: perm },
    });
  }

  const roles: { name: RoleName; description: string }[] = [
    { name: 'ADMIN', description: 'Administrador do sistema' },
    { name: 'GERENTE', description: 'Gerente da oficina' },
    { name: 'ESTOQUISTA', description: 'Responsável pelo estoque' },
    { name: 'FUNCIONARIO', description: 'Funcionário' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'ADMIN' } });
  const hashedPassword = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@oficina.local' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@oficina.local',
      password: hashedPassword,
      roleId: adminRole.id,
      active: true,
    },
  });

  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.userPermission.upsert({
      where: { userId_permissionId: { userId: admin.id, permissionId: perm.id } },
      update: { granted: true },
      create: { userId: admin.id, permissionId: perm.id, granted: true },
    });
  }

  const categories = ['Óleos', 'Filtros', 'Peças', 'Ferramentas', 'Fluidos', 'Acessórios'];
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  await prisma.stockLocation.upsert({
    where: { name: 'Almoxarifado Principal' },
    update: {},
    create: {
      name: 'Almoxarifado Principal',
      description: 'Localização padrão do estoque',
      isDefault: true,
    },
  });

  const settings = [
    { key: 'company_name', value: 'Oficina Automotiva' },
    { key: 'backup_auto_enabled', value: 'true' },
    { key: 'backup_auto_hour', value: '2' },
    { key: 'low_stock_alert_enabled', value: 'true' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log('✅ Seed concluído!');
  console.log('   Admin: admin@oficina.local / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
