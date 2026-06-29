import { NextRequest, NextResponse } from 'next/server'

// SK T타워 (중구 을지로 65, 을지로3가역 근처)
const BASE_X = '126.9786'
const BASE_Y = '37.5666'
const RADIUS = '3000'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ documents: [] })

  const key = process.env.KAKAO_REST_API_KEY
  if (!key) return NextResponse.json({ error: 'Kakao key not configured' }, { status: 500 })

  const params = new URLSearchParams({
    query: q,
    x: BASE_X,
    y: BASE_Y,
    radius: RADIUS,
    category_group_code: 'FD6',
    sort: 'distance',
    size: '8',
  })

  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,
    { headers: { Authorization: `KakaoAK ${key}` } }
  )

  if (!res.ok) {
    const errBody = await res.text()
    console.error('[Kakao API error]', res.status, errBody)
    return NextResponse.json({ documents: [] })
  }
  const data = await res.json()
  return NextResponse.json(data)
}
