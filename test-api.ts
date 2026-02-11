import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://ankjeolvsleaxcbefuvg.supabase.co"
const supabaseAnonKey = "sb_publishable_lzd4pvVRDVgToRakB5U3KA_tQnSwgXt"

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testApi() {
    console.log('Testing Supabase API connection...')
    const { data, error } = await supabase.from('Category').select('*').limit(1)

    if (error) {
        console.error('API Test Failed:', error)
    } else {
        console.log('API Test Successful! Data:', data)
    }
}

testApi()
