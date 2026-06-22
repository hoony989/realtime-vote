import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashPin, isValidPin } from '@/lib/pin'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { pin } = await req.json()

  if (!isValidPin(pin)) {
    return NextResponse.json({ error: '비밀번호는 숫자 4자리로 입력해주세요.' }, { status: 400 })
  }

  const { data: schedule, error: scheduleError } = await supabaseAdmin
    .from('schedules')
    .select('*')
    .eq('id', id)
    .single()

  if (scheduleError || !schedule) {
    return NextResponse.json({ error: '일정을 찾을 수 없어요.' }, { status: 404 })
  }

  const { data: pinRow } = await supabaseAdmin
    .from('schedule_pins')
    .select('pin_hash')
    .eq('schedule_id', id)
    .maybeSingle()

  if (!pinRow || pinRow.pin_hash !== hashPin(pin, schedule.room_id)) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않아요.' }, { status: 401 })
  }

  return NextResponse.json({ schedule })
}
