'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Room, Option, Vote, Opinion, OptionWithCount } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Play, Square, Users, MessageSquare, Sparkles, Copy, QrCode, RefreshCw, ExternalLink, Sun, Moon
} from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'

const BAR_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-orange-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-red-400',
  'bg-yellow-400',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-rose-500',
]

const LABEL_COLORS = [
  'text-blue-400',
  'text-emerald-400',
  'text-orange-400',
  'text-purple-400',
  'text-pink-400',
  'text-red-400',
  'text-yellow-400',
  'text-teal-400',
  'text-indigo-400',
  'text-rose-400',
]

export default function AdminPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const searchParams = useSearchParams()

  const [isDark, setIsDark] = useState(true)
  const [room, setRoom] = useState<Room | null>(null)
  const [options, setOptions] = useState<OptionWithCount[]>([])
  const [opinions, setOpinions] = useState<Opinion[]>([])
  const [uniqueVoters, setUniqueVoters] = useState(0)
  const [aiSummary, setAiSummary] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const opEndRef = useRef<HTMLDivElement>(null)

  const voteUrl = typeof window !== 'undefined' ? `${window.location.origin}/vote/${roomId}` : ''

  // 테마 클래스 모음
  const d = isDark
  const th = {
    page:        d ? 'bg-slate-950 text-white'             : 'bg-gray-50 text-gray-900',
    card:        d ? 'bg-slate-800 border-slate-700'        : 'bg-white border-gray-200 shadow-sm',
    cardTitle:   d ? 'text-slate-200'                       : 'text-gray-800',
    sub:         d ? 'text-slate-400'                       : 'text-gray-500',
    muted:       d ? 'text-slate-600'                       : 'text-gray-400',
    track:       d ? 'bg-slate-700'                         : 'bg-gray-200',
    opCard:      d ? 'bg-slate-900 border-0'                : 'bg-gray-50 border border-gray-100',
    badge:       d ? 'border-slate-700 text-slate-400'      : 'border-gray-300 text-gray-500',
    btnOutline:  d ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-gray-300 text-gray-600 hover:bg-gray-100',
    statLabel:   d ? 'text-slate-500'                       : 'text-gray-400',
    qrLink:      d ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100',
    extLink:     d ? 'text-slate-500 hover:text-slate-300'  : 'text-gray-400 hover:text-gray-600',
    rankNum:     d ? 'text-slate-600'                       : 'text-gray-400',
    aiBtn:       d ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100',
    aiText:      d ? 'text-slate-300'                       : 'text-gray-700',
    toggleBtn:   d ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100',
  }

  const loadData = useCallback(async () => {
    const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single()
    if (roomData) setRoom(roomData)

    const { data: optData } = await supabase
      .from('options').select('*').eq('room_id', roomId).order('sort_order')

    const { data: voteData } = await supabase
      .from('votes').select('*').eq('room_id', roomId)

    if (optData && voteData) {
      const voters = new Set(voteData.map((v: Vote) => v.voter_id))
      setUniqueVoters(voters.size)
      setOptions(
        optData.map((opt: Option) => ({
          ...opt,
          count: voteData.filter((v: Vote) => v.option_id === opt.id).length,
        }))
      )
    }

    const { data: opData } = await supabase
      .from('opinions').select('*').eq('room_id', roomId).order('created_at', { ascending: false })
    if (opData) setOpinions(opData)
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    loadData()

    const channel = supabase
      .channel(`admin-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `room_id=eq.${roomId}` }, loadData)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'opinions', filter: `room_id=eq.${roomId}` }, (payload) => {
        setOpinions((prev) => [payload.new as Opinion, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
        setRoom(payload.new as Room)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId, loadData])

  const updateStatus = async (status: Room['status']) => {
    const { error } = await supabase.from('rooms').update({ status }).eq('id', roomId)
    if (error) toast.error('상태 변경 실패')
    else {
      setRoom((r) => r ? { ...r, status } : r)
      toast.success(status === 'open' ? '투표가 시작됐어요!' : '투표가 종료됐어요!')
    }
  }

  const generateSummary = async () => {
    setAiLoading(true)
    setAiSummary('')
    try {
      const res = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: room?.question,
          options: options.map((o) => ({ label: o.label, count: o.count })),
          opinions: opinions.map((o) => o.content),
        }),
      })
      const data = await res.json()
      if (data.summary) setAiSummary(data.summary)
      else toast.error('AI 요약 생성에 실패했어요.')
    } catch {
      toast.error('AI 요약 생성에 실패했어요.')
    } finally {
      setAiLoading(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(voteUrl)
    toast.success('링크 복사!')
  }

  const totalVotes = options.reduce((s, o) => s + o.count, 0)

  if (!room) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${th.page}`}>
        <div className="opacity-50 animate-pulse">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${th.page}`}>
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* 헤더 */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <Badge variant="outline" className={`text-xs mb-2 ${th.badge}`}>관리자</Badge>
            <h1 className="text-2xl font-bold">{room.title}</h1>
            <p className={`mt-1 text-sm ${th.sub}`}>{room.question}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {room.status === 'waiting' && (
              <Button size="sm" onClick={() => updateStatus('open')} className="bg-green-600 hover:bg-green-500 text-white">
                <Play className="w-4 h-4 mr-1" /> 시작
              </Button>
            )}
            {room.status === 'open' && (
              <Button size="sm" onClick={() => updateStatus('closed')} className="bg-red-600 hover:bg-red-500 text-white">
                <Square className="w-4 h-4 mr-1" /> 종료
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={loadData} className={th.btnOutline}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            {/* 다크/라이트 토글 */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsDark(!isDark)}
              className={`${th.toggleBtn} transition-colors`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className={th.card}>
            <CardContent className="py-3 px-4">
              <p className={`text-xs ${th.statLabel}`}>상태</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full ${room.status === 'open' ? 'bg-green-400 animate-pulse' : room.status === 'waiting' ? 'bg-yellow-400' : 'bg-slate-500'}`} />
                <span className="font-semibold text-sm">
                  {room.status === 'waiting' ? '대기 중' : room.status === 'open' ? '투표 중' : '종료'}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className={th.card}>
            <CardContent className="py-3 px-4">
              <p className={`text-xs ${th.statLabel}`}>참여자</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="font-semibold">{uniqueVoters}명</span>
              </div>
            </CardContent>
          </Card>
          <Card className={th.card}>
            <CardContent className="py-3 px-4">
              <p className={`text-xs ${th.statLabel}`}>총 투표</p>
              <div className="flex items-center gap-1.5 mt-1">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <span className="font-semibold">{totalVotes}표</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">

            {/* 실시간 결과 */}
            <Card className={th.card}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-base ${th.cardTitle}`}>실시간 결과</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {options.map((opt, i) => {
                  const pct = totalVotes > 0 ? (opt.count / totalVotes) * 100 : 0
                  const color = BAR_COLORS[i % BAR_COLORS.length]
                  const labelColor = LABEL_COLORS[i % LABEL_COLORS.length]
                  return (
                    <div key={opt.id}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className={`font-medium ${labelColor}`}>{opt.label}</span>
                        <span className={`tabular-nums ${th.sub}`}>
                          {opt.count}표{totalVotes > 0 && ` · ${Math.round(pct)}%`}
                        </span>
                      </div>
                      <div className={`relative h-3 rounded-full overflow-hidden ${th.track}`}>
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                {totalVotes === 0 && (
                  <p className={`text-sm text-center py-4 ${th.muted}`}>아직 투표가 없어요</p>
                )}
              </CardContent>
            </Card>

            {/* AI 요약 */}
            <Card className={th.card}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-base flex items-center gap-2 ${th.cardTitle}`}>
                    <Sparkles className="w-4 h-4 text-yellow-400" /> AI 요약 인사이트
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={generateSummary}
                    disabled={aiLoading || totalVotes === 0}
                    className={`text-xs ${th.aiBtn}`}
                  >
                    {aiLoading ? '분석 중...' : '요약 생성'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {aiSummary ? (
                  <p className={`text-sm leading-relaxed whitespace-pre-line ${th.aiText}`}>{aiSummary}</p>
                ) : (
                  <p className={`text-sm ${th.muted}`}>투표가 충분히 쌓이면 AI 요약을 생성할 수 있어요</p>
                )}
              </CardContent>
            </Card>

            {/* 의견 피드 */}
            <Card className={th.card}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-base ${th.cardTitle}`}>
                  의견 {opinions.length > 0 && <span className={`text-sm ${th.muted}`}>({opinions.length}개)</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {opinions.length === 0 ? (
                  <p className={`text-sm ${th.muted}`}>아직 의견이 없어요</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {opinions.map((op) => (
                      <div key={op.id} className={`rounded-lg p-3 ${th.opCard}`}>
                        <p className={`text-sm ${th.aiText}`}>{op.content}</p>
                        <p className={`text-xs mt-0.5 ${th.muted}`}>
                          {new Date(op.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                    <div ref={opEndRef} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* QR + 순위 */}
          <div className="space-y-4">
            <Card className={th.card}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-base flex items-center gap-2 ${th.cardTitle}`}>
                  <QrCode className="w-4 h-4" /> 참여 링크
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white rounded-xl p-3 flex items-center justify-center">
                  <QRCodeCanvas value={voteUrl} size={160} />
                </div>
                <Button variant="outline" size="sm" className={`w-full ${th.qrLink}`} onClick={copyLink}>
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> 링크 복사
                </Button>
                <a
                  href={voteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-1.5 text-xs transition-colors ${th.extLink}`}
                >
                  <ExternalLink className="w-3 h-3" /> 투표 페이지 열기
                </a>
              </CardContent>
            </Card>

            {/* 순위 */}
            {options.length > 0 && (
              <Card className={th.card}>
                <CardHeader className="pb-3">
                  <CardTitle className={`text-sm ${th.muted}`}>현황 순위</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[...options]
                    .sort((a, b) => b.count - a.count)
                    .map((opt, i) => {
                      const origIdx = options.findIndex(o => o.id === opt.id)
                      const color = LABEL_COLORS[origIdx % LABEL_COLORS.length]
                      return (
                        <div key={opt.id} className="flex items-center gap-2 text-xs">
                          <span className={`w-3 ${th.rankNum}`}>{i + 1}</span>
                          <span className={`flex-1 truncate ${th.aiText}`}>{opt.label}</span>
                          <span className={`font-bold ${i === 0 && opt.count > 0 ? color : th.muted}`}>
                            {opt.count}
                          </span>
                        </div>
                      )
                    })}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
