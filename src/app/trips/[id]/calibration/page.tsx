'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { detectStaySpots, DetectedSpot, GpsDataPoint } from '@/lib/analysis/spotDetector'
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

            // 結果画面へ遷移
            router.push(`/trips/${tripId}/result`)

        } catch (error: unknown) {
            if (error instanceof Error) {
                alert('保存に失敗しました: ' + error.message)
            } else {
                alert('保存に失敗しました。')
            }
            setIsSubmitting(false)
        }
    }

    // --- Render ---

    if (loading) return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
            <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-6" />
            <h2 className="text-xl font-bold text-white mb-2">軌跡データからスポットを抽出中...</h2>
            <p className="text-neutral-400 text-sm">少し時間がかかる場合があります</p>
        </div>
    )

    return (
        <div className="min-h-screen bg-neutral-950 text-white pb-32">
            {/* Header */}
            <header className="sticky top-0 bg-neutral-950/80 backdrop-blur-xl z-20 border-b border-white/5 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push(`/trips/${tripId}`)} className="p-2 text-neutral-400 hover:text-white bg-white/5 rounded-full">
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="font-bold text-lg">振り返り（キャリブレーション）</h1>
                </div>
                <div className="text-xs font-bold text-teal-400 bg-teal-500/10 px-3 py-1.5 rounded-full">
                    {Object.keys(answers).length} / {spots.length} 完了
                </div>
            </header>

            <main className="p-6 max-w-lg mx-auto">
                {spots.length === 0 ? (
                    <div className="text-center py-20 px-4">
                        <div className="w-20 h-20 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6">
                            <MapPin className="text-neutral-500" size={32} />
                        </div>
                        <h2 className="text-xl font-bold mb-3 text-neutral-200">滞在スポットが見つかりませんでした</h2>
                        <p className="text-neutral-400 text-sm leading-relaxed mb-8">
                            GPS記録時間が短かったか、1ヶ所に30分以上とどまることがなかった可能性があります。<br />
                            分析アルゴリズムを通過して結果を見ることは可能です。
                        </p>
                        <button
                            onClick={() => router.push(`/trips/${tripId}/result`)}
                            className="bg-teal-500 hover:bg-teal-400 text-neutral-900 font-bold py-4 px-8 rounded-full transition-colors"
                        >
                            このまま分析結果を見る
                        </button>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Timeline Line */}
                        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-neutral-800 rounded-full"></div>

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
                                                <div className="bg-white/5 p-3 rounded-2xl">
                                                    <MapPin className={isSelected ? "text-teal-400" : "text-neutral-400"} size={24} />
                                                </div>
                                                <div className="flex-1 mt-1">
                                                    <h3 className="font-bold text-lg leading-tight mb-1">{(spot as DetectedSpot & { place_name: string }).place_name}</h3>
                                                    <div className="flex items-center gap-3 text-xs text-neutral-400 font-medium">
                                                        <span className="flex items-center gap-1"><Clock size={12} /> {arrival}〜</span>
                                                        <span className="bg-white/10 px-2 py-0.5 rounded text-neutral-300">滞在 {spot.duration_minutes}分</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Question */}
                                            <div className="bg-neutral-950/50 -mx-5 px-5 py-4 border-y border-white/5 mb-2">
                                                <p className="text-sm font-bold text-neutral-300 mb-3">これはあなたにとってどんな体験でしたか？</p>
                                                <div className="grid gap-2">
                                                    {CALIBRATION_OPTIONS.map(option => (
                                                        <button
                                                            key={option.id}
                                                            onClick={() => handleSelectAnswer(spot.id, option.id)}
                                                            className={`flex items-center gap-3 w-full p-3 rounded-xl text-left transition-all border ${answers[spot.id] === option.id
                                                                ? 'bg-teal-500/10 border-teal-500/50 text-teal-300 shadow-inner'
                                                                : 'bg-white/5 border-transparent text-neutral-400 hover:bg-white/10'
                                                                }`}
                                                        >
                                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${answers[spot.id] === option.id ? 'border-teal-400' : 'border-neutral-600'
                                                                }`}>
                                                                {answers[spot.id] === option.id && <div className="w-2.5 h-2.5 bg-teal-400 rounded-full" />}
                                                            </div>
                                                            <span className="text-sm font-medium leading-tight">{option.label}</span>
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
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-neutral-950 via-neutral-950 to-transparent flex justify-center z-30">
                    <button
                        onClick={handleStartAnalysis}
                        disabled={!allAnswered || isSubmitting}
                        className={`w-full max-w-md py-4 rounded-full font-bold flex items-center justify-center gap-2 transition-all shadow-xl ${allAnswered
                            ? 'bg-gradient-to-r from-teal-400 to-blue-500 text-neutral-900 hover:scale-[1.02]'
                            : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                            }`}
                    >
                        {isSubmitting ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> 分析を実行中...</>
                        ) : (
                            <><CheckCircle2 size={20} /> 分析結果とAIキャリア提案を見る <ChevronRight size={18} /></>
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}
