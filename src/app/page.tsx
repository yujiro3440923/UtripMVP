'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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
      <header className="px-6 py-4 flex justify-between items-center sticky top-0 bg-[#050505]/70 backdrop-blur-2xl z-20 border-b border-white/5 shadow-sm">
        <div className="flex flex-col items-start justify-center">
          <Image
            src="/images/Utriprogo.png"
            alt="Utrip"
            width={100}
            height={32}
            className="object-contain"
            priority
          />
          <span className="text-[9px] font-black tracking-[0.25em] text-teal-300 ml-1 mt-0.5 uppercase drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]">
            Utrip (MVP)
          </span>
        </div>
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

      {/* Bottom Navigation Space */}
      <div className="h-32"></div>

      {/* App-like Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#050505]/80 backdrop-blur-3xl border-t border-white/5 pt-2 px-6 flex justify-around items-center h-[90px] shadow-[0_-15px_40px_rgba(0,0,0,0.8)] pb-safe lg:rounded-t-[2.5rem] lg:w-full lg:max-w-md lg:mx-auto">

        {/* Nav Item: Home */}
        <button className="flex flex-col items-center gap-1.5 text-teal-400 group relative mb-2">
          <div className="p-2 rounded-2xl bg-teal-500/10 group-hover:bg-teal-500/20 transition-all duration-300 shadow-[inset_0_1px_4px_rgba(255,255,255,0.1)]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <span className="text-[10px] font-black tracking-widest uppercase">Home</span>
          <div className="absolute -bottom-2.5 w-1 h-1 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,1)]"></div>
        </button>

        {/* FAB: Center Action - Create Trip */}
        <div className="relative -top-8 group flex flex-col items-center">
          <div className="absolute top-2 w-20 h-20 bg-gradient-to-tr from-teal-400 via-cyan-300 to-blue-500 rounded-full blur-xl opacity-50 group-hover:opacity-80 group-hover:blur-2xl transition-all duration-500 animate-pulse-glow"></div>
          <button
            onClick={createTrip}
            className="relative flex items-center justify-center w-[80px] h-[80px] bg-gradient-to-br from-teal-300 via-cyan-400 to-blue-600 rounded-full shadow-[0_20px_40px_rgba(45,212,191,0.5),inset_0_4px_12px_rgba(255,255,255,0.7)] transform transition-all duration-500 group-hover:scale-105 group-active:scale-95 border-[3px] border-[#0a0a0a] overflow-hidden"
          >
            {/* Shimmer effect inside button */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>
            <Plus size={38} strokeWidth={2.5} className="text-teal-950 relative z-10 drop-shadow-sm" />
          </button>
          <span className="absolute -bottom-8 text-[13px] font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-cyan-100 whitespace-nowrap tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            旅をする
          </span>
        </div>

        {/* Nav Item: Profile / Settings */}
        <button className="flex flex-col items-center gap-1.5 text-neutral-500 hover:text-neutral-300 transition-colors group mb-2">
          <div className="p-2 rounded-2xl group-hover:bg-white/5 transition-all duration-300">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <span className="text-[10px] font-bold tracking-widest uppercase">Profile</span>
        </button>

      </nav>
    </div>
  )
}
