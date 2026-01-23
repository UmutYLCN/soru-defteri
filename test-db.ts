import 'dotenv/config';
import { prisma } from './lib/prisma';

async function main() {
    try {
        const count = await prisma.question.count();
        console.log('Database connection successful. Question count:', count);
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
