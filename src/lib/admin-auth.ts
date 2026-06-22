import { cookies } from 'next/headers'

export const ADMIN_SESSION_COOKIE = 'admin_session'

export async function isAdminAuthed() {
  const cookieStore = await cookies()
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  return !!session && session === process.env.ADMIN_PASSWORD
}
