'use client'

import { useEffect, useState, useCallback, useRef, createContext, useContext } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Room, Schedule } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { CalendarDays, Users, Copy, Lock, X, Trash2, HelpCircle } from 'lucide-react'
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

function getHeatStyle(count: number): React.CSSProperties {
  if (count === 0) return {}
  if (count === 1) return { backgroundColor: '#d1fae5', color: '#065f46' }
  if (count === 2) return { backgroundColor: '#6ee7b7', color: '#064e3b' }
  return { backgroundColor: '#059669', color: '#ffffff' }
}

const THIS_YEAR = new Date().getFullYear()

const FOCUS_DAYS = new Set([
  `${THIS_YEAR}-07-10`,
  `${THIS_YEAR}-07-24`,
  `${THIS_YEAR}-08-14`,
  `${THIS_YEAR}-08-28`,
  `${THIS_YEAR}-09-11`,
  `${THIS_YEAR}-09-25`,
])

// 대한민국 법정공휴일(대체공휴일 포함). 정부 발표 「월력요항」 기준.
// 방 생성 시 연도를 넘기는 기간(예: 2026년 12월 ~ 2027년 3월)을 고를 수 있어 두 해를 모두 채워둔다.
const HOLIDAYS: Record<string, string> = {
  '2026-01-01': '신정',
  '2026-02-16': '설날 연휴',
  '2026-02-17': '설날',
  '2026-02-18': '설날 연휴',
  '2026-03-01': '삼일절',
  '2026-03-02': '대체공휴일',
  '2026-05-05': '어린이날',
  '2026-05-24': '부처님오신날',
  '2026-05-25': '대체공휴일',
  '2026-06-06': '현충일',
  '2026-08-15': '광복절',
  '2026-08-17': '대체공휴일',
  '2026-09-24': '추석 연휴',
  '2026-09-25': '추석',
  '2026-09-26': '추석 연휴',
  '2026-10-03': '개천절',
  '2026-10-05': '대체공휴일',
  '2026-10-09': '한글날',
  '2026-12-25': '성탄절',
  '2027-01-01': '신정',
  '2027-02-06': '설날 연휴',
  '2027-02-07': '설날',
  '2027-02-08': '설날 연휴',
  '2027-02-09': '대체공휴일',
  '2027-03-01': '삼일절',
}

const SATURDAY_COLOR = '#2563eb'
const SUNDAY_COLOR = '#dc2626'

interface CalendarCellContextValue {
  dateMap: Map<string, PersonOnDate[]>
  onCellEnter: (dateStr: string, e: React.MouseEvent<HTMLButtonElement>) => void
  onCellLeave: () => void
}

const CalendarCellContext = createContext<CalendarCellContextValue | null>(null)

// DayPicker의 components.DayButton으로 전달되는 컴포넌트는 모듈 최상위에 고정된 함수여야 한다.
// 페이지 컴포넌트 내부에 정의하면 hover로 인한 리렌더마다 함수 참조가 바뀌어 React가 모든
// 날짜 버튼을 통째로 unmount/remount한다 - Chrome은 이를 너그럽게 처리하지만 Safari/Firefox/
// 모바일은 mousedown과 mouseup 시점의 엘리먼트가 달라지면 click을 누락시킨다.
function HeatDayButton(props: DayButtonProps) {
  const ctx = useContext(CalendarCellContext)
  const { day, modifiers, className, children, disabled, ...rest } = props
  const dateStr = format(day.date, 'yyyy-MM-dd')
  const people = ctx?.dateMap.get(dateStr) ?? []
  const dow = day.date.getDay()
  const isHoliday = !!HOLIDAYS[dateStr]
  const style: React.CSSProperties = {
    ...(dow === 6 ? { color: SATURDAY_COLOR } : {}),
    ...(dow === 0 || isHoliday ? { color: SUNDAY_COLOR } : {}),
    ...getHeatStyle(people.length),
    backgroundImage: 'none',
    ...(modifiers.selected
      ? { backgroundColor: '#cbd5e1', boxShadow: 'inset 0 0 0 1.5px #64748b', color: '#1e293b' }
      : {}),
  }

  return (
    <button
      {...rest}
      disabled={disabled}
      className={`${className ?? ''} relative`}
      style={style}
      onMouseEnter={(e) => ctx?.onCellEnter(dateStr, e)}
      onMouseLeave={() => ctx?.onCellLeave()}
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

export default function SchedulePage() {
  const { roomId } = useParams<{ roomId: string }>()
  const [room, setRoom] = useState<Room | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [range, setRange] = useState<DateRange | undefined>(undefined)
  const [isUndecided, setIsUndecided] = useState(false)
  const [loading, setLoading] = useState(false)

  const [pinTarget, setPinTarget] = useState<Schedule | null>(null)
  const [pinModalInput, setPinModalInput] = useState('')
  const [pinAction, setPinAction] = useState<'edit' | 'delete'>('edit')
  const [verifying, setVerifying] = useState(false)

  const [hoverDate, setHoverDate] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async () => {
    const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single()
    if (roomData) setRoom(roomData)

    const { data: schedData } = await supabase
      .from('schedules')
      .select('id, room_id, voter_id, name, dates, is_undecided, created_at')
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

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setPin('')
    setRange(undefined)
    setIsUndecided(false)
  }

  const handleSubmit = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.error('이름을 입력해주세요.')
      return
    }
    if (!/^\d{4}$/.test(pin)) {
      toast.error('비밀번호는 숫자 4자리로 입력해주세요.')
      return
    }
    if (!isUndecided && (!range?.from || !range?.to)) {
      toast.error('캘린더에서 기간을 선택해주세요.')
      return
    }

    const dates = isUndecided
      ? []
      : eachDayOfInterval({ start: range!.from!, end: range!.to! })
          .map((d) => format(d, 'yyyy-MM-dd'))
          .sort()

    setLoading(true)
    try {
      const res = await fetch(editingId ? `/api/schedule-entries/${editingId}` : '/api/schedule-entries', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingId
            ? { pin, name: trimmedName, dates, is_undecided: isUndecided }
            : { roomId, name: trimmedName, dates, pin, is_undecided: isUndecided }
        ),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? '처리에 실패했어요.')
        return
      }

      toast.success(editingId ? '수정됐어요!' : '일정이 등록됐어요!')
      resetForm()
      loadData()
    } catch {
      toast.error('처리에 실패했어요.')
    } finally {
      setLoading(false)
    }
  }

  const openPinModal = (schedule: Schedule) => {
    setPinTarget(schedule)
    setPinModalInput('')
    setPinAction('edit')
  }

  const openDeletePinModal = (schedule: Schedule) => {
    setPinTarget(schedule)
    setPinModalInput('')
    setPinAction('delete')
  }

  const handleVerifyPin = async () => {
    if (!pinTarget) return
    if (!/^\d{4}$/.test(pinModalInput)) {
      toast.error('비밀번호 4자리를 입력해주세요.')
      return
    }
    setVerifying(true)
    try {
      if (pinAction === 'delete') {
        const res = await fetch(`/api/schedule-entries/${pinTarget.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pinModalInput }),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error ?? '비밀번호가 올바르지 않아요.')
          return
        }
        toast.success('일정이 삭제됐어요.')
        setPinTarget(null)
        loadData()
      } else {
        const res = await fetch(`/api/schedule-entries/${pinTarget.id}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pinModalInput }),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error ?? '비밀번호가 올바르지 않아요.')
          return
        }

        const sorted = [...data.schedule.dates].sort()
        const undec = !!data.schedule.is_undecided
        setEditingId(data.schedule.id)
        setName(data.schedule.name)
        setPin(pinModalInput)
        setIsUndecided(undec)
        setRange(undec || sorted.length === 0
          ? undefined
          : { from: parseISO(sorted[0]), to: parseISO(sorted[sorted.length - 1]) }
        )
        setPinTarget(null)
        toast.success('확인됐어요. 일정을 수정해주세요.')
      }
    } finally {
      setVerifying(false)
    }
  }

  const dateMap = buildDateMap(schedules)
  const maxCount = Math.max(...Array.from(dateMap.values()).map((v) => v.length), 1)
  const undecidedCount = schedules.filter((s) => s.is_undecided).length
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
    if (!dateMap.get(dateStr)?.length && !FOCUS_DAYS.has(dateStr) && !HOLIDAYS[dateStr]) return
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

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-200">
        <div className="text-slate-500 animate-pulse">로딩 중...</div>
      </div>
    )
  }

  const formatYearMonth = (ym: string) => {
    const [y, m] = ym.split('-').map(Number)
    return `${y}년 ${m}월`
  }
  const monthsLabel = room.months.length === 0
    ? ''
    : room.months[0] === room.months[room.months.length - 1]
      ? formatYearMonth(room.months[0])
      : `${formatYearMonth(room.months[0])} ~ ${formatYearMonth(room.months[room.months.length - 1])}`

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
          touch-action: manipulation;
        }
        .rdp-months { flex-wrap: wrap; justify-content: center; }
        .rdp-month_caption { font-size: 0.8rem; font-weight: 600; }
        .rdp-nav { display: none; }
        .rdp-day_button { transition: filter 0.15s; background-image: none !important; touch-action: manipulation; }
        .rdp-day_button:hover:not(:disabled) { filter: brightness(0.95); }
        .rdp-day_button:disabled { opacity: 1; cursor: default; }
        .rdp-button:focus-visible { outline: none; box-shadow: none; }
        .rdp-weekdays .rdp-weekday:first-child { color: ${SUNDAY_COLOR}; }
        .rdp-weekdays .rdp-weekday:last-child { color: ${SATURDAY_COLOR}; }
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

        {/* 등록/수정 폼 */}
        <div className="bg-white rounded-xl border border-slate-300 p-4 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">{editingId ? '내 일정 수정' : '내 일정 등록'}</h2>
            {editingId && (
              <button onClick={resetForm} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> 취소
              </button>
            )}
          </div>
          <div className="flex items-stretch gap-2 flex-wrap">
            <Input
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-24 flex-shrink-0 bg-white border-slate-300"
            />
            <Input
              placeholder="비밀번호 4자리"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              type="password"
              maxLength={4}
              className="w-32 flex-shrink-0 bg-white border-slate-300 tracking-widest"
            />
            <div className="flex-1 min-w-[140px] flex items-center px-3 rounded-md border border-slate-300 bg-slate-50 text-sm">
              {isUndecided ? (
                <span className="text-amber-600 font-medium flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" /> 미정
                </span>
              ) : range?.from && range?.to ? (
                <span className="text-slate-800">
                  {format(range.from, 'M/d (eee)', { locale: ko })} ~ {format(range.to, 'M/d (eee)', { locale: ko })}
                  <span className="text-slate-400 ml-1.5">({rangeDays}일)</span>
                </span>
              ) : (
                <span className="text-slate-400">아래 캘린더에서 기간을 선택해주세요</span>
              )}
            </div>
            <Button
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              onClick={handleSubmit}
              disabled={loading || !name.trim() || pin.length !== 4 || (!isUndecided && (!range?.from || !range?.to))}
            >
              {loading ? '처리 중...' : editingId ? '수정하기' : '등록하기'}
            </Button>
          </div>
          <label className="flex items-center gap-2 cursor-pointer mt-2.5">
            <input
              type="checkbox"
              checked={isUndecided}
              onChange={(e) => {
                setIsUndecided(e.target.checked)
                if (e.target.checked) setRange(undefined)
              }}
              className="w-4 h-4 accent-amber-500"
            />
            <span className="text-sm text-slate-600">아직 날짜 미정 (나중에 수정할 수 있어요)</span>
          </label>
          <p className="text-xs text-slate-400 mt-1.5">
            비밀번호는 나중에 내 일정을 수정할 때 필요해요. 잊지 않게 기억해주세요.
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: '참여자', value: schedules.length, icon: Users, color: 'text-blue-500' },
            { label: '선택된 날짜 수', value: dateMap.size, icon: CalendarDays, color: 'text-emerald-500' },
            { label: '최다 겹침', value: maxCount > 1 ? `${maxCount}명` : '-', icon: Users, color: 'text-orange-500' },
            { label: '날짜 미정', value: undecidedCount > 0 ? `${undecidedCount}명` : '-', icon: HelpCircle, color: 'text-amber-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
              <Icon className={`w-5 h-5 ${color} mb-2`} />
              <div className="text-2xl font-bold text-slate-900">{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        {/* 통합 캘린더: 방 생성 시 선택한 기간(연-월)만 표시, 히트맵 + 내 선택 동시 표시 */}
        <div ref={containerRef} className={`relative rounded-xl border border-slate-300 bg-white p-4 shadow-sm mb-5 transition-opacity ${isUndecided ? 'opacity-40 pointer-events-none select-none' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-slate-900">일정 비교 캘린더 ({monthsLabel})</h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: '#cbd5e1', boxShadow: 'inset 0 0 0 1.5px #64748b' }}
              />
              선택 중 (미등록)
            </div>
          </div>
          <div className="flex justify-center flex-wrap gap-4 overflow-x-auto">
            <CalendarCellContext.Provider
              value={{ dateMap, onCellEnter: handleCellEnter, onCellLeave: () => setHoverDate(null) }}
            >
              {room.months.map((ym) => {
                const [y, m] = ym.split('-').map(Number)
                return (
                  <DayPicker
                    key={ym}
                    mode="range"
                    selected={range}
                    onSelect={setRange}
                    locale={ko}
                    numberOfMonths={1}
                    defaultMonth={new Date(y, m - 1, 1)}
                    disableNavigation
                    components={{ DayButton: HeatDayButton }}
                  />
                )
              })}
            </CalendarCellContext.Provider>
          </div>

          {hoverDate && hoverPos && (hoverPeople.length > 0 || FOCUS_DAYS.has(hoverDate) || HOLIDAYS[hoverDate]) && (
            <div
              className="absolute z-10 -translate-x-1/2 -translate-y-full -mt-2 px-3 py-2 rounded-lg border border-slate-200 bg-white shadow-lg pointer-events-none whitespace-nowrap"
              style={{ left: hoverPos.x, top: hoverPos.y }}
            >
              <p className="text-xs font-semibold mb-1 text-slate-900">
                {format(parseISO(hoverDate), 'M/d (eee)', { locale: ko })}
                {hoverPeople.length > 0 && ` · ${hoverPeople.length}명`}
              </p>
              {HOLIDAYS[hoverDate] && (
                <p className="text-xs font-medium mb-1" style={{ color: SUNDAY_COLOR }}>
                  {HOLIDAYS[hoverDate]}
                </p>
              )}
              {FOCUS_DAYS.has(hoverDate) && (
                <p className="text-xs font-medium mb-1 text-slate-600">
                  Focus Day (휴무)
                </p>
              )}
              {hoverPeople.length > 0 && (
                <div className="space-y-0.5">
                  {hoverPeople.map((p, i) => (
                    <p key={i} className="text-xs">
                      <span className="font-medium text-slate-800">{p.name}</span>
                      <span className="ml-1.5 text-slate-500">({formatPersonRange(p)})</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mt-3 justify-end flex-wrap text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: '#d1fae5' }} /> 1명
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: '#6ee7b7' }} /> 2명
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: '#059669' }} /> 3명+
            </span>
            <span className="flex items-center gap-1">
              <span className="font-semibold" style={{ color: SUNDAY_COLOR }}>일</span> 일요일·공휴일
            </span>
            <span className="flex items-center gap-1">
              <span className="font-semibold" style={{ color: SATURDAY_COLOR }}>토</span> 토요일
            </span>
            <span className="flex items-center gap-1">Focus Day는 마우스를 올리면 표시돼요</span>
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
              <h3 className="font-semibold text-slate-900 mb-3">
                참여자 ({schedules.length}명) <span className="text-slate-400 font-normal">· 이름을 누르면 수정할 수 있어요</span>
              </h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {schedules.map((s) => {
                  const sorted = [...s.dates].sort()
                  return (
                    <div key={s.id} className="flex items-center hover:bg-slate-50 rounded-lg px-1.5 py-1 -mx-1.5 group">
                      <button
                        onClick={() => openPinModal(s)}
                        className="flex-1 flex items-center justify-between"
                      >
                        <span className="text-sm font-medium text-slate-900 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-slate-400" />
                          {s.name}
                        </span>
                        {s.is_undecided ? (
                          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium mr-2">미정</span>
                        ) : (
                          <span className="text-xs text-slate-500 mr-2">
                            {sorted.length > 0 && `${format(parseISO(sorted[0]), 'M/d')} ~ ${format(parseISO(sorted[sorted.length - 1]), 'M/d')} · `}
                            {s.dates.length}일
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => openDeletePinModal(s)}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity flex-shrink-0"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {pinTarget && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setPinTarget(null)}
        >
          <div className="bg-white rounded-xl p-5 w-full max-w-xs shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-900 mb-1">
              {pinAction === 'delete' ? `${pinTarget.name}님 일정 삭제` : `${pinTarget.name}님의 비밀번호`}
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              {pinAction === 'delete'
                ? '등록할 때 입력한 비밀번호를 확인하면 일정이 삭제돼요.'
                : '등록할 때 입력한 4자리 비밀번호를 입력해주세요.'}
            </p>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={pinModalInput}
              onChange={(e) => setPinModalInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
              autoFocus
              className="mb-3 text-center text-lg tracking-widest"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-slate-300" onClick={() => setPinTarget(null)}>
                취소
              </Button>
              <Button
                className={`flex-1 ${pinAction === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                onClick={handleVerifyPin}
                disabled={verifying || pinModalInput.length !== 4}
              >
                {verifying ? '처리 중...' : pinAction === 'delete' ? '삭제하기' : '확인'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
