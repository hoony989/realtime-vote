'use client'

import { useRef, useState } from 'react'
import { Gowun_Batang, Gowun_Dodum, JetBrains_Mono } from 'next/font/google'

const gowunBatang = Gowun_Batang({ subsets: ['latin'], weight: '700' })
const gowunDodum = Gowun_Dodum({ subsets: ['latin'], weight: '400' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: '500' })

const ACCENT = '#BF3A2C'
const ITEM_WIDTH = 140
const WINDOW_WIDTH = 220
const REPEAT = 14
const SPIN_MS = 3200

const DEFAULT_MENUS = [
  '김치찌개', '된장찌개', '비빔밥', '제육볶음', '갈비탕', '순두부찌개', '칼국수', '냉면',
  '짜장면', '짬뽕', '마라탕', '탕수육',
  '초밥', '라멘', '돈카츠', '우동',
  '파스타', '샐러드', '스테이크',
  '떡볶이', '김밥',
]

export default function LunchPickerPreview() {
  const [menus, setMenus] = useState(DEFAULT_MENUS)
  const [newItem, setNewItem] = useState('')
  const [spinning, setSpinning] = useState(false)
  const [translateX, setTranslateX] = useState(WINDOW_WIDTH / 2 - ITEM_WIDTH / 2)
  const [result, setResult] = useState<string | null>(null)
  const spinCount = useRef(0)

  const strip = Array.from({ length: REPEAT }, () => menus).flat()

  const spin = () => {
    if (spinning) return
    setSpinning(true)
    setResult(null)
    spinCount.current += 1

    const targetIndex = Math.floor(Math.random() * menus.length)
    const landRepeat = REPEAT - 2
    const landIndex = landRepeat * menus.length + targetIndex
    const newTranslateX = -(landIndex * ITEM_WIDTH) + (WINDOW_WIDTH / 2 - ITEM_WIDTH / 2)
    setTranslateX(newTranslateX)

    setTimeout(() => {
      setSpinning(false)
      setResult(menus[targetIndex])
    }, SPIN_MS)
  }

  const addMenu = () => {
    const v = newItem.trim()
    if (v && !menus.includes(v)) setMenus((prev) => [...prev, v])
    setNewItem('')
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

      <div className="text-center">
        <p
          className={`${mono.className} text-[11px] tracking-[0.25em] text-black/45`}
          style={{ filter: 'url(#wobble)' }}
        >
          점메추 (프로토타입)
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
          {strip.map((m, i) => (
            <div
              key={i}
              className={`${gowunDodum.className} flex items-center justify-center text-[17px] text-[#1F1B16]`}
              style={{ width: ITEM_WIDTH, flexShrink: 0 }}
            >
              {m}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={spin}
        disabled={spinning}
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
          ' '
        )}
      </p>

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
          className={`${mono.className} h-9 rounded-md border border-black/20 px-3 text-xs tracking-wide`}
        >
          추가
        </button>
      </div>
    </main>
  )
}
