import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

async function main() {
  try {
    logger.info('🌱 Starting database seeding...');

    // Create default super admin
    const defaultAdminPhone = '+12603486805';
    const defaultAdminPassword = 'Pass123$1';

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { phone: defaultAdminPhone },
    });

    if (existingAdmin) {
      logger.info('✅ Default admin already exists, skipping...');
    } else {
      // Hash the password
      const hashedPassword = await bcrypt.hash(defaultAdminPassword, 12);

      // Create the admin user
      const admin = await prisma.user.create({
        data: {
          name: 'Joel Adu',
          phone: defaultAdminPhone,
          role: 'ADMIN',
          passwordHash: hashedPassword,
        },
      });

      logger.info(`✅ Created default admin: ${admin.phone}`);
    }

    // Create sample positions if they don't exist
    const existingPositions = await prisma.position.count();
    if (existingPositions === 0) {
      logger.info('📝 Creating sample election positions...');

      // Get the admin user to use as creator
      const adminUser = await prisma.user.findUnique({
        where: { phone: defaultAdminPhone },
      });

      if (!adminUser) {
        throw new Error('Admin user not found for election creation');
      }

      // Create a test election that's always active for development
      const now = new Date();
      const election = await prisma.election.create({
        data: {
          title: 'AGOSA Elections 2025',
          description: 'Annual General Meeting and Elections for AGOSA (Test Election)',
          startAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Started 1 day ago
          endAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // Ends 30 days from now
          timezone: 'Africa/Accra',
          status: 'ACTIVE',
          visibility: 'PUBLIC',
          allowAbstain: true,
          createdBy: adminUser.id,
        },
      });

      // Create sample positions
      const positions = [
        { name: 'President', order: 1 },
        { name: 'Vice President', order: 2 },
        { name: 'Secretary', order: 3 },
        { name: 'Assistant Secretary', order: 4 },
        { name: 'Treasurer', order: 5 },
        { name: 'Financial Secretary', order: 6 },
        { name: 'Organizing Secretary', order: 7 },
        { name: 'Assistant Organizing Secretary', order: 8 },
        { name: 'PRO', order: 9 },
      ];

      const createdPositions = [];
      for (const position of positions) {
        const createdPosition = await prisma.position.create({
          data: {
            ...position,
            electionId: election.id,
            isActive: true,
          },
        });
        createdPositions.push(createdPosition);
      }

      logger.info(`✅ Created ${positions.length} sample positions`);

      // Create sample candidates for each position
      logger.info('👥 Creating sample candidates...');

      const sampleCandidates = {
        'President': [
          { fullName: 'John Doe', classYearGroup: 'Class of 2024', bio: 'Experienced leader with vision for change' },
          { fullName: 'Jane Smith', classYearGroup: 'Class of 2025', bio: 'Passionate about student welfare' },
        ],
        'Vice President': [
          { fullName: 'Alice Johnson', classYearGroup: 'Class of 2024', bio: 'Dedicated to serving the community' },
          { fullName: 'Bob Wilson', classYearGroup: 'Class of 2025', bio: 'Fresh ideas for modern challenges' },
        ],
        'Secretary': [
          { fullName: 'Carol Brown', classYearGroup: 'Class of 2024', bio: 'Detail-oriented and organized' },
          { fullName: 'David Lee', classYearGroup: 'Class of 2025', bio: 'Strong communication skills' },
        ],
        'Treasurer': [
          { fullName: 'Emma Davis', classYearGroup: 'Class of 2024', bio: 'Financial expertise and transparency' },
          { fullName: 'Frank Miller', classYearGroup: 'Class of 2025', bio: 'Committed to fiscal responsibility' },
        ],
      };

      let candidateCount = 0;
      for (const position of createdPositions) {
        const candidates = sampleCandidates[position.name as keyof typeof sampleCandidates];
        if (candidates) {
          for (let i = 0; i < candidates.length; i++) {
            await prisma.candidate.create({
              data: {
                ...candidates[i],
                electionId: election.id,
                positionId: position.id,
                order: i + 1,
                isActive: true,
              },
            });
            candidateCount++;
          }
        }
      }

      logger.info(`✅ Created ${candidateCount} sample candidates`);
    } else {
      // Check if we need to create candidates for existing positions
      const existingCandidates = await prisma.candidate.count();
      if (existingCandidates === 0) {
        logger.info('👥 Creating sample candidates for existing positions...');

        // Get the first election and its positions
        const election = await prisma.election.findFirst({
          include: { positions: true }
        });

        if (election) {
          const sampleCandidates = {
            'President': [
              { fullName: 'John Doe', classYearGroup: 'Class of 2024', bio: 'Experienced leader with vision for change' },
              { fullName: 'Jane Smith', classYearGroup: 'Class of 2025', bio: 'Passionate about student welfare' },
            ],
            'Vice President': [
              { fullName: 'Alice Johnson', classYearGroup: 'Class of 2024', bio: 'Dedicated to serving the community' },
              { fullName: 'Bob Wilson', classYearGroup: 'Class of 2025', bio: 'Fresh ideas for modern challenges' },
            ],
            'Secretary': [
              { fullName: 'Carol Brown', classYearGroup: 'Class of 2024', bio: 'Detail-oriented and organized' },
              { fullName: 'David Lee', classYearGroup: 'Class of 2025', bio: 'Strong communication skills' },
            ],
            'Treasurer': [
              { fullName: 'Emma Davis', classYearGroup: 'Class of 2024', bio: 'Financial expertise and transparency' },
              { fullName: 'Frank Miller', classYearGroup: 'Class of 2025', bio: 'Committed to fiscal responsibility' },
            ],
          };

          let candidateCount = 0;
          for (const position of election.positions) {
            const candidates = sampleCandidates[position.name as keyof typeof sampleCandidates];
            if (candidates) {
              for (let i = 0; i < candidates.length; i++) {
                await prisma.candidate.create({
                  data: {
                    ...candidates[i],
                    electionId: election.id,
                    positionId: position.id,
                    order: i + 1,
                    isActive: true,
                  },
                });
                candidateCount++;
              }
            }
          }

          logger.info(`✅ Created ${candidateCount} sample candidates for existing positions`);
        }
      }
    }

    // Create sample notification schedules
    const existingSchedules = await prisma.notificationSchedule.count();
    if (existingSchedules === 0) {
      logger.info('📅 Creating default notification schedules...');

      const elections = await prisma.election.findMany();
      if (elections.length > 0) {
        const election = elections[0];

        const schedules = [
          {
            type: 'VOTE_OPEN' as const,
            sendAt: election.startAt,
            templateId: 'vote_open',
          },
          {
            type: 'VOTE_MIDWAY' as const,
            sendAt: new Date(election.startAt.getTime() + (election.endAt.getTime() - election.startAt.getTime()) / 2),
            templateId: 'vote_midway',
          },
          {
            type: 'VOTE_NEAR_END' as const,
            sendAt: new Date(election.endAt.getTime() - 4 * 60 * 60 * 1000), // 4 hours before end
            templateId: 'vote_near_end',
          },
          {
            type: 'VOTE_END' as const,
            sendAt: election.endAt,
            templateId: 'vote_end',
          },
        ];

        for (const schedule of schedules) {
          await prisma.notificationSchedule.create({
            data: {
              ...schedule,
              electionId: election.id,
            },
          });
        }

        logger.info(`✅ Created ${schedules.length} notification schedules`);
      }
    }

    logger.info('🎉 Database seeding completed successfully!');
    logger.info('');
    logger.info('📋 Default Credentials:');
    logger.info(`   Phone: ${defaultAdminPhone}`);
    logger.info(`   Password: ${defaultAdminPassword}`);
    logger.info('');
    logger.info('⚠️  IMPORTANT: Change the default admin password after first login!');

  } catch (error) {
    logger.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });