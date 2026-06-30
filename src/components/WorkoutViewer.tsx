import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Workout, Exercise, WorkoutSet } from '../types'

type Props = {
  workout: Workout
  onBack: () => void
}

type ExerciseWithSets = Exercise & { sets: WorkoutSet[] }

export default function WorkoutViewer({ workout, onBack }: Props) {
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchExercisesAndSets = async () => {
      const { data: exerciseData, error: exerciseError } = await supabase
        .from('exercises')
        .select('*')
        .eq('workout_id', workout.id)
        .order('created_at', { ascending: true })

      if (exerciseError) {
        console.error(exerciseError)
        setLoading(false)
        return
      }

      const exerciseIds = (exerciseData ?? []).map((e) => e.id)

      const { data: setData, error: setError } = await supabase
        .from('sets')
        .select('*')
        .in('exercise_id', exerciseIds.length > 0 ? exerciseIds : [''])
        .order('set_number', { ascending: true })

      if (setError) {
        console.error(setError)
        setLoading(false)
        return
      }

      const combined: ExerciseWithSets[] = (exerciseData ?? []).map((ex) => ({
        ...ex,
        sets: (setData ?? []).filter((s) => s.exercise_id === ex.id),
      }))

      setExercises(combined)
      setLoading(false)
    }

    fetchExercisesAndSets()
  }, [workout.id])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
      <button
        onClick={onBack}
        className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mb-4"
      >
        ← Back to workouts
      </button>

      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
        {workout.name ?? 'Untitled Workout'}
      </h2>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
        {new Date(workout.created_at).toLocaleDateString()}
      </p>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading exercises...</p>
      ) : exercises.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500">No exercises logged for this workout.</p>
      ) : (
        <div className="space-y-5">
          {exercises.map((ex) => (
            <div key={ex.id}>
              <p className="font-medium text-gray-800 dark:text-gray-100 mb-2">{ex.name}</p>
              {ex.sets.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 pl-2">No sets logged.</p>
              ) : (
                <ul className="space-y-1">
                  {ex.sets.map((s) => (
                    <li
                      key={s.id}
                      className="flex justify-between text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-2"
                    >
                      <span>Set {s.set_number}</span>
                      <span className="text-gray-400 dark:text-gray-500">{s.reps} reps @ {s.weight}lbs</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

