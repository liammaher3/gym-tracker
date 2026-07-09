type Props = {
  elapsedSeconds: number
}

export default function WorkoutTimer({ elapsedSeconds }: Props) {
  return (
    <div className="flex justify-center mb-6">
      <div className="flex gap-2 items-end bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl px-6 py-3">
        <div className="flex flex-col items-center">
          <span className="font-mono text-3xl font-bold text-gray-800 dark:text-gray-100">
            {Math.floor(elapsedSeconds / 3600).toString().padStart(2, '0')}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">hrs</span>
        </div>
        <span className="font-mono text-3xl font-bold text-gray-400 dark:text-gray-500 mb-4">:</span>
        <div className="flex flex-col items-center">
          <span className="font-mono text-3xl font-bold text-gray-800 dark:text-gray-100">
            {Math.floor((elapsedSeconds % 3600) / 60).toString().padStart(2, '0')}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">min</span>
        </div>
        <span className="font-mono text-3xl font-bold text-gray-400 dark:text-gray-500 mb-4">:</span>
        <div className="flex flex-col items-center">
          <span className="font-mono text-3xl font-bold text-gray-800 dark:text-gray-100">
            {(elapsedSeconds % 60).toString().padStart(2, '0')}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">sec</span>
        </div>
      </div>
    </div>
  )
}

