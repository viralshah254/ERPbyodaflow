export function SsoContinuityScreen({
  title = "Opening ERP",
  message = "Taking you to sign in",
  error,
  actionHref,
  actionLabel = "Back to Odaflow",
}: {
  title?: string;
  message?: string;
  error?: string | null;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="fixed inset-0 z-[80] overflow-hidden bg-[#07131f] text-[#e8e2d6]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(880px 420px at 12% 8%, rgba(125, 211, 252, 0.16), transparent 58%), radial-gradient(720px 380px at 90% 88%, rgba(13, 148, 136, 0.14), transparent 52%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-full max-w-lg flex-col justify-center px-6 py-16">
        <p className="mb-7 text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-300/75">
          Odaflow
        </p>

        <div className="rounded-[30px] border border-white/10 bg-[#102033]/82 p-9 shadow-[0_36px_90px_rgba(0,0,0,0.42)] backdrop-blur-md">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">Operations</p>
          <h1
            className="mt-2 text-[2.15rem] leading-[1.15] text-[#f4efe4]"
            style={{ fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif' }}
          >
            {error ? "Could not continue" : title}
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/64">
            {error || message}
          </p>

          {!error && (
            <div className="mt-9 h-[3px] overflow-hidden rounded-full bg-white/10">
              <div className="sso-continuity-bar h-full w-1/3 rounded-full bg-sky-300" />
            </div>
          )}

          {error && actionHref && (
            <a
              href={actionHref}
              className="mt-8 inline-flex rounded-full bg-sky-300 px-5 py-2.5 text-sm font-semibold text-[#07131f]"
            >
              {actionLabel}
            </a>
          )}
        </div>
      </div>

      <style>{`
        @keyframes sso-continuity-slide {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(320%); }
        }
        .sso-continuity-bar {
          animation: sso-continuity-slide 1.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
