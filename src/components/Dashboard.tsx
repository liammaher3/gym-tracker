import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Workout } from '../types'
import WorkoutLogger from './WorkoutLogger'
import WorkoutViewer from './WorkoutViewer' 

type Props = {
  userId: string
}


export default function Dashboard({ userId }: Props) {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [logging, setLogging] = useState(false)
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
    const load = async () => {
        await fetchWorkouts()
    }
    load()
    }, [userId])

  if (loading) return <p className="text-gray-500">Loading workouts...</p>

  if (logging) return (
    <WorkoutLogger
      userId={userId}
      onFinish={() => { setLogging(false); fetchWorkouts() }}
      onBack={() => setLogging(false)}
    />
  )

  if (viewingWorkout) return (
    <WorkoutViewer
    workout={viewingWorkout}
    onBack={() => setViewingWorkout(null)}
    />
  )



  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-700">Your Workouts</h2>
        <button
          onClick={() => setLogging(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
        >
          + New Workout
        </button>
      </div>

      {workouts.length === 0 ? ( 
        <p className="text-gray-400 text-center mt-20">No workouts yet. Start one!</p>
      ) : ( 
        <ul className="space-y-3">
          {workouts.map((workout) => (
            <li key={workout.id} className="bg-white rounded-xl p-4 shadow-sm flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-800">{workout.name ?? 'Untitled Workout'}</p>
                <p className="text-sm text-gray-400">{new Date(workout.created_at).toLocaleDateString()}</p>
              </div>
              <button 
              onClick={() => setViewingWorkout(workout)}
              className="text-sm text-blue-500 hover:text-blue-700">View →</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}