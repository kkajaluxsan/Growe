/**
 * Full-viewport auth shell: live animated background + GROWE watermark + content.
 */
import AuthLiveBackground from './AuthLiveBackground';
import AuthSceneDecor from './AuthSceneDecor';

export default function AuthLayout({ headline, subheadline, children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-slate-900">
      <AuthLiveBackground />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-24 bg-gradient-to-r from-growe/22 via-growe/12 to-transparent" />

      {/* University-style brand watermark */}
      <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center overflow-hidden px-1 sm:px-2">
        <span
          className="animate-auth-watermark select-none whitespace-nowrap text-center font-black tracking-[-0.03em] text-growe"
          style={{ fontSize: 'clamp(7.5rem, 30vw, 20rem)' }}
          aria-hidden
        >
          GROWE
        </span>
      </div>

      {/* Meeting · chat · learning — floating SVGs */}
      <AuthSceneDecor />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="mb-8 flex flex-col items-center text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 sm:text-sm">University Learning Platform</p>
          <p className="animate-auth-brand-glow text-3xl font-bold tracking-tight text-growe sm:text-5xl">GROWE</p>
          {headline && (
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{headline}</h1>
          )}
          {subheadline && (
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">{subheadline}</p>
          )}
        </div>

        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
