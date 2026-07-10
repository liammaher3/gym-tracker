import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Exercise, WorkoutSet } from '../types'
import WorkoutTimer from './WorkoutTimer'
import RestTimer from './RestTimer'

type Props = {
  userId: string
  onFinish: () => void
  onBack: () => void
}

type ExerciseWithSets = Exercise & { sets: WorkoutSet[] }

// function formatTime(seconds: number) {
//   const m = Math.floor(seconds / 60).toString().padStart(2, '0')
//   const s = (seconds % 60).toString().padStart(2, '0') 
//   return `${m}:${s}`
// }

export default function WorkoutLogger({ userId, onFinish, onBack }: Props) {
  const [workoutId, setWorkoutId] = useState<string | null>(null)
  const [workoutName, setWorkoutName] = useState('')
  const [starting, setStarting] = useState(false)

  const [exercises, setExercises] = useState<ExerciseWithSets[]>([])
  const [exerciseNameInput, setExerciseNameInput] = useState('')
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)

  const [setForm, setSetForm] = useState({ reps: 10, weight: 0 })
  const [savingSet, setSavingSet] = useState(false)
  const [savingExercise, setSavingExercise] = useState(false)

  const [showRestTimer, setShowRestTimer] = useState(false) 
  const [lastRestMinutes, setLastRestMinutes] = useState(1) 
  const [lastRestSeconds, setLastRestSeconds] = useState(30) 

  const [startTime, setStartTime] = useState<number | null>(null) 
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (workoutId && startTime) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [workoutId, startTime])

  const startWorkout = async () => {
    setStarting(true)
    const { data, error } = await supabase
      .from('workouts')
      .insert({ user_id: userId, name: workoutName || null })
      .select()
      .single()

    if (error) { console.error(error); setStarting(false); return }
    setWorkoutId(data.id)
    setStartTime(Date.now())
    setStarting(false)
  }

  const handleFinish = async () => {
    if (workoutId && startTime) {
      const endTime = Date.now()
      const duration = Math.floor((endTime - startTime) / 1000)
      const { error } = await supabase
        .from('workouts')
        .update({ duration_seconds: duration })
        .eq('id', workoutId)
      if (error) console.error('Duration save error:', error)
    }
    onFinish()
  }

  const addExercise = async () => {
    if (!workoutId || !exerciseNameInput) return
    setSavingExercise(true)

    const { data, error } = await supabase
      .from('exercises')
      .insert({ workout_id: workoutId, name: exerciseNameInput })
      .select()
      .single()

    if (error) { console.error(error); setSavingExercise(false); return }

    const newExercise: ExerciseWithSets = { ...data, sets: [] }
    setExercises([...exercises, newExercise])
    setActiveExerciseId(newExercise.id)
    setExerciseNameInput('')
    setSetForm({ reps: 10, weight: 0 })
    setSavingExercise(false)
  }

  const deleteExercise = async (exerciseId: string) => {
    const confirmed = window.confirm("Do you want to delete this exercise and all its sets?")
    if (!confirmed) return 
    const { error } = await supabase
    .from('exercises') 
    .delete() 
    .eq('id', exerciseId) 

    if (error) { console.error(error); return } 

    setExercises(exercises.filter((e) => e.id !== exerciseId))
    if (activeExerciseId === exerciseId) setActiveExerciseId(null)
  }

  const deleteSet = async (setId: string, exerciseId: string) => {
    const { error } = await supabase
      .from('sets')
      .delete()
      .eq('id', setId)

    if (error) { console.error(error); return }

    setExercises(exercises.map((e) => {
      if (e.id !== exerciseId) return e
      const remaining = e.sets
        .filter((s) => s.id !== setId)
        .map((s, index) => ({ ...s, set_number: index + 1 }))
      return { ...e, sets: remaining }
    }))
  }

  const addSet = async () => {
    if (!activeExerciseId) return
    const exercise = exercises.find((e) => e.id === activeExerciseId)
    if (!exercise) return

    setSavingSet(true)
    const nextSetNumber = exercise.sets.length + 1

    const { data, error } = await supabase
      .from('sets')
      .insert({
        exercise_id: activeExerciseId,
        set_number: nextSetNumber,
        reps: setForm.reps,
        weight: setForm.weight,
      })
      .select()
      .single()

    if (error) { console.error(error); setSavingSet(false); return }

    setExercises(
      exercises.map((e) =>
        e.id === activeExerciseId ? { ...e, sets: [...e.sets, data] } : e
      )
    )
    setSavingSet(false)
    setShowRestTimer(true)
  }

  if (!workoutId) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <button
          onClick={onBack}
          className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mb-4"
        >
          ← Back to workouts
        </button>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Start New Workout</h2>
        <input
          type="text"
          placeholder="Workout name (optional)"
          value={workoutName}
          onChange={(e) => setWorkoutName(e.target.value)}
          className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-4 py-2 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={startWorkout}
          disabled={starting}
          className="w-full bg-blue-600 dark:bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 text-sm"
        >
          {starting ? 'Starting...' : 'Start Workout'}
        </button>
      </div>
    )
  }

  const activeExercise = exercises.find((e) => e.id === activeExerciseId)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
        {workoutName || 'Untitled Workout'}
      </h2>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">Add exercises and sets below</p>
      {/* Timer */}
      <WorkoutTimer elapsedSeconds={elapsedSeconds} />

      {/* Completed exercises with their sets */}
      {exercises.map((ex) => (
        <div key={ex.id} className="mb-3">
          <div
            className={`flex items-center justify-between px-4 py-2 rounded-lg ${
              ex.id === activeExerciseId
                ? 'bg-blue-50 dark:bg-blue-900/40'
                : 'bg-gray-50 dark:bg-gray-700'
            }`}
          >
            <span
              onClick={() => setActiveExerciseId(ex.id)}
              className={`flex-1 font-medium text-sm cursor-pointer ${
                ex.id === activeExerciseId
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              {ex.name}
            </span>
            <button
              onClick={() => deleteExercise(ex.id)}
              className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 text-sm ml-2"
            >
              Delete
            </button>
          </div>
          {ex.sets.length > 0 && (
            <ul className="space-y-1 pl-2 mt-1">
              {ex.sets.map((s) => (
                <li key={s.id} className="flex justify-between text-sm text-gray-500 dark:text-gray-400 px-2">
                  <span>Set {s.set_number}</span>
                  <div className="flex items-center gap-3">
                    <span>{s.reps} reps @ {s.weight}lbs</span>
                    <button
                      onClick={() => deleteSet(s.id, ex.id)}
                      className="text-xs text-red-400 dark:text-red-400 border border-red-300 dark:border-red-700 rounded px-2 py-0.5 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-300"
                    >
                      x
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {/* Set logger for the active exercise */}
      {activeExercise && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">
            Logging set {activeExercise.sets.length + 1} for {activeExercise.name}
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-400 dark:text-gray-500 mb-1 block">Reps</label>
              <input
                type="number"
                value={setForm.reps}
                onChange={(e) => setSetForm({ ...setForm, reps: Number(e.target.value) })}
                onFocus={(e) => e.target.select()}
                className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 dark:text-gray-500 mb-1 block">Weight (lbs)</label>
              <input
                type="number"
                value={setForm.weight}
                onChange={(e) => setSetForm({ ...setForm, weight: Number(e.target.value) })}
                onFocus={(e) => e.target.select()}
                className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={addSet}
            disabled={savingSet}
            className="w-full bg-blue-600 dark:bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 text-sm disabled:opacity-50"
          >
            {savingSet ? 'Adding...' : '+ Add Set'}
          </button>
        </div>
      )}

      {/* Add new exercise */}
      <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
        <input
          type="text"
          placeholder="New exercise name (e.g. Bench Press)"
          value={exerciseNameInput}
          onChange={(e) => setExerciseNameInput(e.target.value)}
          className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addExercise}
          disabled={savingExercise || !exerciseNameInput}
          className="w-full bg-gray-700 dark:bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-500 text-sm disabled:opacity-50"
        >
          {savingExercise ? 'Adding...' : '+ Add Exercise'}
        </button>
      </div>

      <button
        onClick={handleFinish}
        className="w-full mt-6 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
      >
        Finish Workout
      </button>

      {showRestTimer && (
      <RestTimer
        initialMinutes={lastRestMinutes}
        initialSeconds={lastRestSeconds}
        onStart={(m, s) => {
          setLastRestMinutes(m)
          setLastRestSeconds(s)
        }}
        onDismiss={() => setShowRestTimer(false)}
        />
      )}
    </div>
  )
}
