import Link from 'next/link'
import { Gowun_Batang, Gowun_Dodum, JetBrains_Mono } from 'next/font/google'

const gowunBatang = Gowun_Batang({ subsets: ['latin'], weight: '700' })
const gowunDodum = Gowun_Dodum({ subsets: ['latin'], weight: '400' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: '500' })

const ACCENT = '#BF3A2C'

const entries = [
  {
    no: '01',
    title: '라이브 투표',
    desc: '질문을 올리고 QR로 모아 실시간 결과를 확인해요',
    tag: 'LIVE',
    href: '/vote',
  },
  {
    no: '02',
    title: '일정 조율',
    desc: '휴가와 일정을 모아 겹치는 날을 한눈에 확인해요',
    tag: 'SCHEDULE',
    href: '/schedule',
  },
  {
    no: '03',
    title: '다음 도구',
    desc: '곧 새로운 도구가 추가될 예정이에요',
    tag: 'SOON',
    soon: true,
  },
] as const

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

      <div className="relative mx-auto max-w-2xl">
        <header className="relative mb-16 sm:mb-20">
          <div
            className="mb-5 flex items-center gap-2.5"
            style={{ animation: 'rise 0.7s ease both' }}
          >
            <span className="h-2 w-2 rotate-45" style={{ background: ACCENT }} />
            <span className={`${mono.className} text-[11px] tracking-[0.25em] text-black/45`}>
              사내 업무 도구
            </span>
          </div>

          <h1
            className={`${gowunBatang.className} leading-[1.05] text-[#1F1B16]`}
            style={{ animation: 'rise 0.7s ease 0.08s both' }}
          >
            <span className="block text-[26px] sm:text-[32px]">막내,</span>
            <span className="block text-[92px] sm:text-[140px]">Yaho~</span>
          </h1>

          <div
            className="absolute right-0 top-0 hidden h-[88px] w-[88px] -rotate-[10deg] items-center justify-center rounded-full border sm:flex"
            style={{ animation: 'rise 0.8s ease 0.2s both', borderColor: `${ACCENT}B3` }}
          >
            <div
              className={`${mono.className} text-center text-[10px] leading-tight tracking-widest`}
              style={{ color: `${ACCENT}CC` }}
            >
              TOOLKIT
              <br />
              <span className="text-[8px] opacity-70">EST.2026</span>
            </div>
          </div>
        </header>

        <div
          className="mb-2 h-px w-full bg-black/10"
          style={{ animation: 'rise 0.7s ease 0.25s both' }}
        />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
          {entries.map((entry, i) => {
            const cardClass = `group relative flex flex-col gap-3 rounded-2xl border p-5 transition-colors duration-300 ${
              entry.soon
                ? 'border-dashed border-black/15'
                : 'border-black/10 hover:border-black/25 hover:bg-black/[0.02]'
            }`
            const cardStyle = { animation: `rise 0.6s ease ${0.3 + i * 0.08}s both` }
            const content = (
              <>
                <div className="flex items-center justify-between">
                  <span
                    className={`${mono.className} text-sm tracking-wider transition-colors duration-300 ${
                      entry.soon ? 'text-black/30' : 'text-black/35 group-hover:text-[#BF3A2C]'
                    }`}
                  >
                    {entry.soon ? '+' : entry.no}
                  </span>
                  {!entry.soon && (
                    <span
                      className="-translate-x-1 text-base text-black/25 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-hover:text-[#BF3A2C]"
                      aria-hidden
                    >
                      →
                    </span>
                  )}
                </div>

                <h2
                  className={`${gowunBatang.className} text-[22px] leading-tight ${
                    entry.soon ? 'text-black/35' : 'text-[#1F1B16]'
                  }`}
                >
                  {entry.title}
                </h2>

                <p
                  className={`${gowunDodum.className} text-[13px] leading-relaxed ${
                    entry.soon ? 'text-black/35' : 'text-black/55'
                  }`}
                >
                  {entry.desc}
                </p>

                <span
                  className={`${mono.className} mt-1 inline-block w-fit rounded-full border px-2 py-0.5 text-[9px] tracking-widest ${
                    entry.soon ? 'border-black/10 text-black/30' : 'border-black/15 text-black/45'
                  }`}
                >
                  {entry.tag}
                </span>
              </>
            )

            if (entry.soon) {
              return (
                <div key={entry.no} className={cardClass} style={cardStyle}>
                  {content}
                </div>
              )
            }

            return (
              <Link key={entry.no} href={entry.href} className={cardClass} style={cardStyle}>
                {content}
              </Link>
            )
          })}
        </div>

        <div
          className={`${mono.className} mt-12 flex items-center gap-2 text-[11px] tracking-widest text-black/35`}
          style={{ animation: 'rise 0.6s ease 0.6s both' }}
        >
          <span className="h-1.5 w-1.5 rotate-45" style={{ background: `${ACCENT}99` }} />
          메뉴는 계속 추가됩니다
        </div>
      </div>
    </main>
  )
}
