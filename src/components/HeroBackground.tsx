export function HeroBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base dark gradient */}
      <div className="absolute inset-0 gradient-surface" />

      {/* Subtle red glow - top left */}
      <div className="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full bg-red-600/[0.06] blur-[100px]" />

      {/* Warm accent glow - bottom right */}
      <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] rounded-full bg-red-500/[0.04] blur-[100px]" />

      {/* Center glow pulse */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-red-600/[0.03] blur-[120px] animate-pulse" style={{ animationDuration: "6s" }} />

      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
