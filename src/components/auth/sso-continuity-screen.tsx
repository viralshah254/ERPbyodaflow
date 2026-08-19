export function SsoContinuityScreen({
  title = "Opening ERP",
  message = "Taking you to sign in",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07131f] text-[#e8e2d6]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(900px 420px at 18% 12%, rgba(96,165,250,0.18), transparent 55%), radial-gradient(700px 360px at 88% 80%, rgba(14,116,144,0.16), transparent 50%)",
        }}
      />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
        <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300/80">
          Odaflow
        </p>
        <div className="rounded-[28px] border border-white/10 bg-[#102033]/80 p-8 backdrop-blur-md">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Operations</p>
          <h1
            className="mt-2 text-[2.1rem] leading-tight text-[#f4efe4]"
            style={{ fontFamily: '"Iowan Old Style", Palatino, Georgia, serif' }}
          >
            {title}
          </h1>
          <p className="mt-3 text-sm text-white/65">{message}</p>
          <div className="mt-8 h-[3px] overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 animate-[ssoSlide_1.6s_ease-in-out_infinite] rounded-full bg-sky-300" />
          </div>
        </div>
      </div>
      <style>{`
        @keyframes ssoSlide {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(320%); }
        }
      `}</style>
    </div>
  );
}
