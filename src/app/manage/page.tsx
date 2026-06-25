'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Room, Schedule } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Trash2, Copy, Vote, CalendarDays, Lock, RefreshCw, ChevronDown, ChevronUp, Users, UtensilsCrossed } from 'lucide-react'
import { format } from 'date-fns'

export default function ManagePage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null)
  const [roomSchedules, setRoomSchedules] = useState<Record<string, Schedule[]>>({})
  const [loadingSchedules, setLoadingSchedules] = useState(false)

  const loadRooms = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/rooms')
      if (res.status === 401) {
        setAuthed(false)
        return
      }
      const data = await res.json()
      setRooms(data.rooms ?? [])
      setAuthed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRooms()
  }, [loadRooms])

  const handleLogin = async () => {
    if (!password.trim()) return
    setLoggingIn(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        toast.error('비밀번호가 올바르지 않아요.')
        return
      }
      setPassword('')
      await loadRooms()
    } finally {
      setLoggingIn(false)
    }
  }

  const handleDelete = async (room: Room) => {
    if (!confirm(`"${room.title}" 방을 삭제할까요?\n투표/일정/의견 등 관련 데이터가 모두 함께 삭제되며 되돌릴 수 없어요.`)) return

    const res = await fetch(`/api/admin/rooms/${room.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('삭제에 실패했어요.')
      return
    }
    setRooms((prev) => prev.filter((r) => r.id !== room.id))
    toast.success('삭제됐어요.')
  }

  const toggleExpand = async (room: Room) => {
    if (expandedRoomId === room.id) {
      setExpandedRoomId(null)
      return
    }
    setExpandedRoomId(room.id)
    if (!roomSchedules[room.id]) {
      setLoadingSchedules(true)
      try {
        const res = await fetch(`/api/admin/rooms/${room.id}/schedules`)
        if (res.ok) {
          const data = await res.json()
          setRoomSchedules((prev) => ({ ...prev, [room.id]: data.schedules ?? [] }))
        }
      } finally {
        setLoadingSchedules(false)
      }
    }
  }

  const handleDeleteSchedule = async (roomId: string, schedule: Schedule) => {
    if (!confirm(`"${schedule.name}"님의 일정을 삭제할까요?`)) return

    const res = await fetch(`/api/admin/schedules/${schedule.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('삭제에 실패했어요.')
      return
    }
    setRoomSchedules((prev) => ({
      ...prev,
      [roomId]: (prev[roomId] ?? []).filter((s) => s.id !== schedule.id),
    }))
    toast.success('삭제됐어요.')
  }

  const linkFor = (room: Room) => {
    if (room.type === 'schedule') return `${window.location.origin}/schedule/${room.id}`
    if (room.type === 'dining') return `${window.location.origin}/dining/${room.id}`
    return `${window.location.origin}/vote/${room.id}`
  }

  const adminLinkFor = (room: Room) => {
    if (room.type === 'dining') return `${window.location.origin}/dining/${room.id}/admin?token=${room.admin_token}`
    return `${window.location.origin}/admin/${room.id}?token=${room.admin_token}`
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('링크가 복사됐어요!')
    } catch {
      toast.error('복사에 실패했어요.')
    }
  }

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-slate-400 animate-pulse">로딩 중...</div>
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-slate-400" />
            <h1 className="text-lg font-bold text-slate-900">관리자 로그인</h1>
          </div>
          <Input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="mb-3"
            autoFocus
          />
          <Button className="w-full" onClick={handleLogin} disabled={loggingIn || !password.trim()}>
            {loggingIn ? '확인 중...' : '로그인'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">관리자 페이지</h1>
            <p className="text-slate-500">전체 {rooms.length}개의 방</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadRooms} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="space-y-3">
          {rooms.map((room) => {
            const isExpanded = expandedRoomId === room.id
            const schedules = roomSchedules[room.id] ?? []
            const nameCounts = schedules.reduce<Record<string, number>>((acc, s) => {
              acc[s.name] = (acc[s.name] ?? 0) + 1
              return acc
            }, {})

            return (
              <div key={room.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          room.type === 'schedule' ? 'bg-emerald-100 text-emerald-700' : room.type === 'dining' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {room.type === 'schedule' ? <CalendarDays className="w-3 h-3" /> : room.type === 'dining' ? <UtensilsCrossed className="w-3 h-3" /> : <Vote className="w-3 h-3" />}
                        {room.type === 'schedule' ? '일정 비교' : room.type === 'dining' ? '회식 투표' : '투표'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {format(new Date(room.created_at), 'yyyy-MM-dd HH:mm')}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900 truncate">{room.title}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <button
                        onClick={() => copy(linkFor(room))}
                        className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> 참여 링크
                      </button>
                      {(room.type === 'vote' || room.type === 'dining') && (
                        <button
                          onClick={() => copy(adminLinkFor(room))}
                          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> 관리자 링크
                        </button>
                      )}
                      {room.type === 'schedule' && (
                        <button
                          onClick={() => toggleExpand(room)}
                          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                        >
                          <Users className="w-3 h-3" />
                          참가자 보기
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(room)}
                    className="border-red-200 text-red-600 hover:bg-red-50 flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50 p-4">
                    {loadingSchedules && schedules.length === 0 ? (
                      <p className="text-sm text-slate-400">불러오는 중...</p>
                    ) : schedules.length === 0 ? (
                      <p className="text-sm text-slate-400">참가자가 아직 없어요.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {schedules.map((s) => {
                          const sorted = [...s.dates].sort()
                          const isDup = nameCounts[s.name] > 1
                          return (
                            <div
                              key={s.id}
                              className={`flex items-center justify-between p-2 rounded-lg ${isDup ? 'bg-red-50 border border-red-200' : 'bg-white border border-slate-200'}`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-sm font-medium ${isDup ? 'text-red-700' : 'text-slate-900'}`}>
                                  {s.name}
                                </span>
                                {isDup && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 flex-shrink-0">
                                    중복 이름
                                  </span>
                                )}
                                {sorted.length > 0 && (
                                  <span className="text-xs text-slate-400 truncate">
                                    {format(new Date(sorted[0]), 'M/d')} ~ {format(new Date(sorted[sorted.length - 1]), 'M/d')} ·{' '}
                                    {s.dates.length}일
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteSchedule(room.id, s)}
                                className="text-red-500 hover:text-red-700 flex-shrink-0 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {rooms.length === 0 && !loading && (
            <p className="text-center text-slate-400 py-12">아직 생성된 방이 없어요.</p>
          )}
        </div>
      </div>
    </div>
  )
}
