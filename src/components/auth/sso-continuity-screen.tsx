function SsoTopProgressBar({ accent = "#7dd3fc" }: { accent?: string }) {
  return (
    <div
      className="sso-top-progress"
      role="progressbar"
      aria-hidden="true"
      style={{ ["--sso-bar" as string]: accent }}
    >
      <span className="sso-top-progress__bar sso-top-progress__bar--primary" />
      <span className="sso-top-progress__bar sso-top-progress__bar--trail" />
    </div>
  );
}

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
      {!error && <SsoTopProgressBar />}
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

      <style>{SSO_TOP_PROGRESS_CSS}</style>
    </div>
  );
}

const SSO_TOP_PROGRESS_CSS = `
  .sso-top-progress {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 90;
    height: 3px;
    overflow: hidden;
    pointer-events: none;
    background: rgba(255, 255, 255, 0.08);
  }
  .sso-top-progress__bar {
    position: absolute;
    top: 0;
    bottom: 0;
    width: auto;
    background: var(--sso-bar, #7dd3fc);
    box-shadow: 0 0 10px color-mix(in srgb, var(--sso-bar, #7dd3fc) 70%, transparent);
  }
  .sso-top-progress__bar--primary {
    animation: sso-top-primary 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
  }
  .sso-top-progress__bar--trail {
    animation: sso-top-trail 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) infinite;
    animation-delay: 1.15s;
  }
  @keyframes sso-top-primary {
    0% { left: -35%; right: 100%; }
    60% { left: 100%; right: -90%; }
    100% { left: 100%; right: -90%; }
  }
  @keyframes sso-top-trail {
    0% { left: -200%; right: 100%; }
    60% { left: 107%; right: -8%; }
    100% { left: 107%; right: -8%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sso-top-progress__bar { animation: none; left: 0; right: 35%; }
  }
`;
