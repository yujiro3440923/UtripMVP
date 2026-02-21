'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ArrowLeft, Navigation, Flag, Search } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useGpsRecorder } from '@/hooks/useGpsRecorder'
import MoodInputModal from '@/components/trips/MoodInputModal'

// SSRを無効化してLeafletを読み込む (Next.js対策)
const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false })

interface Trip {
    id: string
    user_id: string
    title: string
    created_at: string
    status: 'active' | 'completed' | 'analyzed'
}

export default function TripRecordPage() {
    const params = useParams()
    const router = useRouter()
    const tripId = params.id as string

    const [trip, setTrip] = useState<Trip | null>(null)
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isActive, setIsActive] = useState(true) // 記録状態のトグル

    const { currentPosition, path, isRecording, error } = useGpsRecorder(tripId, isActive)

    useEffect(() => {
        const fetchTripInfo = async () => {
            const { data, error } = await supabase
                .from('trips')
                .select('*')
                .eq('id', tripId)
                .single()

            if (data) {
                setTrip(data)
                // statusがactive以外なら記録停止
                if (data.status !== 'active') setIsActive(false)
            } else {
                router.push('/')
            }
            setLoading(false)
        }
        fetchTripInfo()
    }, [tripId, router])

    const handleFinishTrip = async () => {
        if (!confirm('旅行を終了して分析フェーズに進みますか？')) return

        setIsActive(false)
        // ステータス更新 (active -> completed) キャリブレーション完了後にanalyzedにする想定
        await supabase.from('trips').update({ status: 'completed' }).eq('id', tripId)

        // キャリブレーション画面へ遷移
        router.push(`/trips/${tripId}/calibration`)
    }

    if (loading) return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    )

    return (
        <div className="h-[100dvh] w-full bg-neutral-950 text-white flex flex-col relative overflow-hidden">
            {/* Header - Overlaid on Map */}
            <header className="absolute top-0 left-0 right-0 p-5 flex items-start gap-4 bg-gradient-to-b from-[#050505]/90 via-[#050505]/40 to-transparent z-20 pointer-events-none">
                <button onClick={() => router.push('/')} className="mt-1 p-2.5 text-white glass-effect-dark rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:bg-white/10 transition-all pointer-events-auto hover:scale-105 active:scale-95">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1 glass-effect-dark rounded-[1.5rem] px-5 py-3.5 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.4)] pointer-events-auto transform transition-all duration-300 hover:shadow-[0_8px_32px_rgba(45,212,191,0.15)] group">
                    <div className="flex-1 min-w-0">
                        <h1 className="font-bold text-base leading-tight truncate text-white group-hover:text-teal-300 transition-colors duration-300">{trip?.title}</h1>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className="relative flex h-2.5 w-2.5">
                                {isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>}
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isActive ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]' : 'bg-neutral-600'}`}></span>
                            </span>
                            <p className="text-[11px] text-neutral-400 font-medium tracking-wide">
                                {error ? 'エラー: ' + error : isActive ? (currentPosition ? 'GPS位置情報を追跡中...' : '衛星シグナルを検索中...') : '記録停止'}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area - Full Screen Map */}
            <main className="flex-1 relative z-0 bg-neutral-900">
                <MapView currentPosition={currentPosition} path={path} />
            </main>

            {/* Floating Action Buttons */}
            <div className="absolute bottom-8 left-0 right-0 px-6 z-20 flex flex-col gap-4 pointer-events-auto max-w-md mx-auto">
                {isActive && (
                    <div className="relative group">
                        <div className="absolute inset-0 bg-teal-400 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-all duration-500"></div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="relative w-full bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-500 text-neutral-950 py-4.5 rounded-2xl shadow-[0_8px_30px_rgba(20,184,166,0.3)] font-black tracking-widest text-lg flex items-center justify-center gap-3 transform transition-all hover:scale-[1.02] active:scale-95 border border-teal-200/50 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="bg-white/20 rounded-xl p-1.5 relative z-10">
                                <Flag strokeWidth={3} className="text-teal-950 w-5 h-5" />
                            </div>
                            <span className="relative z-10 drop-shadow-sm">今の気分を記録</span>
                        </button>
                    </div>
                )}

                {isActive ? (
                    <button
                        onClick={handleFinishTrip}
                        className="w-full glass-effect-dark border border-white/10 hover:border-white/20 text-neutral-300 hover:text-white font-bold py-4 rounded-xl hover:bg-white/5 transition-all flex items-center justify-center gap-2.5 shadow-[0_8px_20px_rgba(0,0,0,0.5)] active:scale-95"
                    >
                        <Navigation size={18} className="text-neutral-500" />
                        旅行を終了して分析へ
                    </button>
                ) : (
                    <div className="relative group">
                        <div className="absolute inset-0 bg-indigo-500 rounded-2xl blur-xl opacity-30 group-hover:opacity-60 transition-all duration-500"></div>
                        <button
                            onClick={() => router.push(`/trips/${tripId}/calibration`)}
                            className="relative w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-black py-4.5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_8px_30px_rgba(99,102,241,0.3)] hover:scale-[1.02] active:scale-95 border border-indigo-300/30 overflow-hidden tracking-widest text-lg"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <Search size={22} className="relative z-10 drop-shadow-md" />
                            <span className="relative z-10 drop-shadow-md">振り返り分析へ進む</span>
                        </button>
                    </div>
                )}
            </div>

            <MoodInputModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                tripId={tripId}
                currentPosition={currentPosition}
            />
        </div>
    )
}
