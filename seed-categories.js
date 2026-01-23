require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function main() {
    // Revert to simplest possible one, ensuring DATABASE_URL is in process.env
    const prisma = new PrismaClient();

    try {
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

        // Verify connection by doing a simple count
        await prisma.category.count();

        for (const catName of categories) {
            const category = await prisma.category.upsert({
                where: { name: catName },
                update: {},
                create: { name: catName },
            });
            console.log(`Created/Ensured category: ${catName} (ID: ${category.id})`);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
