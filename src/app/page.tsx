'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { Plus, Trash2, Vote, CalendarDays } from 'lucide-react'

type Tab = 'vote' | 'schedule'

export default function Home() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('vote')

  // 투표 상태
  const [title, setTitle] = useState('')
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [multiSelect, setMultiSelect] = useState(false)
  const [loading, setLoading] = useState(false)

  // 일정 비교 상태
  const [schedTitle, setSchedTitle] = useState('')
  const [schedDesc, setSchedDesc] = useState('')
  const [schedLoading, setSchedLoading] = useState(false)
  const [selectedMonths, setSelectedMonths] = useState<number[]>([7, 8, 9])

  const toggleMonth = (m: number) => {
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b)
    )
  }

  const addOption = () => {
    if (options.length < 10) setOptions([...options, ''])
  }

  const removeOption = (i: number) => {
    if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i))
  }

  const updateOption = (i: number, value: string) => {
    const next = [...options]
    next[i] = value
    setOptions(next)
  }

  const handleCreateVote = async () => {
    if (!title.trim() || !question.trim()) {
      toast.error('제목과 질문을 입력해주세요.')
      return
    }
    const validOptions = options.filter((o) => o.trim())
    if (validOptions.length < 2) {
      toast.error('선택지를 2개 이상 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({ title, question, multi_select: multiSelect, status: 'waiting', type: 'vote' })
        .select()
        .single()

      if (roomError) throw roomError

      const { error: optError } = await supabase.from('options').insert(
        validOptions.map((label, i) => ({
          room_id: room.id,
          label: label.trim(),
          sort_order: i,
        }))
      )

      if (optError) throw optError

      toast.success('투표방이 생성됐어요!')
      router.push(`/admin/${room.id}?token=${room.admin_token}`)
    } catch {
      toast.error('투표방 생성에 실패했어요.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSchedule = async () => {
    if (!schedTitle.trim()) {
      toast.error('제목을 입력해주세요.')
      return
    }
    if (selectedMonths.length === 0) {
      toast.error('표시할 월을 1개 이상 선택해주세요.')
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
          months: selectedMonths,
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            {tab === 'vote' ? <Vote className="w-7 h-7 text-white" /> : <CalendarDays className="w-7 h-7 text-white" />}
          </div>
          <h1 className="text-3xl font-bold text-slate-900">실시간 투표</h1>
          <p className="text-slate-500 mt-2">QR 코드로 참여하는 실시간 투표 + 일정 비교</p>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-4">
          <button
            onClick={() => setTab('vote')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === 'vote' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Vote className="w-4 h-4" /> 투표 만들기
          </button>
          <button
            onClick={() => setTab('schedule')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === 'schedule' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <CalendarDays className="w-4 h-4" /> 일정 비교
          </button>
        </div>

        {tab === 'vote' ? (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-lg">새 투표 만들기</CardTitle>
              <CardDescription>투표방을 만들고 QR 코드로 공유하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">투표 제목</Label>
                <Input
                  id="title"
                  placeholder="예: 2024년 팀 워크샵 장소 선정"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="question">질문</Label>
                <Textarea
                  id="question"
                  placeholder="예: 이번 워크샵 장소로 어디가 좋을까요?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-3">
                <Label>선택지</Label>
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder={`선택지 ${i + 1}`}
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                    />
                    {options.length > 2 && (
                      <Button variant="ghost" size="icon" onClick={() => removeOption(i)}>
                        <Trash2 className="w-4 h-4 text-slate-400" />
                      </Button>
                    )}
                  </div>
                ))}
                {options.length < 10 && (
                  <Button variant="outline" size="sm" onClick={addOption} className="w-full">
                    <Plus className="w-4 h-4 mr-1" /> 선택지 추가
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <input
                  id="multi"
                  type="checkbox"
                  checked={multiSelect}
                  onChange={(e) => setMultiSelect(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <Label htmlFor="multi" className="cursor-pointer text-sm">
                  복수 선택 허용
                </Label>
              </div>

              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base"
                onClick={handleCreateVote}
                disabled={loading}
              >
                {loading ? '생성 중...' : '투표방 만들기'}
              </Button>
            </CardContent>
          </Card>
        ) : (
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
                <Label>표시할 월 선택</Label>
                <div className="grid grid-cols-6 gap-1.5">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMonth(m)}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedMonths.includes(m)
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {m}월
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500">선택한 월만 캘린더에 표시돼요. 나중에는 바꿀 수 없어요.</p>
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
        )}
      </div>
    </div>
  )
}
