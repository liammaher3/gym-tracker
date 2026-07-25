import WorkoutLogger from './WorkoutLogger'
import FloatingActionButton from './FloatingActionButton'

type Props = {
  userId: string
  logging: boolean
  setLogging: (value: boolean) => void
}

export default function WorkoutTab({ userId, logging, setLogging }: Props) {
  return (
    <div>
      {logging ? (
        <WorkoutLogger
          userId={userId}
          onFinish={() => setLogging(false)}
          onBack={() => setLogging(false)}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center px-6 mt-20">
          <p className="text-4xl mb-4">🏋️</p>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Ready to train?</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500">Tap + to start a new workout</p>
        </div>
      )}

      {!logging && (
        <FloatingActionButton
          actions={[
            {
              label: 'New Workout',
              icon: '🏋️',
              onClick: () => setLogging(true),
            },
          ]}
        />
      )}
    </div>
  )
}

