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
    <div className="min-h-screen bg-neutral-950 text-white pb-24 font-sans selection:bg-teal-500/30">
      {/* Header */}
      <header className="px-6 py-5 flex justify-between items-center sticky top-0 bg-neutral-950/80 backdrop-blur-xl z-20 border-b border-white/5">
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Activity className="text-neutral-900 w-5 h-5" />
          </div>
          Utrip
        </h1>
        <button
          onClick={handleLogout}
          className="p-2 text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all"
        >
          <LogOut size={18} />
        </button>
      </header>

      <main className="p-6 max-w-md mx-auto">
        {/* Profile Summary Placeholder */}
        <section className="mb-10 bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-3xl p-6 border border-white/10 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl group-hover:bg-teal-500/20 transition-all"></div>

          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="w-14 h-14 bg-teal-500/20 rounded-2xl flex items-center justify-center text-teal-400 backdrop-blur-sm border border-teal-500/20">
              <Activity size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{user?.user_metadata?.name || 'ゲスト'}</h2>
              <p className="text-sm text-neutral-400 font-medium tracking-wide">分析済みの旅行: <span className="text-teal-400 font-bold">0</span>件</p>
            </div>
          </div>
          <p className="text-sm text-neutral-300 relative z-10 leading-relaxed">
            旅行を記録して、隠れた強みやキャリア特性を見つけ出しましょう。新しい視点の自己分析が始まります。
          </p>
        </section>

        {/* Trips List */}
        <div className="flex justify-between items-end mb-5 px-1">
          <h3 className="text-xl font-bold tracking-tight">過去の旅の記録</h3>
          <span className="text-xs font-bold text-neutral-500 tracking-wider">HISTORY</span>
        </div>

        <div className="space-y-4">
          {trips.length === 0 ? (
            <div className="text-center p-10 border border-white/10 rounded-3xl bg-white/5 flex flex-col items-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <MapPin className="text-neutral-400" size={28} />
              </div>
              <p className="text-neutral-300 font-medium">まだ旅行の記録がありません</p>
              <p className="text-sm text-neutral-500 mt-2">下のボタンから新しい旅行を始めましょう</p>
            </div>
          ) : (
            trips.map(trip => (
              <Link href={`/trips/${trip.id}`} key={trip.id} className="block group">
                <div className="bg-neutral-900/50 p-5 rounded-3xl border border-white/10 group-hover:border-teal-500/40 group-hover:bg-neutral-800 transition-all duration-300 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <div>
                      <h4 className="font-bold text-lg mb-1 group-hover:text-teal-400 transition-colors">{trip.title}</h4>
                      <p className="text-xs text-neutral-500 font-medium">{new Date(trip.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-xs px-3 py-1 rounded-full font-bold tracking-wide ${trip.status === 'active' ? 'bg-teal-500/20 text-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.2)]' :
                        trip.status === 'analyzed' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/10 text-neutral-400'
                        }`}>
                        {trip.status === 'active' ? '記録中' : trip.status === 'analyzed' ? '分析完了' : '完了'}
                      </span>
                      <ChevronRight className="text-neutral-600 group-hover:text-teal-400 transition-colors w-5 h-5" />
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>

      {/* FAB */}
      <div className="fixed bottom-8 right-6 lg:right-[calc(50%-12rem)] z-30">
        <button
          onClick={createTrip}
          className="bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-300 hover:to-teal-400 text-neutral-900 px-6 py-4 rounded-full shadow-[0_10px_30px_rgba(20,184,166,0.3)] transition-all transform hover:scale-105 hover:-translate-y-1 flex items-center gap-3 font-bold text-lg"
        >
          <Plus size={24} strokeWidth={3} />
          新しい旅行
        </button>
      </div>
    </div>
  )
}
