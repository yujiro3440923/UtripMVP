'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Search, UserPlus, UserMinus, Orbit as OrbitIcon, Home, User as UserIcon, Sparkles, X } from 'lucide-react'
import { useTheme } from '@/providers/ThemeProvider'
import { useSwipeNav } from '@/hooks/useSwipeNav'
import { toast } from 'react-hot-toast'

interface VibeMatch {
    userId: string
    name: string
    email: string
    similarity: number
    vector: number[]
}

export default function OrbitPage() {
    const router = useRouter()
    const { lightMode } = useTheme()
    const { onTouchStart, onTouchEnd } = useSwipeNav({ leftPath: '/', rightPath: '/profile' })

    const [user, setUser] = useState<User | null>(null)
    const [matches, setMatches] = useState<VibeMatch[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [searching, setSearching] = useState(false)
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/login'); return }
            setUser(user)
            await loadOrbit(user.id)
        }
        init()
    }, [router])

    const loadOrbit = async (userId: string) => {
        setLoading(true)
        try {
            // Load following list
            const followRes = await fetch(`/api/social?userId=${userId}&action=following`)
            const followData = await followRes.json()
            const ids = new Set<string>((followData.following || []).map((f: any) => f.following_id))
            setFollowingIds(ids)

            // Load vibe matches
            const matchRes = await fetch(`/api/vibe-match?userId=${userId}`)
            const matchData = await matchRes.json()
            setMatches(matchData.matches || [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = async () => {
        if (!searchQuery.trim()) return
        setSearching(true)
        try {
            const res = await fetch(`/api/social?action=search&q=${encodeURIComponent(searchQuery)}`)
            const data = await res.json()
            // Filter out self
            setSearchResults((data.users || []).filter((u: any) => u.id !== user?.id))
        } catch (e) {
            console.error(e)
        } finally {
            setSearching(false)
        }
    }

    const handleFollow = async (targetId: string) => {
        if (!user) return
        try {
            await fetch('/api/social', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ followerId: user.id, followingId: targetId })
            })
            setFollowingIds(prev => new Set([...prev, targetId]))
            toast.success('フォローしました')
            await loadOrbit(user.id)
        } catch (e) {
            toast.error('フォローに失敗しました')
        }
    }

    const handleUnfollow = async (targetId: string) => {
        if (!user) return
        try {
            await fetch('/api/social', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ followerId: user.id, followingId: targetId })
            })
            setFollowingIds(prev => { const s = new Set(prev); s.delete(targetId); return s })
            toast.success('フォロー解除しました')
            setMatches(prev => prev.filter(m => m.userId !== targetId))
        } catch (e) {
            toast.error('フォロー解除に失敗しました')
        }
    }

    // Orbit positions: distribute around center
    const getOrbitPosition = (index: number, total: number, radius: number) => {
        const angle = (index / total) * Math.PI * 2 - Math.PI / 2
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        }
    }

    return (
        <div
            className={`min-h-screen ${lightMode ? 'bg-[#f5f5f9]' : 'bg-[#020208]'} text-[var(--foreground)] pb-28 font-sans relative overflow-hidden`}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            {/* Aurora background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className={`absolute top-[-25%] left-[-15%] w-[600px] h-[600px] rounded-full blur-[160px] animate-breathe ${lightMode ? 'bg-gradient-to-br from-indigo-300/15 via-purple-300/10 to-transparent' : 'bg-gradient-to-br from-indigo-600/20 via-purple-600/15 to-transparent'}`} style={{ animationDuration: '8s' }}></div>
                <div className={`absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[140px] animate-breathe ${lightMode ? 'bg-gradient-to-tl from-cyan-300/10 via-teal-300/8 to-transparent' : 'bg-gradient-to-tl from-cyan-500/15 via-teal-500/10 to-transparent'}`} style={{ animationDelay: '3s', animationDuration: '10s' }}></div>
            </div>

            {/* Header */}
            <header className="sticky top-0 glass-frosted z-20 border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <OrbitIcon size={22} className="text-indigo-400" />
                    <h1 className="text-lg font-bold tracking-tight">Vibe Orbit</h1>
                </div>
                <span className={`text-[10px] font-black tracking-[0.2em] px-3 py-1 rounded-full border ${lightMode ? 'text-indigo-600 bg-indigo-100 border-indigo-200' : 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20'}`}>
                    {matches.length} CONNECTIONS
                </span>
            </header>

            <main className="px-6 mt-6 relative z-10">

                {/* Search Section */}
                <section className="mb-8">
                    <div className={`flex gap-2 rounded-2xl p-1.5 ${lightMode ? 'bg-white/70 border border-neutral-200' : 'glass-ultra'}`}>
                        <input
                            type="text"
                            placeholder="名前やメールで検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-transparent outline-none placeholder:text-neutral-500 ${lightMode ? 'text-neutral-800' : 'text-white'}`}
                        />
                        <button
                            onClick={handleSearch}
                            disabled={searching}
                            className="px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Search size={16} />
                            <span className="text-xs font-bold">{searching ? '...' : '検索'}</span>
                        </button>
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                        <div className="mt-3 space-y-2 animate-slide-up-spring">
                            <div className="flex items-center justify-between px-2">
                                <p className={`text-xs font-bold tracking-widest ${lightMode ? 'text-neutral-500' : 'text-neutral-500'}`}>検索結果</p>
                                <button onClick={() => setSearchResults([])} className="p-1"><X size={14} className="text-neutral-500" /></button>
                            </div>
                            {searchResults.map((u) => (
                                <div key={u.id} className={`flex items-center justify-between p-4 rounded-2xl ${lightMode ? 'bg-white/70 border border-neutral-200' : 'glass-ultra'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${lightMode ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-500/20 text-indigo-300'}`}>
                                            {(u.name || u.email)?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{u.name || 'Unknown'}</p>
                                            <p className={`text-xs ${lightMode ? 'text-neutral-500' : 'text-neutral-500'}`}>{u.email}</p>
                                        </div>
                                    </div>
                                    {followingIds.has(u.id) ? (
                                        <button onClick={() => handleUnfollow(u.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${lightMode ? 'border-neutral-300 text-neutral-600 hover:bg-neutral-100' : 'border-neutral-700 text-neutral-400 hover:bg-white/5'}`}>
                                            <UserMinus size={14} className="inline mr-1" />フォロー中
                                        </button>
                                    ) : (
                                        <button onClick={() => handleFollow(u.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-600 transition-all active:scale-95">
                                            <UserPlus size={14} className="inline mr-1" />フォロー
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Orbital Visualization */}
                <section className="mb-8">
                    <div className="flex items-center gap-3 mb-5 px-2">
                        <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                            <Sparkles size={18} className="text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold tracking-tight">波長マッチ</h3>
                            <p className={`text-[10px] font-bold tracking-widest ${lightMode ? 'text-neutral-500' : 'text-neutral-500'}`}>VIBE SIMILARITY</p>
                        </div>
                    </div>

                    <div className={`relative rounded-[2.5rem] overflow-hidden ${lightMode ? 'bg-white/50 border border-neutral-200 shadow-lg' : 'glass-ultra'}`} style={{ height: '360px' }}>
                        {/* Orbit rings */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className={`w-48 h-48 rounded-full border ${lightMode ? 'border-neutral-200' : 'border-white/5'} animate-spin`} style={{ animationDuration: '60s' }}></div>
                            <div className={`absolute w-72 h-72 rounded-full border ${lightMode ? 'border-neutral-200/50' : 'border-white/[0.03]'} animate-spin`} style={{ animationDuration: '80s', animationDirection: 'reverse' }}></div>
                        </div>

                        {/* Center: Me */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500/30 rounded-full blur-xl animate-pulse-glow"></div>
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-black border-2 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)] ${lightMode ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-500/30 text-indigo-200'}`}>
                                    {user?.user_metadata?.name?.[0]?.toUpperCase() || 'Me'}
                                </div>
                            </div>
                            <p className={`text-[10px] font-bold text-center mt-2 tracking-widest ${lightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>YOU</p>
                        </div>

                        {/* Orbiting followers */}
                        {!loading && matches.map((match, idx) => {
                            const radius = 90 + (100 - match.similarity) * 0.6
                            const pos = getOrbitPosition(idx, matches.length, Math.min(radius, 140))
                            const vibeColor = match.similarity > 70 ? 'from-teal-400 to-cyan-300' :
                                match.similarity > 40 ? 'from-blue-400 to-indigo-300' : 'from-purple-400 to-pink-300'

                            return (
                                <div
                                    key={match.userId}
                                    className="absolute top-1/2 left-1/2 z-10 animate-antigrav"
                                    style={{
                                        transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                                        animationDuration: `${8 + idx * 2}s`,
                                        animationDelay: `${idx * 0.5}s`
                                    }}
                                >
                                    <button
                                        onClick={() => handleUnfollow(match.userId)}
                                        className="group relative flex flex-col items-center"
                                        title={`${match.name} - Vibe: ${match.similarity}%`}
                                    >
                                        {/* Vibe glow */}
                                        <div className={`absolute -inset-2 rounded-full bg-gradient-to-r ${vibeColor} opacity-20 blur-md group-hover:opacity-40 transition-opacity`}></div>
                                        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold border-2 shadow-lg relative ${lightMode ? 'bg-white border-indigo-200 text-indigo-700' : 'bg-neutral-900/80 border-indigo-500/30 text-indigo-200'}`}>
                                            {match.name[0]?.toUpperCase() || '?'}
                                        </div>
                                        <span className={`text-[9px] font-bold mt-1 max-w-[60px] truncate ${lightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>{match.name}</span>
                                        <span className={`text-[8px] font-black bg-gradient-to-r ${vibeColor} text-transparent bg-clip-text`}>{match.similarity}%</span>
                                    </button>
                                </div>
                            )
                        })}

                        {/* Empty state */}
                        {!loading && matches.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center mt-20">
                                    <p className={`text-sm font-bold mb-1 ${lightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>まだ軌道に誰もいません</p>
                                    <p className={`text-xs ${lightMode ? 'text-neutral-500' : 'text-neutral-600'}`}>上の検索から仲間を見つけましょう</p>
                                </div>
                            </div>
                        )}

                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-12 h-12 border-[3px] border-indigo-400 rounded-full border-t-transparent animate-spin"></div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Followers list */}
                {matches.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="text-sm font-bold tracking-tight">フォロー中</h3>
                            <span className={`text-[10px] font-black tracking-[0.2em] px-3 py-1 rounded-full border ${lightMode ? 'text-neutral-600 bg-neutral-200/80 border-neutral-300' : 'text-neutral-500 bg-neutral-900 border-neutral-800'}`}>
                                {matches.length}
                            </span>
                        </div>
                        <div className="space-y-3">
                            {matches.map((match) => (
                                <div key={match.userId} className={`flex items-center justify-between p-4 rounded-2xl transition-all ${lightMode ? 'bg-white/70 border border-neutral-200 hover:bg-white/90' : 'glass-ultra hover:border-indigo-500/20'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${lightMode ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-500/20 text-indigo-300'}`}>
                                            {match.name[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{match.name}</p>
                                            <div className="flex items-center gap-2">
                                                <div className={`h-1.5 rounded-full ${lightMode ? 'bg-neutral-200' : 'bg-neutral-800'}`} style={{ width: '60px' }}>
                                                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400" style={{ width: `${match.similarity}%` }}></div>
                                                </div>
                                                <span className="text-[10px] font-bold text-indigo-400">{match.similarity}% Vibe</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => handleUnfollow(match.userId)} className={`p-2 rounded-lg transition-all ${lightMode ? 'hover:bg-neutral-100' : 'hover:bg-white/5'}`}>
                                        <UserMinus size={16} className="text-neutral-500" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 glass-frosted pt-2 px-6 flex justify-around items-center h-[80px] pb-safe lg:rounded-t-[2.5rem] lg:w-full lg:max-w-md lg:mx-auto">
                <Link href="/" className={`flex flex-col items-center gap-1.5 group ${lightMode ? 'text-neutral-500' : 'text-neutral-600'}`}>
                    <div className="p-2 rounded-2xl group-hover:bg-teal-500/10 transition-all">
                        <Home size={22} />
                    </div>
                    <span className="text-[9px] font-black tracking-widest">HOME</span>
                </Link>

                <div className="flex flex-col items-center gap-1.5 text-indigo-400 relative">
                    <div className="p-2 rounded-2xl bg-indigo-500/10">
                        <OrbitIcon size={22} />
                    </div>
                    <span className="text-[9px] font-black tracking-widest">ORBIT</span>
                    <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,1)]"></div>
                </div>

                <Link href="/profile" className={`flex flex-col items-center gap-1.5 group ${lightMode ? 'text-neutral-500' : 'text-neutral-600'}`}>
                    <div className="p-2 rounded-2xl group-hover:bg-purple-500/10 transition-all">
                        <UserIcon size={22} />
                    </div>
                    <span className="text-[9px] font-black tracking-widest">PROFILE</span>
                </Link>
            </nav>
        </div>
    )
}
