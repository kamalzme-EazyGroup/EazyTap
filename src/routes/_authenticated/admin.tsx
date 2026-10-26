import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Building2, Users, ShieldCheck, Plus, ArrowLeft, Save, Globe, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/Logo";
import {
  getAdminConsole,
  createOrganization,
  createManagedUser,
  saveAdminPermissions,
} from "@/lib/admin.functions";
import { saveSiteSettings, siteSettingsQuery } from "@/lib/site.functions";
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "@/lib/site-settings";
import { CARD_FONTS } from "@/lib/themes";
import { fileToDataUrl } from "@/lib/image";
import { accessQuery } from "@/lib/access-query";
import { ACTIONS, FEATURES, emptyPermissions, type Permissions } from "@/lib/permissions";

const adminQuery = queryOptions({ queryKey: ["admin-console"], queryFn: () => getAdminConsole() });
export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin console — EazyTap" },
      {
        name: "description",
        content: "Manage EazyTap organizations, users and feature permissions.",
      },
      { property: "og:title", content: "Admin console — EazyTap" },
      { property: "og:description", content: "Organization and user access management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context }) => {
    const access = await context.queryClient.ensureQueryData(accessQuery);
    if (access.isSuperAdmin) await context.queryClient.ensureQueryData(adminQuery);
  },
  component: AdminPage,
});
function AdminPage() {
  const { data: access } = useSuspenseQuery(accessQuery);
  if (!access.isSuperAdmin)
    return (
      <main className="mx-auto max-w-5xl p-8">
        <h1 className="text-3xl">Access restricted</h1>
        <Button asChild className="mt-6">
          <Link to="/dashboard">My cards</Link>
        </Button>
      </main>
    );
  return <AdminConsole />;
}
function AdminConsole() {
  const { data } = useSuspenseQuery(adminQuery);
  const qc = useQueryClient();
  const createOrg = useServerFn(createOrganization),
    createUser = useServerFn(createManagedUser),
    savePermissions = useServerFn(saveAdminPermissions);
  const [tab, setTab] = useState<"users" | "organizations" | "website">("users");
  const [orgName, setOrgName] = useState(""),
    [email, setEmail] = useState(""),
    [orgId, setOrgId] = useState("individual");
  const [selected, setSelected] = useState<{
    id: string;
    kind: "user" | "organization";
    label: string;
  } | null>(null);
  const [matrix, setMatrix] = useState<Permissions>(emptyPermissions()),
    [busy, setBusy] = useState(false);
  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin-console"] }),
      qc.invalidateQueries({ queryKey: ["account-access"] }),
    ]);
  }
  function select(id: string, kind: "user" | "organization", label: string) {
    setSelected({ id, kind, label });
    const m = emptyPermissions();
    const membership = data.accounts.find((a) => a.user_id === id);
    for (const { key } of FEATURES) {
      const own = data.permissionRows.find(
        (p) => p.feature === key && (kind === "user" ? p.user_id === id : p.organization_id === id),
      );
      const inherited =
        kind === "user"
          ? data.permissionRows.find(
              (p) => p.feature === key && p.organization_id === membership?.organization_id,
            )
          : undefined;
      const p = own ?? inherited;
      m[key] = p
        ? { view: p.can_view, add: p.can_add, edit: p.can_edit, delete: p.can_delete }
        : {
            view: kind === "user" && !membership,
            add: kind === "user" && !membership,
            edit: kind === "user" && !membership,
            delete: kind === "user" && !membership,
          };
    }
    setMatrix(m);
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Logo />
          <Button asChild variant="ghost">
            <Link to="/dashboard">
              <ArrowLeft />
              My cards
            </Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex items-center gap-4">
          <ShieldCheck className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-3xl">Admin console</h1>
            <p className="mt-1 text-sm text-muted-foreground">Global super administrator</p>
          </div>
        </div>
        <div className="mb-8 flex flex-wrap gap-8 border-b pb-6">
          <div>
            <p className="text-3xl font-semibold">{data.organizations.length}</p>
            <p className="text-sm text-muted-foreground">Organizations</p>
          </div>
          <div>
            <p className="text-3xl font-semibold">{data.users.length}</p>
            <p className="text-sm text-muted-foreground">Users</p>
          </div>
        </div>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <section className="min-w-0">
            <div className="mb-6 flex gap-2">
              <Button
                variant={tab === "users" ? "secondary" : "ghost"}
                onClick={() => setTab("users")}
              >
                <Users />
                Users
              </Button>
              <Button
                variant={tab === "organizations" ? "secondary" : "ghost"}
                onClick={() => setTab("organizations")}
              >
                <Building2 />
                Organizations
              </Button>
            </div>
            {tab === "organizations" ? (
              <form
                className="mb-6 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    const org = await createOrg({ data: { name: orgName } });
                    setOrgName("");
                    toast.success("Organization created");
                    select(org.id, "organization", org.name);
                  });
                }}
              >
                <Input
                  aria-label="Organization name"
                  placeholder="Organization name"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
                <Button disabled={busy} type="submit">
                  <Plus />
                  Create
                </Button>
              </form>
            ) : (
              <form
                className="mb-6 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    const result = await createUser({
                      data: { email, organizationId: orgId === "individual" ? null : orgId },
                    });
                    setEmail("");
                    toast.success(result.invited ? "Invitation sent" : "User assigned");
                    setSelected(null);
                  });
                }}
              >
                <Input
                  type="email"
                  aria-label="User email"
                  placeholder="User email address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="flex gap-2">
                  <Select value={orgId} onValueChange={setOrgId}>
                    <SelectTrigger aria-label="User organization" className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual user</SelectItem>
                      {data.organizations.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="submit" disabled={busy}>
                    <Plus />
                    Add / invite
                  </Button>
                </div>
              </form>
            )}
            <div className="divide-y border-y">
              {tab === "organizations"
                ? data.organizations.map((o) => (
                    <div key={o.id} className="flex items-center justify-between gap-3 py-4">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{o.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {data.accounts.filter((a) => a.organization_id === o.id).length} members
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => select(o.id, "organization", o.name)}
                      >
                        Permissions
                      </Button>
                    </div>
                  ))
                : data.users.map((u) => {
                    const a = data.accounts.find((a) => a.user_id === u.id);
                    const org = data.organizations.find((o) => o.id === a?.organization_id);
                    return (
                      <div key={u.id} className="flex items-center justify-between gap-3 py-4">
                        <div className="min-w-0">
                          <p className="break-all text-sm font-semibold">{u.email}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {org?.name ?? "Individual user"} · {u.confirmed ? "Active" : "Invited"}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => select(u.id, "user", u.email)}
                        >
                          Permissions
                        </Button>
                      </div>
                    );
                  })}
              {(tab === "organizations" ? data.organizations : data.users).length === 0 && (
                <p className="py-8 text-sm text-muted-foreground">No {tab} yet</p>
              )}
            </div>
          </section>
          <section className="min-w-0 lg:border-l lg:pl-10">
            <h2 className="text-2xl">Feature permissions</h2>
            {selected ? (
              <>
                <p className="my-4 break-all text-sm text-primary">{selected.label}</p>
                <p className="mb-4 text-xs text-muted-foreground">
                  {selected.kind === "user"
                    ? "User overrides take priority over organization permissions. Super administrators always retain full access."
                    : "Members inherit these permissions unless a user override is saved."}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 text-left">Feature</th>
                        {ACTIONS.map((a) => (
                          <th key={a} className="px-2 py-3 capitalize">
                            {a}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {FEATURES.map((f) => (
                        <tr key={f.key} className="border-b">
                          <td className="py-5">{f.label}</td>
                          {ACTIONS.map((a) => (
                            <td key={a} className="px-2 text-center">
                              <Checkbox
                                aria-label={`${f.label} ${a}`}
                                checked={matrix[f.key][a]}
                                onCheckedChange={(v) =>
                                  setMatrix((m) => ({
                                    ...m,
                                    [f.key]: { ...m[f.key], [a]: v === true },
                                  }))
                                }
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button
                  className="mt-6"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await savePermissions({
                        data: {
                          userId: selected.kind === "user" ? selected.id : null,
                          organizationId: selected.kind === "organization" ? selected.id : null,
                          permissions: matrix,
                        },
                      });
                      toast.success("Permissions saved");
                    })
                  }
                >
                  <Save />
                  Save permissions
                </Button>
              </>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">No user or organization selected</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
