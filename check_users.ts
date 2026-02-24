import { createClient } from './lib/supabase-server'

async function main() {
    const supabase = await createClient()
    const { data: users, error } = await supabase
        .from('User')
        .select('id, name, email, totalCreditsUsed')
    
    if (error) {
        console.error('Error:', error)
        return
    }
    
    console.log('Total users in DB:', users.length)
    users.forEach(u => console.log(`ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Credits Used: ${u.totalCreditsUsed}`))
}

main()
