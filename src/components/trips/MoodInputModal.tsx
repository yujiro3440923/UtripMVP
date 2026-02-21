'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

const EXPERIENCE_TAGS = [
    { id: 'nature', label: '🌿 自然・アウトドア' },
    { id: 'food', label: '🍜 食・グルメ' },
    { id: 'culture', label: '🎨 文化・芸術' },
    { id: 'history', label: '⛩️ 歴史・寺社' },
    { id: 'shopping', label: '🛍️ ショッピング' },
    { id: 'social', label: '👥 人との交流' },
    { id: 'solo', label: '🧘 ひとり時間' },
    { id: 'activity', label: '🏃 アクティビティ' },
    { id: 'cafe', label: '☕ カフェ・休憩' },
    { id: 'walk', label: '🚶 街歩き・散策' },
]

const COMPANIONS = [
    { id: 'solo', label: 'ひとり' },
    { id: 'small_group', label: '少人数 (2-3人)' },
    { id: 'large_group', label: '大人数 (4人〜)' },
]

interface MoodInputModalProps {
    isOpen: boolean
    onClose: () => void
    tripId: string
    currentPosition: [number, number] | null
}

export default function MoodInputModal({ isOpen, onClose, tripId, currentPosition }: MoodInputModalProps) {
    const [moodScore, setMoodScore] = useState<number>(3)
    const [energyScore, setEnergyScore] = useState<number>(3)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [companion, setCompanion] = useState<string>('')
    const [note, setNote] = useState<string>('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    if (!isOpen) return null

    const toggleTag = (tagId: string) => {
        setSelectedTags(prev =>
            prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
        )
    }

    const handleSubmit = async () => {
        if (!currentPosition) {
            toast.error('現在地が取得できていないため記録できません。')
            return
        }

        setIsSubmitting(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Not authenticated')

            const { error } = await supabase.from('data_points').insert([{
                trip_id: tripId,
                user_id: session.user.id,
                lat: currentPosition[0],
                lng: currentPosition[1],
                timestamp: new Date().toISOString(),
                mood_score: moodScore,
                energy_score: energyScore,
                experience_tags: selectedTags,
                companion: companion || null,
                note: note || null,
                point_type: 'manual'
            }])

            if (error) throw error

            // Reset and close
            setMoodScore(3)
            setEnergyScore(3)
            setSelectedTags([])
            setCompanion('')
            setNote('')
            onClose()
            toast.success('状態を記録しました！')

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

    const moodEmojis = ['😭', '😥', '😐', '😊', '🤩']
    const energyColors = ['bg-blue-500', 'bg-blue-400', 'bg-teal-400', 'bg-yellow-400', 'bg-orange-500']

    return (
        <div className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 pointer-events-none transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            <div
                className={`absolute inset-0 bg-[#050505]/60 backdrop-blur-md transition-opacity pointer-events-auto ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            <div className={`w-full max-w-lg glass-effect-dark rounded-t-[2.5rem] sm:rounded-3xl shadow-[0_-20px_60px_rgba(0,0,0,0.5)] border-t sm:border border-white/10 pointer-events-auto transform transition-all duration-500 max-h-[90vh] overflow-hidden flex flex-col relative z-50 ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full sm:translate-y-10 sm:scale-95 opacity-0'}`}>
                {/* Decorative header glow */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-teal-500/10 to-transparent pointer-events-none"></div>

                <div className="flex justify-between items-center p-6 border-b border-white/5 relative z-10 shrink-0">
                    <h2 className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">今の状態を記録</h2>
                    <button onClick={onClose} className="p-2.5 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                        <X size={20} className="text-neutral-400" />
                    </button>
                </div>

                <div className="p-6 space-y-9 overflow-y-auto overscroll-contain pb-safe">
                    {/* Mood (1-5) */}
                    <div>
                        <label className="block text-sm font-bold text-neutral-400 mb-3">
                            今の気分は？ <span className="text-red-400">*</span>
                        </label>
                        <div className="flex justify-between items-center px-2">
                            {[1, 2, 3, 4, 5].map((score) => (
                                <button
                                    key={`mood-${score}`}
                                    onClick={() => setMoodScore(score)}
                                    className={`flex flex-col items-center gap-2 transition-transform ${moodScore === score ? 'scale-125' : 'opacity-50 hover:opacity-100 hover:scale-110'}`}
                                >
                                    <span className="text-3xl">{moodEmojis[score - 1]}</span>
                                    <span className="text-xs font-bold">{score}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Energy (1-5) */}
                    <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                        <label className="block text-sm font-bold text-neutral-400 mb-4 tracking-wider">
                            エネルギーレベル（体力・気力） <span className="text-teal-400">*</span>
                        </label>
                        <div className="relative pt-2 pb-6 px-3">
                            {/* Custom animated track glow */}
                            <div className="absolute top-3 left-3 right-3 h-2 bg-gradient-to-r from-blue-500/30 via-teal-500/30 to-orange-500/30 rounded-full blur-xl pointer-events-none"></div>

                            <input
                                type="range"
                                min="1" max="5"
                                value={energyScore}
                                onChange={(e) => setEnergyScore(parseInt(e.target.value))}
                                className="w-full h-2.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer outline-none relative z-10 shadow-inner"
                                style={{
                                    background: `linear-gradient(to right, #14b8a6 ${(energyScore - 1) * 25}%, #262626 ${(energyScore - 1) * 25}%)`
                                }}
                            />
                            {/* <style jsx>{`
                                input[type=range]::-webkit-slider-thumb {
                                    -webkit-appearance: none;
                                    height: 24px;
                                    width: 24px;
                                    border-radius: 50%;
                                    background: #ffffff;
                                    cursor: pointer;
                                    box-shadow: 0 0 15px rgba(20, 184, 166, 0.5);
                                    border: 2px solid #14b8a6;
                                }
                            `}</style> */}
                        </div>
                        <div className="flex justify-between text-[11px] text-neutral-500 font-bold px-1 uppercase tracking-widest">
                            <span>Exhausted</span>
                            <span>Normal</span>
                            <span className="text-teal-500/80">Energetic</span>
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-bold text-neutral-400 mb-3">主な体験（複数選択可）</label>
                        <div className="flex flex-wrap gap-2">
                            {EXPERIENCE_TAGS.map(tag => (
                                <button
                                    key={tag.id}
                                    onClick={() => toggleTag(tag.id)}
                                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${selectedTags.includes(tag.id)
                                        ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                                        : 'bg-white/5 border-transparent text-neutral-300 hover:bg-white/10'
                                        }`}
                                >
                                    {tag.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Companion */}
                    <div>
                        <label className="block text-sm font-bold text-neutral-400 mb-3">誰と一緒？</label>
                        <div className="flex gap-2">
                            {COMPANIONS.map(comp => (
                                <button
                                    key={comp.id}
                                    onClick={() => setCompanion(comp.id)}
                                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors border ${companion === comp.id
                                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                                        : 'bg-white/5 border-transparent text-neutral-300 hover:bg-white/10'
                                        }`}
                                >
                                    {comp.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Note */}
                    <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                        <label className="block text-sm font-bold text-neutral-400 mb-3 tracking-wider">メモ（任意）</label>
                        <div className="relative group">
                            <div className="absolute inset-0 bg-teal-500/10 rounded-2xl blur-lg transition-all duration-300 opacity-0 group-focus-within:opacity-100"></div>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="w-full bg-[#0a0a0a]/80 border border-white/10 rounded-2xl p-4 text-white placeholder-neutral-600 focus:outline-none focus:border-teal-500/50 focus:bg-[#0a0a0a] transition-all resize-none relative z-10"
                                rows={3}
                                placeholder="今の出来事や感じたことを書き残す..."
                            />
                        </div>
                    </div>

                    <div className="pt-4 pb-2 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="relative w-full overflow-hidden group bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 hover:from-teal-300 hover:via-cyan-400 hover:to-blue-400 text-neutral-950 font-black py-4.5 rounded-2xl transition-all shadow-[0_10px_30px_rgba(20,184,166,0.3)] hover:shadow-[0_10px_40px_rgba(20,184,166,0.4)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-lg tracking-widest"
                        >
                            <span className="relative z-10 drop-shadow-sm">{isSubmitting ? '記録を保存中...' : '状態を記録する'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
