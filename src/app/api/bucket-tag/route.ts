import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { url, memo } = await req.json()

        const content = url || memo || ''
        if (!content) return NextResponse.json({ tags: {} })

        const prompt = `以下のテキストを分析し、旅行計画に役立つタグをJSON形式で出力してください。

テキスト: "${content}"

以下の形式で厳密に出力し、他の文章は不要です：
{
  "place": "場所名（推測可能な場合）",
  "genre": "ジャンル（グルメ/観光/アクティビティ/ショッピング/宿泊/その他）",
  "budget": "予算感（安い/普通/高め/不明）",
  "mood": "雰囲気（カジュアル/おしゃれ/リラックス/アクティブ/不明）"
}`

        const currentLlm = process.env.CURRENT_LLM_API || 'openai'
        let resultStr = ''

        if (currentLlm === 'openai' && process.env.OPENAI_API_KEY) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' },
                    max_tokens: 200
                })
            })
            const data = await response.json()
            resultStr = data.choices?.[0]?.message?.content || ''

        } else if (currentLlm === 'gemini' && process.env.GEMINI_API_KEY) {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: 'application/json' }
                })
            })
            const data = await response.json()
            resultStr = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

        } else {
            // Mock tags
            const isFood = /食べ|カフェ|レストラン|ラーメン|肉|寿司|ランチ|ディナー/i.test(content)
            const isNature = /公園|山|海|自然|ハイキング|川/i.test(content)
            return NextResponse.json({
                tags: {
                    place: '不明',
                    genre: isFood ? 'グルメ' : isNature ? 'アクティビティ' : '観光',
                    budget: '不明',
                    mood: '不明'
                }
            })
        }

        try {
            const tags = JSON.parse(resultStr)
            return NextResponse.json({ tags })
        } catch {
            return NextResponse.json({ tags: { place: '不明', genre: 'その他', budget: '不明', mood: '不明' } })
        }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
