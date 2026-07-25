import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabaseClient'
import AuthPage from './components/Auth'
import BottomNav from './components/BottomNav'
import WorkoutTab from './components/WorkoutTab'
import HistoryTab from './components/HistoryTab'
import DietTab from './components/DietTab'

type Tab = 'workout' | 'history' | 'diet'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('workout')
  const [logging, setLogging] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <p className="text-gray-500 dark:text-gray-400">Loading...</p>
    </div>
  )

  if (!session) return <AuthPage />

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Gym Tracker</h1>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Sign out
          </button>
        </div>

        <div className={activeTab === 'workout' ? 'block' : 'hidden'}>
          <WorkoutTab
            userId={session.user.id}
            logging={logging}
            setLogging={setLogging}
          />
        </div>
        <div className={activeTab === 'history' ? 'block' : 'hidden'}>
          <HistoryTab userId={session.user.id} />
        </div>
        <div className={activeTab === 'diet' ? 'block' : 'hidden'}>
          <DietTab />
        </div>
      </div>

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  )
}

export default App

