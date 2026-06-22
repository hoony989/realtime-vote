'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Room, Schedule } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { CalendarDays, Users, Copy, QrCode, Pencil, CheckCircle2 } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { ko } from 'date-fns/locale'
import { format, eachDayOfInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns'
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

function getHeatColor(count: number, max: number): string {
  if (count === 0) return ''
  const intensity = count / Math.max(max, 1)
  if (intensity >= 0.75) return 'bg-emerald-500 text-white'
  if (intensity >= 0.5) return 'bg-emerald-400 text-white'
  if (intensity >= 0.25) return 'bg-emerald-300 text-emerald-900'
  return 'bg-emerald-100 text-emerald-800'
}

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
  const [showQr, setShowQr] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [hoverDate, setHoverDate] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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
    if (mine) setName((prev) => prev || mine.name)
  }, [schedules, voterId])

  const participantUrl = typeof window !== 'undefined' ? window.location.href : ''

  const startEditing = () => {
    if (mySchedule && mySchedule.dates.length > 0) {
      const sorted = [...mySchedule.dates].sort()
      setRange({ from: parseISO(sorted[0]), to: parseISO(sorted[sorted.length - 1]) })
      setName(mySchedule.name)
    }
    setEditing(true)
  }

  const handleRegister = async () => {
    if (!name.trim()) {
      toast.error('이름을 입력해주세요.')
      return
    }
    if (!range?.from || !range?.to) {
      toast.error('기간을 선택해주세요.')
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
      setRange(undefined)
    } catch {
      toast.error('등록에 실패했어요.')
    } finally {
      setLoading(false)
    }
  }

  const dateMap = buildDateMap(schedules)
  const maxCount = Math.max(...Array.from(dateMap.values()).map((v) => v.length), 1)

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })
  const firstDayOfWeek = startOfMonth(currentMonth).getDay()

  const copyLink = () => {
    navigator.clipboard.writeText(participantUrl)
    toast.success('링크가 복사됐어요!')
  }

  const prevMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  const nextMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))

  const selectedPeople = selectedDate ? (dateMap.get(selectedDate) ?? []) : []
  const hoverPeople = hoverDate ? (dateMap.get(hoverDate) ?? []) : []

  const formatRange = (p: PersonOnDate) => {
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

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-200">
        <div className="text-slate-500 animate-pulse">로딩 중...</div>
      </div>
    )
  }

  const showForm = editing || !mySchedule

  return (
    <div className="min-h-screen bg-slate-200 text-slate-900">
      <style>{`
        .rdp {
          --rdp-accent-color: #3b82f6;
          --rdp-background-color: rgba(59,130,246,0.12);
          margin: 0;
        }
        .rdp-day_selected, .rdp-day_selected:hover,
        .rdp-day_range_start, .rdp-day_range_end {
          background-color: #3b82f6 !important;
          color: white;
        }
        .rdp-day_range_middle {
          background-color: rgba(59,130,246,0.2) !important;
          color: #1e293b;
        }
        .rdp-day:hover:not([disabled]) {
          background-color: rgba(59,130,246,0.15);
        }
        .rdp-button:focus-visible {
          outline: none;
          box-shadow: none;
        }
      `}</style>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="mb-6">
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

        {/* 내 일정 등록/수정 */}
        <div className="bg-white rounded-xl border border-slate-300 p-4 mb-6 shadow-sm">
          {!showForm ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900">{mySchedule!.name}님의 일정이 등록됐어요</p>
                  <p className="text-sm text-slate-500">{mySchedule!.dates.length}일 등록됨</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={startEditing} className="border-slate-300">
                <Pencil className="w-3.5 h-3.5 mr-1" /> 수정하기
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700">이름</Label>
                <Input
                  placeholder="이름을 입력하고 시작해주세요"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white border-slate-300"
                  autoFocus
                />
              </div>

              <div className={`transition-opacity ${name.trim() ? '' : 'opacity-40 pointer-events-none select-none'}`}>
                {!name.trim() && (
                  <p className="text-sm text-amber-600 mb-2">⬆ 이름을 먼저 입력하면 일정을 선택할 수 있어요</p>
                )}
                <Label className="text-slate-700 mb-2 block">기간 선택 (언제부터 ~ 언제까지)</Label>
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 flex justify-center">
                  <DayPicker
                    mode="range"
                    selected={range}
                    onSelect={setRange}
                    locale={ko}
                    numberOfMonths={1}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">시작일과 종료일을 차례로 클릭하면 기간이 선택돼요.</p>
              </div>

              <div className="flex gap-2">
                {mySchedule && (
                  <Button variant="outline" className="border-slate-300" onClick={() => setEditing(false)}>
                    취소
                  </Button>
                )}
                <Button
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
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
        <div className="grid grid-cols-3 gap-3 mb-6">
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

        <div className="grid md:grid-cols-2 gap-4">
          {/* 캘린더 히트맵 */}
          <div ref={containerRef} className="relative rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">
                {format(currentMonth, 'yyyy년 M월', { locale: ko })}
              </h2>
              <div className="flex gap-1">
                <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">‹</button>
                <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">›</button>
              </div>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <div key={day} className="text-center text-xs font-medium py-1 text-slate-500">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square rounded-lg bg-slate-50" />
              ))}
              {daysInMonth.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const people = dateMap.get(dateStr) ?? []
                const count = people.length
                const isSelected = selectedDate === dateStr
                const heatClass = getHeatColor(count, maxCount)

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    onMouseEnter={(e) => handleCellEnter(dateStr, e)}
                    onMouseLeave={() => setHoverDate(null)}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all cursor-pointer border-2 ${
                      isSelected
                        ? 'bg-blue-50 border-blue-400'
                        : `border-transparent ${heatClass || 'hover:bg-slate-100 text-slate-400'}`
                    }`}
                  >
                    <span className="leading-none">{day.getDate()}</span>
                    {count > 0 && (
                      <span className="leading-none text-[9px] mt-0.5 font-semibold">{count}</span>
                    )}
                  </button>
                )
              })}
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
                      <span className="ml-1.5 text-slate-500">({formatRange(p)})</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mt-3 justify-end">
              <span className="text-xs text-slate-500">적음</span>
              {['bg-emerald-100', 'bg-emerald-300', 'bg-emerald-400', 'bg-emerald-500'].map((c) => (
                <div key={c} className={`w-4 h-4 rounded ${c}`} />
              ))}
              <span className="text-xs text-slate-500">많음</span>
            </div>
          </div>

          {/* 오른쪽 패널 */}
          <div className="space-y-4">
            {selectedDate && (
              <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-3">
                  {format(parseISO(selectedDate), 'M월 d일 (eee)', { locale: ko })} — {selectedPeople.length}명 휴가
                </h3>
                {selectedPeople.length === 0 ? (
                  <p className="text-sm text-slate-500">이 날 휴가 예정자가 없어요</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPeople.map((p, i) => (
                      <span key={i} className="text-sm px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                        {p.name} <span className="opacity-70">({formatRange(p)})</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {topDates.length > 0 && (
              <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-3">🔥 휴가 집중 날짜 TOP 5</h3>
                <div className="space-y-2">
                  {topDates.map(([dateStr, people]) => (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
                      onMouseEnter={(e) => handleCellEnter(dateStr, e)}
                      onMouseLeave={() => setHoverDate(null)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                        dateStr === selectedDate ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm text-slate-900">
                        {format(parseISO(dateStr), 'M/d (eee)', { locale: ko })}
                      </span>
                      <span className={`text-sm font-semibold ${people.length >= maxCount * 0.75 ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {people.length}명
                      </span>
                    </button>
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

            <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-3">이 페이지 링크 공유</h3>
              <div className="flex gap-2 mb-3">
                <input
                  readOnly
                  value={participantUrl}
                  className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 truncate"
                />
                <Button size="sm" variant="outline" onClick={copyLink} className="border-slate-300">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowQr(!showQr)} className="border-slate-300">
                  <QrCode className="w-3.5 h-3.5" />
                </Button>
              </div>
              {showQr && (
                <div className="flex justify-center mt-2 p-4 bg-white rounded-xl border border-slate-200">
                  <QRCodeCanvas value={participantUrl} size={160} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
