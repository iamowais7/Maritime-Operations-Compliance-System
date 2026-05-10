import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const ships = await Promise.all([
    prisma.ship.upsert({
      where: { imoNumber: '9876543' },
      update: {},
      create: { name: 'MV Ocean Pioneer', imoNumber: '9876543', type: 'Cargo', flag: 'Panama' },
    }),
    prisma.ship.upsert({
      where: { imoNumber: '1234567' },
      update: {},
      create: { name: 'MV Sea Voyager', imoNumber: '1234567', type: 'Tanker', flag: 'Liberia' },
    }),
    prisma.ship.upsert({
      where: { imoNumber: '5555555' },
      update: {},
      create: { name: 'MV Arctic Explorer', imoNumber: '5555555', type: 'Research', flag: 'Norway' },
    }),
  ]);

  const adminHash = await bcrypt.hash('admin123', 12);
  const crewHash = await bcrypt.hash('crew123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@maritime.com' },
    update: {},
    create: { name: 'Captain Admin', email: 'admin@maritime.com', passwordHash: adminHash, role: 'ADMIN' },
  });

  const crew1 = await prisma.user.upsert({
    where: { email: 'john@maritime.com' },
    update: {},
    create: { name: 'John Mariner', email: 'john@maritime.com', passwordHash: crewHash, role: 'CREW', shipId: ships[0].id },
  });

  const crew2 = await prisma.user.upsert({
    where: { email: 'sarah@maritime.com' },
    update: {},
    create: { name: 'Sarah Sailor', email: 'sarah@maritime.com', passwordHash: crewHash, role: 'CREW', shipId: ships[0].id },
  });

  const crew3 = await prisma.user.upsert({
    where: { email: 'mike@maritime.com' },
    update: {},
    create: { name: 'Mike Navigator', email: 'mike@maritime.com', passwordHash: crewHash, role: 'CREW', shipId: ships[1].id },
  });

  const now = new Date();
  const tasks = [
    {
      title: 'Engine Room Inspection',
      description: 'Perform comprehensive engine room inspection including oil levels, belt conditions, and cooling systems.',
      shipId: ships[0].id,
      assignedToId: crew1.id,
      createdById: admin.id,
      dueDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      priority: 'HIGH',
      status: 'PENDING' as const,
    },
    {
      title: 'Fire Suppression System Check',
      description: 'Test all fire suppression systems including sprinklers, CO2 systems, and extinguishers.',
      shipId: ships[0].id,
      assignedToId: crew2.id,
      createdById: admin.id,
      dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      priority: 'HIGH',
      status: 'IN_PROGRESS' as const,
    },
    {
      title: 'Hull Maintenance',
      description: 'Inspect and clean hull, check for corrosion and damage.',
      shipId: ships[0].id,
      assignedToId: crew1.id,
      createdById: admin.id,
      dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      priority: 'MEDIUM',
      status: 'COMPLETED' as const,
      completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Navigation Equipment Calibration',
      description: 'Calibrate GPS, radar, and sonar equipment. Verify AIS transponder.',
      shipId: ships[1].id,
      assignedToId: crew3.id,
      createdById: admin.id,
      dueDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      priority: 'CRITICAL',
      status: 'IN_PROGRESS' as const,
    },
    {
      title: 'Life Raft Inspection',
      description: 'Inspect all life rafts, check inflation mechanisms and emergency supplies.',
      shipId: ships[1].id,
      assignedToId: crew3.id,
      createdById: admin.id,
      dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      priority: 'HIGH',
      status: 'PENDING' as const,
    },
    {
      title: 'Ballast System Maintenance',
      description: 'Clean and inspect ballast tanks, test pumps and valves.',
      shipId: ships[2].id,
      assignedToId: null,
      createdById: admin.id,
      dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      priority: 'LOW',
      status: 'PENDING' as const,
    },
  ];

  for (const task of tasks) {
    await prisma.maintenanceTask.create({ data: task });
  }

  const drills = [
    {
      title: 'Monthly Fire Drill',
      type: 'FIRE_DRILL' as const,
      shipId: ships[0].id,
      scheduledDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      createdById: admin.id,
      description: 'Mandatory monthly fire drill for all crew members.',
    },
    {
      title: 'Evacuation Exercise',
      type: 'EVACUATION' as const,
      shipId: ships[0].id,
      scheduledDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      createdById: admin.id,
      description: 'Full ship evacuation drill including muster stations.',
    },
    {
      title: 'Man Overboard Drill',
      type: 'MAN_OVERBOARD' as const,
      shipId: ships[1].id,
      scheduledDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      createdById: admin.id,
      description: 'Rescue procedures for man overboard scenario.',
    },
    {
      title: 'Lifeboat Deployment',
      type: 'LIFEBOAT' as const,
      shipId: ships[1].id,
      scheduledDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      createdById: admin.id,
      description: 'Full lifeboat deployment and recovery exercise.',
    },
    {
      title: 'Oil Spill Response Drill',
      type: 'OIL_SPILL' as const,
      shipId: ships[2].id,
      scheduledDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      createdById: admin.id,
      description: 'Emergency response to oil spill scenario.',
    },
  ];

  const createdDrills = [];
  for (const drill of drills) {
    const d = await prisma.safetyDrill.create({ data: drill });
    createdDrills.push(d);
  }

  await prisma.drillAttendance.create({
    data: { drillId: createdDrills[0].id, userId: crew1.id, attended: true, completedAt: new Date() },
  });
  await prisma.drillAttendance.create({
    data: { drillId: createdDrills[0].id, userId: crew2.id, attended: true, completedAt: new Date() },
  });

  console.log('Seed complete!');
  console.log('Admin: admin@maritime.com / admin123');
  console.log('Crew:  john@maritime.com / crew123');
  console.log('Crew:  sarah@maritime.com / crew123');
  console.log('Crew:  mike@maritime.com / crew123');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
