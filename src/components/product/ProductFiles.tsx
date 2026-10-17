import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import ModelViewer from "@/components/product/ModelViewer";
import { api, type PublicProductFile } from "@/lib/api";

function size(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Drawings and 3D models for a product. Shows only what an administrator has approved for public display.
 * Drawings that are not approved are described as available on request.
 */
export default function ProductFiles({ slug, productName }: { slug: string; productName: string }) {
  const [files, setFiles] = useState<PublicProductFile[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .productFiles(slug)
      .then((f) => alive && setFiles(f))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (failed) return null;
  if (files === null) return <div className="h-24 animate-pulse bg-bone" aria-busy="true" aria-label="Loading drawings and models" />;

  const models = files.filter((f) => f.kind === "MODEL_3D");
  const documents = files.filter((f) => f.kind !== "MODEL_3D");

  return (
    <section aria-labelledby="drawings-heading" className="space-y-10">
      <div>
        <p className="eyebrow">Drawings and 3D models</p>
        <h2 id="drawings-heading" className="mt-4 font-display text-3xl font-extrabold">Technical files</h2>
      </div>

      {models.length > 0 && (
        <div className="grid gap-10 lg:grid-cols-2">
          {models.map((m) => (
            <div key={m.id} className="space-y-3">
              <p className="font-display text-lg font-bold">{m.label}</p>
              <ModelViewer url={m.url} title={`${productName}, ${m.label}`} />
            </div>
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <ul className="divide-y divide-line border-y border-line">
          {documents.map((d) => (
            <li key={d.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-body text-sm font-semibold">{d.label}</p>
                <p className="font-mono text-[11px] text-ink/65">PDF · {size(d.sizeBytes)}</p>
              </div>
              <a href={d.url} download={d.name} className="inline-flex min-h-10 items-center gap-2 border border-ink px-4 font-body text-sm font-semibold hover:bg-ink hover:text-bone">
                <Download size={16} aria-hidden="true" /> Download PDF
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="font-body text-sm leading-relaxed text-ink/75">
        Dimensioned 2D engineering drawings are supplied on request, with the quotation.{" "}
        <Link to={`/request-quote?product=${encodeURIComponent(slug)}`} className="font-semibold underline underline-offset-4">Request a quotation</Link> and we will confirm what we can share for this part.
      </p>
    </section>
  );
}
