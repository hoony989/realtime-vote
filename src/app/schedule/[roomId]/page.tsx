'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Room, Schedule } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { CalendarDays, Users, Pencil, Copy } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { DayPicker, type DateRange, type DayButtonProps } from 'react-day-picker'
import { ko } from 'date-fns/locale'
import { format, eachDayOfInterval, parseISO, differenceInCalendarDays } from 'date-fns'
import 'react-day-picker/dist/style.css'

interface PersonOnDate {
  name: string
  start: string
  end: string
}

function getVoterId() {
  const key = 'realtime_vote_voter_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

function buildDateMap(schedules: Schedule[]): Map<string, PersonOnDate[]> {
  const map = new Map<string, PersonOnDate[]>()
  for (const s of schedules) {
    if (s.dates.length === 0) continue
    const sorted = [...s.dates].sort()
    const start = sorted[0]
    const end = sorted[sorted.length - 1]
    for (const dt of s.dates) {
      if (!map.has(dt)) map.set(dt, [])
      map.get(dt)!.push({ name: s.name, start, end })
    }
  }
  return map
}

function getHeatStyle(count: number, max: number): React.CSSProperties {
  if (count === 0) return {}
  const intensity = max > 1 ? (count - 1) / (max - 1) : 0
  const hue = 142 - intensity * 142 // 142=초록 -> 0=빨강
  const lightness = 88 - intensity * 38 // 88% -> 50%
  return {
    backgroundColor: `hsl(${hue}, 72%, ${lightness}%)`,
    color: intensity > 0.55 ? '#fff' : '#1f2937',
  }
}

function heatColorAt(intensity: number) {
  const hue = 142 - intensity * 142
  const lightness = 88 - intensity * 38
  return `hsl(${hue}, 72%, ${lightness}%)`
}

const THIS_YEAR = new Date().getFullYear()
const SUMMER_START = new Date(THIS_YEAR, 6, 1)
const SUMMER_END = new Date(THIS_YEAR, 8, 1)

export default function SchedulePage() {
  const { roomId } = useParams<{ roomId: string }>()
  const [room, setRoom] = useState<Room | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [voterId, setVoterId] = useState('')
  const [mySchedule, setMySchedule] = useState<Schedule | null>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [range, setRange] = useState<DateRange | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [hoverDate, setHoverDate] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const didInitRange = useRef(false)

  useEffect(() => {
    setVoterId(getVoterId())
  }, [])

  const loadData = useCallback(async () => {
    const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single()
    if (roomData) setRoom(roomData)

    const { data: schedData } = await supabase
      .from('schedules')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at')
    if (schedData) setSchedules(schedData)
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    loadData()

    const channel = supabase
      .channel(`schedule-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules', filter: `room_id=eq.${roomId}` }, () => {
        loadData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId, loadData])

  useEffect(() => {
    if (!voterId) return
    const mine = schedules.find((s) => s.voter_id === voterId)
    setMySchedule(mine ?? null)
    if (mine) {
      setName((prev) => prev || mine.name)
      if (!didInitRange.current) {
        const sorted = [...mine.dates].sort()
        setRange({ from: parseISO(sorted[0]), to: parseISO(sorted[sorted.length - 1]) })
        didInitRange.current = true
      }
    }
  }, [schedules, voterId])

  const handleRegister = async () => {
    if (!name.trim()) {
      toast.error('이름을 입력해주세요.')
      return
    }
    if (!range?.from || !range?.to) {
      toast.error('캘린더에서 기간을 선택해주세요.')
      return
    }

    setLoading(true)
    try {
      const dates = eachDayOfInterval({ start: range.from, end: range.to })
        .map((d) => format(d, 'yyyy-MM-dd'))
        .sort()

      const { error } = await supabase.from('schedules').upsert(
        { room_id: roomId, voter_id: voterId, name: name.trim(), dates },
        { onConflict: 'room_id,voter_id' }
      )

      if (error) throw error

      toast.success('일정이 등록됐어요!')
      setEditing(false)
    } catch {
      toast.error('등록에 실패했어요.')
    } finally {
      setLoading(false)
    }
  }

  const dateMap = buildDateMap(schedules)
  const maxCount = Math.max(...Array.from(dateMap.values()).map((v) => v.length), 1)
  const participantUrl = typeof window !== 'undefined' ? window.location.href : ''

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(participantUrl)
      toast.success('링크가 복사됐어요!')
    } catch {
      toast.error('복사에 실패했어요.')
    }
  }

  const hoverPeople = hoverDate ? (dateMap.get(hoverDate) ?? []) : []

  const formatPersonRange = (p: PersonOnDate) => {
    if (p.start === p.end) return format(parseISO(p.start), 'M/d', { locale: ko })
    return `${format(parseISO(p.start), 'M/d', { locale: ko })} ~ ${format(parseISO(p.end), 'M/d', { locale: ko })}`
  }

  const topDates = Array.from(dateMap.entries())
    .filter(([, people]) => people.length > 0)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5)

  const handleCellEnter = (dateStr: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (!dateMap.get(dateStr)?.length) return
    const containerRect = containerRef.current?.getBoundingClientRect()
    const cellRect = e.currentTarget.getBoundingClientRect()
    if (!containerRect) return
    setHoverDate(dateStr)
    setHoverPos({
      x: cellRect.left - containerRect.left + cellRect.width / 2,
      y: cellRect.top - containerRect.top,
    })
  }

  const rangeDays = range?.from && range?.to ? differenceInCalendarDays(range.to, range.from) + 1 : 0
  const showForm = editing || !mySchedule

  function HeatDayButton(props: DayButtonProps) {
    const { day, modifiers, className, children, disabled, ...rest } = props
    const dateStr = format(day.date, 'yyyy-MM-dd')
    const people = dateMap.get(dateStr) ?? []
    const isPending = modifiers.selected && showForm
    const style: React.CSSProperties = {
      ...getHeatStyle(people.length, maxCount),
      backgroundImage: 'none',
      ...(isPending
        ? { backgroundColor: '#cbd5e1', boxShadow: 'inset 0 0 0 1.5px #64748b', color: '#1e293b' }
        : {}),
    }

    return (
      <button
        {...rest}
        disabled={disabled || !showForm}
        className={`${className ?? ''} relative`}
        style={style}
        onMouseEnter={(e) => handleCellEnter(dateStr, e)}
        onMouseLeave={() => setHoverDate(null)}
      >
        {children}
        {people.length > 0 && (
          <span className="absolute bottom-0 right-0.5 text-[8px] font-bold leading-none">
            {people.length}
          </span>
        )}
      </button>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-200">
        <div className="text-slate-500 animate-pulse">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-200 text-slate-900">
      <style>{`
        .rdp-root {
          --rdp-accent-color: #64748b;
          --rdp-accent-background-color: #e2e8f0;
          --rdp-day-width: 34px;
          --rdp-day-height: 34px;
          --rdp-day_button-width: 32px;
          --rdp-day_button-height: 32px;
          --rdp-day_button-border-radius: 8px;
          --rdp-months-gap: 1rem;
          --rdp-range_middle-background-color: transparent;
          --rdp-range_start-date-background-color: transparent;
          --rdp-range_end-date-background-color: transparent;
          --rdp-selected-border: none;
          margin: 0;
          font-size: 0.75rem;
        }
        .rdp-months { flex-wrap: wrap; justify-content: center; }
        .rdp-month_caption { font-size: 0.8rem; font-weight: 600; }
        .rdp-day_button { transition: filter 0.15s; background-image: none !important; }
        .rdp-day_button:hover:not(:disabled) { filter: brightness(0.95); }
        .rdp-day_button:disabled { opacity: 1; cursor: default; }
        .rdp-button:focus-visible { outline: none; box-shadow: none; }
        .rdp-weekday { color: #64748b; font-size: 0.65rem; }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full mb-3 bg-emerald-100 text-emerald-700">
              <CalendarDays className="w-3.5 h-3.5" />
              일정 비교
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-1">{room.title}</h1>
            <p className="text-slate-600 text-base leading-relaxed">{room.question}</p>
            <div className="flex items-center gap-1 mt-2 text-sm text-slate-500">
              <Users className="w-3.5 h-3.5" />
              {schedules.length}명 참여 중
            </div>
          </div>
          {participantUrl && (
            <div className="flex-shrink-0 bg-white rounded-xl border border-slate-300 p-3 shadow-sm text-center w-[152px]">
              <QRCodeCanvas value={participantUrl} size={128} />
              <p className="text-xs text-slate-400 mt-1.5">참여 QR</p>
              <button
                onClick={copyLink}
                title={participantUrl}
                className="flex items-center justify-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 mt-1 w-full"
              >
                <Copy className="w-2.5 h-2.5 flex-shrink-0" />
                <span className="truncate">{participantUrl.replace(/^https?:\/\//, '')}</span>
              </button>
            </div>
          )}
        </div>

        {/* 등록바 */}
        <div className="bg-white rounded-xl border border-slate-300 p-4 mb-5 shadow-sm">
          {!showForm ? (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-slate-900">
                <span className="font-semibold">{mySchedule!.name}</span>님의 일정:{' '}
                <span className="text-slate-600">
                  {(() => {
                    const sorted = [...mySchedule!.dates].sort()
                    return `${format(parseISO(sorted[0]), 'M/d')} ~ ${format(parseISO(sorted[sorted.length - 1]), 'M/d')}`
                  })()}
                </span>{' '}
                <span className="text-slate-400">({mySchedule!.dates.length}일)</span>
              </p>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="border-slate-300">
                <Pencil className="w-3.5 h-3.5 mr-1" /> 수정하기
              </Button>
            </div>
          ) : (
            <div className="flex items-stretch gap-2 flex-wrap">
              <Input
                placeholder="이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-24 flex-shrink-0 bg-white border-slate-300"
                autoFocus
              />
              <div className="flex-1 min-w-[140px] flex items-center px-3 rounded-md border border-slate-300 bg-slate-50 text-sm">
                {range?.from && range?.to ? (
                  <span className="text-slate-800">
                    {format(range.from, 'M/d (eee)', { locale: ko })} ~ {format(range.to, 'M/d (eee)', { locale: ko })}
                    <span className="text-slate-400 ml-1.5">({rangeDays}일)</span>
                  </span>
                ) : (
                  <span className="text-slate-400">아래 캘린더에서 기간을 선택해주세요</span>
                )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                {mySchedule && (
                  <Button variant="outline" className="border-slate-300" onClick={() => setEditing(false)}>
                    취소
                  </Button>
                )}
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  onClick={handleRegister}
                  disabled={loading || !range?.from || !range?.to || !name.trim()}
                >
                  {loading ? '등록 중...' : '등록하기'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: '참여자', value: schedules.length, icon: Users, color: 'text-blue-500' },
            { label: '선택된 날짜 수', value: dateMap.size, icon: CalendarDays, color: 'text-emerald-500' },
            { label: '최다 겹침', value: maxCount > 1 ? `${maxCount}명` : '-', icon: Users, color: 'text-orange-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
              <Icon className={`w-5 h-5 ${color} mb-2`} />
              <div className="text-2xl font-bold text-slate-900">{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        {/* 통합 캘린더: 7~9월, 히트맵 + 내 선택 동시 표시 */}
        <div ref={containerRef} className="relative rounded-xl border border-slate-300 bg-white p-4 shadow-sm mb-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-slate-900">하계 휴가 일정 (7월 ~ 9월)</h2>
            {editing && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: '#cbd5e1', boxShadow: 'inset 0 0 0 1.5px #64748b' }}
                />
                선택 중 (미등록)
              </div>
            )}
          </div>
          <div className="flex justify-center overflow-x-auto">
            <DayPicker
              mode="range"
              selected={range}
              onSelect={(r) => { setRange(r); setEditing(true) }}
              locale={ko}
              numberOfMonths={3}
              defaultMonth={SUMMER_START}
              startMonth={SUMMER_START}
              endMonth={SUMMER_END}
              disableNavigation
              components={{ DayButton: HeatDayButton }}
            />
          </div>

          {hoverDate && hoverPeople.length > 0 && hoverPos && (
            <div
              className="absolute z-10 -translate-x-1/2 -translate-y-full -mt-2 px-3 py-2 rounded-lg border border-slate-200 bg-white shadow-lg pointer-events-none whitespace-nowrap"
              style={{ left: hoverPos.x, top: hoverPos.y }}
            >
              <p className="text-xs font-semibold mb-1 text-slate-900">
                {format(parseISO(hoverDate), 'M/d (eee)', { locale: ko })} · {hoverPeople.length}명
              </p>
              <div className="space-y-0.5">
                {hoverPeople.map((p, i) => (
                  <p key={i} className="text-xs">
                    <span className="font-medium text-slate-800">{p.name}</span>
                    <span className="ml-1.5 text-slate-500">({formatPersonRange(p)})</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-3 justify-end">
            <span className="text-xs text-slate-500">적음</span>
            <div
              className="w-28 h-3 rounded"
              style={{ background: `linear-gradient(to right, ${heatColorAt(0)}, ${heatColorAt(0.5)}, ${heatColorAt(1)})` }}
            />
            <span className="text-xs text-slate-500">많음</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {topDates.length > 0 && (
            <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-3">🔥 휴가 집중 날짜 TOP 5</h3>
              <div className="space-y-2">
                {topDates.map(([dateStr, people]) => (
                  <div key={dateStr} className="flex items-center justify-between p-2 rounded-lg">
                    <span className="text-sm text-slate-900">
                      {format(parseISO(dateStr), 'M/d (eee)', { locale: ko })}
                    </span>
                    <span className={`text-sm font-semibold ${people.length >= maxCount * 0.75 ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {people.length}명
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {schedules.length > 0 && (
            <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-3">참여자 ({schedules.length}명)</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {schedules.map((s) => {
                  const sorted = [...s.dates].sort()
                  return (
                    <div key={s.id} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900">{s.name}</span>
                      <span className="text-xs text-slate-500">
                        {sorted.length > 0 && `${format(parseISO(sorted[0]), 'M/d')} ~ ${format(parseISO(sorted[sorted.length - 1]), 'M/d')} · `}
                        {s.dates.length}일
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
