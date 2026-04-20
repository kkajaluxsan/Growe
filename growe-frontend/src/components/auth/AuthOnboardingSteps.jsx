export default function AuthOnboardingSteps({ currentStep = 1 }) {
  const steps = [
    { id: 1, title: 'Verify email' },
    { id: 2, title: 'Complete profile' },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-600 dark:bg-slate-800/50">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
        <span>Setup progress</span>
        <span>
          Step {Math.min(Math.max(currentStep, 1), 2)} of {steps.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {steps.map((step) => {
          const done = currentStep > step.id;
          const active = currentStep === step.id;
          return (
            <div
              key={step.id}
              className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                done
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200'
                  : active
                    ? 'border-growe/50 bg-growe/15 text-slate-900 dark:bg-growe/20 dark:text-slate-100'
                    : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <span className="mr-1">{done ? '✓' : step.id}.</span>
              {step.title}
            </div>
          );
        })}
      </div>
    </div>
  );
}