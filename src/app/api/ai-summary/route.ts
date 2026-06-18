import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(req: Request) {
  try {
    const { question, options, opinions } = await req.json()

    const voteLines = options
      .sort((a: { count: number }, b: { count: number }) => b.count - a.count)
      .map((o: { label: string; count: number }) => `- ${o.label}: ${o.count}표`)
      .join('\n')

    const opinionLines = opinions.length > 0
      ? opinions.slice(0, 20).map((o: string, i: number) => `${i + 1}. ${o}`).join('\n')
      : '(의견 없음)'

    const prompt = `당신은 조직 내 투표 결과를 분석하는 전문가입니다. 아래 투표 결과와 참여자 의견을 바탕으로 핵심 인사이트를 한국어로 요약해주세요.

투표 질문: ${question}

투표 결과:
${voteLines}

참여자 의견:
${opinionLines}

요약 형식:
1. 핵심 결과 (2-3문장)
2. 주목할 점 (의견에서 발견되는 패턴이나 주요 키워드)
3. 시사점 (한 줄)

간결하고 명확하게 작성해주세요.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const summary = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ summary })
  } catch (error) {
    console.error('AI summary error:', error)
    return NextResponse.json({ error: 'AI 요약 생성 실패' }, { status: 500 })
  }
}
