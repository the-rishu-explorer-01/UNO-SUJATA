import { forwardRef, useEffect, useState, type InputHTMLAttributes } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useFieldArray, useForm, type FieldPath, type UseFormRegister } from "react-hook-form";
import ProductFilesCard from "@/admin/pages/ProductFilesCard";
import { adminApi, AdminApiError, type Lookups, type ProductBody, type ProductDetail } from "@/admin/api";
import { Button, Card, Empty, Field, Notice, PageHeader, Select, TextArea, TextInput, errorText, formatDate } from "@/admin/ui";

interface FormValues {
  name: string;
  slug: string;
  productCode: string;
  productType: string;
  description: string;
  categoryId: string;
  materialIds: string[];
  applicationIds: string[];
  processIds: string[];
  finishesText: string;
  specifications: { label: string; value: string }[];
  verified: boolean;
  published: boolean;
  featured: boolean;
}

const emptyValues: FormValues = {
  name: "", slug: "", productCode: "", productType: "", description: "", categoryId: "",
  materialIds: [], applicationIds: [], processIds: [], finishesText: "",
  specifications: [], verified: false, published: false, featured: false,
};

function toValues(p: ProductDetail): FormValues {
  return {
    name: p.name,
    slug: p.slug,
    productCode: p.productCode ?? "",
    productType: p.productType,
    description: p.description,
    categoryId: p.categoryId,
    materialIds: p.materialIds,
    applicationIds: p.applicationIds,
    processIds: p.processIds,
    finishesText: p.finishes.join("\n"),
    specifications: p.specifications,
    verified: p.verified,
    published: p.published,
    featured: p.featured,
  };
}

/** Client rules are a convenience. The server applies the full rules and its messages win. */
const SERVER_FIELDS = new Set<string>(["name", "slug", "productCode", "productType", "description", "categoryId", "materialIds", "applicationIds", "processIds", "finishes", "specifications"]);

export default function ProductFormPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.lookups().then(setLookups).catch((e) => setLoadError(errorText(e)));
    if (id) adminApi.product(id).then(setProduct).catch((e) => setLoadError(errorText(e)));
  }, [id]);

  const changeArchive = async (productId: string, archive: boolean) => {
    setSaveError(null);
    try {
      if (archive) await adminApi.archiveProduct(productId);
      else await adminApi.restoreProduct(productId);
      setProduct(await adminApi.product(productId));
      setNotice(archive ? "Product archived." : "Product restored.");
    } catch (e) {
      setSaveError(errorText(e));
    }
  };

  if (loadError) return <Notice kind="error">{loadError}</Notice>;
  if (!lookups || (!isNew && !product)) return <p className="font-mono text-xs uppercase tracking-technical text-ink/65">Loading product…</p>;

  return (
    <>
      <PageHeader
        title={isNew ? "New product" : product!.name}
        description={isNew ? "Create a product. It stays hidden from the website until you publish it." : `Last updated ${formatDate(product!.updatedAt)}`}
        actions={<Link to="/admin/products" className="font-body text-sm font-semibold uppercase tracking-wider hover:text-brass-deep">← Products</Link>}
      />
      {notice && <Notice kind="success">{notice}</Notice>}
      {saveError && <Notice kind="error">{saveError}</Notice>}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ProductForm
            key={product?.id ?? "new"}
            lookups={lookups}
            initial={product ? toValues(product) : emptyValues}
            productId={id}
            onSaved={(savedId, message) => {
              setNotice(message);
              setSaveError(null);
              if (isNew) navigate(`/admin/products/${savedId}`, { replace: true });
              else adminApi.product(savedId).then(setProduct).catch(() => undefined);
            }}
            onError={(msg) => {
              setSaveError(msg);
              setNotice(null);
            }}
            saving={saving}
            setSaving={setSaving}
          />
        </div>

        <aside className="space-y-6">
          {!isNew && product && (
            <>
              <ImagesCard product={product} onChange={() => adminApi.product(product.id).then(setProduct).catch(() => undefined)} />
              <ProductFilesCard productId={product.id} />
              <Card title="Visibility">
                <p className="font-body text-sm text-ink/70">
                  {product.archivedAt
                    ? "This product is archived and hidden from the website."
                    : product.published
                      ? "Live on the website."
                      : "Draft. Not visible to customers."}
                </p>
                <div className="mt-4">
                  {product.archivedAt ? (
                    <Button onClick={() => void changeArchive(product.id, false)}>Restore product</Button>
                  ) : (
                    <Button variant="danger" onClick={() => {
                      if (window.confirm("Archive this product? It will be hidden from the website.")) void changeArchive(product.id, true);
                    }}>
                      Archive product
                    </Button>
                  )}
                </div>
              </Card>
            </>
          )}
        </aside>
      </div>
    </>
  );
}

function ProductForm({
  lookups,
  initial,
  productId,
  onSaved,
  onError,
  saving,
  setSaving,
}: {
  lookups: Lookups;
  initial: FormValues;
  productId?: string;
  onSaved: (id: string, message: string) => void;
  onError: (message: string) => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: initial });
  const specs = useFieldArray({ control, name: "specifications" });

  const onValid = async (values: FormValues) => {
    const body: ProductBody = {
      name: values.name.trim(),
      slug: values.slug.trim() || undefined,
      productCode: values.productCode.trim() || null,
      productType: values.productType.trim(),
      description: values.description.trim(),
      categoryId: values.categoryId,
      materialIds: values.materialIds,
      applicationIds: values.applicationIds,
      processIds: values.processIds,
      finishes: values.finishesText.split("\n").map((s) => s.trim()).filter(Boolean),
      specifications: values.specifications.filter((s) => s.label.trim()).map((s) => ({ label: s.label.trim(), value: s.value.trim() })),
      verified: values.verified,
      published: values.published,
      featured: values.featured,
    };
    setSaving(true);
    try {
      const saved = productId ? await adminApi.updateProduct(productId, body) : await adminApi.createProduct(body);
      onSaved(saved.id, productId ? "Product saved." : "Product created.");
    } catch (err) {
      if (err instanceof AdminApiError && err.fields) {
        for (const [key, msgs] of Object.entries(err.fields)) {
          if (SERVER_FIELDS.has(key) && msgs[0]) setError(key as FieldPath<FormValues>, { type: "server", message: msgs[0] });
        }
      }
      onError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const err = (name: keyof FormValues) => errors[name]?.message as string | undefined;

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate className="space-y-6">
      <Card title="Identity">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Product name" htmlFor="name" error={err("name")}>
            <TextInput id="name" {...register("name", { required: "Enter a product name", maxLength: { value: 160, message: "Maximum 160 characters" } })} aria-invalid={!!errors.name} />
          </Field>
          <Field label="URL name (slug)" htmlFor="slug" error={err("slug")} hint="Leave blank to generate from the name. Changing it breaks existing links.">
            <TextInput id="slug" {...register("slug")} aria-invalid={!!errors.slug} />
          </Field>
          <Field label="Product code" htmlFor="productCode" error={err("productCode")} hint="Part number shown to customers. Must be unique.">
            <TextInput id="productCode" {...register("productCode")} aria-invalid={!!errors.productCode} />
          </Field>
          <Field label="Product type" htmlFor="productType" error={err("productType")}>
            <TextInput id="productType" {...register("productType", { required: "Enter a product type" })} aria-invalid={!!errors.productType} placeholder="e.g. Pin, Terminal" />
          </Field>
          <Field label="Category" htmlFor="categoryId" error={err("categoryId")}>
            <Select id="categoryId" {...register("categoryId", { required: "Choose a category" })} aria-invalid={!!errors.categoryId}>
              <option value="">Choose a category</option>
              {lookups.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="mt-5">
          <Field label="Description" htmlFor="description" error={err("description")}>
            <TextArea id="description" rows={5} {...register("description", { required: "Describe the product", minLength: { value: 10, message: "Describe the product in at least 10 characters" } })} aria-invalid={!!errors.description} />
          </Field>
        </div>
      </Card>

      <Card title="Material, application and process">
        <div className="grid gap-6 sm:grid-cols-3">
          <CheckGroup label="Material" name="materialIds" options={lookups.materials} register={register} />
          <CheckGroup label="Application" name="applicationIds" options={lookups.applications} register={register} />
          <CheckGroup label="Manufacturing process" name="processIds" options={lookups.processes} register={register} />
        </div>
        <p className="mt-4 font-body text-xs text-ink/65">Options are managed by the team. Leave all unticked if a value is not confirmed; the website then shows “Available on request”.</p>
      </Card>

      <Card title="Specifications and finishes">
        <div className="space-y-3">
          {specs.fields.length === 0 && <p className="font-body text-sm text-ink/60">No specifications yet. Add the values confirmed for this part.</p>}
          {specs.fields.map((field, i) => (
            <div key={field.id} className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto]">
              <TextInput aria-label={`Specification ${i + 1} label`} placeholder="Label, e.g. Dimensions" {...register(`specifications.${i}.label` as const)} />
              <TextInput aria-label={`Specification ${i + 1} value`} placeholder="Value" {...register(`specifications.${i}.value` as const)} />
              <Button variant="ghost" onClick={() => specs.remove(i)} aria-label={`Remove specification ${i + 1}`}>Remove</Button>
            </div>
          ))}
          <Button onClick={() => specs.append({ label: "", value: "" })} disabled={specs.fields.length >= 40}>Add specification</Button>
        </div>
        <div className="mt-6">
          <Field label="Available finishes" htmlFor="finishesText" hint="One finish per line.">
            <TextArea id="finishesText" rows={3} {...register("finishesText")} />
          </Field>
        </div>
      </Card>

      <Card title="Publishing">
        <div className="space-y-3 font-body text-sm">
          <Check label="Publish on the website" {...register("published")} />
          <Check label="Featured" {...register("featured")} />
          <Check label="Technical data confirmed" {...register("verified")} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving…" : productId ? "Save changes" : "Create product"}</Button>
        </div>
      </Card>
    </form>
  );
}

function CheckGroup({ label, name, options, register }: { label: string; name: "materialIds" | "applicationIds" | "processIds"; options: { id: string; name: string }[]; register: UseFormRegister<FormValues> }) {
  return (
    <fieldset>
      <legend className="font-mono text-[11px] uppercase tracking-wider text-ink/65">{label}</legend>
      {options.length === 0 ? (
        <p className="mt-2 font-body text-xs text-ink/65">None defined yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {options.map((o) => (
            <li key={o.id}>
              <label className="flex min-h-10 cursor-pointer items-center gap-3 font-body text-sm">
                <input type="checkbox" value={o.id} className="h-4 w-4 accent-[#7D5F33]" {...register(name)} />
                {o.name}
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

const Check = forwardRef<HTMLInputElement, { label: string } & InputHTMLAttributes<HTMLInputElement>>(function Check({ label, ...rest }, ref) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-3">
      <input ref={ref} type="checkbox" className="h-4 w-4 accent-[#7D5F33]" {...rest} />
      {label}
    </label>
  );
});

function ImagesCard({ product, onChange }: { product: ProductDetail; onChange: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async () => {
    setError(null);
    if (!file) return setError("Choose an image first.");
    if (alt.trim().length < 2) return setError("Describe the image so it is accessible.");
    setBusy(true);
    try {
      await adminApi.uploadImage(product.id, file, alt.trim());
      setFile(null);
      setAlt("");
      onChange();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (imageId: string) => {
    if (!window.confirm("Remove this image?")) return;
    try {
      await adminApi.removeImage(product.id, imageId);
      onChange();
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <Card title={`Images (${product.images.length}/10)`}>
      {error && <div className="mb-4"><Notice kind="error">{error}</Notice></div>}
      {product.images.length === 0 ? (
        <Empty>No images yet. The website shows a placeholder until one is added.</Empty>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {product.images.map((img) => (
            <li key={img.id} className="border border-line">
              <img src={img.url} alt={img.alt} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <div className="flex items-center justify-between gap-2 p-2">
                <span className="truncate font-body text-xs text-ink/70">{img.alt}</span>
                <button type="button" onClick={() => remove(img.id)} className="shrink-0 font-body text-xs font-semibold text-red-800 hover:underline">Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {product.images.length < 10 && (
        <div className="mt-5 space-y-3 border-t border-line pt-5">
          <Field label="Image file" htmlFor="imageFile" hint="JPG, PNG or WebP, up to 5 MB.">
            <input
              id="imageFile"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1.5 block w-full font-body text-sm file:mr-3 file:min-h-10 file:border file:border-ink/30 file:bg-paper file:px-3 file:font-semibold"
            />
          </Field>
          <Field label="Description (alt text)" htmlFor="imageAlt">
            <TextInput id="imageAlt" value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={200} />
          </Field>
          <Button onClick={upload} disabled={busy} variant="primary">{busy ? "Uploading…" : "Upload image"}</Button>
        </div>
      )}
    </Card>
  );
}
