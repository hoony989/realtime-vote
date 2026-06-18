'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Room } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { CalendarDays, CheckCircle2, Users } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { ko } from 'date-fns/locale'
import { format } from 'date-fns'
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

export default function SchedulePage() {
  const { roomId } = useParams<{ roomId: string }>()
  const [room, setRoom] = useState<Room | null>(null)
  const [name, setName] = useState('')
  const [selectedDays, setSelectedDays] = useState<Date[]>([])
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
      const dates = selectedDays.map((d) => format(d, 'yyyy-MM-dd')).sort()

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
      setTotalParticipants((p) => p + 1)
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

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <style>{`
        .rdp {
          --rdp-accent-color: #3b82f6;
          --rdp-background-color: rgba(59,130,246,0.15);
          color: white;
          margin: 0;
        }
        .rdp-day_selected, .rdp-day_selected:hover {
          background-color: #3b82f6;
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
              {selectedDays
                .sort((a, b) => a.getTime() - b.getTime())
                .map((d) => (
                  <span key={d.toISOString()} className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full">
                    {format(d, 'M/d (eee)', { locale: ko })}
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
                placeholder="이름을 입력해주세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
              />
            </div>

            <div>
              <Label className="text-slate-300 mb-3 block">
                휴가 일정 선택
                {selectedDays.length > 0 && (
                  <span className="ml-2 text-xs text-blue-400">{selectedDays.length}일 선택됨</span>
                )}
              </Label>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3 flex justify-center">
                <DayPicker
                  mode="multiple"
                  selected={selectedDays}
                  onSelect={(days) => setSelectedDays(days ?? [])}
                  locale={ko}
                  numberOfMonths={1}
                  startMonth={new Date()}
                />
              </div>
              <p className="text-xs text-slate-600 mt-2 text-center">날짜를 클릭해서 선택/해제할 수 있어요</p>
            </div>

            {selectedDays.length > 0 && (
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-500 mb-2">선택된 날짜</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDays
                    .sort((a, b) => a.getTime() - b.getTime())
                    .map((d) => (
                      <span key={d.toISOString()} className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full">
                        {format(d, 'M/d (eee)', { locale: ko })}
                      </span>
                    ))}
                </div>
              </div>
            )}

            <Button
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              onClick={handleSubmit}
              disabled={loading || selectedDays.length === 0 || !name.trim()}
            >
              {loading ? '등록 중...' : '일정 등록하기'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
