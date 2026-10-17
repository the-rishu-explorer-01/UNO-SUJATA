import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi, AdminApiError, type UserRow } from "@/admin/api";
import { useAdminAuth } from "@/admin/AdminAuth";
import { Button, Card, Field, Notice, PageHeader, Select, TextInput, errorText, formatDate } from "@/admin/ui";

export default function SettingsPage() {
  const { state, logout } = useAdminAuth();
  const navigate = useNavigate();
  const user = state.status === "authenticated" ? state.user : null;

  return (
    <>
      <PageHeader title="Settings" description="Your account and, for administrators, who can access this system." />
      {user && (
        <Card title="Your account">
          <dl className="grid gap-4 font-body text-sm sm:grid-cols-3">
            <div><dt className="font-mono text-[11px] uppercase tracking-wider text-ink/65">Name</dt><dd className="mt-1">{user.name}</dd></div>
            <div><dt className="font-mono text-[11px] uppercase tracking-wider text-ink/65">Email</dt><dd className="mt-1 break-all">{user.email}</dd></div>
            <div><dt className="font-mono text-[11px] uppercase tracking-wider text-ink/65">Role</dt><dd className="mt-1">{user.role === "ADMIN" ? "Administrator" : "Editor"}</dd></div>
          </dl>
        </Card>
      )}

      <PasswordCard
        onChanged={async () => {
          // The server has signed every session out, so return to sign-in.
          await logout();
          navigate("/admin/login", { replace: true });
        }}
      />

      {user?.role === "ADMIN" ? <UsersCard selfId={user.id} /> : (
        <Card title="Users">
          <p className="font-body text-sm text-ink/65">Only administrators can add or change staff accounts.</p>
        </Card>
      )}
    </>
  );
}

function PasswordCard({ onChanged }: { onChanged: () => Promise<void> }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFields({});
    if (next !== confirm) {
      setFields({ confirm: ["The new passwords do not match"] });
      return;
    }
    setBusy(true);
    try {
      await adminApi.changePassword(current, next);
      await onChanged();
    } catch (err) {
      if (err instanceof AdminApiError && err.fields) setFields(err.fields);
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Change password">
      <form onSubmit={submit} noValidate className="grid max-w-xl gap-5">
        {error && <Notice kind="error">{error}</Notice>}
        <Field label="Current password" htmlFor="current" error={fields.currentPassword?.[0]}>
          <TextInput id="current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password" htmlFor="next" error={fields.newPassword?.[0]} hint="At least 12 characters. A passphrase of several words works well.">
          <TextInput id="next" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm" error={fields.confirm?.[0]}>
          <TextInput id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <p className="font-body text-xs text-ink/60">Changing your password signs you out of every device.</p>
        <div>
          <Button type="submit" variant="primary" disabled={busy}>{busy ? "Updating…" : "Update password"}</Button>
        </div>
      </form>
    </Card>
  );
}

/** Administrator reset for a staff member who has lost their password. The new password is shown to no one. */
function ResetPassword({ user, onDone, onError }: { user: UserRow; onDone: (msg: string) => void; onError: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  if (!open) {
    return <Button variant="ghost" className="!min-h-9 !text-xs" onClick={() => setOpen(true)}>Reset password</Button>;
  }
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await adminApi.updateUser(user.id, { password: pw });
          setPw("");
          setOpen(false);
          onDone(`Password reset for ${user.email}. They are signed out everywhere.`);
        } catch (err) {
          onError(errorText(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="sr-only" htmlFor={`reset-${user.id}`}>New password for {user.email}</label>
      <TextInput id={`reset-${user.id}`} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className="!mt-0 !min-h-9 !w-44" placeholder="New password" />
      <Button type="submit" variant="primary" className="!min-h-9 !text-xs" disabled={busy || pw.length < 12}>Set</Button>
      <Button variant="ghost" className="!min-h-9 !text-xs" onClick={() => setOpen(false)}>Cancel</Button>
    </form>
  );
}

function UsersCard({ selfId }: { selfId: string }) {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", name: "", role: "EDITOR" as "ADMIN" | "EDITOR", password: "" });
  const [fields, setFields] = useState<Record<string, string[]>>({});

  const reload = () => adminApi.users().then(setUsers).catch((e) => setError(errorText(e)));
  useEffect(() => {
    reload();
  }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setFields({});
    try {
      await adminApi.createUser(form);
      setForm({ email: "", name: "", role: "EDITOR", password: "" });
      setNotice("Account created. Share the initial password through a secure channel, and ask them to change it.");
      await reload();
    } catch (err) {
      if (err instanceof AdminApiError && err.fields) setFields(err.fields);
      setError(errorText(err));
    }
  };

  const change = async (u: UserRow, patch: { role?: "ADMIN" | "EDITOR"; active?: boolean }) => {
    setError(null);
    setNotice(null);
    try {
      await adminApi.updateUser(u.id, patch);
      setNotice("Account updated.");
      await reload();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <>
      <Card title="Staff accounts">
        {error && <div className="mb-4"><Notice kind="error">{error}</Notice></div>}
        {notice && <div className="mb-4"><Notice kind="success">{notice}</Notice></div>}
        {users === null ? (
          <p className="font-body text-sm text-ink/60">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left font-body text-sm">
              <thead className="border-b border-line font-mono text-[11px] uppercase tracking-wider text-ink/65">
                <tr>
                  <th className="py-2 font-normal">Name</th>
                  <th className="py-2 font-normal">Email</th>
                  <th className="py-2 font-normal">Role</th>
                  <th className="py-2 font-normal">Access</th>
                  <th className="py-2 font-normal">Last sign-in</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-line last:border-0">
                    <td className="py-3">{u.name}{u.id === selfId && <span className="ml-2 font-mono text-[10px] text-ink/65">(you)</span>}</td>
                    <td className="py-3 break-all">{u.email}</td>
                    <td className="py-3">
                      <Select aria-label={`Role for ${u.email}`} className="!mt-0 !min-h-9 !w-36" value={u.role} onChange={(e) => change(u, { role: e.target.value as "ADMIN" | "EDITOR" })}>
                        <option value="ADMIN">Administrator</option>
                        <option value="EDITOR">Editor</option>
                      </Select>
                    </td>
                    <td className="py-3">
                      <Button variant={u.active ? "secondary" : "danger"} className="!min-h-9" onClick={() => change(u, { active: !u.active })} disabled={u.id === selfId}>
                        {u.active ? "Active" : "Disabled"}
                      </Button>
                    </td>
                    <td className="py-3 font-mono text-xs text-ink/60">
                      <div className="flex flex-wrap items-center gap-3">
                        <span>{u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}</span>
                        {u.id !== selfId && <ResetPassword user={u} onDone={(msg) => { setNotice(msg); void reload(); }} onError={setError} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Add staff account">
        <form onSubmit={create} noValidate className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="u-name" error={fields.name?.[0]}>
            <TextInput id="u-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email" htmlFor="u-email" error={fields.email?.[0]}>
            <TextInput id="u-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Role" htmlFor="u-role">
            <Select id="u-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "ADMIN" | "EDITOR" })}>
              <option value="EDITOR">Editor: content, products, RFQs</option>
              <option value="ADMIN">Administrator: everything, including staff accounts</option>
            </Select>
          </Field>
          <Field label="Initial password" htmlFor="u-pass" error={fields.password?.[0]} hint="At least 12 characters.">
            <TextInput id="u-pass" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" variant="primary">Create account</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
