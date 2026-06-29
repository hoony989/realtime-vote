'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Room, DiningVenue, DiningVote } from '@/lib/types'
import { toast } from 'sonner'
import { MapPin, Wallet, DoorOpen, ExternalLink, CheckCircle2, Clock, Users, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface KakaoPlace {
  place_name: string
  road_address_name: string
  address_name: string
  place_url: string
  category_name: string
  distance: string
}

function getVoterId() {
  const key = 'realtime_vote_voter_id'
  let id = localStorage.getItem(key)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id) }
  return id
}

async function searchKakao(query: string): Promise<KakaoPlace[]> {
  if (!query.trim()) return []
  const res = await fetch(`/api/kakao/search?q=${encodeURIComponent(query)}`)
  if (!res.ok) return []
  const data = await res.json()
  return data.documents ?? []
}

export default function DiningPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const [room, setRoom] = useState<Room | null>(null)
  const [venues, setVenues] = useState<DiningVenue[]>([])
  const [allVotes, setAllVotes] = useState<DiningVote[]>([])
  const [voterId, setVoterId] = useState('')
  const [voteLoading, setVoteLoading] = useState<string | null>(null)

  // 새 장소 제안 폼
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [sugName, setSugName] = useState('')
  const [sugDesc, setSugDesc] = useState('')
  const [sugLocation, setSugLocation] = useState('')
  const [sugCost, setSugCost] = useState('')
  const [sugRoom, setSugRoom] = useState(false)
  const [sugMapUrl, setSugMapUrl] = useState('')
  const [sugLoading, setSugLoading] = useState(false)

  // 카카오 자동완성
  const [kakaoResults, setKakaoResults] = useState<KakaoPlace[]>([])
  const [kakaoOpen, setKakaoOpen] = useState(false)
  const kakaoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setVoterId(getVoterId()) }, [])

  const loadData = useCallback(async () => {
    const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single()
    if (roomData) setRoom(roomData)
    const { data: venueData } = await supabase.from('dining_venues').select('*').eq('room_id', roomId).order('sort_order')
    if (venueData) setVenues(venueData)
    const { data: voteData } = await supabase.from('dining_votes').select('*').eq('room_id', roomId)
    if (voteData) setAllVotes(voteData)
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    loadData()
    const channel = supabase
      .channel(`dining-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dining_votes', filter: `room_id=eq.${roomId}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dining_venues', filter: `room_id=eq.${roomId}` }, loadData)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => setRoom(payload.new as Room))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [roomId, loadData])

  const myVoteIds = new Set(allVotes.filter((v) => v.voter_id === voterId).map((v) => v.venue_id))

  const handleVote = async (venueId: string) => {
    if (!voterId || room?.status !== 'open') return
    setVoteLoading(venueId)
    try {
      const isVoted = myVoteIds.has(venueId)
      if (isVoted) {
        await supabase.from('dining_votes').delete().eq('venue_id', venueId).eq('voter_id', voterId)
        setAllVotes((prev) => prev.filter((v) => !(v.venue_id === venueId && v.voter_id === voterId)))
      } else {
        if (!room.multi_select) {
          await supabase.from('dining_votes').delete().eq('room_id', roomId).eq('voter_id', voterId)
          setAllVotes((prev) => prev.filter((v) => v.voter_id !== voterId))
        }
        const { data } = await supabase.from('dining_votes').insert({ room_id: roomId, venue_id: venueId, voter_id: voterId }).select().single()
        if (data) setAllVotes((prev) => [...prev, data])
      }
    } catch {
      toast.error('투표에 실패했어요.')
    } finally {
      setVoteLoading(null)
    }
  }

  const onSugNameChange = (val: string) => {
    setSugName(val)
    if (kakaoTimer.current) clearTimeout(kakaoTimer.current)
    if (!val.trim()) { setKakaoResults([]); setKakaoOpen(false); return }
    kakaoTimer.current = setTimeout(async () => {
      const results = await searchKakao(val)
      setKakaoResults(results)
      setKakaoOpen(results.length > 0)
    }, 300)
  }

  const selectKakaoPlace = (p: KakaoPlace) => {
    setSugName(p.place_name)
    setSugLocation(p.road_address_name || p.address_name)
    setSugMapUrl(p.place_url)
    setKakaoResults([])
    setKakaoOpen(false)
  }

  const resetSuggestForm = () => {
    setSugName(''); setSugDesc(''); setSugLocation('')
    setSugCost(''); setSugRoom(false); setSugMapUrl('')
    setKakaoResults([]); setKakaoOpen(false)
  }

  const handleSuggestSubmit = async () => {
    if (!sugName.trim() || !sugLocation.trim()) { toast.error('장소명과 위치는 필수예요.'); return }
    setSugLoading(true)
    try {
      const { data: venue, error } = await supabase.from('dining_venues').insert({
        room_id: roomId,
        name: sugName.trim(),
        description: sugDesc.trim() || null,
        location: sugLocation.trim(),
        cost_per_person: sugCost.trim() || null,
        has_private_room: sugRoom,
        map_url: sugMapUrl.trim() || null,
        sort_order: venues.length,
      }).select().single()
      if (error) throw error
      await supabase.from('dining_votes').insert({ room_id: roomId, venue_id: venue.id, voter_id: voterId })
      toast.success('장소가 추가됐어요!')
      resetSuggestForm()
      setSuggestOpen(false)
    } catch {
      toast.error('장소 추가에 실패했어요.')
    } finally {
      setSugLoading(false)
    }
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <div className="text-orange-300 animate-pulse">로딩 중...</div>
      </div>
    )
  }

  const voteCountFor = (venueId: string) => allVotes.filter((v) => v.venue_id === venueId).length
  const totalVoters = new Set(allVotes.map((v) => v.voter_id)).size

  const statusMap = {
    waiting: { label: '대기 중', cls: 'bg-yellow-100 text-yellow-700' },
    open: { label: '투표 중', cls: 'bg-green-100 text-green-700' },
    closed: { label: '종료', cls: 'bg-slate-100 text-slate-500' },
  }

  return (
    <div className="min-h-screen bg-orange-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-6">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-3 ${statusMap[room.status].cls}`}>
            {room.status === 'open' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
            {statusMap[room.status].label}
          </span>
          <h1 className="text-2xl font-bold text-slate-900">{room.title}</h1>
          <p className="text-slate-500 mt-1">{room.question}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-slate-400 flex-wrap">
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{totalVoters}명 참여</span>
            {room.multi_select && <span>✅ 복수 선택 가능</span>}
          </div>
        </div>

        {room.status === 'waiting' && (
          <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
            <Clock className="w-12 h-12" />
            <p className="font-medium">투표가 아직 시작되지 않았어요</p>
            <p className="text-sm">관리자가 투표를 시작하면 참여할 수 있어요</p>
          </div>
        )}

        {room.status === 'closed' && venues.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
            <CheckCircle2 className="w-12 h-12" />
            <p className="font-medium">투표가 종료됐어요</p>
          </div>
        )}

        {/* 2열 카드 그리드 */}
        {(room.status === 'open' || room.status === 'closed') && venues.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {venues.map((venue) => {
              const isVoted = myVoteIds.has(venue.id)
              const count = voteCountFor(venue.id)
              const canVote = room.status === 'open'
              return (
                <div
                  key={venue.id}
                  onClick={() => canVote && handleVote(venue.id)}
                  className={`bg-white rounded-2xl border-2 flex flex-col transition-all ${canVote ? 'cursor-pointer' : ''} ${
                    isVoted ? 'border-orange-400 shadow-md shadow-orange-100' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex-1 p-4 pb-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-bold text-slate-900 text-base leading-snug">{venue.name}</span>
                      {venue.has_private_room && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold flex-shrink-0">
                          <DoorOpen className="w-3 h-3" /> 룸
                        </span>
                      )}
                    </div>
                    {venue.description && <p className="text-xs text-slate-500 mb-2 leading-relaxed">{venue.description}</p>}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="w-3 h-3 flex-shrink-0 text-slate-400" />{venue.location}
                      </div>
                      {venue.cost_per_person && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Wallet className="w-3 h-3 flex-shrink-0 text-slate-400" />인당 {venue.cost_per_person}
                        </div>
                      )}
                    </div>
                    {venue.map_url && (
                      <a href={venue.map_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 mt-2 font-semibold">
                        <ExternalLink className="w-3 h-3" /> 식당 링크
                      </a>
                    )}
                  </div>
                  <div className="px-4 py-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className={`text-xs ${count > 0 ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>
                      {count}명 투표
                    </span>
                    {canVote && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleVote(venue.id) }}
                        disabled={voteLoading === venue.id}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                          isVoted ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-orange-100 hover:text-orange-600'
                        }`}
                      >
                        {isVoted ? '✓ 선택됨' : '👍 투표'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 새 장소 제안 */}
        {room.status === 'open' && (
          <div className="mt-6">
            <button
              onClick={() => { setSuggestOpen(!suggestOpen); if (suggestOpen) resetSuggestForm() }}
              className={`w-full py-3 rounded-xl border-2 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                suggestOpen ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-dashed border-slate-300 text-slate-400 hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50/50'
              }`}
            >
              {suggestOpen ? <><X className="w-4 h-4" /> 닫기</> : <><Plus className="w-4 h-4" /> 새 장소 제안하기</>}
            </button>

            {suggestOpen && (
              <div className="mt-3 bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <p className="text-sm font-bold text-slate-700">🔍 장소 검색 (카카오)</p>

                {/* 카카오 자동완성 */}
                <div className="relative">
                  <Label className="text-xs font-semibold text-slate-500 mb-1 block">장소명 *</Label>
                  <Input
                    placeholder="장소명 입력 시 카카오에서 자동 검색..."
                    value={sugName}
                    onChange={(e) => onSugNameChange(e.target.value)}
                    onBlur={() => setTimeout(() => setKakaoOpen(false), 150)}
                    autoComplete="off"
                  />
                  {kakaoOpen && kakaoResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
                      {kakaoResults.map((p, i) => (
                        <button
                          key={i}
                          onMouseDown={() => selectKakaoPlace(p)}
                          className="w-full text-left px-4 py-2.5 hover:bg-orange-50 border-b border-slate-100 last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                            <span className="text-sm font-semibold text-slate-800 truncate">{p.place_name}</span>
                            {p.distance && (
                              <span className="text-xs text-orange-400 font-semibold flex-shrink-0">{p.distance}m</span>
                            )}
                            {p.category_name && (
                              <span className="text-xs text-slate-400 flex-shrink-0 truncate max-w-[80px]">{p.category_name.split(' > ').pop()}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 pl-5 truncate">{p.road_address_name || p.address_name}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-500 mb-1 block">메뉴/식당 한 줄 설명 (선택)</Label>
                  <Input placeholder="예: 가성비 좋은 이자카야, 사케 종류 다양" value={sugDesc} onChange={(e) => setSugDesc(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 mb-1 block">위치 *</Label>
                    <Input placeholder="카카오 선택 시 자동입력" value={sugLocation} onChange={(e) => setSugLocation(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 mb-1 block">인당 비용</Label>
                    <Input placeholder="예: 3만원대" value={sugCost} onChange={(e) => setSugCost(e.target.value)} />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <input type="checkbox" id="sug-room" checked={sugRoom} onChange={(e) => setSugRoom(e.target.checked)} className="w-4 h-4 accent-orange-500" />
                  <Label htmlFor="sug-room" className="text-sm cursor-pointer">룸 있음</Label>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-500 mb-1 block">식당 링크</Label>
                  <Input placeholder="카카오 선택 시 자동입력" value={sugMapUrl} onChange={(e) => setSugMapUrl(e.target.value)} />
                </div>

                <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={handleSuggestSubmit} disabled={sugLoading}>
                  {sugLoading ? '추가 중...' : '이 장소 추가하고 투표'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
