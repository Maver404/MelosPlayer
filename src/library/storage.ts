import { db, type StorageBackend, type Track } from '../db/schema';

const AUDIO_DIR = 'audio';

export function opfsAvailable(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.storage?.getDirectory;
}

async function audioDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(AUDIO_DIR, { create: true });
}

let worker: Worker | null = null;
let reqSeq = 0;
const pending = new Map<number, { resolve: () => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./opfs-worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ reqId: number; ok: boolean; error?: string }>) => {
      const p = pending.get(e.data.reqId);
      if (!p) return;
      pending.delete(e.data.reqId);
      if (e.data.ok) p.resolve();
      else p.reject(new Error(e.data.error ?? 'OPFS write failed'));
    };
  }
  return worker;
}

async function writeViaWorker(name: string, data: Blob): Promise<void> {
  const buf = await data.arrayBuffer();
  const reqId = ++reqSeq;
  await new Promise<void>((resolve, reject) => {
    pending.set(reqId, { resolve, reject });
    getWorker().postMessage({ reqId, dir: AUDIO_DIR, name, buf }, [buf]);
  });
}

/** Which method last succeeded, shown in the diagnostics screen. */
export let lastWriteMethod: 'createWritable' | 'worker' | 'indexeddb' | null = null;

/**
 * Copies an audio file into the app's private storage.
 * Tries OPFS (main thread, then worker) and falls back to IndexedDB blobs.
 */
export async function saveAudio(id: string, data: Blob): Promise<StorageBackend> {
  if (opfsAvailable()) {
    try {
      const fh = await (await audioDir()).getFileHandle(id, { create: true });
      if ('createWritable' in fh) {
        const w = await fh.createWritable();
        await w.write(data);
        await w.close();
        lastWriteMethod = 'createWritable';
        return 'opfs';
      }
    } catch {
      // fall through to the worker path
    }
    try {
      await writeViaWorker(id, data);
      lastWriteMethod = 'worker';
      return 'opfs';
    } catch {
      // fall through to IndexedDB
    }
  }
  await db.blobs.put({ id, blob: data });
  lastWriteMethod = 'indexeddb';
  return 'idb';
}

export async function loadAudio(track: Pick<Track, 'id' | 'storage' | 'mime'>): Promise<Blob> {
  if (track.storage === 'opfs') {
    const fh = await (await audioDir()).getFileHandle(track.id);
    const file = await fh.getFile();
    // Re-wrap so the element gets the right MIME type (OPFS files have none).
    return file.type ? file : new Blob([file], { type: track.mime });
  }
  const row = await db.blobs.get(track.id);
  if (!row) throw new Error('File audio mancante');
  return row.blob;
}

export async function deleteAudio(track: Pick<Track, 'id' | 'storage'>): Promise<void> {
  if (track.storage === 'opfs') {
    try {
      await (await audioDir()).removeEntry(track.id);
    } catch {
      // already gone
    }
  } else {
    await db.blobs.delete(track.id);
  }
}

export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted?.()) return true;
  return navigator.storage.persist();
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const e = await navigator.storage.estimate();
  return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
}
