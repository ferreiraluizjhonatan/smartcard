import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: e208 } = await supabase.from('elevators').select('id, status').eq('equipment_id', '208839').single()
  const { data: e215 } = await supabase.from('elevators').select('id, status').eq('equipment_id', '215195').single()
  
  if (e208) {
    const { count: c1 } = await supabase.from('pre_installation_checklists').select('*', { count: 'exact' }).eq('elevator_id', e208.id)
    const { count: c2 } = await supabase.from('assembly_checklists').select('*', { count: 'exact' }).eq('elevator_id', e208.id)
    const { count: c3 } = await supabase.from('adjustment_checklists').select('*', { count: 'exact' }).eq('elevator_id', e208.id)
    console.log('208839:', 'pre:', c1, 'assembly:', c2, 'adjust:', c3, 'status:', e208.status)
  }
  
  if (e215) {
    const { count: c1 } = await supabase.from('pre_installation_checklists').select('*', { count: 'exact' }).eq('elevator_id', e215.id)
    const { count: c2 } = await supabase.from('assembly_checklists').select('*', { count: 'exact' }).eq('elevator_id', e215.id)
    const { count: c3 } = await supabase.from('adjustment_checklists').select('*', { count: 'exact' }).eq('elevator_id', e215.id)
    console.log('215195:', 'pre:', c1, 'assembly:', c2, 'adjust:', c3, 'status:', e215.status)
  }
}
run()
