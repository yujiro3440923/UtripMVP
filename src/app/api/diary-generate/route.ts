import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SYSTEM_PROMPT = `あなたはユーザーの行動データを読み解く、洞察力のあるパーソナルAIです。
毎日のデータから、占いや日記のように「今日のあなた」を温かく、でも鋭く描写してください。

以下のルールに従ってください：
- 友達が書いてくれた日記のようなトーン
- データに基づく具体的な洞察を含める
- 「なぜそう動いたのか」の仮説を提示する
- 過去の傾向との比較があれば言及する
- 200-300字程度で簡潔に
- 出力は日本語で`

function buildUserMessage(tripData: {
    date: string
    startTime: string
    endTime: string
    totalDistanceKm: number
    spots: Array<{ name: string; arrivalTime: string; departureTime: string; durationMin: number }>
    activityScore: number
    explorationRate: number
    dwellTendency: number
    diversityScore: number
    totalSpots: number
    newSpots: number
}) {
    const spotsText = tripData.spots
        .map((s, i) => `  ${i + 1}. ${s.name || '不明なスポット'} (${s.arrivalTime}-${s.departureTime}, ${s.durationMin}分)`)
        .join('\n')

    return `【今日のデータ】
- 日付: ${tripData.date}
- 外出開始: ${tripData.startTime} / 帰宅: ${tripData.endTime}
- 移動距離: ${tripData.totalDistanceKm.toFixed(1)}km
- 訪問スポット:
${spotsText}
- 活動量スコア: ${tripData.activityScore}/100
- 探索度: ${tripData.explorationRate.toFixed(2)}（${tripData.newSpots}/${tripData.totalSpots}が新規スポット）
- 滞留傾向: ${tripData.dwellTendency.toFixed(2)}${tripData.spots.length > 0 ? `（${tripData.spots.reduce((max, s) => s.durationMin > max.durationMin ? s : max, tripData.spots[0]).name}に長くいた）` : ''}
- 行動多様性: ${tripData.diversityScore.toFixed(1)}`
}

export async function POST(req: Request) {
    try {
        const { tripId, userId } = await req.json()

        if (!tripId) {
            return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 })
        }

        // 1. Fetch trip info
        const { data: trip } = await supabaseAdmin
            .from('trips')
            .select('*')
            .eq('id', tripId)
            .single()

        if (!trip) {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
        }

        // 2. Fetch GPS data points
        const { data: dataPoints } = await supabaseAdmin
            .from('data_points')
            .select('*')
            .eq('trip_id', tripId)
            .order('timestamp', { ascending: true })

        // 3. Fetch detected spots
        const { data: spots } = await supabaseAdmin
            .from('detected_spots')
            .select('*')
            .eq('trip_id', tripId)
            .order('arrival_time', { ascending: true })

        // 4. Fetch trip analysis if exists
        const { data: analysis } = await supabaseAdmin
            .from('trip_analyses')
            .select('*')
            .eq('trip_id', tripId)
            .single()

        // 5. Calculate metrics from available data
        const points = dataPoints || []
        const detectedSpots = spots || []

        // Calculate total distance
        let totalDistanceKm = 0
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1]
            const curr = points[i]
            const R = 6371 // Earth radius in km
            const dLat = (curr.lat - prev.lat) * Math.PI / 180
            const dLon = (curr.lng - prev.lng) * Math.PI / 180
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(prev.lat * Math.PI / 180) * Math.cos(curr.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2
            totalDistanceKm += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        }

        // Time range
        const tripDate = trip.created_at ? new Date(trip.created_at).toLocaleDateString('ja-JP') : '不明'
        const startTime = points.length > 0 ? new Date(points[0].timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '不明'
        const endTime = points.length > 0 ? new Date(points[points.length - 1].timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '不明'

        // Spots data
        const formattedSpots = detectedSpots.map(s => ({
            name: s.place_name || `スポット(${s.lat.toFixed(4)}, ${s.lng.toFixed(4)})`,
            arrivalTime: new Date(s.arrival_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
            departureTime: new Date(s.departure_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
            durationMin: s.duration_minutes
        }))

        // Activity & exploration scores
        const activityScore = Math.min(100, Math.round(totalDistanceKm * 8 + detectedSpots.length * 10))
        const explorationRate = analysis?.exploration_score ? Number(analysis.exploration_score) : (detectedSpots.length > 0 ? 0.5 : 0)
        const totalDwellTime = detectedSpots.reduce((sum, s) => sum + s.duration_minutes, 0)
        const maxDwellTime = detectedSpots.length > 0 ? Math.max(...detectedSpots.map(s => s.duration_minutes)) : 0
        const dwellTendency = totalDwellTime > 0 ? maxDwellTime / totalDwellTime : 0

        const tripData = {
            date: tripDate,
            startTime,
            endTime,
            totalDistanceKm,
            spots: formattedSpots,
            activityScore,
            explorationRate,
            dwellTendency,
            diversityScore: detectedSpots.length > 0 ? Math.min(1, detectedSpots.length / 3) : 0,
            totalSpots: detectedSpots.length,
            newSpots: Math.ceil(detectedSpots.length * explorationRate)
        }

        const userMessage = buildUserMessage(tripData)

        // 6. Call LLM
        const currentLlm = process.env.CURRENT_LLM_API || 'openai'
        let diaryText = ''

        if (currentLlm === 'openai' && process.env.OPENAI_API_KEY) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: userMessage }
                    ],
                    temperature: 0.8,
                    max_tokens: 600
                })
            })
            const data = await response.json()
            diaryText = data.choices?.[0]?.message?.content || ''

        } else if (currentLlm === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 600,
                    system: SYSTEM_PROMPT,
                    messages: [{ role: 'user', content: userMessage }]
                })
            })
            const data = await response.json()
            diaryText = data.content?.[0]?.text || ''

        } else if (currentLlm === 'gemini' && process.env.GEMINI_API_KEY) {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${userMessage}` }] }]
                })
            })
            const data = await response.json()
            diaryText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

        } else {
            // Mock response
            diaryText = `今日は${startTime}に動き出して、${formattedSpots.length > 0 ? formattedSpots[0].name + 'でゆっくり' : 'のんびりとスタート'}。\n\n${formattedSpots.length > 1 ? `その後、${formattedSpots.slice(1).map(s => s.name).join('、')}を巡ったね。` : ''}\n\n移動距離は${totalDistanceKm.toFixed(1)}km。${activityScore > 50 ? 'なかなかアクティブな一日だった！' : 'ゆったりとしたペースの一日だったみたい。'}\n\n${dwellTendency > 0.5 ? '特定の場所にじっくり腰を据えるタイプの日だったね。気に入った場所を深く楽しむ姿勢が見える。' : 'いろんな場所をテンポよく回っていたみたい。好奇心旺盛な一日！'}\n\n${explorationRate > 0.5 ? '新しい場所への挑戦が多かったのも印象的。冒険心が光ってるね✨' : ''}（※モックレスポンス：LLMキーを設定すると、より詳細な日記が生成されます）`
        }

        return NextResponse.json({
            success: true,
            diary: {
                text: diaryText,
                date: tripDate,
                metrics: {
                    distance: totalDistanceKm.toFixed(1),
                    activityScore,
                    explorationRate: explorationRate.toFixed(2),
                    dwellTendency: dwellTendency.toFixed(2),
                    spotsVisited: detectedSpots.length
                }
            }
        })

    } catch (error: unknown) {
        console.error('Diary generate API error:', error)
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
