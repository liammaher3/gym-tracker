export type Workout = {
  id: string
  user_id: string
  name: string | null
  notes: string | null
  duration_seconds: number | null 
  created_at: string
}

export type Exercise = {
  id: string
  workout_id: string
  name: string
  created_at: string
}

export type WorkoutSet = {
  id: string
  exercise_id: string
  set_number: number
  reps: number
  weight: number
  created_at: string
}
