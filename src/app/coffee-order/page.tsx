'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Gowun_Batang, Gowun_Dodum, JetBrains_Mono } from 'next/font/google'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const gowunBatang = Gowun_Batang({ subsets: ['latin'], weight: '700' })
const gowunDodum = Gowun_Dodum({ subsets: ['latin'], weight: '400' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: '500' })

const ACCENT = '#BF3A2C'
const CARD_RADIUS = '16px 13px 19px 15px'

type Temperature = 'HOT' | 'ICE'

interface CoffeeOrder {
  id: number
  name: string
  menu: string
  size: string
  temperature: Temperature
  options: string[]
  quantity: number
  memo: string
  timestamp: Date
}

const MENU_GROUPS = [
  {
    label: '커피',
    items: ['아메리카노', '카페라떼', '카페모카', '에스프레소', '바닐라라떼', '카라멜마키아토', '콜드브루'],
  },
  {
    label: '차류',
    items: ['배도라지차', '유자차', '레몬차', '루이보스', '얼그레이'],
  },
  {
    label: '과일·라떼',
    items: ['자몽에이드', '레몬에이드', '밀크티', '초코라떼', '딸기라떼', '그린티라떼'],
  },
] as const

const DEFAULT_MENU = MENU_GROUPS[0].items[0]

const SIZES = ['Tall', 'Grande', 'Venti'] as const
const TEMPERATURES: Temperature[] = ['HOT', 'ICE']

const EXTRA_OPTIONS = ['연하게', '휘핑크림 제거', '시럽 적게', '얼음 많이', '샷 추가 (+500)']

const TEAM_MEMBERS = [
  '조승훈', '강두호', '김세훈', '남금재', '박성조', '박태욱',
  '서정민', '이영중', '장다혜', '진현철', '채주영', '황준혁',
] as const

const defaultForm = () => ({
  name: '',
  menu: DEFAULT_MENU,
  size: SIZES[1],
  temperature: 'ICE' as Temperature,
  options: [] as string[],
  quantity: 1,
  memo: '',
})

export default function CoffeeOrderPage() {
  const [orders, setOrders] = useState<CoffeeOrder[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiInsight, setAiInsight] = useState('')
  const [form, setForm] = useState(defaultForm)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('이름을 입력해주세요.')
      return
    }

    const newOrder: CoffeeOrder = {
      id: Date.now(),
      ...form,
      timestamp: new Date(),
    }

    setOrders((prev) => [newOrder, ...prev])
    toast.success(`${form.name}님의 ${form.menu} ${form.quantity}잔 주문이 접수됐어요!`)

    setForm(defaultForm())
  }

  const totalOrders = orders.length
  const totalCups = orders.reduce((sum, o) => sum + o.quantity, 0)

  const generateInsight = async () => {
    if (orders.length === 0) {
      toast.error('주문을 먼저 입력해주세요.')
      return
    }

    setAiLoading(true)
    setAiInsight('')
    try {
      const res = await fetch('/api/coffee-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orders: orders.map(({ name, menu, size, temperature, options, quantity, memo }) => ({
            name,
            menu,
            size,
            temperature,
            options,
            quantity,
            memo,
          })),
        }),
      })
      const data = await res.json()
      if (data.insight) {
        setAiInsight(data.insight)
      } else {
        toast.error(data.error ?? 'AI 인사이트 생성에 실패했어요.')
      }
    } catch {
      toast.error('AI 인사이트 생성에 실패했어요.')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F5F0E6] px-6 py-20 sm:px-12">
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

      <div className="relative mx-auto max-w-6xl">
        <header className="mb-10 text-center">
          <p
            className={`${mono.className} text-[11px] tracking-[0.25em] text-black/45`}
            style={{ filter: 'url(#wobble)' }}
          >
            커피주문
          </p>
          <h1
            className={`${gowunBatang.className} mt-2 text-[34px] text-[#1F1B16] sm:text-[42px]`}
            style={{ filter: 'url(#wobble)' }}
          >
            팀 커피 단체주문
          </h1>
          <p
            className={`${gowunDodum.className} mt-2 text-[14px] text-black/55`}
            style={{ filter: 'url(#wobble)' }}
          >
            막내가 실시간으로 취합 중입니다
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <div
              className="pointer-events-none absolute inset-0 border border-black/20 bg-white/50"
              style={{ borderRadius: CARD_RADIUS, filter: 'url(#wobble)' }}
            />
            <div className="relative p-6 sm:p-8">
              <h2
                className={`${gowunBatang.className} mb-6 text-[22px] text-[#1F1B16]`}
                style={{ filter: 'url(#wobble)' }}
              >
                새 주문 입력
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className={`${mono.className} mb-2 block text-[10px] tracking-widest text-black/45`}>
                    이름
                  </label>
                  <p className={`${gowunDodum.className} mb-3 text-[12px] text-black/40`}>
                    형님 누르시면 바로 채워져요~
                  </p>
                  <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {TEAM_MEMBERS.map((member) => {
                      const selected = form.name === member
                      return (
                        <Button
                          key={member}
                          type="button"
                          variant={selected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setForm({ ...form, name: member })}
                          className={cn(
                            gowunDodum.className,
                            'h-auto min-h-9 w-full px-1.5 py-2 text-[12px] font-normal shadow-none sm:text-[13px]',
                            selected
                              ? 'border-transparent text-white shadow-sm hover:opacity-90'
                              : 'border-black/15 bg-white/60 text-black/70 hover:border-black/25 hover:bg-white/90',
                          )}
                          style={selected ? { background: ACCENT } : undefined}
                        >
                          {member}
                        </Button>
                      )
                    })}
                  </div>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={`${gowunDodum.className} w-full rounded-md border border-black/20 bg-white/70 px-4 py-3 text-sm focus:border-[#BF3A2C]/50 focus:outline-none`}
                    placeholder="직접 입력도 가능해요"
                    required
                  />
                </div>

                <div>
                  <label className={`${mono.className} mb-2 block text-[10px] tracking-widest text-black/45`}>
                    메뉴
                  </label>
                  <select
                    value={form.menu}
                    onChange={(e) => setForm({ ...form, menu: e.target.value })}
                    className={`${gowunDodum.className} w-full rounded-md border border-black/20 bg-white/70 px-3 py-3 text-sm focus:outline-none`}
                  >
                    {MENU_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.items.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`${mono.className} mb-2 block text-[10px] tracking-widest text-black/45`}>
                      사이즈
                    </label>
                    <div className="flex gap-1.5">
                      {SIZES.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setForm({ ...form, size })}
                          className={`${mono.className} flex-1 rounded-md border py-2.5 text-[10px] tracking-wide transition ${
                            form.size === size
                              ? 'border-transparent text-white'
                              : 'border-black/20 bg-white/50 text-black/60 hover:bg-white/80'
                          }`}
                          style={form.size === size ? { background: ACCENT } : undefined}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={`${mono.className} mb-2 block text-[10px] tracking-widest text-black/45`}>
                      온도
                    </label>
                    <div className="flex gap-1.5">
                      {TEMPERATURES.map((temp) => (
                        <button
                          key={temp}
                          type="button"
                          onClick={() => setForm({ ...form, temperature: temp })}
                          className={`${mono.className} flex-1 rounded-md border py-2.5 text-[10px] tracking-wide transition ${
                            form.temperature === temp
                              ? 'border-transparent text-white'
                              : 'border-black/20 bg-white/50 text-black/60 hover:bg-white/80'
                          }`}
                          style={form.temperature === temp ? { background: ACCENT } : undefined}
                        >
                          {temp}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className={`${mono.className} mb-2 block text-[10px] tracking-widest text-black/45`}>
                    수량
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: +e.target.value })}
                    className={`${gowunDodum.className} w-full rounded-md border border-black/20 bg-white/70 px-4 py-3 text-sm focus:outline-none`}
                  />
                </div>

                <div>
                  <label className={`${mono.className} mb-2 block text-[10px] tracking-widest text-black/45`}>
                    추가 요청
                  </label>
                  <p className={`${gowunDodum.className} mb-2 text-[12px] text-black/40`}>
                    필요한 것만 골라주세요~
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EXTRA_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const newOpts = form.options.includes(opt)
                            ? form.options.filter((o) => o !== opt)
                            : [...form.options, opt]
                          setForm({ ...form, options: newOpts })
                        }}
                        className={`${gowunDodum.className} rounded-full border px-3 py-1.5 text-[12px] transition ${
                          form.options.includes(opt)
                            ? 'border-transparent text-white'
                            : 'border-black/20 bg-white/50 text-black/60 hover:bg-white/80'
                        }`}
                        style={form.options.includes(opt) ? { background: ACCENT } : undefined}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={`${mono.className} mb-2 block text-[10px] tracking-widest text-black/45`}>
                    메모
                  </label>
                  <textarea
                    value={form.memo}
                    onChange={(e) => setForm({ ...form, memo: e.target.value })}
                    className={`${gowunDodum.className} h-24 w-full resize-y rounded-md border border-black/20 bg-white/70 px-4 py-3 text-sm focus:outline-none`}
                    placeholder="그 외 요청 있으시면 적어주세요~"
                  />
                </div>

                <button
                  type="submit"
                  className={`${mono.className} w-full rounded-full py-3.5 text-sm tracking-widest text-white transition hover:brightness-105`}
                  style={{ background: ACCENT, filter: 'url(#wobble)' }}
                >
                  주문 접수하기
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-3">
            <div className="relative">
              <div
                className="pointer-events-none absolute inset-0 border border-black/20 bg-white/50"
                style={{ borderRadius: CARD_RADIUS, filter: 'url(#wobble)' }}
              />
              <div className="relative p-6 sm:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <h2
                    className={`${gowunBatang.className} text-[22px] text-[#1F1B16]`}
                    style={{ filter: 'url(#wobble)' }}
                  >
                    실시간 주문 ({totalOrders}건)
                  </h2>
                  <span
                    className={`${gowunBatang.className} text-[28px]`}
                    style={{ color: ACCENT, filter: 'url(#wobble)' }}
                  >
                    {totalCups}잔
                  </span>
                </div>

                {orders.length === 0 ? (
                  <div className={`${gowunDodum.className} py-16 text-center text-[14px] text-black/35`}>
                    아직 주문이 없어요.
                    <br />
                    첫 주문을 해보세요!
                  </div>
                ) : (
                  <div className="max-h-[480px] space-y-3 overflow-y-auto pr-1">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-md border border-black/10 bg-white/40 px-4 py-4 transition-colors hover:border-black/20 hover:bg-white/70"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className={`${gowunBatang.className} text-[17px] text-[#1F1B16]`}>{order.name}</p>
                            <p className={`${mono.className} mt-0.5 text-[10px] tracking-wide text-black/35`}>
                              {order.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <span className={`${gowunBatang.className} text-[18px]`} style={{ color: ACCENT }}>
                            {order.quantity}잔
                          </span>
                        </div>
                        <p className={`${gowunDodum.className} mt-2 text-[15px] text-black/70`}>
                          {order.menu} · {order.size} · {order.temperature}
                        </p>
                        {order.options.length > 0 && (
                          <p className={`${gowunDodum.className} mt-1 text-[12px] text-black/50`}>
                            추가: {order.options.join(', ')}
                          </p>
                        )}
                        {order.memo && (
                          <p className={`${gowunDodum.className} mt-1 text-[12px] italic text-black/45`}>
                            &ldquo;{order.memo}&rdquo;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="relative">
              <div
                className="pointer-events-none absolute inset-0 border border-black/20 bg-white/50"
                style={{ borderRadius: CARD_RADIUS, filter: 'url(#wobble)' }}
              />
              <div className="relative p-6 sm:p-8 text-center">
                <button
                  type="button"
                  onClick={generateInsight}
                  disabled={aiLoading || orders.length === 0}
                  className={`${mono.className} rounded-full border border-black/25 bg-[#1F1B16] px-8 py-3.5 text-sm tracking-widest text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {aiLoading ? '막내가 정리 중...' : '막내에게 취합 부탁하기'}
                </button>
                {aiInsight ? (
                  <div className="mt-6 text-left">
                    <p
                      className={`${mono.className} mb-2 text-[10px] tracking-widest text-black/40`}
                      style={{ filter: 'url(#wobble)' }}
                    >
                      막내 Agent
                    </p>
                    <p
                      className={`${gowunDodum.className} whitespace-pre-line text-[14px] leading-relaxed text-black/70`}
                    >
                      {aiInsight}
                    </p>
                  </div>
                ) : (
                  <p className={`${gowunDodum.className} mt-4 text-[13px] text-black/35`}>
                    {orders.length === 0
                      ? '주문이 쌓이면 막내가 형님들 주문 취합해드릴게요~'
                      : '누르시면 메뉴·옵션을 형님들이 바로 이해할 수 있게 정리해드려요!'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}