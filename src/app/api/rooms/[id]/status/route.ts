import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Room } from '@/lib/types'

const VALID_STATUS: Room['status'][] = ['waiting', 'open', 'closed']

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { token, status } = await req.json()

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: '권한이 없어요.' }, { status: 401 })
  }
  if (!VALID_STATUS.includes(status)) {
    return NextResponse.json({ error: '잘못된 상태값이에요.' }, { status: 400 })
  }

  const { data: room, error: roomError } = await supabaseAdmin
    .from('rooms')
    .select('admin_token')
    .eq('id', id)
    .single()

  if (roomError || !room) {
    return NextResponse.json({ error: '방을 찾을 수 없어요.' }, { status: 404 })
  }
  if (room.admin_token !== token) {
    return NextResponse.json({ error: '권한이 없어요.' }, { status: 403 })
  }

  const { error } = await supabaseAdmin.from('rooms').update({ status }).eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
