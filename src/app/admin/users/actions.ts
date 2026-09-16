'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

export async function createUser(formData: FormData) {
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  
  if (!currentUser) return { success: false, error: 'Unauthorized' }

  // Check if current user is admin and super_admin
  const { data: roleData } = await supabase
    .from('users')
    .select('role, is_super_admin')
    .eq('id', currentUser.id)
    .single()
    
  if (roleData?.role !== 'admin' || !roleData?.is_super_admin) return { success: false, error: 'Unauthorized' }

  const adminAuthClient = createAdminClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as string
  const canSupply = formData.get('canSupply') === 'on'
  const stationId = formData.get('stationId') as string

  // 1. Create user in auth.users
  const { data: authUser, error: authError } = await adminAuthClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (authError) return { success: false, error: authError.message }
  if (!authUser.user) return { success: false, error: 'Failed to create user' }

  // 2. Insert into public.users (role and permissions)
  const { error: userError } = await adminAuthClient
    .from('users')
    .insert({
      id: authUser.user.id,
      role: role,
      can_supply: role === 'viewer' ? canSupply : false
    })

  if (userError) {
    // Rollback auth user
    await adminAuthClient.auth.admin.deleteUser(authUser.user.id)
    return { success: false, error: userError.message }
  }

  // 3. Assign station if manager
  if (role === 'manager' && stationId) {
    const { error: assignmentError } = await adminAuthClient
      .from('station_assignments')
      .insert({
        user_id: authUser.user.id,
        station_id: stationId
      })

    if (assignmentError) {
      console.error('Failed to assign station:', assignmentError)
      // We don't rollback here, but ideally we should handle it gracefully
    }
  }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function assignManagerToStation(stationId: string, managerId: string | null) {
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  
  if (!currentUser) return { success: false, error: 'Unauthorized' }

  // Check if current user is admin and super_admin
  const { data: roleData } = await supabase
    .from('users')
    .select('role, is_super_admin')
    .eq('id', currentUser.id)
    .single()
    
  if (roleData?.role !== 'admin' || !roleData?.is_super_admin) return { success: false, error: 'Unauthorized' }

  const adminAuthClient = createAdminClient()

  // 1. Delete existing assignments for this station
  const { error: deleteError } = await adminAuthClient
    .from('station_assignments')
    .delete()
    .eq('station_id', stationId)

  if (deleteError) {
    console.error('Error deleting assignment:', deleteError)
    return { success: false, error: deleteError.message }
  }

  // 2. Insert new assignment if managerId is provided
  if (managerId) {
    // Delete any existing assignments for this manager (managers can only manage one station)
    await adminAuthClient
      .from('station_assignments')
      .delete()
      .eq('user_id', managerId)

    const { error: insertError } = await adminAuthClient
      .from('station_assignments')
      .insert({
        station_id: stationId,
        user_id: managerId
      })

    if (insertError) {
      console.error('Error inserting assignment:', insertError)
      return { success: false, error: insertError.message }
    }
  }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function reassignManagerWithAuth(
  stationId: string | null,
  managerId: string,
  adminPassword: string,
  actionDescription: string
) {
  const supabase = await createClient()
  
  // 1. Get current admin
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) return { success: false, error: 'Unauthorized' }

  // 2. Verify admin role and super admin
  const { data: roleData } = await supabase
    .from('users')
    .select('role, is_super_admin')
    .eq('id', currentUser.id)
    .single()
    
  if (roleData?.role !== 'admin' || !roleData?.is_super_admin) return { success: false, error: 'Unauthorized' }

  // 3. Authenticate to confirm action using current admin's email and provided password
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: currentUser.email!,
    password: adminPassword,
  })

  if (authError) {
    return { success: false, error: 'Invalid password. Assignment cancelled.' }
  }

  const adminAuthClient = createAdminClient()

  // 4. Update the assignment
  
  // Delete any existing assignments for this manager
  await adminAuthClient
    .from('station_assignments')
    .delete()
    .eq('user_id', managerId)

  let assignedStationId = stationId;

  if (stationId) {
    // We NO LONGER delete existing assignments for this station, allowing multiple managers
      
    // Insert new assignment
    const { error: insertError } = await adminAuthClient
      .from('station_assignments')
      .insert({
        station_id: stationId,
        user_id: managerId
      })
      
    if (insertError) {
      console.error('Error inserting assignment:', insertError)
      return { success: false, error: insertError.message }
    }
  }

  // 5. Log the action in audit_log
  const { error: auditError } = await adminAuthClient
    .from('audit_log')
    .insert({
      table_name: 'station_assignments',
      record_id: managerId, // Using managerId as record reference
      action: actionDescription,
      user_id: currentUser.id,
      details: { stationId, managerId }
    })

  if (auditError) {
    console.error('Audit log error:', auditError)
    // We still return success since the assignment worked, but log the error
  }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function updateUserRole(userId: string, newRole: string) {
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) return { success: false, error: 'Unauthorized' }

  const { data: roleData } = await supabase
    .from('users')
    .select('role, is_super_admin')
    .eq('id', currentUser.id)
    .single()
    
  if (roleData?.role !== 'admin' || !roleData?.is_super_admin) return { success: false, error: 'Unauthorized' }

  const adminAuthClient = createAdminClient()
  const { error } = await adminAuthClient
    .from('users')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) return { success: false, error: error.message }
  
  // If role is no longer manager, remove assignments
  if (newRole !== 'manager') {
    await adminAuthClient.from('station_assignments').delete().eq('user_id', userId)
  }

  // If role is no longer viewer, remove can_supply
  if (newRole !== 'viewer') {
    await adminAuthClient.from('users').update({ can_supply: false }).eq('id', userId)
  }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function toggleViewerSupplyPermission(userId: string, canSupply: boolean) {
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) return { success: false, error: 'Unauthorized' }

  const { data: roleData } = await supabase
    .from('users')
    .select('role, is_super_admin')
    .eq('id', currentUser.id)
    .single()
    
  if (roleData?.role !== 'admin' || !roleData?.is_super_admin) return { success: false, error: 'Unauthorized' }

  const adminAuthClient = createAdminClient()
  const { error } = await adminAuthClient
    .from('users')
    .update({ can_supply: canSupply })
    .eq('id', userId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}

