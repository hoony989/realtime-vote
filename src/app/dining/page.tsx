'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, UtensilsCrossed, MapPin } from 'lucide-react'

interface KakaoPlace {
  place_name: string
  road_address_name: string
  address_name: string
  place_url: string
  category_name: string
  phone: string
  distance: string
}

interface VenueInput {
  name: string
  description: string
  location: string
  cost_per_person: string
  has_private_room: boolean
  map_url: string
}

const emptyVenue = (): VenueInput => ({
  name: '', description: '', location: '', cost_per_person: '', has_private_room: false, map_url: '',
})

async function searchKakaoPlaces(query: string): Promise<KakaoPlace[]> {
  if (!query.trim()) return []
  const res = await fetch(`/api/kakao/search?q=${encodeURIComponent(query)}`)
  if (!res.ok) return []
  const data = await res.json()
  return data.documents ?? []
}

function VenueForm({
  venue,
  index,
  onChange,
  onRemove,
  showRemove,
}: {
  venue: VenueInput
  index: number
  onChange: (field: keyof VenueInput, value: string | boolean) => void
  onRemove: () => void
  showRemove: boolean
}) {
  const [suggestions, setSuggestions] = useState<KakaoPlace[]>([])
  const [showSug, setShowSug] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onNameChange = useCallback((val: string) => {
    onChange('name', val)
    if (timer.current) clearTimeout(timer.current)
    if (!val.trim()) { setSuggestions([]); setShowSug(false); return }
    timer.current = setTimeout(async () => {
      const results = await searchKakaoPlaces(val)
      setSuggestions(results)
      setShowSug(results.length > 0)
    }, 300)
  }, [onChange])

  const selectPlace = (p: KakaoPlace) => {
    onChange('name', p.place_name)
    onChange('location', p.road_address_name || p.address_name)
    onChange('map_url', p.place_url)
    setSuggestions([])
    setShowSug(false)
  }

  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-orange-500">장소 {index + 1}</span>
        {showRemove && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
          </Button>
        )}
      </div>

      {/* 장소명 + 카카오 자동완성 */}
      <div className="relative">
        <Input
          placeholder="장소명 * (입력하면 카카오 검색)"
          value={venue.name}
          onChange={(e) => onNameChange(e.target.value)}
          onBlur={() => setTimeout(() => setShowSug(false), 150)}
          autoComplete="off"
        />
        {showSug && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
            {suggestions.map((p, i) => (
              <button
                key={i}
                onMouseDown={() => selectPlace(p)}
                className="w-full text-left px-4 py-2.5 hover:bg-orange-50 border-b border-slate-100 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-slate-800 truncate">{p.place_name}</span>
                  {p.distance && (
                    <span className="text-xs text-orange-400 font-semibold flex-shrink-0">{p.distance}m</span>
                  )}
                  {p.category_name && (
                    <span className="text-xs text-slate-400 flex-shrink-0 truncate max-w-[80px]">
                      {p.category_name.split(' > ').pop()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 pl-5 truncate">
                  {p.road_address_name || p.address_name}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <Input
        placeholder="메뉴/식당 한 줄 설명 (선택)"
        value={venue.description}
        onChange={(e) => onChange('description', e.target.value)}
      />
      <Input
        placeholder="위치 * (카카오 선택 시 자동입력)"
        value={venue.location}
        onChange={(e) => onChange('location', e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Input
            placeholder="인당 비용 (예: 3만원대)"
            value={venue.cost_per_person}
            onChange={(e) => onChange('cost_per_person', e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1">3만원대 / 2~4만원 / 미정</p>
        </div>
        <div className="flex items-center gap-2 pl-2">
          <input
            type="checkbox"
            id={`room-${index}`}
            checked={venue.has_private_room}
            onChange={(e) => onChange('has_private_room', e.target.checked)}
            className="w-4 h-4 accent-orange-500"
          />
          <Label htmlFor={`room-${index}`} className="text-sm cursor-pointer">룸 있음</Label>
        </div>
      </div>
      <Input
        placeholder="식당 링크 (카카오 선택 시 자동입력)"
        value={venue.map_url}
        onChange={(e) => onChange('map_url', e.target.value)}
      />
    </div>
  )
}

export default function CreateDiningPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [multiSelect, setMultiSelect] = useState(true)
  const [loading, setLoading] = useState(false)
  const [venues, setVenues] = useState<VenueInput[]>([emptyVenue(), emptyVenue()])

  const updateVenue = (i: number, field: keyof VenueInput, value: string | boolean) => {
    setVenues((prev) => prev.map((v, idx) => idx === i ? { ...v, [field]: value } : v))
  }

  const handleCreate = async () => {
    if (!title.trim()) { toast.error('제목을 입력해주세요.'); return }
    const valid = venues.filter((v) => v.name.trim() && v.location.trim())
    if (valid.length < 2) { toast.error('장소를 2개 이상 입력해주세요.'); return }

    setLoading(true)
    try {
      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .insert({
          title,
          question: '마음에 드는 장소에 투표해주세요!',
          multi_select: multiSelect,
          status: 'waiting',
          type: 'dining',
        })
        .select().single()
      if (roomErr) throw roomErr

      const { error: venueErr } = await supabase.from('dining_venues').insert(
        valid.map((v, i) => ({
          room_id: room.id,
          name: v.name.trim(),
          description: v.description.trim() || null,
          location: v.location.trim(),
          cost_per_person: v.cost_per_person.trim() || null,
          has_private_room: v.has_private_room,
          map_url: v.map_url.trim() || null,
          sort_order: i,
        }))
      )
      if (venueErr) throw venueErr

      toast.success('회식 투표방이 생성됐어요!')
      router.push(`/dining/${room.id}/admin?token=${room.admin_token}`)
    } catch {
      toast.error('생성에 실패했어요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> 도구함으로
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-500 rounded-2xl mb-4">
            <UtensilsCrossed className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">회식 투표</h1>
          <p className="text-slate-500 mt-2">장소명 입력 시 카카오에서 정보를 자동으로 채워요</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-lg">새 투표방 만들기</CardTitle>
            <CardDescription>장소를 2개 이상 등록하고 QR 코드로 공유하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dining-title">투표 제목</Label>
              <Input
                id="dining-title"
                placeholder="예: 2분기 팀 회식 장소 투표"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <input
                id="dining-multi"
                type="checkbox"
                checked={multiSelect}
                onChange={(e) => setMultiSelect(e.target.checked)}
                className="w-4 h-4 accent-orange-500"
              />
              <Label htmlFor="dining-multi" className="cursor-pointer text-sm">
                복수 선택 허용 (여러 곳에 동시 투표 가능)
              </Label>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">장소 후보</Label>
              {venues.map((v, i) => (
                <VenueForm
                  key={i}
                  venue={v}
                  index={i}
                  onChange={(field, value) => updateVenue(i, field, value)}
                  onRemove={() => setVenues((prev) => prev.filter((_, idx) => idx !== i))}
                  showRemove={venues.length > 2}
                />
              ))}
              {venues.length < 10 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVenues((prev) => [...prev, emptyVenue()])}
                  className="w-full border-dashed border-orange-300 text-orange-500 hover:bg-orange-50"
                >
                  <Plus className="w-4 h-4 mr-1" /> 장소 추가
                </Button>
              )}
            </div>

            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-base"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? '생성 중...' : '투표방 만들기'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
