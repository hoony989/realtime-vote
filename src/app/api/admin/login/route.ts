import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-auth'

export async function POST(req: Request) {
  const { password } = await req.json()

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않아요.' }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_SESSION_COOKIE, password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  return NextResponse.json({ ok: true })
}
