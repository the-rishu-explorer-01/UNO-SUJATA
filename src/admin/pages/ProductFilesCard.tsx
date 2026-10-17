import { useEffect, useState, type FormEvent } from "react";
import { adminApi, AdminApiError, PRODUCT_FILE_KIND_LABEL, type AdminProductFile } from "@/admin/api";
import { Badge, Button, Card, Empty, Field, Notice, Select, TextInput, errorText } from "@/admin/ui";

const LIMITS = {
  DRAWING_2D: { ext: "pdf", mb: 25 },
  DOCUMENT: { ext: "pdf", mb: 25 },
  MODEL_3D: { ext: "glb", mb: 50 },
} as const;

function sizeText(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Drawings, 3D models and documents for one product. Files are private until an administrator approves them.
 * The browser checks the type and size for speed; the server checks the file's contents and is authoritative.
 */
export default function ProductFilesCard({ productId }: { productId: string }) {
  const [files, setFiles] = useState<AdminProductFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<AdminProductFile["kind"]>("DRAWING_2D");
  const [label, setLabel] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = () => adminApi.productFiles(productId).then(setFiles).catch((e) => setError(errorText(e)));
  useEffect(() => {
    reload();
  }, [productId]);

  const pick = (f: File | null) => {
    setError(null);
    setFile(f);
    if (!f) return;
    const rule = LIMITS[kind];
    if (!f.name.toLowerCase().endsWith(`.${rule.ext}`)) setError(`For this kind of file, choose a .${rule.ext} file.`);
    else if (f.size > rule.mb * 1024 * 1024) setError(`This file is larger than ${rule.mb} MB.`);
  };

  const upload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return setError("Choose a file first.");
    const rule = LIMITS[kind];
    if (!file.name.toLowerCase().endsWith(`.${rule.ext}`)) return setError(`For this kind of file, choose a .${rule.ext} file.`);
    if (file.size > rule.mb * 1024 * 1024) return setError(`This file is larger than ${rule.mb} MB.`);
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      await adminApi.uploadProductFile(productId, file, { kind, label: label.trim() || PRODUCT_FILE_KIND_LABEL[kind], isPublic }, setProgress);
      setFile(null);
      setLabel("");
      setIsPublic(false);
      await reload();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : errorText(err));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const toggle = async (f: AdminProductFile) => {
    setError(null);
    try {
      await adminApi.updateProductFile(f.id, { isPublic: !f.isPublic });
      await reload();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const remove = async (f: AdminProductFile) => {
    if (!window.confirm(`Delete ${f.name}? This cannot be undone.`)) return;
    setError(null);
    try {
      await adminApi.removeProductFile(f.id);
      await reload();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <Card title="Drawings and 3D models">
      {error && <div className="mb-4"><Notice kind="error">{error}</Notice></div>}

      {files === null ? (
        <p className="font-body text-sm text-ink/65">Loading…</p>
      ) : files.length === 0 ? (
        <Empty>No drawings or models yet. Files stay private until you approve them for display.</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {files.map((f) => (
            <li key={f.id} className="space-y-2 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-body text-sm font-semibold">{f.label}</p>
                  <p className="truncate font-mono text-[11px] text-ink/65">{f.name} · {sizeText(f.sizeBytes)}</p>
                  <p className="font-body text-xs text-ink/65">{PRODUCT_FILE_KIND_LABEL[f.kind]}</p>
                </div>
                <Badge tone={f.isPublic ? "live" : "draft"}>{f.isPublic ? "Public" : "Private"}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={adminApi.productFileUrl(f.id, f.kind !== "MODEL_3D")} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center border border-ink/30 px-3 font-body text-xs font-semibold hover:border-ink">Open</a>
                <Button className="!min-h-9 !text-xs" onClick={() => toggle(f)}>{f.isPublic ? "Make private" : "Approve for public display"}</Button>
                <Button variant="danger" className="!min-h-9 !text-xs" onClick={() => remove(f)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={upload} noValidate className="mt-6 space-y-4 border-t border-line pt-6">
        <p className="font-body text-sm font-semibold">Add a file</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" htmlFor="pf-kind">
            <Select id="pf-kind" value={kind} onChange={(e) => { setKind(e.target.value as AdminProductFile["kind"]); setFile(null); setError(null); }}>
              {(Object.keys(PRODUCT_FILE_KIND_LABEL) as AdminProductFile["kind"][]).map((k) => (
                <option key={k} value={k}>{PRODUCT_FILE_KIND_LABEL[k]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Label" htmlFor="pf-label" hint="For example: Front view, Section A-A, Dimensioned drawing">
            <TextInput id="pf-label" value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} />
          </Field>
        </div>
        <Field label="File" htmlFor="pf-file" hint={`${LIMITS[kind].ext.toUpperCase()} only, up to ${LIMITS[kind].mb} MB. SVG, STL and OBJ are not accepted yet.`}>
          <input
            id="pf-file"
            type="file"
            accept={`.${LIMITS[kind].ext}`}
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
            className="mt-1.5 block w-full font-body text-sm file:mr-3 file:min-h-10 file:border file:border-ink/30 file:bg-paper file:px-3 file:font-semibold"
          />
        </Field>
        {file && !error && (
          <p className="font-mono text-[11px] text-ink/70" aria-live="polite">Ready: {file.name} · {sizeText(file.size)}</p>
        )}
        <label className="flex min-h-10 items-center gap-3 font-body text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[#7D5F33]" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Approve for public display now
        </label>
        {progress !== null && (
          <div>
            <div role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} className="h-1.5 w-full bg-line">
              <div className="h-full bg-brass transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <p className="mt-1 font-mono text-[11px] text-ink/65">Uploading {Math.round(progress * 100)}%</p>
          </div>
        )}
        <Button type="submit" variant="primary" disabled={busy || !file || !!error}>{busy ? "Uploading…" : "Upload file"}</Button>
      </form>
    </Card>
  );
}
