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
            <header className="absolute top-0 left-0 right-0 p-4 flex items-center gap-4 bg-gradient-to-b from-neutral-950/80 to-transparent z-20 pointer-events-auto">
                <button onClick={() => router.push('/')} className="p-2 text-neutral-900 bg-white/90 backdrop-blur-md rounded-full shadow-lg">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1 bg-neutral-900/60 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/10 flex items-center justify-between shadow-lg">
                    <div className="flex-1 min-w-0">
                        <h1 className="font-bold text-sm leading-tight truncate">{trip?.title}</h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="relative flex h-2 w-2">
                                {isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>}
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${isActive ? 'bg-teal-500' : 'bg-neutral-500'}`}></span>
                            </span>
                            <p className="text-[10px] text-neutral-300 font-medium tracking-wide">
                                {error ? 'エラー: ' + error : isActive ? (currentPosition ? '記録中' : '位置情報を取得中...') : '記録停止'}
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
            <div className="absolute bottom-6 left-0 right-0 px-6 z-20 flex flex-col gap-3 pointer-events-auto">

                {isActive && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full bg-gradient-to-r from-teal-400 to-blue-500 text-neutral-900 py-4 rounded-full shadow-[0_10px_30px_rgba(20,184,166,0.25)] font-black tracking-wide text-lg flex items-center justify-center gap-2 transform transition-transform hover:scale-[1.02] active:scale-95"
                    >
                        <Flag strokeWidth={3} className="text-neutral-900/80" />
                        今の気分を記録
                    </button>
                )}

                {isActive ? (
                    <button
                        onClick={handleFinishTrip}
                        className="w-full bg-neutral-800/80 backdrop-blur-md border border-white/10 text-white font-bold py-3.5 rounded-full hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Navigation size={18} className="text-neutral-400" />
                        旅行を終了して分析へ
                    </button>
                ) : (
                    <button
                        onClick={() => router.push(`/trips/${tripId}/calibration`)}
                        className="w-full bg-purple-500 hover:bg-purple-400 text-white font-bold py-4 rounded-full transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                    >
                        <Search size={20} />
                        振り返り分析へ進む
                    </button>
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
