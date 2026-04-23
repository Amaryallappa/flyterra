import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function check() {
  console.log('Checking Field 9...')
  const { data: field, error: fieldErr } = await supabase
    .from('fields')
    .select('*')
    .eq('field_id', 9)
    .single()
  
  if (fieldErr) {
    console.error('Field error:', fieldErr.message)
  } else {
    console.log('Field found:', field)
    
    if (field.station_id) {
      console.log(`Checking drones for station ${field.station_id}...`)
      const { data: drones, error: droneErr } = await supabase
        .from('drones')
        .select('*')
        .eq('station_id', field.station_id)
        .eq('status', 'Active')
      
      if (droneErr) {
        console.error('Drone error:', droneErr.message)
      } else {
        console.log('Active drones found:', drones)
      }
    } else {
      console.log('Field has no station_id assigned.')
    }
  }
}

check()
