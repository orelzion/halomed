'use server'

import { revalidatePath } from 'next/cache'

export async function refreshAnalytics() {
  revalidatePath('/admin/analytics')
}
