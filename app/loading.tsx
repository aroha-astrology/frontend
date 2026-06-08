export default function Loading() {
  return (
    <div className="h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
      <div className="w-16 h-16 rounded-full border-4 border-yellow-500 border-t-transparent animate-spin" />
    </div>
  );
}
