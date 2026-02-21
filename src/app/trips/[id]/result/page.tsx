'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { analyzeTripData, TraitAnalysisResult } from '@/lib/analysis/traitAnalyzer'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'
import { ArrowLeft, Sparkles, AlertCircle, Briefcase, Heart, Building, TrendingUp } from 'lucide-react'

export default function ResultPage() {
    const params = useParams()
    const router = useRouter()
    const tripId = params.id as string

    const [loading, setLoading] = useState(true)
    const [analysisState, setAnalysisState] = useState('データの集計中...')
    const [traits, setTraits] = useState<TraitAnalysisResult | null>(null)
    const [suggestion, setSuggestion] = useState<Record<string, any> | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const runAnalysis = async () => {
            try {
                setAnalysisState('GPSと気分データの統合中...')
                // 1. Fetch remote data (MVP version - simplified)
                const [spotsRes, pointsRes] = await Promise.all([
                    supabase.from('detected_spots').select('*').eq('trip_id', tripId),
                    supabase.from('data_points').select('*').eq('trip_id', tripId)
                ])

                const spots = spotsRes.data || []
                const points = pointsRes.data || []

                setAnalysisState('6軸特性プロファイルの生成中...')
                // 2. Run Trait Analysis
                const analysisResult = analyzeTripData(spots, points, [])
                setTraits(analysisResult)

                // （本来ならここで trip_analyses, personal_profiles テーブルに保存する処理を入れる）
                setTimeout(() => { }, 500) // UI用ディレイ

                setAnalysisState('AIキャリアカウンセラーに相談中...')
                // 3. Call LLM API Route
                const res = await fetch('/api/career-suggest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ profileData: analysisResult })
                })

                if (!res.ok) throw new Error('AI提案の取得に失敗しました')

                const data = await res.json()
                setSuggestion(data.suggestion)

            } catch (err: unknown) {
                console.error(err)
                if (err instanceof Error) {
                    setError(err.message)
                } else {
                    setError('予期せぬエラーが発生しました。')
                }
            } finally {
                setLoading(false)
            }
        }

        runAnalysis()
    }, [tripId])


    if (loading) return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-4 border-neutral-800 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-teal-500 rounded-full border-t-transparent animate-spin"></div>
                <Sparkles className="absolute inset-0 m-auto text-teal-400 animate-pulse" size={32} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">プロファイルを解析中...</h2>
            <p className="text-teal-400 font-medium animate-pulse">{analysisState}</p>
        </div>
    )

    if (error) return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">エラーが発生しました</h2>
            <p className="text-neutral-400 mb-6">{error}</p>
            <button onClick={() => router.push('/')} className="px-6 py-2 bg-neutral-800 rounded-full">ホームに戻る</button>
        </div>
    )

    // Radar Chart Data Prep
    const radarData = [
        { subject: '没入の深さ', A: (traits?.immersion_triggers.confidence || 0) * 100, fullMark: 100 },
        { subject: '探索性', A: (traits?.exploration_score || 0) * 100, fullMark: 100 },
        { subject: '内・外向性', A: ((traits?.social_energy || 0) + 1) * 50, fullMark: 100 }, // -1~1 to 0~100
        { subject: '不確実性耐性', A: (traits?.uncertainty_tolerance || 0) * 100, fullMark: 100 },
        { subject: '直感(感情)重視', A: traits?.decision_style === 'spontaneous' ? 80 : 30, fullMark: 100 },
        { subject: '活動量', A: 70, fullMark: 100 }, // Mock
    ]

    return (
        <div className="min-h-screen bg-neutral-950 text-white pb-24 selection:bg-teal-500/30">
            {/* Header */}
            <header className="sticky top-0 bg-neutral-950/80 backdrop-blur-xl z-20 border-b border-white/5 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/')} className="p-2 text-neutral-400 hover:text-white bg-white/5 rounded-full">
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="font-bold text-lg">分析結果</h1>
                </div>
                <div className="bg-teal-500/10 text-teal-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Sparkles size={12} /> AI Analyzed
                </div>
            </header>

            <main className="max-w-xl mx-auto p-6 space-y-10">

                {/* Section 1: 6軸レーダーチャート */}
                <section className="bg-gradient-to-br from-neutral-900 to-neutral-800/50 rounded-3xl p-6 border border-white/10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl"></div>

                    <h2 className="text-xl font-black mb-1 flex items-center gap-2 relative z-10">あなたのキャリア特性</h2>
                    <p className="text-xs text-neutral-400 font-medium mb-6 relative z-10">旅行での行動パターンから抽出された6つの基礎特性</p>

                    <div className="h-64 w-full relative z-10 -ml-2 mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="#333" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 11, fontWeight: 'bold' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="本人" dataKey="A" stroke="#14b8a6" strokeWidth={3} fill="#14b8a6" fillOpacity={0.3} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-3 relative z-10">
                        <div className="bg-neutral-950/50 p-3 rounded-2xl border border-white/5">
                            <p className="text-xs text-neutral-500 font-bold mb-1">主要な没入トリガー</p>
                            <p className="font-bold text-teal-400">{traits?.immersion_triggers.primary === 'unknown' ? 'データ不足' : traits?.immersion_triggers.primary}</p>
                        </div>
                        <div className="bg-neutral-950/50 p-3 rounded-2xl border border-white/5">
                            <p className="text-xs text-neutral-500 font-bold mb-1">探索スタイル</p>
                            <p className="font-bold text-blue-400">{traits?.exploration_score && traits.exploration_score > 0.6 ? '広く探索する派' : '深く掘り下げる派'}</p>
                        </div>
                    </div>
                </section>

                {/* Section 2: AIキャリア提案 */}
                {suggestion && (
                    <section className="space-y-6">
                        <h2 className="text-2xl font-black flex items-center gap-3">
                            <span className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                <Sparkles className="text-white" size={20} />
                            </span>
                            AIキャリア提案
                        </h2>

                        {/* 根拠 */}
                        <div className="bg-purple-950/20 border border-purple-500/20 rounded-2xl p-5 text-sm leading-relaxed text-purple-100">
                            <span className="font-bold text-purple-400 mb-2 block">💡 なぜこの提案？</span>
                            {suggestion.reasoning || 'あなたの旅行中の「探索性」や「没入条件」のデータ傾向を元に、最も能力を発揮しやすい環境を導き出しました。'}
                        </div>

                        {/* 向いている業界 */}
                        <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6">
                            <h3 className="font-bold text-neutral-400 text-sm flex items-center gap-2 mb-4">
                                <Briefcase size={16} className="text-blue-400" />
                                ポテンシャルを発揮しやすい業界 / 職種
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {suggestion.fit_industries?.map((item: string, i: number) => (
                                    <span key={i} className="bg-blue-500/10 text-blue-300 border border-blue-500/20 px-3 py-1.5 rounded-lg text-sm font-bold">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* 働き方 */}
                        <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6">
                            <h3 className="font-bold text-neutral-400 text-sm flex items-center gap-2 mb-4">
                                <Heart size={16} className="text-pink-400" />
                                フィットするワークスタイル
                            </h3>
                            <ul className="space-y-2">
                                {suggestion.fit_work_style?.map((item: string, i: number) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-neutral-200">
                                        <span className="text-pink-400 mt-0.5">•</span> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* 組織文化 */}
                        <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6">
                            <h3 className="font-bold text-neutral-400 text-sm flex items-center gap-2 mb-4">
                                <Building size={16} className="text-orange-400" />
                                適した組織文化・カルチャー
                            </h3>
                            <ul className="space-y-2">
                                {suggestion.fit_org_culture?.map((item: string, i: number) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-neutral-200">
                                        <span className="text-orange-400 mt-0.5">•</span> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* 成長メモ */}
                        <div className="bg-gradient-to-r from-neutral-900 to-neutral-900 border-l-4 border-teal-500 rounded-r-3xl p-6 shadow-lg">
                            <h3 className="font-bold text-teal-400 text-xs tracking-wider mb-2 flex items-center gap-1.5">
                                <TrendingUp size={14} /> ADVICE FOR GROWTH
                            </h3>
                            <p className="text-sm leading-relaxed text-neutral-200">
                                {suggestion.growth_notes}
                            </p>
                        </div>
                    </section>
                )}

            </main>

            {/* Bottom padding to prevent FAB overlap if added later */}
            <div className="h-10"></div>
        </div>
    )
}
