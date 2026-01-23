const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');

async function main() {
    const dbPath = `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`;
    const adapter = new PrismaBetterSqlite3({ url: dbPath });
    const prisma = new PrismaClient({ adapter });

    const categories = [
        "Ch06_Work and Kinetic Energy",
        "Ch07_Potential Energy and Energy Conservation",
        "Ch08_Momentum, Impulse, and Collisions",
        "Ch09_Rotation of Rigid Bodies",
        "Ch10_Dynamics of Rotational Motion",
        "Ch11_Equilibrium and Elasticity",
        "Ch14_Periodic Motion"
    ];

    console.log('Seeding categories...');

    const categoryMap = {};
    for (const catName of categories) {
        const category = await prisma.category.upsert({
            where: { name: catName },
            update: {},
            create: { name: catName },
        });
        categoryMap[catName] = category.id;
        console.log(`Created/Ensured category: ${catName} (ID: ${category.id})`);
    }

    const workEnergyId = categoryMap["Ch06_Work and Kinetic Energy"];

    console.log('Updating all existing questions to "Ch06_Work and Kinetic Energy"...');
    const updateResult = await prisma.question.updateMany({
        data: {
            categoryId: workEnergyId
        }
    });
    console.log(`Updated ${updateResult.count} questions.`);

    // Cleanup: Delete other categories that are not in our list
    console.log('Cleaning up unused categories...');
    const deletedCategories = await prisma.category.deleteMany({
        where: {
            NOT: {
                name: { in: categories }
            }
        }
    });
    console.log(`Deleted ${deletedCategories.count} old categories.`);

    await prisma.$disconnect();
}

main().catch(console.error);
