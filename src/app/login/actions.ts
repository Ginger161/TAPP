'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    let errorMessage = 'Invalid email or password.'
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      errorMessage = 'The password you entered is incorrect or this account doesn\'t exist. Please try again.'
    } else if (error.message.toLowerCase().includes('user not found')) {
      errorMessage = 'We couldn\'t find an account with that email address.'
    } else {
      errorMessage = error.message
    }
    return redirect(`/login?error=${encodeURIComponent(errorMessage)}`)
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    revalidatePath('/', 'layout')

    if (userRecord?.role === 'manager') {
      redirect('/manager/dashboard')
    } else if (userRecord?.role === 'viewer') {
      redirect('/viewer/dashboard')
    } else {
      redirect('/admin/dashboard')
    }
  } else {
    revalidatePath('/', 'layout')
    redirect('/dashboard') // Fallback
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
