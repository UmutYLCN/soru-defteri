import { PrismaClient } from '@prisma/client'

const testUrl = "postgresql://postgres.ankjeolvsleaxcbefuvg:.USMS10efsane@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: testUrl,
        },
    },
})

async function main() {
    try {
        console.log('Testing connection to NEW POOLER...')
        const categories = await prisma.category.findMany()
        console.log('Categories found:', categories.length)
        console.log('Connection successful!')
    } catch (error: any) {
        console.error('Connection failed:', error.message || error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
