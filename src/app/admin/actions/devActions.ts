'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function resetTestData() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Unauthorized');
  }

  const supabase = await createClient();

  // Supabase delete requires at least one filter. We use not.is.null on id which covers all rows.
  const tables = ['corrections', 'expenses', 'sales_transactions', 'supply_transactions'];
  
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().not('id', 'is', null);
    if (error) {
      console.error(`Failed to clear table ${table}:`, error);
      return { success: false, error: error.message };
    }
  }

  revalidatePath('/', 'layout');
  return { success: true };
}
