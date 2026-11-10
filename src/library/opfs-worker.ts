/// <reference lib="webworker" />
// Writes a file into OPFS with a sync access handle. Safari supports this inside
// workers even on versions where FileSystemFileHandle.createWritable() is missing.

interface WriteRequest {
  reqId: number;
  dir: string;
  name: string;
  buf: ArrayBuffer;
}

self.onmessage = async (e: MessageEvent<WriteRequest>) => {
  const { reqId, dir, name, buf } = e.data;
  try {
    const root = await navigator.storage.getDirectory();
    const d = await root.getDirectoryHandle(dir, { create: true });
    const fh = await d.getFileHandle(name, { create: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle = await (fh as any).createSyncAccessHandle();
    handle.truncate(0);
    handle.write(new Uint8Array(buf), { at: 0 });
    handle.flush();
    handle.close();
    postMessage({ reqId, ok: true });
  } catch (err) {
    postMessage({ reqId, ok: false, error: String(err) });
  }
};
