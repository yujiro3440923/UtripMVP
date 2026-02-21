'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'
import { ArrowLeft, User as UserIcon, Award, Settings, Palette, Edit2, Check, Sparkles, Navigation, Lock, Share2, Sun, Moon, Orbit } from 'lucide-react'
import { useTheme } from '@/providers/ThemeProvider'
import { toast } from 'react-hot-toast'
import { useSwipeNav } from '@/hooks/useSwipeNav'

interface UserStats {
    tripCount: number
    dataPointCount: number
}

interface PersonalityInsight {
    type: string
    description: string
    isLocked: boolean
}

type ThemeOption = {
    id: 'default' | 'ocean' | 'sunset' | 'amethyst' | 'monochrome'
    name: string
    colors: string[]
}

const THEMES: ThemeOption[] = [
    { id: 'default', name: 'Emerald', colors: ['bg-teal-400', 'bg-cyan-500', 'bg-blue-600'] },
    { id: 'ocean', name: 'Ocean', colors: ['bg-sky-400', 'bg-indigo-500', 'bg-purple-600'] },
    { id: 'sunset', name: 'Sunset', colors: ['bg-orange-400', 'bg-rose-500', 'bg-yellow-500'] },
    { id: 'amethyst', name: 'Amethyst', colors: ['bg-purple-400', 'bg-fuchsia-500', 'bg-pink-500'] },
    { id: 'monochrome', name: 'Monochrome', colors: ['bg-neutral-300', 'bg-neutral-500', 'bg-neutral-800'] },
]

export default function ProfilePage() {
    const router = useRouter()
    const { theme, setTheme, lightMode, toggleLightMode } = useTheme()
    const { onTouchStart, onTouchEnd } = useSwipeNav({ leftPath: '/' })

    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<UserStats>({ tripCount: 0, dataPointCount: 0 })
    const [insight, setInsight] = useState<PersonalityInsight | null>(null)

    const [isEditingName, setIsEditingName] = useState(false)
    const [editName, setEditName] = useState('')
    const [updatingName, setUpdatingName] = useState(false)

    useEffect(() => {
        const fetchProfileData = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }

            setUser(session.user)
            setEditName(session.user.user_metadata?.name || 'ゲスト')

            // Fetch Trip Count
            const { count: tripCount } = await supabase
                .from('trips')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', session.user.id)

            // Fetch DataPoints Count
            const { count: dataPointCount } = await supabase
                .from('data_points')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', session.user.id)

            const trips = tripCount || 0
            const points = dataPointCount || 0
            setStats({ tripCount: trips, dataPointCount: points })

            // Generate Personality Insight Mock based on trips
            if (trips === 0) {
                setInsight({
                    type: '未分析',
                    description: 'データが不足しています。今週末、近場にお出かけして記録してみませんか？まずは1回目の旅行を記録して、あなたの隠れた性質をアンロックしましょう。',
                    isLocked: true
                })
            } else if (trips < 3) {
                setInsight({
                    type: '好奇心旺盛なエクスプローラー',
                    description: 'あなたは新しい場所や体験に対して開かれた心を持っています。計画よりも直感で動くことが多く、偶然の出会いに価値を見出す傾向があります。さらにデータを蓄積すると、より深い分析が可能になります。',
                    isLocked: false
                })
            } else {
                setInsight({
                    type: '計画的かつ柔軟なバランサー',
                    description: '過去のデータ傾向から、あなたは事前のリサーチを重んじつつも、現地での予期せぬトラブルを「スパイス」として楽しめる柔軟性を持っています。自己成長意欲が強く、新しい環境への適応力が極めて高いです。',
                    isLocked: false
                })
            }

            setLoading(false)
        }

        fetchProfileData()
    }, [router])

    const handleUpdateName = async () => {
        if (!editName.trim() || !user) return
        setUpdatingName(true)

        const { error } = await supabase.auth.updateUser({
            data: { name: editName }
        })

        if (!error) {
            setUser(prev => prev ? { ...prev, user_metadata: { ...prev.user_metadata, name: editName } } : null)
            setIsEditingName(false)
            toast.success('名前を更新しました')
        } else {
            toast.error('名前の更新に失敗しました')
        }
        setUpdatingName(false)
    }

    const getRank = (trips: number) => {
        if (trips === 0) return { title: 'Trainee', color: 'text-neutral-400', progress: 0, next: 1 }
        if (trips < 3) return { title: 'Explorer', color: 'text-t-secondary-400', progress: (trips / 3) * 100, next: 3 }
        if (trips < 10) return { title: 'Voyager', color: 'text-t-primary-400', progress: (trips / 10) * 100, next: 10 }
        return { title: 'Master', color: 'text-t-accent-400', progress: 100, next: trips }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-t-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    const rank = getRank(stats.tripCount)

    return (
        <div className={`min-h-screen ${lightMode ? 'bg-[#f5f5f9]' : 'bg-[#020208]'} text-[var(--foreground)] pb-32 font-sans selection:bg-t-primary-500/30 relative overflow-hidden`}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            {/* Background aurora */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-bl from-blue-600/15 via-purple-600/10 to-transparent rounded-full blur-[160px] animate-breathe" style={{ animationDuration: '8s' }}></div>
                <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-tr from-teal-500/10 via-cyan-500/8 to-transparent rounded-full blur-[140px] animate-breathe" style={{ animationDelay: '3s', animationDuration: '10s' }}></div>
                <div className="absolute top-[30%] left-[5%] w-1.5 h-1.5 bg-teal-400/40 rounded-full animate-antigrav" style={{ animationDuration: '11s' }}></div>
                <div className="absolute top-[60%] right-[10%] w-1 h-1 bg-purple-400/30 rounded-full animate-antigrav" style={{ animationDuration: '13s', animationDelay: '2s' }}></div>
            </div>

            {/* Header */}
            <header className="px-6 py-5 flex items-center gap-4 sticky top-0 glass-frosted z-20 border-b border-white/5">
                <button onClick={() => router.push('/')} className="p-2.5 text-neutral-400 hover:text-white glass-effect rounded-full transition-all">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold tracking-tight text-white">Profile</h1>
            </header>

            <main className="p-6 max-w-md mx-auto relative z-10 space-y-8 animate-fade-in-up">

                {/* User Identity Section */}
                <section className="glass-ultra rounded-[2.5rem] p-8 relative overflow-hidden text-center glass-shimmer animate-slide-up-spring">
                    <div className="absolute top-0 right-0 w-32 h-32 glow-sphere opacity-15" style={{ animationDuration: '5s' }}></div>

                    <div className="w-24 h-24 mx-auto glass-ultra rounded-3xl flex items-center justify-center shadow-2xl relative mb-6 animate-antigrav" style={{ animationDuration: '7s' }}>
                        <UserIcon size={40} className="text-t-primary-300 drop-shadow-[0_0_15px_rgba(var(--color-t-primary-400),0.5)]" />
                        <div className="absolute -bottom-2 -right-2 bg-neutral-900 rounded-full p-2 border border-white/10 shadow-lg">
                            <Award size={16} className={rank.color} />
                        </div>
                    </div>

                    <div className="mb-2">
                        {isEditingName ? (
                            <div className="flex items-center justify-center gap-3">
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="bg-black/50 border border-t-primary-500/30 text-center rounded-xl px-4 py-2 text-xl font-bold text-white focus:outline-none focus:border-t-primary-500 w-full"
                                    autoFocus
                                />
                                <button
                                    onClick={handleUpdateName}
                                    disabled={updatingName}
                                    className="p-2.5 bg-t-primary-500/20 text-t-primary-300 rounded-xl hover:bg-t-primary-500/30 transition-colors"
                                >
                                    <Check size={20} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-3">
                                <h2 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                                    {user?.user_metadata?.name || 'ゲスト'}
                                </h2>
                                <button onClick={() => setIsEditingName(true)} className="text-neutral-500 hover:text-t-primary-400 transition-colors">
                                    <Edit2 size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                    <p className="text-sm font-medium text-neutral-400 mb-6">{user?.email}</p>

                    {/* Rank Display */}
                    <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-neutral-500 tracking-widest uppercase">Current Rank</span>
                            <span className={`text-sm font-black tracking-widest uppercase ${rank.color}`}>{rank.title}</span>
                        </div>
                        <div className="h-2 bg-black/50 rounded-full overflow-hidden mb-2 relative">
                            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-t-primary-600 to-t-secondary-400 rounded-full transition-all duration-1000" style={{ width: `${rank.progress}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[11px] font-medium text-neutral-400">
                            <span>{stats.tripCount} Trips</span>
                            {stats.tripCount < rank.next && <span>Next: {rank.next} Trips</span>}
                        </div>
                    </div>
                </section>

                {/* AI Personality Insight */}
                <section>
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="p-2 bg-t-accent-500/20 rounded-xl border border-t-accent-500/30">
                            <Sparkles size={18} className="text-t-accent-400" />
                        </div>
                        <h3 className="text-lg font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-t-accent-200 to-white">AI パーソナリティ分析</h3>
                    </div>

                    <div className={`glass-effect rounded-[2rem] p-6 relative overflow-hidden transition-all duration-500 ${insight?.isLocked ? 'border-neutral-800' : 'border-t-accent-500/20 shadow-[0_10px_40px_-10px_rgba(var(--color-t-accent-500),0.15)]'}`}>
                        {insight?.isLocked && (
                            <div className="absolute inset-0 bg-[#050505]/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-8 text-center border border-white/5 rounded-[2rem]">
                                <div className="w-14 h-14 bg-neutral-900 rounded-2xl flex items-center justify-center mb-4 shadow-xl border border-neutral-800">
                                    <Lock size={24} className="text-neutral-500" />
                                </div>
                                <h4 className="font-bold text-lg mb-2 text-neutral-300">データが不足しています</h4>
                                <p className="text-sm text-neutral-500 leading-relaxed font-medium">週末のお出かけから記録をスタートしてみましょう！1回目の記録で最初の分析がアンロックされます。</p>
                            </div>
                        )}

                        <div className={insight?.isLocked ? 'opacity-30 blur-sm flex flex-col items-center' : ''}>
                            <h4 className="text-sm font-black text-t-accent-400 mb-3 tracking-widest uppercase">{insight?.type}</h4>
                            <p className="text-sm text-neutral-300 leading-relaxed font-medium">
                                {insight?.description}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Theme Settings */}
                <section>
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="p-2 bg-t-primary-500/20 rounded-xl border border-t-primary-500/30">
                            <Palette size={18} className="text-t-primary-400" />
                        </div>
                        <h3 className="text-lg font-bold tracking-tight">テーマカラー設定</h3>
                    </div>

                    {/* Light / Dark Toggle */}
                    <div className="glass-effect rounded-2xl p-5 mb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {lightMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-blue-400" />}
                                <span className="text-sm font-bold">{lightMode ? 'ライトモード' : 'ダークモード'}</span>
                            </div>
                            <button
                                onClick={toggleLightMode}
                                className={`relative w-14 h-8 rounded-full transition-all duration-300 ${lightMode ? 'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)]' : 'bg-neutral-700'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${lightMode ? 'translate-x-7' : 'translate-x-1'}`}></div>
                            </button>
                        </div>
                    </div>

                    <div className="glass-effect rounded-[2rem] p-6">
                        <p className="text-xs font-bold text-neutral-500 tracking-widest uppercase mb-5">Select Your Style</p>
                        <div className="grid grid-cols-5 gap-3">
                            {THEMES.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id)}
                                    className={`flex flex-col items-center gap-3 transition-transform ${theme === t.id ? 'scale-110' : 'hover:scale-105 opacity-60 hover:opacity-100'}`}
                                >
                                    <div className={`w-12 h-12 rounded-full flex flex-col overflow-hidden relative border-2 ${theme === t.id ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-transparent'}`}>
                                        {/* Display gradient preview of theme */}
                                        <div className={`h-1/3 w-full ${t.colors[0]}`}></div>
                                        <div className={`h-1/3 w-full ${t.colors[1]}`}></div>
                                        <div className={`h-1/3 w-full ${t.colors[2]}`}></div>
                                        {theme === t.id && (
                                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                                <Check size={16} className="text-white drop-shadow-md" strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                    <span className={`text-[10px] font-bold tracking-wider ${theme === t.id ? 'text-white' : 'text-neutral-500'}`}>{t.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Share Profile */}
                <section>
                    <button
                        onClick={async () => {
                            const shareText = `Utripで旅の記録を始めてみました！\n\n` +
                                `ランク: ${rank.title}\n` +
                                `旅行回数: ${stats.tripCount}回\n` +
                                (insight && !insight.isLocked ? `タイプ: ${insight.type}\n` : '') +
                                `\n#Utrip #旅行記録`
                            if (navigator.share) {
                                try {
                                    await navigator.share({ title: 'Utrip - マイプロフィール', text: shareText })
                                } catch (e) { /* user cancelled */ }
                            } else {
                                await navigator.clipboard.writeText(shareText)
                                toast.success('クリップボードにコピーしました')
                            }
                        }}
                        className="w-full glass-effect rounded-2xl p-5 flex items-center justify-center gap-3 text-neutral-400 hover:text-white hover:border-t-primary-500/30 transition-all group"
                    >
                        <Share2 size={18} className="group-hover:text-t-primary-400 transition-colors" />
                        <span className="text-sm font-bold tracking-wide">プロフィールをシェア</span>
                    </button>
                </section>

            </main>

            {/* App-like Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 glass-frosted pt-2 px-6 flex justify-around items-center h-[90px] pb-safe lg:rounded-t-[2.5rem] lg:w-full lg:max-w-md lg:mx-auto">
                <Link href="/" className="flex flex-col items-center gap-1.5 text-neutral-500 hover:text-neutral-300 transition-colors group mb-2">
                    <div className="p-2 rounded-2xl group-hover:bg-white/5 transition-all duration-300">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    </div>
                    <span className="text-[10px] font-bold tracking-widest uppercase">Home</span>
                </Link>

                {/* FAB: Create Trip (Inactive state for profile page) */}
                <div className="relative -top-8 flex flex-col items-center">
                    <div className="absolute top-2 w-20 h-20 bg-neutral-800 rounded-full blur-xl opacity-30"></div>
                    <button
                        onClick={() => router.push('/')}
                        className="relative flex items-center justify-center w-[80px] h-[80px] bg-neutral-900 rounded-full border-[3px] border-[#0a0a0a] overflow-hidden opacity-60 hover:opacity-100 transition-opacity"
                    >
                        <Navigation size={30} strokeWidth={2} className="text-neutral-500 rotate-45 ml-[-4px] mt-[4px]" />
                    </button>
                </div>

                {/* Nav Item: Orbit */}
                <Link href="/orbit" className="flex flex-col items-center gap-1.5 text-neutral-500 hover:text-indigo-400 transition-colors group mb-2">
                    <div className="p-2 rounded-2xl group-hover:bg-indigo-500/10 transition-all duration-300">
                        <Orbit size={22} />
                    </div>
                    <span className="text-[10px] font-bold tracking-widest uppercase">Orbit</span>
                </Link>

                <button className="flex flex-col items-center gap-1.5 text-t-primary-400 group relative mb-2">
                    <div className="p-2 rounded-2xl bg-t-primary-500/10 group-hover:bg-t-primary-500/20 transition-all duration-300 shadow-[inset_0_1px_4px_rgba(255,255,255,0.1)]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <span className="text-[10px] font-black tracking-widest uppercase">Profile</span>
                    <div className="absolute -bottom-2.5 w-1 h-1 rounded-full bg-t-primary-400 shadow-[0_0_8px_var(--glow-color)]"></div>
                </button>
            </nav>

        </div>
    )
}
