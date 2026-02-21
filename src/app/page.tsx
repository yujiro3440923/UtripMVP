'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Plus, MapPin, Activity, ChevronRight } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface Trip {
  id: string
  user_id: string
  title: string
  created_at: string
  status: 'active' | 'completed' | 'analyzed'
}

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
        fetchTrips(session.user.id)
      }
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push('/login')
      else setUser(session.user)
    })

    return () => subscription.unsubscribe()
  }, [router])

  const fetchTrips = async (userId: string) => {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (data) setTrips(data)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const createTrip = async () => {
    if (!user) return
    const title = prompt('旅行のタイトルを入力してください', '新しい旅行')
    if (!title) return

    const { data, error } = await supabase
      .from('trips')
      .insert([{ user_id: user.id, title, status: 'active' }])
      .select()

    if (data && data.length > 0) {
      router.push(`/trips/${data[0].id}`)
    } else if (error) {
      alert('エラーが発生しました: ' + error.message)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-24 font-sans selection:bg-teal-500/30 relative">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-teal-900/10 rounded-full blur-[120px] pointer-events-none animate-float" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-[40%] right-[-10%] w-[400px] h-[400px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none animate-float" style={{ animationDelay: '3s' }}></div>

      {/* Header */}
      <header className="px-6 py-5 flex justify-between items-center sticky top-0 bg-[#050505]/70 backdrop-blur-2xl z-20 border-b border-white/5 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(45,212,191,0.4)]">
            <Activity className="text-neutral-900 w-6 h-6" strokeWidth={2.5} />
          </div>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-400">Utrip</span>
        </h1>
        <button
          onClick={handleLogout}
          className="p-2.5 text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
        >
          <LogOut size={20} />
        </button>
      </header>

      <main className="p-6 max-w-md mx-auto relative z-10 animate-fade-in-up">
        {/* Profile Summary Placeholder */}
        <section className="mb-12 glass-effect-dark rounded-[2rem] p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-teal-500/20 to-blue-500/20 rounded-full blur-3xl group-hover:bg-teal-500/30 transition-all duration-700"></div>

          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>

          <div className="flex items-center gap-5 mb-5 relative z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-teal-400/20 blur-md rounded-2xl animate-pulse-glow"></div>
              <div className="w-16 h-16 bg-gradient-to-br from-teal-900/50 to-neutral-900 rounded-2xl flex items-center justify-center text-teal-400 backdrop-blur-md border border-teal-500/30 relative z-10 shadow-lg">
                <Activity size={32} strokeWidth={1.5} />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">
                {user?.user_metadata?.name || 'ゲスト'}
              </h2>
              <p className="text-sm text-neutral-400 mt-1 font-medium tracking-wider">分析済みの旅行: <span className="text-teal-400 font-bold ml-1 text-base">0</span><span className="text-xs ml-0.5">件</span></p>
            </div>
          </div>
          <p className="text-sm text-neutral-400 relative z-10 leading-relaxed font-medium">
            旅行を記録して、隠れた強みやキャリア特性を見つけ出しましょう。新しい視点の自己分析が始まります。
          </p>
        </section>

        {/* Trips List */}
        <div className="flex justify-between items-end mb-6 px-2">
          <h3 className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-400">過去の旅の記録</h3>
          <span className="text-[10px] font-black text-neutral-600 tracking-[0.2em] bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">HISTORY</span>
        </div>

        <div className="space-y-4">
          {trips.length === 0 ? (
            <div className="text-center p-12 glass-effect rounded-[2rem] flex flex-col items-center">
              <div className="w-20 h-20 bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/5">
                <MapPin className="text-neutral-500" size={32} strokeWidth={1.5} />
              </div>
              <p className="text-neutral-300 font-medium text-lg">まだ記録がありません</p>
              <p className="text-sm text-neutral-500 mt-2 leading-relaxed">右下のボタンから<br />新しい旅行を始めましょう</p>
            </div>
          ) : (
            trips.map((trip, idx) => (
              <Link href={`/trips/${trip.id}`} key={trip.id} className="block group animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                <div className="glass-effect p-6 rounded-3xl transition-all duration-500 relative overflow-hidden hover:scale-[1.02] hover:bg-white/[0.05] hover:border-teal-500/30 hover:shadow-[0_10px_40px_-10px_rgba(45,212,191,0.2)]">
                  {/* Subtle hover gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/0 to-teal-500/0 group-hover:from-teal-500/5 group-hover:via-transparent group-hover:to-blue-500/5 transition-all duration-500"></div>

                  <div className="flex justify-between items-center relative z-10">
                    <div>
                      <h4 className="font-bold text-lg mb-1.5 text-white group-hover:text-teal-300 transition-colors duration-300">{trip.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
                        <MapPin size={12} />
                        {new Date(trip.created_at).toLocaleDateString('ja-JP')}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <span className={`text-[10px] px-3 py-1.5 rounded-full font-bold tracking-widest ${trip.status === 'active' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-[0_0_15px_rgba(45,212,191,0.15)]' :
                          trip.status === 'analyzed' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                            'bg-neutral-800 text-neutral-400 border border-neutral-700'
                        }`}>
                        {trip.status === 'active' ? 'RECORDING' : trip.status === 'analyzed' ? 'ANALYZED' : 'COMPLETED'}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-neutral-800 group-hover:bg-teal-500/20 flex items-center justify-center transition-colors duration-300">
                        <ChevronRight className="text-neutral-500 group-hover:text-teal-400 transition-colors w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>

      {/* FAB - Enhanced glow and interaction */}
      <div className="fixed bottom-8 right-6 lg:right-[calc(50%-12rem)] z-30 group">
        <div className="absolute inset-0 bg-teal-400 rounded-full blur-xl opacity-40 group-hover:opacity-60 group-hover:blur-2xl transition-all duration-500"></div>
        <button
          onClick={createTrip}
          className="relative bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-300 hover:from-teal-300 hover:via-cyan-300 hover:to-teal-200 text-teal-950 px-6 py-4 rounded-full shadow-[0_10px_40px_rgba(45,212,191,0.4)] transition-all duration-300 transform group-hover:scale-105 group-active:scale-95 flex items-center gap-3 font-bold text-lg border border-teal-200/50"
        >
          <div className="bg-white/20 rounded-full p-1">
            <Plus size={20} strokeWidth={3} className="text-teal-950" />
          </div>
          新しい旅行
        </button>
      </div>
    </div>
  )
}
