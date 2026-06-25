'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ROOM_PUBLIC_SELECT } from '@/lib/types'
import type { PublicRoom, Option, Opinion } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { CheckCircle2, Users, MessageSquare, Clock } from 'lucide-react'

function getVoterId() {
  const key = 'realtime_vote_voter_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

export default function VotePage() {
  const { roomId } = useParams<{ roomId: string }>()
  const [room, setRoom] = useState<PublicRoom | null>(null)
  const [options, setOptions] = useState<Option[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [voted, setVoted] = useState(false)
  const [opinion, setOpinion] = useState('')
  const [opinionSent, setOpinionSent] = useState(false)
  const [totalVotes, setTotalVotes] = useState(0)
  const [recentOpinions, setRecentOpinions] = useState<Opinion[]>([])
  const [loading, setLoading] = useState(false)
  const [voterId, setVoterId] = useState('')

  useEffect(() => {
    setVoterId(getVoterId())
  }, [])

  const loadRoom = useCallback(async () => {
    const { data: roomData } = await supabase.from('rooms').select(ROOM_PUBLIC_SELECT).eq('id', roomId).single()
    if (roomData) setRoom(roomData)

    const { data: optData } = await supabase
      .from('options')
      .select('*')
      .eq('room_id', roomId)
      .order('sort_order')
    if (optData) setOptions(optData)

    const { count } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)
    setTotalVotes(count ?? 0)

    const { data: opData } = await supabase
      .from('opinions')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(5)
    if (opData) setRecentOpinions(opData)
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    loadRoom()

    const channel = supabase
      .channel(`vote-page-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `room_id=eq.${roomId}` }, () => {
        loadRoom()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'opinions', filter: `room_id=eq.${roomId}` }, (payload) => {
        setRecentOpinions((prev) => [payload.new as Opinion, ...prev].slice(0, 5))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
        setRoom(payload.new as PublicRoom)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId, loadRoom])

  const toggleOption = (id: string) => {
    if (voted || room?.status !== 'open') return
    setSelected((prev) => {
      const next = new Set(prev)
      if (room?.multi_select) {
        next.has(id) ? next.delete(id) : next.add(id)
      } else {
        next.clear()
        next.add(id)
      }
      return next
    })
  }

  const handleVote = async () => {
    if (selected.size === 0) {
      toast.error('선택지를 골라주세요.')
      return
    }
    setLoading(true)
    try {
      const inserts = Array.from(selected).map((option_id) => ({
        room_id: roomId,
        option_id,
        voter_id: voterId,
      }))
      const { error } = await supabase.from('votes').insert(inserts)
      if (error) {
        if (error.code === '23505') {
          toast.error('이미 투표하셨습니다.')
        } else {
          throw error
        }
      } else {
        setVoted(true)
        toast.success('투표 완료!')
      }
    } catch {
      toast.error('투표에 실패했어요.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpinion = async () => {
    if (!opinion.trim()) return
    try {
      await supabase.from('opinions').insert({
        room_id: roomId,
        content: opinion.trim(),
        voter_id: voterId,
      })
      setOpinion('')
      setOpinionSent(true)
      toast.success('의견이 전달됐어요!')
    } catch {
      toast.error('의견 전송에 실패했어요.')
    }
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-white/60 animate-pulse">투표방 로딩 중...</div>
      </div>
    )
  }

  const statusMap = {
    waiting: { label: '대기 중', color: 'bg-yellow-500/20 text-yellow-300' },
    open: { label: '투표 중', color: 'bg-green-500/20 text-green-300' },
    closed: { label: '투표 종료', color: 'bg-slate-500/20 text-slate-300' },
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-6">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full mb-3 ${statusMap[room.status].color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${room.status === 'open' ? 'bg-green-400 animate-pulse' : 'bg-current'}`} />
            {statusMap[room.status].label}
          </span>
          <h1 className="text-xl font-bold text-white mb-1">{room.title}</h1>
          <p className="text-slate-300 text-base leading-relaxed">{room.question}</p>
          <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{totalVotes}명 참여</span>
            {room.multi_select && <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />복수 선택 가능</span>}
          </div>
        </div>

        {/* 선택지 */}
        {room.status === 'waiting' ? (
          <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
            <Clock className="w-10 h-10" />
            <p>투표가 아직 시작되지 않았어요</p>
            <p className="text-sm text-slate-600">관리자가 투표를 시작하면 참여할 수 있어요</p>
          </div>
        ) : room.status === 'closed' ? (
          <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
            <CheckCircle2 className="w-10 h-10" />
            <p>투표가 종료됐어요</p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {options.map((opt) => {
              const isSelected = selected.has(opt.id)
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleOption(opt.id)}
                  disabled={voted}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500'
                  } ${voted ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      isSelected ? 'border-blue-400 bg-blue-500' : 'border-slate-600'
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="font-medium">{opt.label}</span>
                  </div>
                </button>
              )
            })}

            {!voted && (
              <Button
                className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-semibold mt-2"
                onClick={handleVote}
                disabled={loading || selected.size === 0}
              >
                {loading ? '투표 중...' : `투표하기 ${selected.size > 0 ? `(${selected.size}개 선택)` : ''}`}
              </Button>
            )}

            {voted && (
              <div className="flex items-center justify-center gap-2 text-green-400 py-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">투표 완료!</span>
              </div>
            )}
          </div>
        )}

        {/* 의견 */}
        <div className="border-t border-slate-800 pt-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-3">
            <MessageSquare className="w-4 h-4" /> 의견 남기기
          </h2>
          {opinionSent ? (
            <p className="text-green-400 text-sm">의견이 전달됐어요. 감사합니다!</p>
          ) : (
            <div className="space-y-2">
              <Textarea
                placeholder="자유롭게 의견을 남겨주세요..."
                value={opinion}
                onChange={(e) => setOpinion(e.target.value)}
                rows={3}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 resize-none"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpinion}
                disabled={!opinion.trim()}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                의견 전송
              </Button>
            </div>
          )}

          {recentOpinions.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-slate-600">최근 의견</p>
              {recentOpinions.map((op) => (
                <Card key={op.id} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="py-2.5 px-3">
                    <p className="text-sm text-slate-300">{op.content}</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {new Date(op.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
