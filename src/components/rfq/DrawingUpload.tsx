import { useRef, useState, type Dispatch, type DragEvent, type SetStateAction } from "react";
import { FileUp, RotateCw, X, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import {
  ACCEPT_ATTRIBUTE,
  MAX_FILES,
  checkFileMeta,
  fileSignatureOk,
  formatBytes,
  typeLabel,
} from "@/lib/fileRules";
import { describeError } from "@/lib/rfqErrors";

export interface UploadItem {
  localId: string;
  name: string;
  size: number;
  status: "uploading" | "done" | "error";
  progress: number;
  /** Set once the server has accepted the file. Only this id is sent with the enquiry. */
  serverId?: string;
  error?: string;
  retryable?: boolean;
}

interface Props {
  items: UploadItem[];
  setItems: Dispatch<SetStateAction<UploadItem[]>>;
}

let counter = 0;
const nextId = () => `f${Date.now().toString(36)}${(counter++).toString(36)}`;

/**
 * Drag-and-drop drawing upload. Each file uploads as soon as it is added, so the enquiry only
 * carries references to files the server has already checked.
 */
export default function DrawingUpload({ items, setItems }: Props) {
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Browser File objects and abort controllers are kept out of React state where possible.
  const fileById = useRef(new Map<string, File>());
  const controllerById = useRef(new Map<string, AbortController>());

  const patch = (localId: string, change: Partial<UploadItem>) =>
    setItems((prev) => prev.map((i) => (i.localId === localId ? { ...i, ...change } : i)));

  function startUpload(localId: string, file: File) {
    const controller = new AbortController();
    controllerById.current.set(localId, controller);
    patch(localId, { status: "uploading", progress: 0, error: undefined, retryable: undefined });

    api
      .uploadDrawing(file, (fraction) => patch(localId, { progress: fraction }), controller.signal)
      .then((staged) => {
        controllerById.current.delete(localId);
        fileById.current.delete(localId);
        patch(localId, { status: "done", progress: 1, serverId: staged.id });
      })
      .catch((err: unknown) => {
        controllerById.current.delete(localId);
        if (controller.signal.aborted) return; // removed by the customer
        const d = describeError(err, "upload");
        patch(localId, { status: "error", error: d.message, retryable: d.retryable });
      });
  }

  async function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    setNotice(null);
    if (incoming.length === 0) return;

    const room = MAX_FILES - items.length;
    if (room <= 0) {
      setNotice(`You can attach up to ${MAX_FILES} files. Remove one to add another.`);
      return;
    }
    if (incoming.length > room) setNotice(`Only ${room} more file${room === 1 ? "" : "s"} can be added (maximum ${MAX_FILES}).`);

    for (const file of incoming.slice(0, room)) {
      const localId = nextId();
      const base: UploadItem = { localId, name: file.name, size: file.size, status: "uploading", progress: 0 };

      const metaError = checkFileMeta(file);
      if (metaError) {
        setItems((prev) => [...prev, { ...base, status: "error", error: metaError, retryable: false }]);
        continue;
      }

      // Quick signature check before uploading, so obviously wrong files never leave the browser.
      const signatureOk = await fileSignatureOk(file).catch(() => false);
      if (!signatureOk) {
        setItems((prev) => [
          ...prev,
          { ...base, status: "error", error: `This does not look like a valid ${typeLabel(file.name)} file. Check the file and try again.`, retryable: false },
        ]);
        continue;
      }

      fileById.current.set(localId, file);
      setItems((prev) => [...prev, base]);
      startUpload(localId, file);
    }
  }

  function remove(item: UploadItem) {
    controllerById.current.get(item.localId)?.abort();
    controllerById.current.delete(item.localId);
    fileById.current.delete(item.localId);
    if (item.serverId) void api.discardDrawing(item.serverId);
    setItems((prev) => prev.filter((i) => i.localId !== item.localId));
    setNotice(null);
  }

  function retry(item: UploadItem) {
    const file = fileById.current.get(item.localId);
    if (file) startUpload(item.localId, file);
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    void addFiles(e.dataTransfer.files);
  };

  const atLimit = items.length >= MAX_FILES;

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!atLimit) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center border-2 border-dashed px-6 py-10 text-center transition-colors sm:py-12 ${
          dragging ? "border-brass bg-brass/10" : "border-ink/30 bg-paper"
        } ${atLimit ? "opacity-60" : ""}`}
      >
        <FileUp size={32} className="text-brass-deep" aria-hidden="true" />
        <p className="mt-4 font-display text-lg font-bold">Drop drawings here</p>
        <p className="mt-1 font-body text-sm text-ink/60">or</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={atLimit}
          className="btn-ghost mt-4 !py-2.5 !text-xs disabled:cursor-not-allowed"
        >
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          aria-label="Choose drawing files"
          disabled={atLimit}
          onChange={(e) => {
            void addFiles(e.target.files ?? []);
            e.target.value = ""; // allow choosing the same file again after removing it
          }}
        />
        <p className="mt-5 max-w-md font-mono text-[11px] uppercase leading-relaxed tracking-technical text-ink/65">
          PDF · STEP · STP · DWG · DXF · JPG · PNG · up to {MAX_FILES} files · 10 MB each
        </p>
      </div>

      {notice && <p role="status" className="font-body text-sm text-ink/70">{notice}</p>}

      {items.length > 0 && (
        <ul className="divide-y divide-line border-y border-line" aria-label="Attached files">
          {items.map((item) => (
            <li key={item.localId} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 min-w-[44px] shrink-0 items-center justify-center border border-ink/30 px-2 font-mono text-[10px] font-medium">
                  {typeLabel(item.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body text-sm font-medium" title={item.name}>{item.name}</p>
                  <p className="font-mono text-[11px] text-ink/65">{formatBytes(item.size)}</p>

                  {item.status === "uploading" && (
                    <div className="mt-2">
                      <div
                        role="progressbar"
                        aria-label={`Uploading ${item.name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(item.progress * 100)}
                        className="h-1.5 w-full bg-line"
                      >
                        <div className="h-full bg-brass transition-[width] duration-200" style={{ width: `${Math.round(item.progress * 100)}%` }} />
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-ink/65">Uploading {Math.round(item.progress * 100)}%</p>
                    </div>
                  )}
                  {item.status === "done" && (
                    <p className="mt-1 inline-flex items-center gap-1.5 font-body text-xs text-emerald-800">
                      <CheckCircle2 size={14} aria-hidden="true" /> Uploaded and checked
                    </p>
                  )}
                  {item.status === "error" && (
                    <p role="alert" className="mt-1 inline-flex items-start gap-1.5 font-body text-xs text-red-800">
                      <AlertCircle size={14} className="mt-px shrink-0" aria-hidden="true" />
                      <span>{item.error}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                {item.status === "error" && item.retryable && (
                  <button type="button" onClick={() => retry(item)} className="inline-flex h-10 items-center gap-1.5 px-3 font-body text-xs font-semibold uppercase tracking-wider hover:text-brass-deep">
                    <RotateCw size={14} aria-hidden="true" /> Retry
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(item)}
                  aria-label={`Remove ${item.name}`}
                  className="inline-flex h-10 w-10 items-center justify-center hover:text-red-800"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
