'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { analyzeTripData, TraitAnalysisResult } from '@/lib/analysis/traitAnalyzer'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'
import { ArrowLeft, Sparkles, AlertCircle, Briefcase, Heart, Building, TrendingUp, Share2, BookOpen, MapPin, Footprints, Compass } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useTheme } from '@/providers/ThemeProvider'

export default function ResultPage() {
    const params = useParams()
    const router = useRouter()
    const tripId = params.id as string

    const [loading, setLoading] = useState(true)
    const [analysisState, setAnalysisState] = useState('データの集計中...')
    const [traits, setTraits] = useState<TraitAnalysisResult | null>(null)
    const [suggestion, setSuggestion] = useState<Record<string, any> | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [diary, setDiary] = useState<{ text: string; date: string; metrics: Record<string, any> } | null>(null)
    const [diaryLoading, setDiaryLoading] = useState(false)
    const { lightMode } = useTheme()
    const [spots, setSpots] = useState<any[]>([])
    const [points, setPoints] = useState<any[]>([])

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
                setSpots(spots)
                setPoints(points)

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
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden text-white">
            <div className="absolute inset-0 bg-gradient-to-tr from-teal-900/20 via-[#050505] to-purple-900/20 animate-gradient-xy z-0"></div>

            <div className="relative z-10 glass-effect-dark p-12 rounded-[3rem] flex flex-col items-center animate-fade-in-up border border-white/5 shadow-2xl">
                <div className="relative w-28 h-28 mb-10">
                    <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-2xl animate-pulse-glow"></div>
                    <div className="absolute inset-0 border-[3px] border-neutral-800 rounded-full"></div>
                    <div className="absolute inset-0 border-[3px] border-teal-400 rounded-full border-t-transparent animate-spin" style={{ animationDuration: '1.5s' }}></div>
                    <div className="absolute inset-0 border-[3px] border-purple-500 rounded-full border-b-transparent animate-spin mix-blend-screen" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
                    <Sparkles className="absolute inset-0 m-auto text-teal-300 animate-pulse drop-shadow-[0_0_15px_rgba(45,212,191,0.8)]" size={36} />
                </div>
                <h2 className="text-2xl font-black mb-3 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-teal-100 to-gray-300">プロファイルを解析中...</h2>
                <p className="text-teal-400 font-bold tracking-widest text-sm animate-pulse">{analysisState}</p>
            </div>
        </div>
    )

    if (error) return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
            <div className="glass-effect-dark p-10 rounded-[2.5rem] flex flex-col items-center max-w-sm w-full animate-fade-in-up border border-red-500/20 shadow-[0_20px_60px_-15px_rgba(239,68,68,0.2)]">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-white mb-3">エラーが発生しました</h2>
                <p className="text-neutral-400 mb-8 max-w-[250px] leading-relaxed text-sm">{error}</p>
                <button onClick={() => router.push('/')} className="w-full py-4.5 bg-white text-neutral-900 font-bold rounded-2xl hover:bg-neutral-200 transition-colors shadow-lg active:scale-95">ホームに戻る</button>
            </div>
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
        <div className={`min-h-screen ${lightMode ? 'bg-[#f5f5f9]' : 'bg-[#050505]'} text-[var(--foreground)] pb-32 relative font-sans selection:bg-teal-500/30`}>
            {/* Animated Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className={`absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[160px] animate-breathe ${lightMode ? 'bg-gradient-to-br from-blue-300/15 via-purple-300/10 to-transparent' : 'bg-gradient-to-br from-blue-600/15 via-purple-600/10 to-transparent'}`} style={{ animationDuration: '8s' }}></div>
                <div className={`absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[140px] animate-breathe ${lightMode ? 'bg-gradient-to-tl from-teal-300/10 via-cyan-300/8 to-transparent' : 'bg-gradient-to-tl from-teal-500/10 via-cyan-500/8 to-transparent'}`} style={{ animationDelay: '3s', animationDuration: '10s' }}></div>
            </div>

            {/* Header */}
            <header className="sticky top-0 glass-frosted z-20 border-b border-white/5 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/')} className="p-2.5 text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all duration-300">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="font-bold text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">分析結果</h1>
                </div>
                <div className="bg-teal-500/10 border border-teal-500/20 text-teal-300 px-3.5 py-1.5 rounded-full text-[10px] tracking-widest font-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(45,212,191,0.1)]">
                    <Sparkles size={12} className="text-teal-400" /> AI ANALYZED
                </div>
            </header>

            <main className="max-w-xl mx-auto p-6 space-y-12 relative z-10">

                {/* Section 1: 6軸レーダーチャート */}
                <section className={`rounded-[2.5rem] p-8 relative overflow-hidden animate-fade-in-up ${lightMode ? 'bg-white/70 border border-neutral-200 shadow-lg' : 'glass-effect-dark'}`}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-teal-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse-glow"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>

                    <h2 className="text-2xl font-black mb-1.5 flex items-center gap-3 relative z-10 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">
                        あなたのキャリア特性
                    </h2>
                    <p className="text-[11px] text-teal-400/80 font-bold tracking-widest uppercase mb-8 relative z-10">
                        旅行行動から抽出された6つの基礎特性
                    </p>

                    <div className="h-72 w-full relative z-10 -ml-2 mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                                <PolarGrid stroke={lightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)'} />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: lightMode ? '#3a3a5a' : '#a3a3a3', fontSize: 11, fontWeight: 'bold' }} stroke="none" />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="本人" dataKey="A" stroke="#14b8a6" strokeWidth={3} fill="url(#colorTeal)" fillOpacity={1} />
                                <defs>
                                    <linearGradient id="colorTeal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div className={`p-4 rounded-2xl border backdrop-blur-md shadow-inner transition-colors ${lightMode ? 'bg-white/60 border-neutral-200 hover:bg-white/80' : 'bg-[#050505]/40 border-white/5 hover:bg-white/5'}`}>
                            <p className="text-[10px] text-neutral-500 font-bold mb-1.5 uppercase tracking-widest">没入トリガー</p>
                            <p className="font-black tracking-wide text-teal-400">{traits?.immersion_triggers.primary === 'unknown' ? 'データ不足' : traits?.immersion_triggers.primary}</p>
                        </div>
                        <div className={`p-4 rounded-2xl border backdrop-blur-md shadow-inner transition-colors ${lightMode ? 'bg-white/60 border-neutral-200 hover:bg-white/80' : 'bg-[#050505]/40 border-white/5 hover:bg-white/5'}`}>
                            <p className="text-[10px] text-neutral-500 font-bold mb-1.5 uppercase tracking-widest">探索スタイル</p>
                            <p className="font-black tracking-wide text-blue-400">{traits?.exploration_score && traits.exploration_score > 0.6 ? '広く探索する派' : '深く掘り下げる派'}</p>
                        </div>
                    </div>
                </section>

                {/* Section 2: AIキャリア提案 */}
                {suggestion && (
                    <section className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <div className="flex items-center gap-4 mb-2">
                            <span className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-[0_10px_30px_rgba(168,85,247,0.3)] animate-float">
                                <Sparkles className="text-white" size={24} />
                            </span>
                            <h2 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200 drop-shadow-sm">
                                AIキャリア提案
                            </h2>
                        </div>

                        {/* 根拠 */}
                        <div className={`rounded-[2rem] p-6 text-sm leading-relaxed relative overflow-hidden group border ${lightMode ? 'bg-purple-50/80 border-purple-200 text-purple-900 shadow-md' : 'glass-effect-dark bg-purple-950/20 border-purple-500/20 text-purple-100 shadow-[0_10px_40px_-10px_rgba(168,85,247,0.1)]'}`}>
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none group-hover:from-purple-500/10 transition-colors duration-500"></div>
                            <h3 className={`font-bold mb-2.5 flex items-center gap-2 relative z-10 text-[13px] tracking-wider uppercase ${lightMode ? 'text-purple-700' : 'text-purple-300'}`}>
                                <div className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]"></div>
                                なぜこの提案？
                            </h3>
                            <p className="relative z-10 font-medium">{suggestion?.reasoning || 'あなたの旅行中の「探索性」や「没入条件」のデータ傾向を元に、最も能力を発揮しやすい環境を導き出しました。'}</p>
                        </div>

                        {/* 向いている業界 */}
                        <div className={`rounded-[2rem] p-7 transition-all hover:shadow-xl border ${lightMode ? 'bg-white/70 border-neutral-200 hover:bg-white/90' : 'glass-effect border-white/5 hover:bg-white/[0.03] hover:border-white/10'}`}>
                            <h3 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-200 text-sm flex items-center gap-3 mb-5 tracking-wide">
                                <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                                    <Briefcase size={16} className="text-blue-400" />
                                </div>
                                ポテンシャルを発揮しやすい業界 / 職種
                            </h3>
                            <div className="flex flex-wrap gap-2.5">
                                {suggestion?.fit_industries?.map((item: string, i: number) => (
                                    <span key={i} className={`px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors select-none border ${lightMode ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' : 'bg-gradient-to-br from-[#050505] to-neutral-900 border-white/10 text-neutral-300 hover:border-blue-500/40 hover:text-blue-300'}`}>
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* 働き方 */}
                        <div className={`rounded-[2rem] p-7 transition-all hover:shadow-xl border ${lightMode ? 'bg-white/70 border-neutral-200 hover:bg-white/90' : 'glass-effect border-white/5 hover:bg-white/[0.03] hover:border-white/10'}`}>
                            <h3 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-rose-200 text-sm flex items-center gap-3 mb-5 tracking-wide">
                                <div className="p-2 bg-pink-500/20 rounded-xl border border-pink-500/30">
                                    <Heart size={16} className="text-pink-400" />
                                </div>
                                フィットするワークスタイル
                            </h3>
                            <ul className="space-y-4">
                                {suggestion?.fit_work_style?.map((item: string, i: number) => (
                                    <li key={i} className={`flex items-start gap-4 text-[13px] leading-relaxed font-medium ${lightMode ? 'text-neutral-700' : 'text-neutral-300'}`}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-2 shadow-[0_0_8px_rgba(236,72,153,0.8)] shrink-0"></div> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* 組織文化 */}
                        <div className={`rounded-[2rem] p-7 transition-all hover:shadow-xl border ${lightMode ? 'bg-white/70 border-neutral-200 hover:bg-white/90' : 'glass-effect border-white/5 hover:bg-white/[0.03] hover:border-white/10'}`}>
                            <h3 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-amber-200 text-sm flex items-center gap-3 mb-5 tracking-wide">
                                <div className="p-2 bg-orange-500/20 rounded-xl border border-orange-500/30">
                                    <Building size={16} className="text-orange-400" />
                                </div>
                                適した組織文化・カルチャー
                            </h3>
                            <ul className="space-y-4">
                                {suggestion?.fit_org_culture?.map((item: string, i: number) => (
                                    <li key={i} className="flex items-start gap-4 text-[13px] leading-relaxed text-neutral-300 font-medium">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 shadow-[0_0_8px_rgba(249,115,22,0.8)] shrink-0"></div> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* 成長メモ */}
                        <div className={`relative overflow-hidden rounded-[2rem] p-8 mt-8 border ${lightMode ? 'bg-teal-50/80 border-teal-200 shadow-md' : 'bg-gradient-to-br from-[#050505] to-neutral-900 border-teal-500/30 shadow-[0_10px_40px_-15px_rgba(20,184,166,0.3)]'}`}>
                            <div className="absolute top-0 left-0 bottom-0 w-2 bg-gradient-to-b from-teal-400 to-cyan-500 shadow-[0_0_15px_rgba(45,212,191,0.5)]"></div>

                            <h3 className="font-black text-teal-400 text-xs tracking-widest mb-4 flex items-center gap-2 uppercase">
                                <TrendingUp size={16} /> Advice for Growth
                            </h3>
                            <p className={`text-[13px] leading-relaxed font-medium ${lightMode ? 'text-neutral-700' : 'text-neutral-300'}`}>
                                {suggestion?.growth_notes}
                            </p>
                        </div>
                    </section>
                )}

                {/* === AI Diary Section === */}
                <section className="mt-10 animate-fade-in-up">
                    <div className="flex items-center gap-3 mb-5 px-2">
                        <div className="p-2.5 bg-amber-500/15 rounded-xl border border-amber-500/25">
                            <BookOpen size={18} className="text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold tracking-tight text-white">今日のあなた</h3>
                            <p className="text-[10px] text-neutral-500 font-bold tracking-widest">AI DIARY</p>
                        </div>
                    </div>

                    {!diary && !diaryLoading && (
                        <button
                            onClick={async () => {
                                setDiaryLoading(true)
                                try {
                                    // Calculate metrics client-side
                                    let totalDistanceKm = 0
                                    for (let i = 1; i < points.length; i++) {
                                        const prev = points[i - 1]
                                        const curr = points[i]
                                        const R = 6371
                                        const dLat = (curr.lat - prev.lat) * Math.PI / 180
                                        const dLon = (curr.lng - prev.lng) * Math.PI / 180
                                        const a = Math.sin(dLat / 2) ** 2 + Math.cos(prev.lat * Math.PI / 180) * Math.cos(curr.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2
                                        totalDistanceKm += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
                                    }
                                    const tripDate = points.length > 0 ? new Date(points[0].timestamp).toLocaleDateString('ja-JP') : new Date().toLocaleDateString('ja-JP')
                                    const activityScore = Math.min(100, Math.round(totalDistanceKm * 8 + spots.length * 10))
                                    const explorationRate = traits?.exploration_score || 0.5
                                    const totalDwell = spots.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0)
                                    const maxDwell = spots.length > 0 ? Math.max(...spots.map((s: any) => s.duration_minutes || 0)) : 0
                                    const dwellTendency = totalDwell > 0 ? maxDwell / totalDwell : 0

                                    const res = await fetch('/api/diary-generate', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            tripData: {
                                                date: tripDate,
                                                distanceKm: totalDistanceKm,
                                                spotsCount: spots.length,
                                                activityScore,
                                                explorationRate,
                                                dwellTendency,
                                                diversityScore: spots.length > 0 ? Math.min(1, spots.length / 3) : 0
                                            }
                                        })
                                    })
                                    const data = await res.json()
                                    if (data.success) {
                                        setDiary(data.diary)
                                    } else {
                                        toast.error('日記の生成に失敗しました: ' + (data.error || ''))
                                    }
                                } catch (e) {
                                    console.error(e)
                                    toast.error('日記の生成に失敗しました')
                                } finally {
                                    setDiaryLoading(false)
                                }
                            }}
                            className={`w-full glass-ultra rounded-[2rem] p-8 text-center group hover:scale-[1.01] transition-all duration-300 hover:border-amber-500/20 hover:shadow-[0_10px_40px_-10px_rgba(245,158,11,0.15)] relative overflow-hidden glass-shimmer`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="w-16 h-16 mx-auto mb-4 glow-sphere opacity-40 animate-antigrav" style={{ animationDuration: '6s', background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), rgba(245,158,11,0.4) 40%, transparent 70%)', boxShadow: '0 0 30px rgba(245,158,11,0.3)' }}></div>
                            <p className="text-white font-bold text-lg mb-1 relative z-10">AIに日記を書いてもらう</p>
                            <p className="text-neutral-500 text-xs relative z-10">旅のデータをもとに「今日のあなた」を描写します</p>
                        </button>
                    )}

                    {diaryLoading && (
                        <div className="glass-ultra rounded-[2rem] p-10 text-center animate-slide-up-spring">
                            <div className="relative w-16 h-16 mx-auto mb-6">
                                <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-xl animate-pulse-glow"></div>
                                <div className="absolute inset-0 border-[3px] border-amber-400 rounded-full border-t-transparent animate-spin" style={{ animationDuration: '1.5s' }}></div>
                                <BookOpen className="absolute inset-0 m-auto text-amber-300 animate-pulse" size={24} />
                            </div>
                            <p className="text-amber-300 font-bold tracking-widest text-sm animate-pulse">AIが日記を執筆中...</p>
                        </div>
                    )}

                    {diary && (
                        <div className="glass-ultra rounded-[2rem] p-8 relative overflow-hidden glass-shimmer animate-slide-up-spring">
                            {/* Decorative glow */}
                            <div className="absolute top-0 right-0 w-24 h-24 glow-sphere opacity-15" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), rgba(245,158,11,0.3) 40%, transparent 70%)' }}></div>

                            {/* Date badge */}
                            <div className="flex items-center gap-2 mb-5">
                                <span className="text-[10px] px-3 py-1.5 rounded-full font-bold tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">📅 {diary.date}</span>
                            </div>

                            {/* Diary text */}
                            <div className="text-[14px] leading-[1.9] text-neutral-300 font-medium whitespace-pre-line mb-6">
                                {diary.text}
                            </div>

                            {/* Metrics bubbles */}
                            <div className="flex flex-wrap gap-3 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 bg-white/5 px-3 py-1.5 rounded-full">
                                    <Footprints size={12} className="text-teal-400" />
                                    {diary.metrics.distance}km
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 bg-white/5 px-3 py-1.5 rounded-full">
                                    <Compass size={12} className="text-blue-400" />
                                    探索度 {diary.metrics.explorationRate}
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 bg-white/5 px-3 py-1.5 rounded-full">
                                    <MapPin size={12} className="text-purple-400" />
                                    {diary.metrics.spotsVisited}スポット
                                </div>
                            </div>
                        </div>
                    )}
                </section>

            </main>

            {/* Bottom padding to prevent FAB overlap if added later */}
            <div className="h-10"></div>

            {/* Share FAB */}
            {traits && (
                <button
                    onClick={async () => {
                        const shareText = `Utripで自分のキャリア特性を分析しました！\n\n` +
                            `没入トリガー: ${traits.immersion_triggers.primary}\n` +
                            `探索スタイル: ${traits.exploration_score > 0.6 ? '広く探索する派' : '深く掘り下げる派'}\n\n` +
                            `#Utrip #キャリア分析`
                        if (navigator.share) {
                            try {
                                await navigator.share({ title: 'Utrip - キャリア特性プロファイル', text: shareText })
                            } catch (e) { /* user cancelled */ }
                        } else {
                            await navigator.clipboard.writeText(shareText)
                            toast.success('クリップボードにコピーしました')
                        }
                    }}
                    className="fixed bottom-8 right-6 z-30 w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(168,85,247,0.5)] hover:scale-110 active:scale-95 transition-all"
                >
                    <Share2 size={22} className="text-white" />
                </button>
            )}
        </div>
    )
}
