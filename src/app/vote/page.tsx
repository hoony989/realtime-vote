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
import { ArrowLeft, Plus, Trash2, Vote } from 'lucide-react'

export default function CreateVotePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [multiSelect, setMultiSelect] = useState(false)
  const [loading, setLoading] = useState(false)

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> 도구함으로
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <Vote className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">라이브 투표</h1>
          <p className="text-slate-500 mt-2">QR 코드로 참여하는 실시간 투표</p>
        </div>

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
      </div>
    </div>
  )
}
