'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Plus, Home, User as UserIcon, Orbit, Archive, Link2, FileText, Trash2, X, ChevronLeft, Tag, MapPin, Utensils, Sparkles } from 'lucide-react'
import { useTheme } from '@/providers/ThemeProvider'
import { toast } from 'react-hot-toast'

interface Bucket {
    id: string; name: string; description: string | null; is_shared: boolean; created_at: string
    bucket_items?: Array<{ count: number }>
}

interface BucketItem {
    id: string; url: string | null; memo: string | null; ai_tags: Record<string, string>; created_at: string
}

export default function BucketPage() {
    const router = useRouter()
    const { lightMode } = useTheme()
    const [user, setUser] = useState<User | null>(null)
    const [buckets, setBuckets] = useState<Bucket[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedBucket, setSelectedBucket] = useState<Bucket | null>(null)
    const [items, setItems] = useState<BucketItem[]>([])
    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState('')
    const [showAddItem, setShowAddItem] = useState(false)
    const [newUrl, setNewUrl] = useState('')
    const [newMemo, setNewMemo] = useState('')
    const [addingItem, setAddingItem] = useState(false)

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/login'); return }
            setUser(user)
            await loadBuckets(user.id)
        }
        init()
    }, [router])

    const loadBuckets = useCallback(async (userId: string) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/bucket?userId=${userId}`)
            const data = await res.json()
            setBuckets(data.buckets || [])
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [])

    const loadBucketDetail = async (bucket: Bucket) => {
        setSelectedBucket(bucket)
        try {
            const res = await fetch(`/api/bucket?bucketId=${bucket.id}`)
            const data = await res.json()
            setItems(data.items || [])
        } catch (e) { console.error(e) }
    }

    const createBucket = async () => {
        if (!user || !newName.trim()) return
        try {
            const res = await fetch('/api/bucket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, name: newName.trim() })
            })
            const data = await res.json()
            if (data.success) {
                toast.success('バケットを作成しました')
                setShowCreate(false)
                setNewName('')
                await loadBuckets(user.id)
            }
        } catch { toast.error('作成に失敗しました') }
    }

    const addItem = async () => {
        if (!user || !selectedBucket || (!newUrl.trim() && !newMemo.trim())) return
        setAddingItem(true)
        try {
            const res = await fetch('/api/bucket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add_item',
                    bucketId: selectedBucket.id,
                    userId: user.id,
                    url: newUrl.trim() || null,
                    memo: newMemo.trim() || null
                })
            })
            const data = await res.json()
            if (data.success) {
                toast.success('アイテムを追加しました')
                setShowAddItem(false)
                setNewUrl('')
                setNewMemo('')
                await loadBucketDetail(selectedBucket)
            }
        } catch { toast.error('追加に失敗しました') }
        finally { setAddingItem(false) }
    }

    const deleteItem = async (itemId: string) => {
        try {
            await fetch('/api/bucket', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId })
            })
            setItems(prev => prev.filter(i => i.id !== itemId))
            toast.success('削除しました')
        } catch { toast.error('削除に失敗しました') }
    }

    const deleteBucket = async (bucketId: string) => {
        if (!user) return
        try {
            await fetch('/api/bucket', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bucketId })
            })
            setSelectedBucket(null)
            toast.success('バケットを削除しました')
            await loadBuckets(user.id)
        } catch { toast.error('削除に失敗しました') }
    }

    const genreIcon = (genre: string) => {
        if (genre === 'グルメ') return <Utensils size={10} className="text-orange-400" />
        if (genre === '観光') return <MapPin size={10} className="text-blue-400" />
        return <Tag size={10} className="text-purple-400" />
    }

    // Bubble positions for buckets
    const getBubbleStyle = (idx: number, total: number) => {
        const positions = [
            { top: '8%', left: '10%', size: 140 },
            { top: '5%', left: '55%', size: 120 },
            { top: '35%', left: '30%', size: 150 },
            { top: '30%', left: '70%', size: 110 },
            { top: '60%', left: '8%', size: 130 },
            { top: '58%', left: '55%', size: 125 },
            { top: '80%', left: '35%', size: 115 },
        ]
        return positions[idx % positions.length]
    }

    return (
        <div className={`min-h-screen ${lightMode ? 'bg-[#f5f5f9]' : 'bg-[#020208]'} text-[var(--foreground)] pb-28 font-sans relative overflow-hidden`}>
            {/* Aurora */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className={`absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[160px] animate-breathe ${lightMode ? 'bg-gradient-to-br from-cyan-300/15 via-blue-300/10 to-transparent' : 'bg-gradient-to-br from-cyan-600/15 via-blue-600/10 to-transparent'}`} style={{ animationDuration: '8s' }}></div>
                <div className={`absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[120px] animate-breathe ${lightMode ? 'bg-gradient-to-tl from-purple-300/10 to-transparent' : 'bg-gradient-to-tl from-purple-500/10 to-transparent'}`} style={{ animationDelay: '4s', animationDuration: '12s' }}></div>
            </div>

            {/* Header */}
            <header className="sticky top-0 glass-frosted z-20 border-b border-white/5 px-6 py-4 flex items-center justify-between">
                {selectedBucket ? (
                    <>
                        <button onClick={() => setSelectedBucket(null)} className="flex items-center gap-2">
                            <ChevronLeft size={20} className="text-neutral-400" />
                            <h1 className="text-lg font-bold tracking-tight">{selectedBucket.name}</h1>
                        </button>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowAddItem(true)} className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition-all">
                                <Plus size={18} />
                            </button>
                            <button onClick={() => deleteBucket(selectedBucket.id)} className="p-2 text-neutral-500 hover:text-red-400 transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-3">
                            <Archive size={22} className="text-cyan-400" />
                            <h1 className="text-lg font-bold tracking-tight">Vibe Bucket</h1>
                        </div>
                        <button onClick={() => setShowCreate(true)} className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition-all active:scale-95">
                            <Plus size={18} />
                        </button>
                    </>
                )}
            </header>

            <main className="relative z-10">

                {/* === Bucket List (Floating Bubbles) === */}
                {!selectedBucket && (
                    <div className="relative" style={{ minHeight: '70vh' }}>
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-12 h-12 border-[3px] border-cyan-400 rounded-full border-t-transparent animate-spin"></div>
                            </div>
                        )}

                        {!loading && buckets.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center px-6">
                                <div className="text-center">
                                    <div className="w-20 h-20 mx-auto mb-4 glow-sphere opacity-30 animate-antigrav" style={{ animationDuration: '6s', background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), rgba(6,182,212,0.3) 40%, transparent 70%)' }}></div>
                                    <p className={`text-lg font-bold mb-2 ${lightMode ? 'text-neutral-700' : 'text-neutral-300'}`}>バケットがありません</p>
                                    <p className={`text-sm mb-6 ${lightMode ? 'text-neutral-500' : 'text-neutral-600'}`}>右上の「+」からバケットを作って<br />行きたい場所を集めましょう</p>
                                    <button onClick={() => setShowCreate(true)} className="px-6 py-3 bg-cyan-500 text-white rounded-2xl font-bold text-sm hover:bg-cyan-600 transition-all active:scale-95">
                                        最初のバケットを作る
                                    </button>
                                </div>
                            </div>
                        )}

                        {!loading && buckets.map((bucket, idx) => {
                            const style = getBubbleStyle(idx, buckets.length)
                            const itemCount = bucket.bucket_items?.[0]?.count || 0
                            return (
                                <button
                                    key={bucket.id}
                                    onClick={() => loadBucketDetail(bucket)}
                                    className="absolute animate-antigrav group"
                                    style={{ top: style.top, left: style.left, animationDuration: `${7 + idx * 1.5}s`, animationDelay: `${idx * 0.3}s` }}
                                >
                                    <div className={`relative rounded-full flex flex-col items-center justify-center p-4 transition-all duration-300 group-hover:scale-110 ${lightMode ? 'bg-white/60 border border-neutral-200/80 shadow-xl hover:shadow-2xl' : 'glass-ultra hover:border-cyan-500/30'}`} style={{ width: style.size, height: style.size }}>
                                        {/* Iridescent glow */}
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400/5 via-transparent to-purple-400/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <Archive size={24} className={`mb-2 ${lightMode ? 'text-cyan-600' : 'text-cyan-400'}`} />
                                        <p className={`text-xs font-bold text-center leading-tight max-w-[80%] ${lightMode ? 'text-neutral-700' : 'text-neutral-200'}`}>{bucket.name}</p>
                                        <span className={`text-[9px] mt-1 font-bold ${lightMode ? 'text-neutral-500' : 'text-neutral-500'}`}>{itemCount}件</span>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* === Bucket Detail (Items) === */}
                {selectedBucket && (
                    <div className="px-6 mt-4 space-y-3 animate-slide-up-spring">
                        {items.length === 0 && (
                            <div className="text-center py-16">
                                <Sparkles size={32} className={`mx-auto mb-3 ${lightMode ? 'text-neutral-400' : 'text-neutral-600'}`} />
                                <p className={`font-bold mb-1 ${lightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>まだ何もありません</p>
                                <p className={`text-xs ${lightMode ? 'text-neutral-500' : 'text-neutral-600'}`}>URLやメモを追加して旅の欠片を集めましょう</p>
                            </div>
                        )}
                        {items.map((item) => (
                            <div key={item.id} className={`p-4 rounded-2xl transition-all group animate-fade-in-up ${lightMode ? 'bg-white/70 border border-neutral-200 hover:bg-white/90' : 'glass-ultra hover:border-cyan-500/20'}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        {item.url && (
                                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-bold text-cyan-400 hover:text-cyan-300 truncate mb-1">
                                                <Link2 size={14} className="shrink-0" />
                                                <span className="truncate">{item.url}</span>
                                            </a>
                                        )}
                                        {item.memo && (
                                            <div className="flex items-start gap-2">
                                                <FileText size={14} className={`shrink-0 mt-0.5 ${lightMode ? 'text-neutral-500' : 'text-neutral-500'}`} />
                                                <p className={`text-sm ${lightMode ? 'text-neutral-700' : 'text-neutral-300'}`}>{item.memo}</p>
                                            </div>
                                        )}
                                        {/* AI Tags */}
                                        {item.ai_tags && Object.keys(item.ai_tags).length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {Object.entries(item.ai_tags).filter(([, v]) => v && v !== '不明').map(([key, val]) => (
                                                    <span key={key} className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${lightMode ? 'bg-neutral-100 text-neutral-600 border border-neutral-200' : 'bg-white/5 text-neutral-400 border border-white/10'}`}>
                                                        {genreIcon(String(val))} {String(val)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => deleteItem(item.id)} className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500 hover:text-red-400">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Create Bucket Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-fade-in-up" onClick={() => setShowCreate(false)}>
                    <div className={`w-full max-w-sm rounded-[2rem] p-8 ${lightMode ? 'bg-white shadow-2xl' : 'glass-ultra'}`} onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4">新しいバケット</h3>
                        <input
                            type="text"
                            placeholder="バケット名（例: 京都の旅）"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && createBucket()}
                            className={`w-full px-4 py-3 rounded-xl mb-4 text-sm font-medium outline-none border ${lightMode ? 'bg-neutral-50 border-neutral-200 text-neutral-800' : 'bg-white/5 border-white/10 text-white'}`}
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setShowCreate(false)} className={`flex-1 py-3 rounded-xl font-bold text-sm ${lightMode ? 'bg-neutral-100 text-neutral-600' : 'bg-white/5 text-neutral-400'}`}>キャンセル</button>
                            <button onClick={createBucket} className="flex-1 py-3 rounded-xl font-bold text-sm bg-cyan-500 text-white hover:bg-cyan-600 transition-all active:scale-95">作成</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Item Modal */}
            {showAddItem && (
                <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in-up" onClick={() => setShowAddItem(false)}>
                    <div className={`w-full max-w-sm rounded-t-[2rem] rounded-b-2xl p-8 ${lightMode ? 'bg-white shadow-2xl' : 'glass-ultra'}`} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold">アイテムを追加</h3>
                            <button onClick={() => setShowAddItem(false)} className="p-1"><X size={20} className="text-neutral-500" /></button>
                        </div>
                        <input
                            type="url"
                            placeholder="URL（Instagram, Web等）"
                            value={newUrl}
                            onChange={e => setNewUrl(e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl mb-3 text-sm font-medium outline-none border ${lightMode ? 'bg-neutral-50 border-neutral-200 text-neutral-800' : 'bg-white/5 border-white/10 text-white'}`}
                        />
                        <textarea
                            placeholder="メモ（例: 来月どっかで美味しい肉食べたい）"
                            value={newMemo}
                            onChange={e => setNewMemo(e.target.value)}
                            rows={3}
                            className={`w-full px-4 py-3 rounded-xl mb-4 text-sm font-medium outline-none border resize-none ${lightMode ? 'bg-neutral-50 border-neutral-200 text-neutral-800' : 'bg-white/5 border-white/10 text-white'}`}
                        />
                        <button onClick={addItem} disabled={addingItem} className="w-full py-3.5 rounded-xl font-bold text-sm bg-cyan-500 text-white hover:bg-cyan-600 transition-all active:scale-95 disabled:opacity-50">
                            {addingItem ? 'AIがタグ付け中...' : '追加する'}
                        </button>
                    </div>
                </div>
            )}

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 glass-frosted pt-2 px-6 flex justify-around items-center h-[70px] pb-safe">
                <Link href="/" className={`flex flex-col items-center gap-1 group ${lightMode ? 'text-neutral-500' : 'text-neutral-600'}`}>
                    <Home size={20} />
                    <span className="text-[9px] font-black tracking-widest">HOME</span>
                </Link>
                <Link href="/orbit" className={`flex flex-col items-center gap-1 group ${lightMode ? 'text-neutral-500' : 'text-neutral-600'}`}>
                    <Orbit size={20} />
                    <span className="text-[9px] font-black tracking-widest">ORBIT</span>
                </Link>
                <div className="flex flex-col items-center gap-1 text-cyan-400 relative">
                    <Archive size={20} />
                    <span className="text-[9px] font-black tracking-widest">BUCKET</span>
                    <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,1)]"></div>
                </div>
                <Link href="/profile" className={`flex flex-col items-center gap-1 group ${lightMode ? 'text-neutral-500' : 'text-neutral-600'}`}>
                    <UserIcon size={20} />
                    <span className="text-[9px] font-black tracking-widest">PROFILE</span>
                </Link>
            </nav>
        </div>
    )
}
