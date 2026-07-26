import { useState } from "react";

type Action = {
  label: string;
  icon: string;
  onClick: () => void;
};

type Props = {
  actions: Action[];
};

export default function FloatingActionButton({ actions }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-2 flex flex-col items-center gap-3 z-40">
      {/* Fan out actions */}
      {actions.map((action, index) => (
        <div
          key={action.label}
          className={`flex items-center gap-2 transition-all duration-200 ${
            open
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
          style={{ transitionDelay: open ? `${index * 50}ms` : "0ms" }}
        >
          <span className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-medium px-3 py-1.5 rounded-full shadow-md border border-gray-200 dark:border-gray-700">
            {action.label}
          </span>
          <button
            onClick={() => {
              action.onClick();
              setOpen(false);
            }}
            className="w-11 h-11 rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-md border border-gray-200 dark:border-gray-700 flex items-center justify-center text-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {action.icon}
          </button>
        </div>
      ))}

      {/* Main + button */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-14 h-14 rounded-full bg-blue-600 dark:bg-blue-500 text-white shadow-lg flex items-center justify-center transition-transform duration-200 hover:bg-blue-700 dark:hover:bg-blue-600 ${
          open ? "rotate-45" : "rotate-0"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Backdrop to close on outside tap */}
      {open && (
        <div className="fixed inset-0 z-[-1]" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
