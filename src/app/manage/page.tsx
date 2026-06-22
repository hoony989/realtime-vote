'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Room } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Trash2, Copy, Vote, CalendarDays, Lock, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

export default function ManagePage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)

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

  const linkFor = (room: Room) =>
    `${window.location.origin}${room.type === 'schedule' ? `/schedule/${room.id}` : `/vote/${room.id}`}`

  const adminLinkFor = (room: Room) => `${window.location.origin}/admin/${room.id}?token=${room.admin_token}`

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
          {rooms.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      room.type === 'schedule' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {room.type === 'schedule' ? <CalendarDays className="w-3 h-3" /> : <Vote className="w-3 h-3" />}
                    {room.type === 'schedule' ? '일정 비교' : '투표'}
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
                  {room.type === 'vote' && (
                    <button
                      onClick={() => copy(adminLinkFor(room))}
                      className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> 관리자 링크
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
          ))}

          {rooms.length === 0 && !loading && (
            <p className="text-center text-slate-400 py-12">아직 생성된 방이 없어요.</p>
          )}
        </div>
      </div>
    </div>
  )
}
