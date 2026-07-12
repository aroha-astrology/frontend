/**
 * Route-transition fallback for the content area only — TopBar and
 * BottomNavigation live outside this Suspense boundary (see layout.tsx) and
 * stay mounted, so this only needs to fill the space between them rather
 * than claim the full viewport height (which used to push the page taller
 * than the screen and misalign this spinner under the fixed bottom nav).
 */
export default function Loading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center" style={{ background: "var(--background)" }}>
      <div className="w-16 h-16 rounded-full border-4 border-yellow-500 border-t-transparent animate-spin" />
    </div>
  );
}
