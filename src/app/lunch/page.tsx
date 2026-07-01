'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Gowun_Batang, Gowun_Dodum, JetBrains_Mono } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { ArrowLeft, ExternalLink } from 'lucide-react'

const gowunBatang = Gowun_Batang({ subsets: ['latin'], weight: '700' })
const gowunDodum = Gowun_Dodum({ subsets: ['latin'], weight: '400' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: '500' })

const ACCENT = '#BF3A2C'
const ITEM_WIDTH = 140
const WINDOW_WIDTH = 220
const REPEAT = 14
const SPIN_MS = 3200

type KakaoPlace = {
  place_name: string
  category_name: string
  road_address_name: string
  address_name: string
  place_url: string
  distance: string
}

function formatCategory(categoryName: string): string {
  const parts = categoryName
    .split('>')
    .map((s) => s.trim())
    .filter((s) => s && s !== '음식점')
  return parts.slice(-2).join(' · ') || '음식점'
}

type Draw = { menu: string; restaurant: KakaoPlace }

export default function LunchPicker() {
  const [menus, setMenus] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState('')
  const [adding, setAdding] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [translateX, setTranslateX] = useState(WINDOW_WIDTH / 2 - ITEM_WIDTH / 2)
  const [result, setResult] = useState<string | null>(null)
  const [restaurant, setRestaurant] = useState<KakaoPlace | null>(null)
  const [restaurantCandidates, setRestaurantCandidates] = useState<KakaoPlace[]>([])
  const [restaurantLoading, setRestaurantLoading] = useState(false)
  const [restaurantSearched, setRestaurantSearched] = useState(false)
  const [drawHistory, setDrawHistory] = useState<Draw[]>([])
  const spinCount = useRef(0)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('lunch_menus')
        .select('name')
        .order('created_at', { ascending: true })

      if (error) {
        toast.error('메뉴를 불러오지 못했어요.')
      } else {
        setMenus(data.map((row) => row.name))
      }
      setLoading(false)
    }
    load()
  }, [])

  const strip = menus.length ? Array.from({ length: REPEAT }, () => menus).flat() : []

  const fetchRestaurant = async (menuName: string) => {
    setRestaurantLoading(true)
    setRestaurant(null)
    setRestaurantCandidates([])
    setRestaurantSearched(false)
    try {
      const res = await fetch(`/api/kakao/search?q=${encodeURIComponent(menuName)}`)
      const data = await res.json()
      const docs: KakaoPlace[] = data.documents ?? []
      setRestaurantCandidates(docs)
      if (docs.length > 0) {
        setRestaurant(docs[Math.floor(Math.random() * docs.length)])
      }
    } catch {
      setRestaurantCandidates([])
    } finally {
      setRestaurantSearched(true)
      setRestaurantLoading(false)
    }
  }

  const rerollRestaurant = () => {
    if (restaurantCandidates.length < 2) return
    setRestaurant((prev) => {
      const others = restaurantCandidates.filter((p) => p.place_name !== prev?.place_name)
      const pool = others.length > 0 ? others : restaurantCandidates
      return pool[Math.floor(Math.random() * pool.length)]
    })
  }

  const spin = () => {
    if (spinning || menus.length === 0) return
    setSpinning(true)
    if (result && restaurant) {
      setDrawHistory((prev) => [...prev, { menu: result, restaurant }])
    }
    setResult(null)
    setRestaurant(null)
    setRestaurantCandidates([])
    setRestaurantSearched(false)
    spinCount.current += 1

    const targetIndex = Math.floor(Math.random() * menus.length)
    const landRepeat = REPEAT - 2
    const landIndex = landRepeat * menus.length + targetIndex
    const newTranslateX = -(landIndex * ITEM_WIDTH) + (WINDOW_WIDTH / 2 - ITEM_WIDTH / 2)
    setTranslateX(newTranslateX)

    setTimeout(() => {
      setSpinning(false)
      const picked = menus[targetIndex]
      setResult(picked)
      fetchRestaurant(picked)
    }, SPIN_MS)
  }

  const addMenu = async () => {
    const v = newItem.trim()
    if (!v || adding) return
    if (menus.includes(v)) {
      toast.error('이미 있는 메뉴예요.')
      return
    }

    setAdding(true)
    const { error } = await supabase.from('lunch_menus').insert({ name: v })
    setAdding(false)

    if (error) {
      toast.error('추가에 실패했어요.')
      return
    }
    setMenus((prev) => [...prev, v])
    setNewItem('')
    toast.success('메뉴를 추가했어요!')
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center gap-10 bg-[#F5F0E6] px-6 py-20">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <filter id="wobble" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.045 0.055" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <Link
        href="/"
        className="absolute left-6 top-8 inline-flex items-center gap-1.5 text-sm text-black/45 hover:text-black/70"
      >
        <ArrowLeft className="h-4 w-4" /> 도구함으로
      </Link>

      <div className="text-center">
        <p
          className={`${mono.className} text-[11px] tracking-[0.25em] text-black/45`}
          style={{ filter: 'url(#wobble)' }}
        >
          점메추
        </p>
        <h1
          className={`${gowunBatang.className} mt-2 text-[34px] text-[#1F1B16]`}
          style={{ filter: 'url(#wobble)' }}
        >
          오늘 점심 뭐 먹지?
        </h1>
      </div>

      <div
        className="relative overflow-hidden"
        style={{ width: WINDOW_WIDTH, height: 64, borderRadius: '10px 8px 12px 9px' }}
      >
        <div
          className="pointer-events-none absolute inset-0 border-2"
          style={{ borderColor: ACCENT, filter: 'url(#wobble)' }}
        />
        <div
          className="flex h-full items-center"
          style={{
            transform: `translateX(${translateX}px)`,
            transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.1,0.7,0.1,1)` : 'none',
          }}
        >
          {loading ? (
            <div className={`${gowunDodum.className} flex items-center justify-center text-[14px] text-black/35`} style={{ width: WINDOW_WIDTH }}>
              불러오는 중...
            </div>
          ) : (
            strip.map((m, i) => (
              <div
                key={i}
                className={`${gowunDodum.className} flex items-center justify-center text-[17px] text-[#1F1B16]`}
                style={{ width: ITEM_WIDTH, flexShrink: 0 }}
              >
                {m}
              </div>
            ))
          )}
        </div>
      </div>

      <button
        onClick={spin}
        disabled={spinning || loading || menus.length === 0}
        className={`${mono.className} rounded-full px-6 py-3 text-sm tracking-widest text-white disabled:opacity-50`}
        style={{ background: ACCENT, filter: 'url(#wobble)' }}
      >
        {spinning ? '돌리는 중...' : '뽑기'}
      </button>

      <p
        className={`${gowunBatang.className} h-7 text-[20px] text-[#1F1B16]`}
        style={{ filter: 'url(#wobble)' }}
      >
        {result ? (
          <>
            오늘은 <span style={{ color: ACCENT }}>{result}</span> 어떠세요?
          </>
        ) : (
          ' '
        )}
      </p>

      {restaurantLoading && (
        <p className={`${mono.className} text-[11px] tracking-widest text-black/35`}>
          주변 식당 찾는 중...
        </p>
      )}

      {!restaurantLoading && restaurantSearched && !restaurant && (
        <p className={`${gowunDodum.className} text-[12px] text-black/35`}>
          근처에 마땅한 곳을 못 찾았어요
        </p>
      )}

      {restaurant && (
        <div className="relative w-full max-w-xs">
          <div
            className="absolute inset-0 rounded-lg border border-black/20"
            style={{ filter: 'url(#wobble)' }}
          />
          <div className="relative flex flex-col gap-1.5 p-4">
            <p
              className={`${mono.className} text-[10px] tracking-widest text-black/40`}
              style={{ filter: 'url(#wobble)' }}
            >
              {formatCategory(restaurant.category_name)} · {restaurant.distance}m
            </p>
            <p
              className={`${gowunBatang.className} text-[17px] text-[#1F1B16]`}
              style={{ filter: 'url(#wobble)' }}
            >
              {restaurant.place_name}
            </p>
            <p
              className={`${gowunDodum.className} text-[12px] text-black/55`}
              style={{ filter: 'url(#wobble)' }}
            >
              {restaurant.road_address_name || restaurant.address_name}
            </p>
            <div className="-mb-3 flex items-center gap-4">
              <a
                href={restaurant.place_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${mono.className} inline-flex items-center gap-1 py-3 text-[11px]`}
                style={{ color: ACCENT, filter: 'url(#wobble)' }}
              >
                카카오맵에서 보기 <ExternalLink className="h-3 w-3" />
              </a>
              {restaurantCandidates.length > 1 && (
                <button
                  onClick={rerollRestaurant}
                  className={`${mono.className} py-3 text-[11px] text-black/40 hover:text-black/60`}
                  style={{ filter: 'url(#wobble)' }}
                >
                  다른 곳 보기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {drawHistory.length > 0 && (
        <div className="w-full max-w-xs">
          <p
            className={`${mono.className} mb-2 text-[10px] tracking-widest text-black/35`}
            style={{ filter: 'url(#wobble)' }}
          >
            지금까지 나온 후보 ({drawHistory.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {[...drawHistory].reverse().map((draw, i) => (
              <a
                key={i}
                href={draw.restaurant.place_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-2 rounded-md border border-black/10 bg-white/40 px-3 py-3 transition-colors hover:border-black/20 hover:bg-white/70"
              >
                <div className="min-w-0">
                  <p className={`${mono.className} text-[9px] tracking-wide text-black/35`}>{draw.menu}</p>
                  <p className={`${gowunDodum.className} truncate text-[13px] text-black/70`}>
                    {draw.restaurant.place_name}
                  </p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-black/30 transition-colors group-hover:text-[#BF3A2C]" />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="메뉴 추가하기"
          className={`${gowunDodum.className} h-9 rounded-md border border-black/20 bg-white/60 px-3 text-sm`}
          onKeyDown={(e) => e.key === 'Enter' && addMenu()}
        />
        <button
          onClick={addMenu}
          disabled={adding}
          className={`${mono.className} h-9 rounded-md border border-black/20 px-3 text-xs tracking-wide disabled:opacity-50`}
        >
          추가
        </button>
      </div>
    </main>
  )
}
