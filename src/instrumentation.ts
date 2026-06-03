export async function register() {
  // no-op — required export for Next.js instrumentation lifecycle
}

export async function onRequestError(
  error: Error & { digest?: string },
  request: { path: string; method: string; headers: { [key: string]: string } },
  _context: { routerKind: string; routePath: string; routeType: string }
): Promise<void> {
  // Server-side error reporting hook — logging only for now.
  console.error(`[onRequestError] ${request.method} ${request.path}`, error);
}
