import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim();
  }
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: sales, error: err1 } = await supabase.from('sales_transactions').select('*').limit(1);
  console.log("sales_transactions", sales ? Object.keys(sales[0] || {}) : err1);
  const { data: dips, error: err2 } = await supabase.from('daily_dips').select('*').limit(1);
  console.log("daily_dips", dips ? Object.keys(dips[0] || {}) : err2);
  const { data: exp, error: err3 } = await supabase.from('expenses').select('*').limit(1);
  console.log("expenses", exp ? Object.keys(exp[0] || {}) : err3);
}
check();
