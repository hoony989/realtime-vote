import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashPin, isValidPin } from '@/lib/pin'

export async function POST(req: Request) {
  const body = await req.json()
  const { roomId, name, dates, pin } = body

  if (typeof roomId !== 'string' || !roomId) {
    return NextResponse.json({ error: 'roomId가 필요해요.' }, { status: 400 })
  }
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  if (!trimmedName) {
    return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 })
  }
  if (!Array.isArray(dates) || dates.length === 0 || !dates.every((d) => typeof d === 'string')) {
    return NextResponse.json({ error: '날짜를 선택해주세요.' }, { status: 400 })
  }
  if (!isValidPin(pin)) {
    return NextResponse.json({ error: '비밀번호는 숫자 4자리로 입력해주세요.' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('schedules')
    .select('id')
    .eq('room_id', roomId)
    .eq('name', trimmedName)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: '이미 등록된 이름이에요. 다른 이름을 사용해주세요.' }, { status: 409 })
  }

  const { data: schedule, error: insertError } = await supabaseAdmin
    .from('schedules')
    .insert({
      room_id: roomId,
      voter_id: crypto.randomUUID(),
      name: trimmedName,
      dates,
    })
    .select()
    .single()

  if (insertError || !schedule) {
    if (insertError?.code === '23505') {
      return NextResponse.json({ error: '이미 등록된 이름이에요. 다른 이름을 사용해주세요.' }, { status: 409 })
    }
    return NextResponse.json({ error: insertError?.message ?? '등록에 실패했어요.' }, { status: 500 })
  }

  const { error: pinError } = await supabaseAdmin
    .from('schedule_pins')
    .insert({ schedule_id: schedule.id, pin_hash: hashPin(pin, roomId) })

  if (pinError) {
    await supabaseAdmin.from('schedules').delete().eq('id', schedule.id)
    return NextResponse.json({ error: '등록에 실패했어요.' }, { status: 500 })
  }

  return NextResponse.json({ schedule })
}
