import { NextResponse } from 'next/server'

const SYSTEM_PROMPT = `あなたはユーザーの行動データを読み解く、洞察力のあるパーソナルAIです。
毎日のデータから、占いや日記のように「今日のあなた」を温かく、でも鋭く描写してください。

以下のルールに従ってください：
- 友達が書いてくれた日記のようなトーン
- データに基づく具体的な洞察を含める
- 「なぜそう動いたのか」の仮説を提示する
- 過去の傾向との比較があれば言及する
- 200-300字程度で簡潔に
- 出力は日本語で`

export async function POST(req: Request) {
    try {
        const { tripData } = await req.json()

        if (!tripData) {
            return NextResponse.json({ error: 'Trip data is required' }, { status: 400 })
        }

        // Build user message from passed trip data
        const userMessage = tripData.userMessage || `【今日のデータ】
- 日付: ${tripData.date || '不明'}
- 移動距離: ${tripData.distanceKm || 0}km
- 訪問スポット数: ${tripData.spotsCount || 0}
- 活動量スコア: ${tripData.activityScore || 0}/100
- 探索度: ${tripData.explorationRate || 0}
- 滞留傾向: ${tripData.dwellTendency || 0}
- 行動多様性: ${tripData.diversityScore || 0}`

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
            // Mock: generate a realistic diary from the data
            const dist = tripData.distanceKm || 0
            const spots = tripData.spotsCount || 0
            const score = tripData.activityScore || 0
            diaryText = `今日は${tripData.date || 'この日'}の冒険。\n\n${dist > 0 ? `${dist.toFixed(1)}kmの道のりを歩いた一日。` : ''} ${spots > 0 ? `${spots}箇所のスポットを巡ったね。` : ''}\n\n${score > 50 ? 'なかなかアクティブに動いた日だった！\n体が動きたがっていたのかも。新しい刺激を求めて、\n自然と足が向いた先があったはず。' : 'ゆったりとしたペースで過ごした日みたい。\nこういう日は内省的になっている証拠。\n心が整理されていくのを感じていたのかもね。'}\n\n${(tripData.explorationRate || 0) > 0.5 ? '新しい場所への好奇心が光っていた日。\nまだ見ぬ世界を覗きたい気持ちが強かったみたい✨' : 'お気に入りの場所を大切にする一面が見えた日。\n安心できる場所がエネルギーの源になっているのかも。'}\n\n（※LLMキーを設定すると、より詳細で個性的な日記が生成されます）`
        }

        return NextResponse.json({
            success: true,
            diary: {
                text: diaryText,
                date: tripData.date || '不明',
                metrics: {
                    distance: (tripData.distanceKm || 0).toFixed(1),
                    activityScore: tripData.activityScore || 0,
                    explorationRate: (tripData.explorationRate || 0).toFixed(2),
                    dwellTendency: (tripData.dwellTendency || 0).toFixed(2),
                    spotsVisited: tripData.spotsCount || 0
                }
            }
        })

    } catch (error: unknown) {
        console.error('Diary generate API error:', error)
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
