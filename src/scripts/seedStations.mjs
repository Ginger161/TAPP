import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read env variables (crude parsing of .env.local)
const envPath = path.resolve(__dirname, '../../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim();
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const seedData = [
  {"name": "Ogbala station", "address": "Ogbala Izzi", "products": ["PMS", "AGO"], "manager": "Ikechukwu", "email": "kingofsabs@gmail.com"},
  {"name": "Ntezi station", "address": "Ntezi", "products": ["PMS", "AGO"], "manager": "Ebuka", "email": null},
  {"name": "ovudechi station", "address": "ovudechi", "products": ["PMS", "AGO"]},
  {"name": "Nwori station", "address": "Nwori", "products": ["PMS", "AGO"]},
  {"name": "Iziogo station", "address": "Iziogo", "products": ["PMS", "AGO"]},
  {"name": "Ezillo station", "address": "Ezillo", "products": ["PMS", "AGO"]},
  {"name": "135 station", "address": "135 Ezzamgbo", "products": ["PMS", "AGO"]},
  {"name": "Ezzamgbo station", "address": "Ezzamgbo", "products": ["PMS", "AGO"]},
  {"name": "Amasiri station", "address": "Amasiri", "products": ["PMS", "AGO"]},
  {"name": "Akpoha station", "address": "Akpoha", "products": ["PMS", "AGO"]},
  {"name": "Ikwo station", "address": "Ikwo", "products": ["PMS", "AGO"]},
  {"name": "Iboko station", "address": "Iboko", "products": ["PMS", "AGO"]},
  {"name": "Nwezenyi station 1", "address": "Nwezenyi", "products": ["PMS", "AGO"]},
  {"name": "Nwezenyi station 2", "address": "Nwanwu", "products": ["PMS", "AGO"]},
  {"name": "Nwezenyi station 3", "address": "Nwezenyi", "products": ["PMS", "AGO"]},
  {"name": "Onueke station", "address": "Onueke", "products": ["PMS", "AGO"]},
  {"name": "Echiaba station", "address": "Echiaba", "products": ["PMS", "AGO"]},
  {"name": "Nwofe station", "address": "Nwofe", "products": ["PMS", "AGO"]},
  {"name": "Benjoy station", "address": "Spare n deo", "products": ["PMS", "AGO"]},
  {"name": "Head office", "address": "Spare n deo", "products": ["PMS", "AGO"]}
];

async function seed() {
  console.log('Starting seed...');

  // 1. Ensure the user exists
  let managerId = null;
  const managerEmail = 'kingofsabs@gmail.com';
  
  // Try to find the user in auth.users by listing users
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.error('Error fetching users:', usersError);
  } else {
    const existingUser = usersData.users.find(u => u.email === managerEmail);
    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      managerId = existingUser.id;
    } else {
      console.log('Creating user:', managerEmail);
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: managerEmail,
        password: 'Password123!',
        email_confirm: true,
        user_metadata: { name: 'Ikechukwu' }
      });
      if (createError) {
        console.error('Error creating user:', createError);
      } else {
        console.log('User created:', newUser.user.id);
        managerId = newUser.user.id;
        
        // ensure user is in public.users table as manager
        await supabase.from('users').upsert({
          id: newUser.user.id,
          email: managerEmail,
          role: 'manager'
        });
      }
    }
  }

  // 2. Insert stations
  for (const station of seedData) {
    console.log(`Processing station: ${station.name}`);
    let mId = (station.email === managerEmail) ? managerId : null;

    // Check if manager_id column exists
    const rowData = {
      organization_id: '11111111-1111-1111-1111-111111111111',
      name: station.name,
      location: station.address,
    };
    
    const { data: insertedStation, error: insertError } = await supabase
      .from('stations')
      .insert(rowData)
      .select('id')
      .single();

    let stationId;
    
    if (insertError) {
      console.error(`Failed to insert station ${station.name}:`, insertError);
      continue;
    } else {
      stationId = insertedStation.id;
    }

    console.log(`Successfully inserted station ${station.name} with ID ${stationId}`);

    // If we have a managerId and it's this station, also insert into station_assignments just in case
    if (mId) {
      console.log(`Assigning manager ${mId} to station ${stationId}`);
      await supabase.from('station_assignments').insert({
        user_id: mId,
        station_id: stationId
      });
    }
  }

  console.log('Seed completed.');
}

seed().catch(console.error);
