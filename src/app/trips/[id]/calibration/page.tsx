'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { detectStaySpots, DetectedSpot, GpsDataPoint } from '@/lib/analysis/spotDetector'
import { toast } from 'react-hot-toast'
// lib/db/dexie.ts はクライアントサイドのみ
import { db } from '@/lib/db/dexie'
import { ArrowLeft, Clock, MapPin, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react'

// キャリブレーションの選択肢
const CALIBRATION_OPTIONS = [
    { id: 'immersion', label: '夢中で時間を忘れた', color: 'teal' },
    { id: 'recovery', label: '心地よくぼーっとしていた', color: 'blue' },
    { id: 'filler', label: '正直あまり楽しくなかった', color: 'orange' },
    { id: 'external', label: '待ち合わせ等で外的に決まった', color: 'neutral' }
]

export default function CalibrationPage() {
    const params = useParams()
    const router = useRouter()
    const tripId = params.id as string

    const [loading, setLoading] = useState(true)
    const [spots, setSpots] = useState<DetectedSpot[]>([])
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        const initializeCalibration = async () => {
            // 1. SupabaseからGPSデータを取得 (サーバーにある分)
            const { data: remoteData, error } = await supabase
                .from('data_points')
                .select('*')
                .eq('trip_id', tripId)
                .order('timestamp', { ascending: true })

            let allPoints = remoteData || []

            // 2. もしローカルに未同期のデータがあればマージする (ベストエフォート)
            try {
                const localPoints = await db.gps_points.where('tripId').equals(tripId).toArray()
                // 簡易マージ（タイムスタンプで重複排除は省略）
                if (localPoints.length > 0 && allPoints.length === 0) {
                    allPoints = localPoints.map(p => ({
                        id: p.id?.toString() || '',
                        lat: p.lat,
                        lng: p.lng,
                        timestamp: p.timestamp instanceof Date ? p.timestamp.toISOString() : new Date(p.timestamp as any).toISOString(),
                        point_type: 'auto'
                    })) as unknown as GpsDataPoint[]
                }
            } catch (err) {
                console.error('Dexie read error:', err)
            }

            // 3. スポット抽出アルゴリズムの実行
            const detectedSpots = detectStaySpots(tripId, allPoints)

            // （※本来ならここで detected_spots テーブルに保存・地名取得APIを呼ぶが、MVPではメモリ上で処理）
            // 便宜上モックの地名を付与
            const spotsWithNames = detectedSpots.map((spot, index) => ({
                ...spot,
                place_name: `滞在ポイント ${index + 1}`
            })) as (DetectedSpot & { place_name: string })[]

            setSpots(spotsWithNames)
            setLoading(false)
        }

        initializeCalibration()
    }, [tripId])

    const handleSelectAnswer = (spotId: string, answerId: string) => {
        setAnswers(prev => ({ ...prev, [spotId]: answerId }))
    }

    const allAnswered = spots.length > 0 && Object.keys(answers).length === spots.length

    const handleStartAnalysis = async () => {
        if (!allAnswered) return
        setIsSubmitting(true)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Not authenticated')

            // 1. 各スポットとキャリブレーション結果を detected_spots, calibrationsに保存
            for (const spot of spots) {
                const label = answers[spot.id]

                // detected_spots に保存
                const { data: spotData, error: spotError } = await supabase
                    .from('detected_spots')
                    .insert([{
                        trip_id: tripId,
                        lat: spot.lat,
                        lng: spot.lng,
                        place_name: (spot as DetectedSpot & { place_name: string }).place_name,
                        arrival_time: spot.arrival_time,
                        departure_time: spot.departure_time,
                        duration_minutes: spot.duration_minutes,
                        calibration_label: label
                    }])
                    .select()
                    .single()

                if (spotData && !spotError) {
                    await supabase.from('calibrations').insert([{
                        user_id: session.user.id,
                        spot_id: spotData.id,
                        question: 'これはあなたにとってどんな体験でしたか？',
                        answer: CALIBRATION_OPTIONS.find(o => o.id === label)?.label,
                        label: label
                    }])
                }
            }

            toast.success('キャリブレーションを保存しました')
            // 結果画面へ遷移
            router.push(`/trips/${tripId}/result`)

        } catch (error: unknown) {
            console.error(error)
            if (error instanceof Error) {
                toast.error('保存に失敗しました: ' + error.message)
            } else {
                toast.error('保存に失敗しました。')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    // --- Render ---

    if (loading) return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden text-white">
            <div className="absolute inset-0 bg-gradient-to-tr from-teal-900/20 via-[#050505] to-blue-900/20 animate-gradient-xy z-0"></div>
            <div className="relative z-10 glass-effect-dark p-10 rounded-[2.5rem] flex flex-col items-center animate-fade-in-up">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-teal-500/30 blur-xl rounded-full animate-pulse-glow"></div>
                    <Loader2 className="w-16 h-16 text-teal-400 animate-spin relative z-10" />
                </div>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 mb-3 tracking-tight">軌跡データからスポットを抽出中...</h2>
                <p className="text-neutral-400 text-sm font-medium tracking-wide">少し時間がかかる場合があります</p>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#050505] text-white pb-32 relative font-sans selection:bg-teal-500/30">
            {/* Animated Background Gradients */}
            <div className="fixed inset-0 bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-teal-950/20 z-0 pointer-events-none"></div>

            {/* Header */}
            <header className="sticky top-0 bg-[#050505]/70 backdrop-blur-2xl z-20 border-b border-white/5 p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push(`/trips/${tripId}`)} className="p-2.5 text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all duration-300">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="font-bold text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">振り返り（キャリブレーション）</h1>
                </div>
                <div className="text-[11px] font-black tracking-widest text-teal-300 bg-teal-500/10 border border-teal-500/20 px-3.5 py-1.5 rounded-full shadow-[0_0_15px_rgba(45,212,191,0.1)]">
                    <span className="text-sm mr-1">{Object.keys(answers).length}</span> / {spots.length} 完了
                </div>
            </header>

            <main className="p-6 max-w-lg mx-auto relative z-10">
                {spots.length === 0 ? (
                    <div className="text-center py-24 px-6 glass-effect-dark rounded-[2.5rem] mt-8 flex flex-col items-center animate-fade-in-up border border-white/5 shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none"></div>
                        <div className="w-24 h-24 bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-full flex items-center justify-center mb-8 shadow-inner border border-white/5 relative z-10">
                            <MapPin className="text-neutral-500" size={36} strokeWidth={1.5} />
                        </div>
                        <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-400 relative z-10">スポットが見つかりませんでした</h2>
                        <p className="text-neutral-400 text-sm leading-relaxed mb-10 font-medium relative z-10">
                            記録時間が短かったか、1ヶ所に30分以上<br />とどまることがなかった可能性があります。<br />
                            <span className="text-teal-500/80">このまま分析アルゴリズムへ進むことは可能です。</span>
                        </p>
                        <button
                            onClick={() => router.push(`/trips/${tripId}/result`)}
                            className="bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 hover:from-teal-300 hover:via-cyan-400 hover:to-blue-400 text-neutral-950 font-black py-4.5 px-10 rounded-2xl transition-all shadow-[0_10px_30px_rgba(20,184,166,0.25)] hover:scale-[1.02] active:scale-95 text-lg relative z-10"
                        >
                            <span className="drop-shadow-sm">このまま分析結果を見る</span>
                        </button>
                    </div>
                ) : (
                    <div className="relative mt-4">
                        {/* Timeline Line */}
                        <div className="absolute left-[1.125rem] top-8 bottom-8 w-[2px] bg-gradient-to-b from-teal-500/50 via-neutral-800 to-transparent rounded-full shadow-[0_0_10px_rgba(45,212,191,0.2)]"></div>

                        <div className="space-y-8">
                            {spots.map((spot, index) => {
                                const isSelected = !!answers[spot.id]
                                const arrival = new Date(spot.arrival_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

                                return (
                                    <div key={spot.id} className="relative pl-14">
                                        {/* Timeline Node */}
                                        <div className={`absolute left-4 top-5 w-4 h-4 rounded-full border-4 border-neutral-950 ${isSelected ? 'bg-teal-400' : 'bg-neutral-600'}`}></div>

                                        <div className={`bg-neutral-900/80 border ${isSelected ? 'border-teal-500/30' : 'border-white/5'} rounded-3xl p-5 shadow-lg transition-all`}>

                                            {/* Spot Header */}
                                            <div className="flex items-start gap-4 mb-5">
                                                <div className="bg-gradient-to-br from-neutral-800/80 to-neutral-900/80 p-3.5 rounded-[1.25rem] shadow-inner border border-white/5">
                                                    <MapPin className={isSelected ? "text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]" : "text-neutral-500"} size={26} strokeWidth={isSelected ? 2 : 1.5} />
                                                </div>
                                                <div className="flex-1 mt-1.5">
                                                    <h3 className="font-bold text-xl leading-tight mb-2 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-200">
                                                        {(spot as DetectedSpot & { place_name: string }).place_name}
                                                    </h3>
                                                    <div className="flex items-center gap-3 text-xs text-neutral-400 font-bold tracking-wider">
                                                        <span className="flex items-center gap-1.5 bg-neutral-900 py-1 px-2.5 rounded-md border border-white/5"><Clock size={12} className="text-teal-500/60" /> {arrival}〜</span>
                                                        <span className="bg-teal-500/10 text-teal-400/80 border border-teal-500/20 px-2.5 py-1 rounded-md">滞在 {spot.duration_minutes}分</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Question */}
                                            <div className="bg-[#050505]/40 -mx-6 -mb-6 mt-6 px-6 py-5 border-t border-white/5 rounded-b-[2rem]">
                                                <p className="text-sm font-bold text-neutral-300 mb-4 tracking-wide">これはあなたにとってどんな体験でしたか？</p>
                                                <div className="grid gap-2.5">
                                                    {CALIBRATION_OPTIONS.map(option => (
                                                        <button
                                                            key={option.id}
                                                            onClick={() => handleSelectAnswer(spot.id, option.id)}
                                                            className={`flex items-center gap-4 w-full p-4 rounded-xl text-left transition-all duration-300 border relative overflow-hidden group ${answers[spot.id] === option.id
                                                                ? 'bg-teal-500/15 border-teal-500/40 text-teal-300 shadow-[0_4px_20px_rgba(45,212,191,0.1)_inset]'
                                                                : 'bg-white/5 border-transparent text-neutral-400 hover:bg-white/10'
                                                                }`}
                                                        >
                                                            {answers[spot.id] === option.id && <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-transparent pointer-events-none"></div>}
                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors relative z-10 ${answers[spot.id] === option.id ? 'border-teal-400' : 'border-neutral-600 group-hover:border-neutral-500'
                                                                }`}>
                                                                {answers[spot.id] === option.id && <div className="w-2.5 h-2.5 bg-teal-400 rounded-full shadow-[0_0_8px_rgba(45,212,191,0.8)]" />}
                                                            </div>
                                                            <span className="text-sm font-bold tracking-wide relative z-10">{option.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Action Bar */}
            {spots.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent flex justify-center z-30 pointer-events-none pb-10">
                    <button
                        onClick={handleStartAnalysis}
                        disabled={!allAnswered || isSubmitting}
                        className={`w-full max-w-md py-4.5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all duration-300 pointer-events-auto border group relative overflow-hidden text-lg tracking-widest ${allAnswered
                            ? 'bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-500 text-neutral-950 border-teal-300/50 hover:scale-[1.02] shadow-[0_10px_40px_rgba(20,184,166,0.3)] active:scale-95'
                            : 'bg-neutral-800/80 backdrop-blur-md text-neutral-500 border-white/5 cursor-not-allowed'
                            }`}
                    >
                        {allAnswered && <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>}

                        {isSubmitting ? (
                            <><Loader2 className="w-6 h-6 animate-spin text-neutral-950 relative z-10" /> <span className="relative z-10">分析を実行中...</span></>
                        ) : (
                            <><span className="relative z-10 flex items-center gap-2 drop-shadow-sm"><CheckCircle2 size={24} /> 分析結果とAIキャリア提案を見る</span></>
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}
