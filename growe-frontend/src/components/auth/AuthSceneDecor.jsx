import { useEffect, useState } from 'react';

/**
 * Floating meeting / chat / learning motifs above the watermark, below the form (z-2).
 */
export default function AuthSceneDecor() {
  const [reduce, setReduce] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fn = () => setReduce(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  const stroke = 'rgba(46, 232, 160, 0.65)';
  const fillSoft = 'rgba(76, 245, 183, 0.08)';

  if (reduce) {
    return (
      <div className="pointer-events-none absolute inset-0 z-[2] opacity-60" aria-hidden>
        <LearningIcon className="absolute left-[4%] top-[22%] h-20 w-20 text-growe-dark" noMotion />
        <ChatIcon className="absolute right-[5%] top-[30%] h-24 w-24 text-growe-dark" noMotion />
        <MeetingIcon
          className="absolute bottom-[18%] left-[8%] h-20 w-20 text-growe-dark"
          stroke={stroke}
          fillSoft={fillSoft}
        />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden" aria-hidden>
      <div className="absolute left-[2%] top-[16%] sm:left-[4%] sm:top-[18%]">
        <div className="animate-auth-icon-float-1 drop-shadow-[0_4px_20px_rgba(46,232,160,0.18)]">
          <LearningIcon className="h-16 w-16 text-growe-dark sm:h-24 sm:w-24" />
        </div>
      </div>

      <div className="absolute right-[2%] top-[22%] sm:right-[5%] sm:top-[26%]">
        <div className="animate-auth-icon-float-2 drop-shadow-[0_4px_20px_rgba(46,232,160,0.18)]">
          <ChatIcon className="h-20 w-20 text-growe-dark sm:h-28 sm:w-28" />
        </div>
      </div>

      <div className="absolute bottom-[12%] left-[3%] sm:bottom-[14%] sm:left-[6%]">
        <div className="animate-auth-icon-float-3 drop-shadow-[0_4px_20px_rgba(46,232,160,0.35)]">
          <MeetingIcon className="h-20 w-20 text-growe-dark sm:h-24 sm:w-24" stroke={stroke} fillSoft={fillSoft} />
        </div>
      </div>

      <div className="absolute right-[10%] top-[10%] hidden md:block">
        <div className="animate-auth-icon-float-4 opacity-75">
          <SparkleIcon className="h-10 w-10 text-growe/80 sm:h-12 sm:w-12" />
        </div>
      </div>
    </div>
  );
}

function LearningIcon({ className, noMotion }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M32 8L12 16v28c0 4 3.5 7 8 8l12 4 12-4c4.5-1 8-4 8-8V16L32 8z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        fill="rgba(76,245,183,0.07)"
      />
      <path d="M32 8v40" stroke="currentColor" strokeWidth="2" />
      <path d="M20 22h10M20 28h8M20 34h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M34 22h10M34 28h8M34 34h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {!noMotion && (
        <circle cx="48" cy="14" r="3" fill="currentColor" className="animate-auth-ping-soft" />
      )}
    </svg>
  );
}

function ChatIcon({ className, noMotion }) {
  return (
    <svg viewBox="0 0 72 72" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M12 18c0-4 3.5-7 8-7h32c4.5 0 8 3 8 7v22c0 4-3.5 7-8 7H28l-12 8v-8h-4c-4.5 0-8-3-8-7V18z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        fill="rgba(76,245,183,0.06)"
      />
      {noMotion ? (
        <>
          <circle cx="26" cy="32" r="3" fill="currentColor" />
          <circle cx="36" cy="32" r="3" fill="currentColor" />
          <circle cx="46" cy="32" r="3" fill="currentColor" />
        </>
      ) : (
        <>
          <circle cx="26" cy="32" r="3" fill="currentColor" className="animate-auth-dot-1" />
          <circle cx="36" cy="32" r="3" fill="currentColor" className="animate-auth-dot-2" />
          <circle cx="46" cy="32" r="3" fill="currentColor" className="animate-auth-dot-3" />
        </>
      )}
    </svg>
  );
}

function MeetingIcon({ className, stroke, fillSoft }) {
  return (
    <svg viewBox="0 0 72 72" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="14" y="22" width="44" height="28" rx="4" stroke={stroke} strokeWidth="2" fill={fillSoft} />
      <circle cx="26" cy="36" r="5" fill="currentColor" opacity="0.85" />
      <circle cx="46" cy="36" r="5" fill="currentColor" opacity="0.85" />
      <path d="M26 44v6M46 44v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M36 14v8M32 18h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function SparkleIcon({ className }) {
  return (
    <svg viewBox="0 0 40 40" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M20 4l2.5 8.5L31 15l-8.5 2.5L20 26l-2.5-8.5L9 15l8.5-2.5L20 4z" opacity="0.9" />
    </svg>
  );
}
