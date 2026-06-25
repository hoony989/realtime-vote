import Link from 'next/link'
import { Gowun_Batang, Gowun_Dodum, JetBrains_Mono } from 'next/font/google'

const gowunBatang = Gowun_Batang({ subsets: ['latin'], weight: '700' })
const gowunDodum = Gowun_Dodum({ subsets: ['latin'], weight: '400' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: '500' })

const ACCENT = '#BF3A2C'
const CARD_RADIUS = '16px 13px 19px 15px'

type Entry = {
  no: string
  title: string
  desc: string
  tag: string
  href: string
  soon: boolean
}

const entries: Entry[] = [
  {
    no: '01',
    title: '라이브 투표',
    desc: '질문을 올리고 QR로 모아 실시간 결과를 확인해요',
    tag: 'LIVE',
    href: '/vote',
    soon: false,
  },
  {
    no: '02',
    title: '일정 조율',
    desc: '휴가와 일정을 모아 겹치는 날을 한눈에 확인해요',
    tag: 'SCHEDULE',
    href: '/schedule',
    soon: false,
  },
  {
    no: '03',
    title: '다음 도구',
    desc: '곧 새로운 도구가 추가될 예정이에요',
    tag: 'SOON',
    href: '',
    soon: true,
  },
]

function HandArrow({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      className={className}
      style={{ filter: 'url(#wobble)' }}
      aria-hidden
    >
      <polyline
        points="4,2 11,7 4,12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BowlIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 20" className={className} style={{ filter: 'url(#wobble)' }} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M2 10 Q2 16.5 9 16.5 Q16 16.5 16 10" />
        <line x1="1.5" y1="10" x2="16.5" y2="10" />
        <path d="M6 6 Q6 4 7.5 3" />
        <path d="M11 6 Q11 4 9.5 3" />
      </g>
    </svg>
  )
}

function LadderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 20" className={className} style={{ filter: 'url(#wobble)' }} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <line x1="4" y1="1.5" x2="4" y2="18.5" />
        <line x1="12" y1="1.5" x2="12" y2="18.5" />
        <line x1="4" y1="5.5" x2="12" y2="5.5" />
        <line x1="4" y1="10" x2="12" y2="10" />
        <line x1="4" y1="14.5" x2="12" y2="14.5" />
      </g>
    </svg>
  )
}

function DiceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" className={className} style={{ filter: 'url(#wobble)' }} aria-hidden>
      <rect x="1.2" y="1.2" width="15.6" height="15.6" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <g fill="currentColor">
        <circle cx="5.2" cy="5.2" r="1.05" />
        <circle cx="12.8" cy="5.2" r="1.05" />
        <circle cx="9" cy="9" r="1.05" />
        <circle cx="5.2" cy="12.8" r="1.05" />
        <circle cx="12.8" cy="12.8" r="1.05" />
      </g>
    </svg>
  )
}

function ScrewIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 20" className={className} style={{ filter: 'url(#wobble)' }} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <circle cx="8" cy="5" r="4" />
        <line x1="4.5" y1="5" x2="11.5" y2="5" />
        <line x1="8" y1="9" x2="8" y2="18" />
        <line x1="5.8" y1="11.5" x2="10.2" y2="11.5" />
        <line x1="5.8" y1="14.5" x2="10.2" y2="14.5" />
      </g>
    </svg>
  )
}

function WindupKeyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 20" className={className} style={{ filter: 'url(#wobble)' }} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <circle cx="8" cy="4.2" r="2.8" />
        <line x1="8" y1="7" x2="8" y2="15" />
        <line x1="4" y1="15" x2="12" y2="15" />
        <line x1="4" y1="15" x2="4" y2="17.5" />
        <line x1="12" y1="15" x2="12" y2="17.5" />
      </g>
    </svg>
  )
}

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F5F0E6] px-6 py-20 sm:px-12">
      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .grain {
          position: fixed; inset: 0; pointer-events: none; opacity: 0.05; mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 180px 180px;
        }
      `}</style>
      <div className="grain" />
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <filter id="wobble" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.045 0.055" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="wobbleBig" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.015 0.02" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div className="relative mx-auto max-w-2xl">
        <header className="relative mb-16 sm:mb-20">
          <div
            className="mb-5 flex items-center gap-2.5"
            style={{ animation: 'rise 0.7s ease both' }}
          >
            <span className="h-2 w-2 rotate-45" style={{ background: ACCENT, filter: 'url(#wobble)' }} />
            <span
              className={`${mono.className} text-[11px] tracking-[0.25em] text-black/45`}
              style={{ filter: 'url(#wobble)' }}
            >
              사내 업무 도구
            </span>
          </div>

          <h1
            className={`${gowunBatang.className} leading-[1.05] text-[#1F1B16]`}
            style={{ animation: 'rise 0.7s ease 0.08s both' }}
          >
            <span className="block text-[26px] sm:text-[32px]" style={{ filter: 'url(#wobble)' }}>
              막내,
            </span>
            <span className="block text-[92px] sm:text-[140px]" style={{ filter: 'url(#wobbleBig)' }}>
              Yaho~
            </span>
          </h1>

          <div
            className="absolute right-0 top-0 hidden h-[88px] w-[88px] items-center justify-center sm:flex"
            style={{ animation: 'rise 0.8s ease 0.2s both' }}
          >
            <div
              className="absolute inset-0 rounded-full border"
              style={{ borderColor: `${ACCENT}B3`, transform: 'rotate(-10deg)', filter: 'url(#wobble)' }}
            />
            <div
              className={`${mono.className} relative text-center text-[10px] leading-tight tracking-widest`}
              style={{ color: `${ACCENT}CC`, filter: 'url(#wobble)' }}
            >
              TOOLKIT
              <br />
              <span className="text-[8px] opacity-70">EST.2026</span>
            </div>
          </div>
        </header>

        <div
          className="mb-2 h-px w-full bg-black/15"
          style={{ animation: 'rise 0.7s ease 0.25s both', filter: 'url(#wobble)' }}
        />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
          {entries.map((entry, i) => {
            const cardStyle = { animation: `rise 0.6s ease ${0.3 + i * 0.08}s both` }
            const borderStyle = {
              borderRadius: CARD_RADIUS,
              filter: 'url(#wobble)',
            }
            const content = (
              <div className="relative flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between">
                  <span
                    className={`${mono.className} text-sm tracking-wider transition-colors duration-300 ${
                      entry.soon ? 'text-black/30' : 'text-black/35 group-hover:text-[#BF3A2C]'
                    }`}
                    style={{ filter: 'url(#wobble)' }}
                  >
                    {entry.soon ? '+' : entry.no}
                  </span>
                  {!entry.soon && (
                    <HandArrow className="-translate-x-1 text-black/25 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-hover:text-[#BF3A2C]" />
                  )}
                </div>

                <h2
                  className={`${gowunBatang.className} text-[22px] leading-tight ${
                    entry.soon ? 'text-black/35' : 'text-[#1F1B16]'
                  }`}
                  style={{ filter: 'url(#wobble)' }}
                >
                  {entry.title}
                </h2>

                <p
                  className={`${gowunDodum.className} text-[13px] leading-relaxed ${
                    entry.soon ? 'text-black/35' : 'text-black/55'
                  }`}
                  style={{ filter: 'url(#wobble)' }}
                >
                  {entry.desc}
                </p>

                <span
                  className={`${mono.className} mt-1 inline-block w-fit rounded-full border px-2 py-0.5 text-[9px] tracking-widest ${
                    entry.soon ? 'border-black/10 text-black/30' : 'border-black/15 text-black/45'
                  }`}
                  style={{ filter: 'url(#wobble)' }}
                >
                  {entry.tag}
                </span>
              </div>
            )

            if (entry.soon) {
              return (
                <div key={entry.no} className="group relative block" style={cardStyle}>
                  <div className="absolute inset-0 border border-dashed border-black/20" style={borderStyle} />
                  {content}
                </div>
              )
            }

            return (
              <Link key={entry.no} href={entry.href} className="group relative block" style={cardStyle}>
                <div
                  className="absolute inset-0 border border-black/25 transition-colors duration-300 group-hover:border-[#BF3A2C]/60 group-hover:bg-black/[0.02]"
                  style={borderStyle}
                />
                {content}
              </Link>
            )
          })}
        </div>

        <div className="mt-14 flex items-center gap-5" style={{ animation: 'rise 0.6s ease 0.6s both' }}>
          <Link href="/lunch-preview" className="group/hidden relative text-black/25 transition-colors duration-300 hover:text-[#BF3A2C]">
            <BowlIcon className="h-5 w-5 transition-transform duration-300 group-hover/hidden:-rotate-6" />
            <span
              className={`${gowunDodum.className} pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-[11px] text-black/45 opacity-0 transition-opacity duration-300 group-hover/hidden:opacity-100`}
              style={{ filter: 'url(#wobble)' }}
            >
              점메추
            </span>
          </Link>

          <div className="group/hidden relative cursor-default text-black/25 transition-colors duration-300 hover:text-black/45">
            <LadderIcon className="h-5 w-5 transition-transform duration-300 group-hover/hidden:-rotate-6" />
            <span
              className={`${gowunDodum.className} pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-[11px] text-black/45 opacity-0 transition-opacity duration-300 group-hover/hidden:opacity-100`}
              style={{ filter: 'url(#wobble)' }}
            >
              사다리타기
            </span>
          </div>

          <div className="group/hidden relative cursor-default text-black/25 transition-colors duration-300 hover:text-black/45">
            <DiceIcon className="h-5 w-5 transition-transform duration-300 group-hover/hidden:rotate-12" />
            <span
              className={`${gowunDodum.className} pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-[11px] text-black/45 opacity-0 transition-opacity duration-300 group-hover/hidden:opacity-100`}
              style={{ filter: 'url(#wobble)' }}
            >
              주루마블
            </span>
          </div>

          <span className="text-black/10">
            <ScrewIcon className="h-5 w-5" />
          </span>
          <span className="text-black/10">
            <WindupKeyIcon className="h-5 w-5" />
          </span>
        </div>
      </div>
    </main>
  )
}
