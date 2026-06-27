import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  try {
    const { data: e208 } = await supabase.from('elevators').select('id').eq('equipment_id', '208839').single()
    if (e208) {
      const { data: items } = await supabase.from('assembly_checklists').select('item_name').eq('elevator_id', e208.id)
      fs.writeFileSync('out.txt', `DOPPIO (SM2) has ${items?.length} assembly items:\n` + items?.map(i => i.item_name).join('\n'))
    }
  } catch (e) {
    fs.writeFileSync('out.txt', e.message)
  }
}
run()
