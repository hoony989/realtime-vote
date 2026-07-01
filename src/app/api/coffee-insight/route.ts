import { NextResponse } from 'next/server'
import { generateClaudeText } from '@/lib/ai'

type CoffeeOrderInput = {
  name: string
  menu: string
  size: string
  temperature?: string
  options: string[]
  quantity: number
  memo: string
}

type GroupedOrder = {
  menu: string
  size: string
  temperature: string
  quantity: number
  names: string[]
  options: string[]
  memos: string[]
}

function groupOrders(orders: CoffeeOrderInput[]): GroupedOrder[] {
  const map = new Map<string, GroupedOrder>()

  for (const order of orders) {
    const temperature = order.temperature ?? 'ICE'
    const key = `${order.menu}|${order.size}|${temperature}|${order.options.join(',')}`
    const existing = map.get(key)
    if (existing) {
      existing.quantity += order.quantity
      existing.names.push(order.name)
      if (order.memo.trim()) existing.memos.push(`${order.name}: ${order.memo}`)
    } else {
      map.set(key, {
        menu: order.menu,
        size: order.size,
        temperature,
        quantity: order.quantity,
        names: [order.name],
        options: order.options,
        memos: order.memo.trim() ? [`${order.name}: ${order.memo}`] : [],
      })
    }
  }

  return [...map.values()].sort((a, b) => b.quantity - a.quantity)
}

function buildLocalInsight(orders: CoffeeOrderInput[]): string {
  const totalCups = orders.reduce((sum, o) => sum + o.quantity, 0)
  const grouped = groupOrders(orders)
  const memoLines = orders.filter((o) => o.memo.trim()).map((o) => `- ${o.name}님: ${o.memo}`)

  const orderLines = grouped.map((g) => {
    const opts = g.options.length > 0 ? ` (${g.options.join(', ')})` : ''
    const who = g.names.length > 1 ? ` — ${g.names.join(', ')}님` : ` — ${g.names[0]}님`
    return `· ${g.menu} ${g.size} ${g.temperature} ${g.quantity}잔${opts}${who}`
  })

  const lines = [
    `형님들~ 지금 ${orders.length}건, 총 ${totalCups}잔 모였어요!`,
    '',
    '이렇게 주문하시면 편할 것 같아요',
    ...orderLines,
  ]

  if (memoLines.length > 0) {
    lines.push('', '메모 챙기실 거예요', ...memoLines)
  }

  const top = grouped[0]
  lines.push(
    '',
    '막내 한마디',
    top
      ? `${top.menu} ${top.size} ${top.temperature}가 제일 많아요. 같은 메뉴끼리 묶어서 말씀드리면 바로 이해하실 거예요. 추천드려요!`
      : '주문 다시 한번 확인 부탁드려요~',
  )

  return lines.join('\n')
}

function buildCoffeePrompt(orders: CoffeeOrderInput[]): string {
  const orderLines = orders
    .map((o) => {
      const temp = o.temperature ?? 'ICE'
      const opts = o.options.length > 0 ? `, 추가: ${o.options.join(', ')}` : ''
      const memo = o.memo ? `, 메모: ${o.memo}` : ''
      return `- ${o.name}: ${o.menu} ${o.size} ${temp} ${o.quantity}잔${opts}${memo}`
    })
    .join('\n')

  const totalCups = orders.reduce((sum, o) => sum + o.quantity, 0)

  return `당신은 사내에서 커피 단체주문을 취합하는 친근한 '막내' 직원입니다.
아래 주문 목록을 보고, 카페에서 주문하는 담당자가 바로 읽을 수 있게 짧게 정리해주세요.

말투 가이드:
- "형님들~", "추천드려요", "이렇게 주문하시면 돼요" 같은 친근한 말투
- 딱딱한 보고서/번호 목록 형식(1. 2. 3.)은 쓰지 않기
- 5~8줄 이내로 간결하게
- 같은 메뉴는 묶어서 알려주기

총 ${orders.length}건 · ${totalCups}잔

주문:
${orderLines}

출력 예시 느낌:
형님들~ 총 N잔 모였어요!
· 아메리카노 Grande ICE 2잔 (연하게) — 홍길동, 김철수님
메모 있으면 한 줄로
막내 한마디로 실용 팁 한 줄`
}

async function buildAiInsight(orders: CoffeeOrderInput[]): Promise<string | null> {
  return generateClaudeText(buildCoffeePrompt(orders))
}

export async function POST(req: Request) {
  try {
    const { orders } = (await req.json()) as { orders: CoffeeOrderInput[] }

    if (!orders?.length) {
      return NextResponse.json({ error: '주문이 없습니다.' }, { status: 400 })
    }

    let insight: string | null = null
    try {
      insight = await buildAiInsight(orders)
    } catch (error) {
      console.error('Coffee AI insight error:', error)
    }

    return NextResponse.json({ insight: insight ?? buildLocalInsight(orders) })
  } catch (error) {
    console.error('Coffee insight error:', error)
    return NextResponse.json({ error: '인사이트 생성 실패' }, { status: 500 })
  }
}