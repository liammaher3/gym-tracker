import { useEffect, useState, useRef } from "react";

type Props = {
  initialMinutes: number;
  initialSeconds: number;
  onStart: (minutes: number, seconds: number) => void;
  onDismiss: () => void;
};

export default function RestTimer({
  initialMinutes,
  initialSeconds,
  onStart,
  onDismiss,
}: Props) {
  const [minutes, setMinutes] = useState(initialMinutes);
  const [seconds, setSeconds] = useState(initialSeconds);
  const [started, setStarted] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const totalSecondsRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    const total = minutes * 60 + seconds;
    if (total <= 0) return;
    onStart(minutes, seconds); // save for next time
    totalSecondsRef.current = total;
    startTimeRef.current = Date.now();
    setRemaining(total);
    setStarted(true);
  };

  useEffect(() => {
    if (!started || remaining === null) return;

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      const left = totalSecondsRef.current - elapsed;
      if (left <= 0) {
        setRemaining(0);
        setDone(true);
        clearInterval(timerRef.current!);
        setTimeout(() => {
          window.alert("Rest over! Time to get back to work.");
          onDismiss();
        }, 50);
      } else {
        setRemaining(left);
      }
    }, 500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started]);

  const formatRemaining = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Setup screen — keep this as a small modal since you need to type a duration
  if (!started) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 pb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-xl w-80 mx-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Set rest duration
          </h2>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <label className="text-xs text-gray-400 dark:text-gray-500 mb-1 block">
                Min
              </label>
              <input
                type="number"
                value={minutes}
                onChange={(e) =>
                  setMinutes(Math.max(0, Number(e.target.value)))
                }
                onFocus={(e) => e.target.select()}
                className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-gray-400 dark:text-gray-500 mt-4">:</span>
            <div className="flex-1">
              <label className="text-xs text-gray-400 dark:text-gray-500 mb-1 block">
                Sec
              </label>
              <input
                type="number"
                value={seconds}
                onChange={(e) =>
                  setSeconds(Math.min(59, Math.max(0, Number(e.target.value))))
                }
                onFocus={(e) => e.target.select()}
                className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onDismiss}
              className="flex-1 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Skip
            </button>
            <button
              onClick={start}
              className="flex-1 bg-blue-600 dark:bg-blue-500 text-white py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              Start
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Floating pill — shows during countdown and when done
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div
        className={`flex items-center gap-3 px-5 py-3 rounded-full shadow-lg text-sm font-medium transition-colors ${
          done
            ? "bg-green-500 dark:bg-green-600 text-white"
            : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
        }`}
      >
        <span>
          {done ? "✓ Rest done" : `Rest ${formatRemaining(remaining!)}`}
        </span>
        <button
          onClick={onDismiss}
          className="text-xs opacity-70 hover:opacity-100 border border-gray-400/40 dark:border-gray-500/40 rounded-full px-2 py-0.5"
        >
          {done ? "Dismiss" : "Skip"}
        </button>
      </div>
    </div>
  );
}
