'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

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
            alert('現在地が取得できていないため記録できません。')
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

        } catch (error: unknown) {
            if (error instanceof Error) {
                alert('保存に失敗しました: ' + error.message)
            } else {
                alert('保存に失敗しました。')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const moodEmojis = ['😭', '😥', '😐', '😊', '🤩']
    const energyColors = ['bg-blue-500', 'bg-blue-400', 'bg-teal-400', 'bg-yellow-400', 'bg-orange-500']

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-neutral-900 rounded-t-3xl z-50 p-6 shadow-2xl border-t border-white/10 animate-slide-up h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">今の状態を記録</h2>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-8 pb-10">
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
                    <div>
                        <label className="block text-sm font-bold text-neutral-400 mb-3">
                            エネルギーレベル（体力・気力） <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="range"
                            min="1" max="5"
                            value={energyScore}
                            onChange={(e) => setEnergyScore(parseInt(e.target.value))}
                            className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
                        />
                        <div className="flex justify-between text-xs text-neutral-500 mt-2 font-bold px-1">
                            <span>1 (疲れた)</span>
                            <span>3 (普通)</span>
                            <span>5 (元気！)</span>
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
                    <div>
                        <label className="block text-sm font-bold text-neutral-400 mb-2">メモ（任意）</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full bg-neutral-800 border-none rounded-xl p-3 text-white placeholder-neutral-500 focus:ring-2 focus:ring-teal-500"
                            rows={3}
                            placeholder="今の出来事や感じたことを書き残す..."
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full bg-teal-500 hover:bg-teal-400 text-neutral-900 font-bold py-4 rounded-xl transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? '保存中...' : '記録する'}
                    </button>
                </div>
            </div>
        </>
    )
}
