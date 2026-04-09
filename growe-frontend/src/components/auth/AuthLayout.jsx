/**
 * Full-viewport auth shell: live animated background + GROWE watermark + content.
 */
import AuthLiveBackground from './AuthLiveBackground';
import AuthSceneDecor from './AuthSceneDecor';

export default function AuthLayout({ headline, subheadline, children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-slate-900">
      <AuthLiveBackground />

      {/* Large GROWE watermark — scaled with viewport, max 26rem to limit horizontal overflow */}
      <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center overflow-hidden px-1 sm:px-2">
        <span
          className="animate-auth-watermark select-none whitespace-nowrap text-center font-black tracking-[-0.04em] text-growe"
          style={{ fontSize: 'clamp(8.5rem, 36vw, 26rem)' }}
          aria-hidden
        >
          GROWE
        </span>
      </div>

      <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center overflow-hidden px-1 sm:px-2">
        <span
          className="select-none whitespace-nowrap text-center font-black tracking-[-0.04em] text-transparent"
          style={{
            fontSize: 'clamp(8.5rem, 36vw, 26rem)',
            WebkitTextStroke: '3px #4CF5B7',
          }}
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
