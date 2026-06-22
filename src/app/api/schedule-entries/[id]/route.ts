import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashPin, isValidPin } from '@/lib/pin'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { pin, name, dates } = body

  if (!isValidPin(pin)) {
    return NextResponse.json({ error: '비밀번호는 숫자 4자리로 입력해주세요.' }, { status: 400 })
  }
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  if (!trimmedName) {
    return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 })
  }
  if (!Array.isArray(dates) || dates.length === 0 || !dates.every((d) => typeof d === 'string')) {
    return NextResponse.json({ error: '날짜를 선택해주세요.' }, { status: 400 })
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

  if (trimmedName !== schedule.name) {
    const { data: existing } = await supabaseAdmin
      .from('schedules')
      .select('id')
      .eq('room_id', schedule.room_id)
      .eq('name', trimmedName)
      .neq('id', id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: '이미 등록된 이름이에요. 다른 이름을 사용해주세요.' }, { status: 409 })
    }
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('schedules')
    .update({ name: trimmedName, dates })
    .eq('id', id)
    .select()
    .single()

  if (updateError || !updated) {
    if (updateError?.code === '23505') {
      return NextResponse.json({ error: '이미 등록된 이름이에요. 다른 이름을 사용해주세요.' }, { status: 409 })
    }
    return NextResponse.json({ error: updateError?.message ?? '수정에 실패했어요.' }, { status: 500 })
  }

  return NextResponse.json({ schedule: updated })
}
