import Blueprint from "./ui/Blueprint";
import { Icon } from "./ui/Icons";
import WorkoutLogger from "./WorkoutLogger";

type Props = {
  userId: string;
  logging: boolean;
  setLogging: (value: boolean) => void;
  onSignOut: () => void;
  /** Optional summary strip; pass nulls and the cells read "—". */
  stats?: {
    thisWeek: number;
    daysSince: number | null;
    avgMinutes: number | null;
  };
};

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 py-3.5 text-center">
      <div className="tnum font-head text-[24px] leading-none">{value}</div>
      <div className="mt-[7px] font-body text-[9px] uppercase leading-none tracking-[.18em] text-dim">
        {label}
      </div>
    </div>
  );
}

export default function WorkoutTab({
  userId,
  logging,
  setLogging,
  onSignOut,
  stats,
}: Props) {
  if (logging) {
    return (
      <WorkoutLogger
        userId={userId}
        onFinish={() => setLogging(false)}
        onBack={() => setLogging(false)}
      />
    );
  }

  return (
    <div className="grid-backdrop relative flex min-h-screen flex-col bg-ground text-ink">
      <div className="relative flex items-start justify-between px-[22px] pt-2.5">
        <div>
          <div className="font-head text-[9px] uppercase leading-none tracking-[.32em] text-accent">
            Teretana
          </div>
          <div className="mt-1.5 font-head text-[34px] uppercase leading-none tracking-[.01em]">
            Workout
          </div>
        </div>
        <button
          type="button"
          aria-label="Sign out"
          onClick={onSignOut}
          className="grid h-9 w-9 place-items-center border border-line text-dim hover:border-accent hover:text-accent"
        >
          <Icon.SignOut size={17} />
        </button>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-[26px] pb-24">
        <Blueprint className="flex w-full flex-col items-center px-6 pb-[30px] pt-[38px]">
          <Icon.Dumbbell size={54} className="text-accent" />
          <div className="mt-5 font-head text-[26px] uppercase leading-tight tracking-[.06em]">
            Ready to train
          </div>
          <div className="mt-1.5 text-center font-body text-[13px] leading-[1.5] text-dim">
            Nothing logged today.
            <br />
            Start a session and the clock runs.
          </div>
          <button
            type="button"
            onClick={() => setLogging(true)}
            className="mt-[26px] flex h-[54px] w-full items-center justify-center gap-2.5 bg-accent font-head text-[17px] uppercase tracking-[.16em] text-on-accent hover:bg-accent-hot"
          >
            <Icon.Plus size={18} />
            Start workout
          </button>
        </Blueprint>

        <div className="mt-[34px] flex w-full border-y border-line">
          <Stat value={String(stats?.thisWeek ?? 0)} label="This week" />
          <div className="w-px bg-line" />
          <Stat
            value={stats?.daysSince == null ? "—" : stats.daysSince + "d"}
            label="Since last"
          />
          <div className="w-px bg-line" />
          <Stat
            value={stats?.avgMinutes == null ? "—" : stats.avgMinutes + "m"}
            label="Avg length"
          />
        </div>
      </div>
    </div>
  );
}
