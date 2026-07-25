import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Workout } from '../types'
import WorkoutViewer from './WorkoutViewer'

type Props = {
  userId: string
}

export default function HistoryTab({ userId }: Props) {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingWorkout, setViewingWorkout] = useState<Workout | null>(null)

  const fetchWorkouts = async () => {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    else setWorkouts(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    const load = async () => { await fetchWorkouts() }
    load()
  }, [userId])

  if (viewingWorkout) return (
    <WorkoutViewer
      workout={viewingWorkout}
      onBack={() => { setViewingWorkout(null); fetchWorkouts() }}
    />
  )

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Loading workouts...</p>

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-6">Workout History</h2>

      {workouts.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 text-center mt-20">No workouts yet. Start one!</p>
      ) : (
        <ul className="space-y-3">
          {workouts.map((workout) => (
            <li
              key={workout.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex justify-between items-center"
            >
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-100">{workout.name ?? 'Untitled Workout'}</p>
                <div className="flex gap-2 text-sm text-gray-400 dark:text-gray-500">
                  <span>{new Date(workout.created_at).toLocaleDateString()}</span>
                  {workout.duration_seconds && (
                    <span>· {Math.floor(workout.duration_seconds / 60)}m</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setViewingWorkout(workout)}
                className="text-sm text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                View →
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

