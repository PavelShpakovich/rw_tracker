// A template remounts on navigation but not on router.refresh(), so auto-refresh never replays the animation.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
