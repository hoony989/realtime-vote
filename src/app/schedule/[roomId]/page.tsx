'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Room } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { CalendarDays, CheckCircle2, Users, X, Plus } from 'lucide-react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { ko } from 'date-fns/locale'
import { format, eachDayOfInterval, isWeekend } from 'date-fns'
import 'react-day-picker/dist/style.css'

function getVoterId() {
  const key = 'realtime_vote_voter_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

function toKey(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

export default function SchedulePage() {
  const { roomId } = useParams<{ roomId: string }>()
  const [room, setRoom] = useState<Room | null>(null)
  const [name, setName] = useState('')
  const [selectedDays, setSelectedDays] = useState<Date[]>([])
  const [range, setRange] = useState<DateRange | undefined>(undefined)
  const [excludeWeekends, setExcludeWeekends] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [totalParticipants, setTotalParticipants] = useState(0)
  const [voterId, setVoterId] = useState('')

  useEffect(() => {
    setVoterId(getVoterId())
  }, [])

  const loadRoom = useCallback(async () => {
    const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single()
    if (data) setRoom(data)

    const { count } = await supabase
      .from('schedules')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)
    setTotalParticipants(count ?? 0)
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    loadRoom()
  }, [roomId, loadRoom])

  const addRange = () => {
    if (!range?.from || !range?.to) return
    const days = eachDayOfInterval({ start: range.from, end: range.to }).filter(
      (day) => !excludeWeekends || !isWeekend(day)
    )
    setSelectedDays((prev) => {
      const existingKeys = new Set(prev.map(toKey))
      const merged = [...prev]
      for (const day of days) {
        if (!existingKeys.has(toKey(day))) {
          merged.push(day)
          existingKeys.add(toKey(day))
        }
      }
      return merged.sort((a, b) => a.getTime() - b.getTime())
    })
    setRange(undefined)
  }

  const removeDay = (key: string) => {
    setSelectedDays((prev) => prev.filter((d) => toKey(d) !== key))
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('이름을 입력해주세요.')
      return
    }
    if (selectedDays.length === 0) {
      toast.error('날짜를 1개 이상 선택해주세요.')
      return
    }

    setLoading(true)
    try {
      const dates = selectedDays.map(toKey).sort()

      const { error } = await supabase.from('schedules').upsert(
        {
          room_id: roomId,
          voter_id: voterId,
          name: name.trim(),
          dates,
        },
        { onConflict: 'room_id,voter_id' }
      )

      if (error) throw error

      setSubmitted(true)
      toast.success('일정이 등록됐어요!')
    } catch {
      toast.error('등록에 실패했어요.')
    } finally {
      setLoading(false)
    }
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-white/60 animate-pulse">로딩 중...</div>
      </div>
    )
  }

  const nameReady = name.trim().length > 0

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <style>{`
        .rdp {
          --rdp-accent-color: #3b82f6;
          --rdp-background-color: rgba(59,130,246,0.15);
          color: white;
          margin: 0;
        }
        .rdp-day_selected, .rdp-day_selected:hover,
        .rdp-day_range_start, .rdp-day_range_end {
          background-color: #3b82f6 !important;
          color: white;
        }
        .rdp-day_range_middle {
          background-color: rgba(59,130,246,0.25) !important;
          color: white;
        }
        .rdp-day:hover:not([disabled]) {
          background-color: rgba(59,130,246,0.2);
        }
        .rdp-head_cell, .rdp-caption_label {
          color: #94a3b8;
        }
        .rdp-button:focus-visible {
          outline: none;
          box-shadow: none;
        }
        .rdp-nav_button {
          color: #94a3b8;
        }
      `}</style>

      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full mb-3 bg-emerald-500/20 text-emerald-300">
            <CalendarDays className="w-3.5 h-3.5" />
            일정 비교
          </div>
          <h1 className="text-xl font-bold text-white mb-1">{room.title}</h1>
          <p className="text-slate-300 text-base leading-relaxed">{room.question}</p>
          <div className="flex items-center gap-1 mt-2 text-sm text-slate-500">
            <Users className="w-3.5 h-3.5" />
            {totalParticipants}명 참여 중
          </div>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-400" />
            <h2 className="text-xl font-bold">일정 등록 완료!</h2>
            <p className="text-slate-400">
              총 <span className="text-white font-semibold">{selectedDays.length}일</span>이 등록됐어요
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center mt-2">
              {selectedDays.map((dt) => (
                <span key={toKey(dt)} className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full">
                  {format(dt, 'M/d (eee)', { locale: ko })}
                </span>
              ))}
            </div>
            <Button
              variant="outline"
              className="mt-4 border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => setSubmitted(false)}
            >
              수정하기
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-300">이름</Label>
              <Input
                placeholder="이름을 입력하고 시작해주세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
                autoFocus
              />
            </div>

            <div className={`transition-opacity ${nameReady ? '' : 'opacity-40 pointer-events-none select-none'}`}>
              {!nameReady && (
                <p className="text-sm text-amber-400 mb-2">⬆ 이름을 먼저 입력하면 일정을 선택할 수 있어요</p>
              )}

              <Label className="text-slate-300 mb-2 block">기간 선택 (언제부터 ~ 언제까지)</Label>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3 flex justify-center">
                <DayPicker
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  locale={ko}
                  numberOfMonths={1}
                  startMonth={new Date()}
                />
              </div>

              <div className="flex items-center justify-between mt-3 gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeWeekends}
                    onChange={(e) => setExcludeWeekends(e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  주말 제외하고 추가
                </label>
                <Button
                  size="sm"
                  onClick={addRange}
                  disabled={!range?.from || !range?.to}
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> 기간 추가
                </Button>
              </div>
              <p className="text-xs text-slate-600 mt-2">
                시작일과 종료일을 차례로 클릭하면 기간이 선택돼요. 여러 기간을 나눠서 추가할 수 있어요.
              </p>

              {selectedDays.length > 0 && (
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-500">선택된 날짜 ({selectedDays.length}일)</p>
                    <p className="text-xs text-slate-600">날짜를 클릭하면 제외돼요</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDays.map((dt) => {
                      const weekend = isWeekend(dt)
                      return (
                        <button
                          key={toKey(dt)}
                          onClick={() => removeDay(toKey(dt))}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
                            weekend
                              ? 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30'
                              : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                          }`}
                        >
                          {format(dt, 'M/d (eee)', { locale: ko })}
                          <X className="w-3 h-3" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <Button
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              onClick={handleSubmit}
              disabled={loading || selectedDays.length === 0 || !nameReady}
            >
              {loading ? '등록 중...' : '일정 등록하기'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
