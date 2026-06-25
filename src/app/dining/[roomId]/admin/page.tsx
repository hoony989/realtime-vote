'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Room, DiningVenue, DiningVote, DiningVenueWithCount } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Play, Square, Users, Copy, QrCode, RefreshCw, ExternalLink, MapPin, Wallet, DoorOpen, Sun, Moon } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'

const BAR_COLORS = ['bg-orange-500', 'bg-amber-500', 'bg-yellow-400', 'bg-purple-500', 'bg-pink-500', 'bg-blue-500', 'bg-teal-500', 'bg-red-400', 'bg-indigo-500', 'bg-emerald-500']
const LABEL_COLORS = ['text-orange-400', 'text-amber-400', 'text-yellow-400', 'text-purple-400', 'text-pink-400', 'text-blue-400', 'text-teal-400', 'text-red-400', 'text-indigo-400', 'text-emerald-400']

export default function DiningAdminPage() {
  const { roomId } = useParams<{ roomId: string }>()
  useSearchParams() // token은 URL에만 존재, 보안은 obscurity

  const [isDark, setIsDark] = useState(true)
  const [room, setRoom] = useState<Room | null>(null)
  const [venues, setVenues] = useState<DiningVenueWithCount[]>([])
  const [uniqueVoters, setUniqueVoters] = useState(0)

  const participantUrl = typeof window !== 'undefined' ? `${window.location.origin}/dining/${roomId}` : ''

  const d = isDark
  const th = {
    page:      d ? 'bg-slate-950 text-white'                   : 'bg-gray-50 text-gray-900',
    card:      d ? 'bg-slate-800 border-slate-700'              : 'bg-white border-gray-200 shadow-sm',
    title:     d ? 'text-slate-200'                             : 'text-gray-800',
    sub:       d ? 'text-slate-400'                             : 'text-gray-500',
    muted:     d ? 'text-slate-600'                             : 'text-gray-400',
    track:     d ? 'bg-slate-700'                               : 'bg-gray-200',
    badge:     d ? 'border-slate-700 text-slate-400'            : 'border-gray-300 text-gray-500',
    outline:   d ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-gray-300 text-gray-600 hover:bg-gray-100',
    statLabel: d ? 'text-slate-500'                             : 'text-gray-400',
    qrBtn:     d ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100',
    toggle:    d ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100',
    venueCard: d ? 'bg-slate-900 border-slate-700'              : 'bg-gray-50 border-gray-200',
    body:      d ? 'text-slate-300'                             : 'text-gray-700',
    rankNum:   d ? 'text-slate-600'                             : 'text-gray-400',
  }

  const loadData = useCallback(async () => {
    const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single()
    if (roomData) setRoom(roomData)

    const { data: venueData } = await supabase.from('dining_venues').select('*').eq('room_id', roomId).order('sort_order')
    const { data: voteData } = await supabase.from('dining_votes').select('*').eq('room_id', roomId)

    if (venueData && voteData) {
      setUniqueVoters(new Set(voteData.map((v: DiningVote) => v.voter_id)).size)
      setVenues(venueData.map((v: DiningVenue) => ({
        ...v,
        count: voteData.filter((dv: DiningVote) => dv.venue_id === v.id).length,
      })))
    }
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    loadData()
    const channel = supabase
      .channel(`dining-admin-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dining_votes', filter: `room_id=eq.${roomId}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dining_venues', filter: `room_id=eq.${roomId}` }, loadData)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => setRoom(payload.new as Room))
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

  const copyLink = () => {
    navigator.clipboard.writeText(participantUrl)
    toast.success('링크 복사!')
  }

  if (!room) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${th.page}`}>
        <div className="opacity-50 animate-pulse">로딩 중...</div>
      </div>
    )
  }

  const totalVotes = venues.reduce((s, v) => s + v.count, 0)
  const sorted = [...venues].sort((a, b) => b.count - a.count)

  return (
    <div className={`min-h-screen transition-colors duration-300 ${th.page}`}>
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* 헤더 */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <Badge variant="outline" className={`text-xs mb-2 ${th.badge}`}>관리자 · 회식 투표</Badge>
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
            <Button size="sm" variant="outline" onClick={loadData} className={th.outline}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsDark(!isDark)} className={`${th.toggle} transition-colors`}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* 통계 */}
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
                <Users className="w-4 h-4 text-orange-400" />
                <span className="font-semibold">{uniqueVoters}명</span>
              </div>
            </CardContent>
          </Card>
          <Card className={th.card}>
            <CardContent className="py-3 px-4">
              <p className={`text-xs ${th.statLabel}`}>총 투표 / 장소 수</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-orange-400 text-sm">👍</span>
                <span className="font-semibold">{totalVotes}표 / {venues.length}곳</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">

            {/* 실시간 결과 */}
            <Card className={th.card}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-base ${th.title}`}>실시간 결과</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {sorted.map((venue) => {
                  const pct = totalVotes > 0 ? (venue.count / totalVotes) * 100 : 0
                  const origIdx = venues.findIndex((v) => v.id === venue.id)
                  return (
                    <div key={venue.id}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className={`font-semibold ${LABEL_COLORS[origIdx % LABEL_COLORS.length]}`}>
                          {venue.name}
                        </span>
                        <span className={`tabular-nums ${th.sub}`}>
                          {venue.count}표{totalVotes > 0 && ` · ${Math.round(pct)}%`}
                        </span>
                      </div>
                      <div className={`relative h-2.5 rounded-full overflow-hidden ${th.track}`}>
                        <div className={`h-full rounded-full transition-all duration-700 ease-out ${BAR_COLORS[origIdx % BAR_COLORS.length]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
                {totalVotes === 0 && <p className={`text-sm text-center py-4 ${th.muted}`}>아직 투표가 없어요</p>}
              </CardContent>
            </Card>

            {/* 장소 상세 */}
            <Card className={th.card}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-base ${th.title}`}>장소 상세</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {venues.map((venue, i) => (
                  <div key={venue.id} className={`rounded-xl border p-3 ${th.venueCard}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold text-sm ${LABEL_COLORS[i % LABEL_COLORS.length]}`}>{venue.name}</span>
                          {venue.has_private_room && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1">
                              <DoorOpen className="w-3 h-3" /> 룸
                            </span>
                          )}
                        </div>
                        {venue.description && <p className={`text-xs mt-0.5 ${th.muted}`}>{venue.description}</p>}
                        <div className={`flex flex-col gap-0.5 mt-1 text-xs ${th.sub}`}>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{venue.location}</span>
                          {venue.cost_per_person && <span className="flex items-center gap-1"><Wallet className="w-3 h-3" />인당 {venue.cost_per_person}</span>}
                        </div>
                        {venue.map_url && (
                          <a href={venue.map_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 mt-1">
                            <ExternalLink className="w-3 h-3" /> 식당 링크
                          </a>
                        )}
                      </div>
                      <span className={`font-bold text-sm flex-shrink-0 ${LABEL_COLORS[i % LABEL_COLORS.length]}`}>{venue.count}표</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* 우측: QR + 순위 */}
          <div className="space-y-4">
            <Card className={th.card}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-base flex items-center gap-2 ${th.title}`}>
                  <QrCode className="w-4 h-4" /> 참여 링크
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white rounded-xl p-3 flex items-center justify-center">
                  <QRCodeCanvas value={participantUrl} size={160} />
                </div>
                <Button variant="outline" size="sm" className={`w-full ${th.qrBtn}`} onClick={copyLink}>
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> 링크 복사
                </Button>
                <a href={participantUrl} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-1.5 text-xs ${th.muted} hover:${th.sub}`}>
                  <ExternalLink className="w-3 h-3" /> 투표 페이지 열기
                </a>
              </CardContent>
            </Card>

            {sorted.length > 0 && (
              <Card className={th.card}>
                <CardHeader className="pb-3">
                  <CardTitle className={`text-sm ${th.muted}`}>현황 순위</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sorted.map((venue, i) => {
                    const origIdx = venues.findIndex((v) => v.id === venue.id)
                    const color = LABEL_COLORS[origIdx % LABEL_COLORS.length]
                    return (
                      <div key={venue.id} className="flex items-center gap-2 text-xs">
                        <span className={`w-3 ${th.rankNum}`}>{i + 1}</span>
                        <span className={`flex-1 truncate ${th.body}`}>{venue.name}</span>
                        <span className={`font-bold ${i === 0 && venue.count > 0 ? color : th.muted}`}>{venue.count}</span>
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
