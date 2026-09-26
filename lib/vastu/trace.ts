// "Import / trace": a photo of the user's floor plan shown faintly under the
// editor so they can drag the plot corners and rooms over it by hand. No
// computer vision — the user stays in control. The photo never leaves the
// device: it is kept in IndexedDB (localStorage fallback) only.

/** A traced photo placed under the plan. All positions are in plan units. */
export interface TraceImage {
  /** Downscaled JPEG data URL. */
  dataUrl: string;
  /** Image size in pixels. */
  width: number;
  height: number;
  /** Top-left of the (unrotated) image, in plan units. */
  x: number;
  y: number;
  /** Plan units per image pixel. */
  scale: number;
  /** Degrees, clockwise (SVG y-down), about the image centre. */
  rotation: number;
  /** 0..1 */
  opacity: number;
}

export interface TraceBBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  w: number;
  h: number;
}

/**
 * Place an image over the plot: scaled so it covers the plot's bounding box
 * (so it spans at least the plot's larger side), centred on the bbox.
 */
export function fitTraceToPlot(imgW: number, imgH: number, plotBBox: TraceBBox): Pick<TraceImage, "x" | "y" | "scale"> {
  const iw = imgW > 0 ? imgW : 1;
  const ih = imgH > 0 ? imgH : 1;
  const bw = plotBBox.w > 0 ? plotBBox.w : 1;
  const bh = plotBBox.h > 0 ? plotBBox.h : 1;
  const scale = Math.max(bw / iw, bh / ih);
  const cx = plotBBox.minX + plotBBox.w / 2;
  const cy = plotBBox.minY + plotBBox.h / 2;
  return { x: cx - (iw * scale) / 2, y: cy - (ih * scale) / 2, scale };
}

export function traceStorageKey(scope: string, homeId: string | null): string {
  return `vastu_trace:${scope}:${homeId ?? "draft"}`;
}

// ---------------------------------------------------------------------------
// Storage: IndexedDB first, localStorage fallback. Every access is guarded —
// private mode, blocked storage and SSR all degrade to null / no-op.

const DB_NAME = "aroha-vastu";
const STORE = "traces";

function isTrace(v: unknown): v is TraceImage {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.dataUrl === "string" &&
    ["width", "height", "x", "y", "scale", "rotation", "opacity"].every((k) => typeof o[k] === "number" && Number.isFinite(o[k] as number))
  );
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined" || !indexedDB) return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        try {
          if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
        } catch {
          /* ignore */
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function idbRun<T>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest | null): Promise<{ ok: boolean; value?: T }> {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve({ ok: false });
        try {
          const tx = db.transaction(STORE, mode);
          const req = op(tx.objectStore(STORE));
          let value: T | undefined;
          if (req) req.onsuccess = () => (value = req.result as T);
          tx.oncomplete = () => {
            db.close();
            resolve({ ok: true, value });
          };
          tx.onerror = () => {
            db.close();
            resolve({ ok: false });
          };
          tx.onabort = () => {
            db.close();
            resolve({ ok: false });
          };
        } catch {
          try {
            db.close();
          } catch {
            /* ignore */
          }
          resolve({ ok: false });
        }
      }),
  );
}

function lsGet(key: string): TraceImage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return isTrace(v) ? v : null;
  } catch {
    return null;
  }
}

function lsRemove(key: string) {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export async function loadTrace(key: string): Promise<TraceImage | null> {
  try {
    const r = await idbRun<unknown>("readonly", (s) => s.get(key));
    if (r.ok && isTrace(r.value)) return r.value;
  } catch {
    /* fall through */
  }
  return lsGet(key);
}

export async function saveTrace(key: string, t: TraceImage): Promise<void> {
  try {
    const r = await idbRun("readwrite", (s) => s.put(t, key));
    if (r.ok) {
      lsRemove(key); // don't leave a stale fallback copy behind
      return;
    }
  } catch {
    /* fall through */
  }
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(t));
  } catch {
    /* quota / blocked — no-op */
  }
}

export async function clearTrace(key: string): Promise<void> {
  try {
    await idbRun("readwrite", (s) => s.delete(key));
  } catch {
    /* ignore */
  }
  lsRemove(key);
}

// ---------------------------------------------------------------------------
// Image decode + downscale (browser only).

export const TRACE_MAX_BYTES = 15 * 1024 * 1024;

export type TraceErrorCode = "TOO_LARGE" | "NOT_IMAGE";

function loadHtmlImage(file: File): Promise<{ src: CanvasImageSource; width: number; height: number; release: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () =>
      resolve({
        src: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        release: () => URL.revokeObjectURL(url),
      });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("NOT_IMAGE"));
    };
    img.src = url;
  });
}

export async function downscaleImage(file: File, maxSide = 1600): Promise<{ dataUrl: string; width: number; height: number }> {
  if (!file || (file.type && !file.type.startsWith("image/"))) throw new Error("NOT_IMAGE");
  if (file.size > TRACE_MAX_BYTES) throw new Error("TOO_LARGE");

  let decoded: { src: CanvasImageSource; width: number; height: number; release: () => void } | null = null;
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      decoded = { src: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() };
    } catch {
      decoded = null;
    }
  }
  if (!decoded) decoded = await loadHtmlImage(file);

  try {
    const { width: sw, height: sh } = decoded;
    if (!sw || !sh) throw new Error("NOT_IMAGE");
    const k = Math.min(1, maxSide / Math.max(sw, sh));
    const width = Math.max(1, Math.round(sw * k));
    const height = Math.max(1, Math.round(sh * k));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("NOT_IMAGE");
    // JPEG has no alpha — paint white behind transparent PNGs.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(decoded.src, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    return { dataUrl, width, height };
  } finally {
    try {
      decoded.release();
    } catch {
      /* ignore */
    }
  }
}
