'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Room, Schedule } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { CalendarDays, Users, Copy, Sun, Moon, QrCode, RefreshCw } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { format, eachDayOfInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'

interface PersonOnDate {
  name: string
  start: string
  end: string
}

function getHeatColor(count: number, max: number): string {
  if (count === 0) return ''
  const intensity = count / Math.max(max, 1)
  if (intensity >= 0.75) return 'bg-emerald-500 text-white'
  if (intensity >= 0.5) return 'bg-emerald-400 text-white'
  if (intensity >= 0.25) return 'bg-emerald-300 text-emerald-900'
  return 'bg-emerald-100 text-emerald-800'
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

export default function ScheduleAdminPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [room, setRoom] = useState<Room | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isDark, setIsDark] = useState(true)
  const [showQr, setShowQr] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [hoverDate, setHoverDate] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const participantUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/schedule/${roomId}`
    : ''

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
      .channel(`schedule-admin-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules', filter: `room_id=eq.${roomId}` }, () => {
        loadData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId, loadData])

  const dateMap = buildDateMap(schedules)
  const maxCount = Math.max(...Array.from(dateMap.values()).map((v) => v.length), 1)

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  const firstDayOfWeek = startOfMonth(currentMonth).getDay()

  const d = isDark
  const th = {
    page: d ? 'bg-slate-950 text-white' : 'bg-gray-50 text-gray-900',
    card: d ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-gray-200',
    text: d ? 'text-white' : 'text-gray-900',
    muted: d ? 'text-slate-400' : 'text-gray-500',
    track: d ? 'bg-slate-700' : 'bg-gray-200',
    badge: d ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600',
    input: d ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900',
    selectedDate: d ? 'bg-slate-700/80 border-blue-500' : 'bg-blue-50 border-blue-400',
    calHeader: d ? 'text-slate-400' : 'text-gray-500',
    navBtn: d ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500',
    emptyCell: d ? 'bg-slate-900/30' : 'bg-gray-50',
    tooltip: d ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900',
  }

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

  // 가장 겹치는 날짜 Top 5
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
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-white/60 animate-pulse">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${th.page} transition-colors duration-300`}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-medium text-emerald-400">일정 비교 관리자</span>
            </div>
            <h1 className={`text-xl font-bold ${th.text} truncate`}>{room.title}</h1>
            <p className={`text-sm ${th.muted} mt-0.5`}>{room.question}</p>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-lg transition-colors ${th.navBtn}`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Button size="sm" variant="outline" onClick={loadData} className={`border ${th.card}`}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: '참여자', value: schedules.length, icon: Users, color: 'text-blue-400' },
            { label: '선택된 날짜 수', value: dateMap.size, icon: CalendarDays, color: 'text-emerald-400' },
            { label: '최다 겹침', value: maxCount > 1 ? `${maxCount}명` : '-', icon: Users, color: 'text-orange-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`rounded-xl border p-4 ${th.card}`}>
              <Icon className={`w-5 h-5 ${color} mb-2`} />
              <div className={`text-2xl font-bold ${th.text}`}>{value}</div>
              <div className={`text-xs ${th.muted}`}>{label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* 캘린더 히트맵 */}
          <div ref={containerRef} className={`relative rounded-xl border p-4 ${th.card}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-semibold ${th.text}`}>
                {format(currentMonth, 'yyyy년 M월', { locale: ko })}
              </h2>
              <div className="flex gap-1">
                <button onClick={prevMonth} className={`p-1.5 rounded-lg transition-colors ${th.navBtn}`}>‹</button>
                <button onClick={nextMonth} className={`p-1.5 rounded-lg transition-colors ${th.navBtn}`}>›</button>
              </div>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 mb-1">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <div key={day} className={`text-center text-xs font-medium py-1 ${th.calHeader}`}>{day}</div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className={`aspect-square rounded-lg ${th.emptyCell}`} />
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
                        ? `${th.selectedDate}`
                        : `border-transparent ${heatClass || (d ? 'hover:bg-slate-700/50 text-slate-400' : 'hover:bg-gray-100 text-gray-400')}`
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

            {/* 호버 툴팁 */}
            {hoverDate && hoverPeople.length > 0 && hoverPos && (
              <div
                className={`absolute z-10 -translate-x-1/2 -translate-y-full -mt-2 px-3 py-2 rounded-lg border shadow-lg pointer-events-none whitespace-nowrap ${th.tooltip}`}
                style={{ left: hoverPos.x, top: hoverPos.y }}
              >
                <p className="text-xs font-semibold mb-1">
                  {format(parseISO(hoverDate), 'M/d (eee)', { locale: ko })} · {hoverPeople.length}명
                </p>
                <div className="space-y-0.5">
                  {hoverPeople.map((p, i) => (
                    <p key={i} className="text-xs">
                      <span className="font-medium">{p.name}</span>
                      <span className={`ml-1.5 ${d ? 'text-slate-400' : 'text-gray-500'}`}>({formatRange(p)})</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* 범례 */}
            <div className="flex items-center gap-2 mt-3 justify-end">
              <span className={`text-xs ${th.muted}`}>적음</span>
              {['bg-emerald-100', 'bg-emerald-300', 'bg-emerald-400', 'bg-emerald-500'].map((c) => (
                <div key={c} className={`w-4 h-4 rounded ${c}`} />
              ))}
              <span className={`text-xs ${th.muted}`}>많음</span>
            </div>
          </div>

          {/* 오른쪽 패널 */}
          <div className="space-y-4">
            {/* 선택된 날짜 상세 */}
            {selectedDate && (
              <div className={`rounded-xl border p-4 ${th.card}`}>
                <h3 className={`font-semibold ${th.text} mb-3`}>
                  {format(parseISO(selectedDate), 'M월 d일 (eee)', { locale: ko })} — {selectedPeople.length}명 휴가
                </h3>
                {selectedPeople.length === 0 ? (
                  <p className={`text-sm ${th.muted}`}>이 날 휴가 예정자가 없어요</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPeople.map((p, i) => (
                      <span key={i} className={`text-sm px-3 py-1 rounded-full ${th.badge}`}>
                        {p.name} <span className="opacity-70">({formatRange(p)})</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 가장 겹치는 날짜 */}
            {topDates.length > 0 && (
              <div className={`rounded-xl border p-4 ${th.card}`}>
                <h3 className={`font-semibold ${th.text} mb-3`}>🔥 휴가 집중 날짜 TOP 5</h3>
                <div className="space-y-2">
                  {topDates.map(([dateStr, people]) => (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
                      onMouseEnter={(e) => handleCellEnter(dateStr, e as unknown as React.MouseEvent<HTMLButtonElement>)}
                      onMouseLeave={() => setHoverDate(null)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                        dateStr === selectedDate ? (d ? 'bg-blue-600/20' : 'bg-blue-50') : (d ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50')
                      }`}
                    >
                      <span className={`text-sm ${th.text}`}>
                        {format(parseISO(dateStr), 'M/d (eee)', { locale: ko })}
                      </span>
                      <span className={`text-sm font-semibold ${people.length >= maxCount * 0.75 ? 'text-emerald-400' : th.muted}`}>
                        {people.length}명
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 참여자 목록 */}
            {schedules.length > 0 && (
              <div className={`rounded-xl border p-4 ${th.card}`}>
                <h3 className={`font-semibold ${th.text} mb-3`}>참여자 ({schedules.length}명)</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {schedules.map((s) => {
                    const sorted = [...s.dates].sort()
                    return (
                      <div key={s.id} className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${th.text}`}>{s.name}</span>
                        <span className={`text-xs ${th.muted}`}>
                          {sorted.length > 0 && `${format(parseISO(sorted[0]), 'M/d')} ~ ${format(parseISO(sorted[sorted.length - 1]), 'M/d')} · `}
                          {s.dates.length}일
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* QR / 링크 공유 */}
            <div className={`rounded-xl border p-4 ${th.card}`}>
              <h3 className={`font-semibold ${th.text} mb-3`}>참여 링크 공유</h3>
              <div className="flex gap-2 mb-3">
                <input
                  readOnly
                  value={participantUrl}
                  className={`flex-1 text-xs px-3 py-2 rounded-lg border ${th.input} truncate`}
                />
                <Button size="sm" variant="outline" onClick={copyLink} className={`border ${d ? 'border-slate-600' : 'border-gray-300'}`}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowQr(!showQr)} className={`border ${d ? 'border-slate-600' : 'border-gray-300'}`}>
                  <QrCode className="w-3.5 h-3.5" />
                </Button>
              </div>
              {showQr && (
                <div className="flex justify-center mt-2 p-4 bg-white rounded-xl">
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
