import { NextResponse } from 'next/server'

// 簡易的なプロンプト生成関数
const generatePrompt = (profileJson: string) => `
あなたはプロのキャリアカウンセラーAIです。
以下の「旅行中の行動データから抽出された個人の特性プロファイルJSON」を読み解き、
BigFiveやキャリア理論に基づいて、この人に最適なキャリア提案を生成してください。

【ユーザープロファイルJSON】
${profileJson}

以下のフォーマット（JSON形式）で厳密に出力してください。その他の文章は不要です。
{
  "fit_industries": ["業界名1", "業界名2", "業界名3"],
  "fit_work_style": ["働き方1", "働き方2", "働き方3"],
  "fit_org_culture": ["組織文化1", "組織文化2", "組織文化3"],
  "growth_notes": "成長のためのアドバイスや注意点（200文字程度）",
  "reasoning": "なぜこの提案になったのか、プロファイルからの根拠（200文字程度）"
}
`

export async function POST(req: Request) {
    try {
        const { profileData } = await req.json()

        if (!profileData) {
            return NextResponse.json({ error: 'Profile data is required' }, { status: 400 })
        }

        const currentLlm = process.env.CURRENT_LLM_API || 'openai'
        const prompt = generatePrompt(JSON.stringify(profileData, null, 2))

        let resultJsonStr = null

        // OpenAI (ChatGPT) 連携例
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
                    response_format: { type: 'json_object' }
                })
            })
            const data = await response.json()
            resultJsonStr = data.choices[0].message.content

            // Anthropic (Claude) 連携例
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
                    max_tokens: 1000,
                    messages: [{ role: 'user', content: prompt }]
                })
            })
            const data = await response.json()
            // Claudeが余計な文字を入れる場合を考慮して抽出するロジックが必要だがMVPでは簡易化
            resultJsonStr = data.content[0].text

            // Gemini 連携例
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
            resultJsonStr = data.candidates[0].content.parts[0].text

            // APIキーがない場合のモックレスポンス
        } else {
            console.warn(`[Utrip] LLM ${currentLlm} is not configured. Falling back to mock.`)
            resultJsonStr = JSON.stringify({
                fit_industries: ["IT/Web系", "リサーチ・企画", "クリエイティブ"],
                fit_work_style: ["裁量労働制", "リモートワーク中心", "プロジェクトベース"],
                fit_org_culture: ["フラットでオープン", "新しい技術への投資に積極的", "自律性が尊重される"],
                growth_notes: "（モック）探求心が強いため、専門性を深く掘り下げる一方で、時折全体像を見渡す意識を持つとより良いパフォーマンスを発揮できます。",
                reasoning: "（モック）探索性スコアが高く没入要素が見られるため、自律的に動ける環境が適しています。"
            })
        }

        try {
            const parsedResult = JSON.parse(resultJsonStr)
            return NextResponse.json({ success: true, suggestion: parsedResult })
        } catch (e) {
            console.error('Failed to parse LLM JSON response:', resultJsonStr)
            return NextResponse.json({ error: 'LLM returned invalid JSON' }, { status: 500 })
        }

    } catch (error: any) {
        console.error('Career suggest API error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
