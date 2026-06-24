'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowLeft, CalendarDays } from 'lucide-react'

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR + 1]
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1)

function expandMonthRange(startYear: number, startMonth: number, endYear: number, endMonth: number): string[] {
  const result: string[] = []
  let y = startYear
  let m = startMonth
  let guard = 0
  while ((y < endYear || (y === endYear && m <= endMonth)) && guard < 24) {
    result.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
    guard += 1
  }
  return result
}

export default function CreateSchedulePage() {
  const router = useRouter()
  const [schedTitle, setSchedTitle] = useState('')
  const [schedDesc, setSchedDesc] = useState('')
  const [schedLoading, setSchedLoading] = useState(false)
  const [startYear, setStartYear] = useState(CURRENT_YEAR)
  const [startMonth, setStartMonth] = useState(7)
  const [endYear, setEndYear] = useState(CURRENT_YEAR)
  const [endMonth, setEndMonth] = useState(9)

  const handleCreateSchedule = async () => {
    if (!schedTitle.trim()) {
      toast.error('제목을 입력해주세요.')
      return
    }

    const months = expandMonthRange(startYear, startMonth, endYear, endMonth)
    if (months.length === 0) {
      toast.error('종료월이 시작월보다 빠를 수 없어요.')
      return
    }
    if (months.length > 12) {
      toast.error('한 번에 최대 12개월까지 선택할 수 있어요.')
      return
    }

    setSchedLoading(true)
    try {
      const { data: room, error } = await supabase
        .from('rooms')
        .insert({
          title: schedTitle,
          question: schedDesc.trim() || '휴가 일정을 등록해주세요.',
          multi_select: false,
          status: 'open',
          type: 'schedule',
          months,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('일정 비교방이 생성됐어요!')
      router.push(`/schedule/${room.id}`)
    } catch {
      toast.error('생성에 실패했어요.')
    } finally {
      setSchedLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> 도구함으로
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-600 rounded-2xl mb-4">
            <CalendarDays className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">일정 조율</h1>
          <p className="text-slate-500 mt-2">겹치는 일정을 한눈에 확인하세요</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-lg">일정 비교 방 만들기</CardTitle>
            <CardDescription>팀원들이 휴가 일정을 등록하고 겹치는 날짜를 한눈에 확인하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="sched-title">제목</Label>
              <Input
                id="sched-title"
                placeholder="예: 7월 휴가 일정 취합"
                value={schedTitle}
                onChange={(e) => setSchedTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sched-desc">설명 (선택)</Label>
              <Textarea
                id="sched-desc"
                placeholder="예: 7월 중 휴가 예정일을 모두 선택해주세요"
                value={schedDesc}
                onChange={(e) => setSchedDesc(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>표시할 기간 선택</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 w-7">시작</span>
                  <select
                    value={startYear}
                    onChange={(e) => setStartYear(Number(e.target.value))}
                    className="h-9 px-2 rounded-md border border-slate-300 bg-white text-sm"
                  >
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>{y}년</option>
                    ))}
                  </select>
                  <select
                    value={startMonth}
                    onChange={(e) => setStartMonth(Number(e.target.value))}
                    className="h-9 px-2 rounded-md border border-slate-300 bg-white text-sm"
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m}월</option>
                    ))}
                  </select>
                </div>
                <span className="text-slate-400">~</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 w-7">종료</span>
                  <select
                    value={endYear}
                    onChange={(e) => setEndYear(Number(e.target.value))}
                    className="h-9 px-2 rounded-md border border-slate-300 bg-white text-sm"
                  >
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>{y}년</option>
                    ))}
                  </select>
                  <select
                    value={endMonth}
                    onChange={(e) => setEndMonth(Number(e.target.value))}
                    className="h-9 px-2 rounded-md border border-slate-300 bg-white text-sm"
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m}월</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                연도가 달라도 괜찮아요 (예: 2026년 12월 ~ 2027년 3월). 최대 12개월까지 선택할 수 있고, 나중에는 바꿀 수 없어요.
              </p>
            </div>

            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <p className="text-sm text-emerald-700">
                ✅ 방을 만들면 QR 코드로 공유할 수 있어요. 팀원들이 달력에서 날짜를 선택하면 관리자 화면에서 겹치는 일정을 바로 확인할 수 있어요.
              </p>
            </div>

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base"
              onClick={handleCreateSchedule}
              disabled={schedLoading}
            >
              {schedLoading ? '생성 중...' : '일정 비교방 만들기'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
