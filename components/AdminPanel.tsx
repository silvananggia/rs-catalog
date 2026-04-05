"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { STAC_COLLECTION_IDS } from "@/components/SearchPanel";
import type {
  CatalogSettingsRecord,
  DirectusRoleRow,
  DirectusUserListRow,
} from "@/lib/types";
import type { MergedCatalogSettings } from "@/lib/catalog-settings";
import { mapDirectusRoleNameToRole } from "@/lib/auth";
import type { Role } from "@/lib/types";

const ALL_STAC_IDS = Object.values(STAC_COLLECTION_IDS);

type Tab = "overview" | "users" | "catalog" | "system";

function TabButton({
  id,
  label,
  active,
  onClick,
}: {
  id: Tab;
  label: string;
  active: boolean;
  onClick: (t: Tab) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-catalog-accent-muted text-catalog-accent"
          : "text-catalog-muted hover:bg-catalog-raised hover:text-catalog-ink"
      }`}
    >
      {label}
    </button>
  );
}

function roleLabelForApp(r: DirectusRoleRow): Role {
  return mapDirectusRoleNameToRole(r.name);
}

/** Explains that the table is backed by Directus REST (same DB as Directus Admin). */
function DirectusUsersRolesNote() {
  const base =
    typeof process.env.NEXT_PUBLIC_DIRECTUS_URL === "string"
      ? process.env.NEXT_PUBLIC_DIRECTUS_URL.replace(/\/$/, "")
      : "";
  return (
    <div className="rounded-lg border border-catalog-border bg-catalog-accent-muted/50 px-3 py-2.5 text-xs leading-relaxed text-catalog-ink">
      <p className="font-semibold text-catalog-ink">Connected to Directus</p>
      <p className="mt-1 text-catalog-muted">
        Users and roles are loaded from{" "}
        <code className="rounded bg-catalog-raised px-1 font-mono text-[10px]">
          directus_users
        </code>{" "}
        and{" "}
        <code className="rounded bg-catalog-raised px-1 font-mono text-[10px]">
          directus_roles
        </code>{" "}
        via the server (
        <code className="font-mono text-[10px]">DIRECTUS_ADMIN_TOKEN</code>
        ). Changing a role here updates the same record as in Directus Admin.
      </p>
      {base ? (
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          <a
            href={`${base}/admin/users`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-catalog-accent hover:underline"
          >
            Open Directus — Users
          </a>
          <a
            href={`${base}/admin/settings/roles`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-catalog-accent hover:underline"
          >
            Open Directus — Roles
          </a>
        </p>
      ) : null}
    </div>
  );
}

export function AdminPanel() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");

  const statsQuery = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Stats failed");
      return res.json() as Promise<{
        sceneCount: number | null;
        ingestionJobCount: number;
      }>;
    },
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Users failed");
      return res.json() as Promise<{ users: DirectusUserListRow[] }>;
    },
    enabled: tab === "users",
  });

  const rolesQuery = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/roles");
      if (!res.ok) throw new Error("Roles failed");
      return res.json() as Promise<{ roles: DirectusRoleRow[] }>;
    },
    enabled: tab === "users",
  });

  const catalogQuery = useQuery({
    queryKey: ["admin-catalog-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/catalog-settings");
      if (!res.ok) throw new Error("Settings failed");
      return res.json() as Promise<{
        row: CatalogSettingsRecord | null;
        merged: MergedCatalogSettings;
        stacSearchUrl: string;
      }>;
    },
    enabled: tab === "catalog",
  });

  const [catalogForm, setCatalogForm] = useState<{
    enabledIds: string[];
    restrictCollections: boolean;
    stac_search_url: string;
    default_cloud_cover: number;
    default_search_limit: number;
    bulk_ingest_max_items: number;
    date_range_days_default: number;
  } | null>(null);

  useEffect(() => {
    if (tab !== "catalog" || !catalogQuery.data || catalogForm !== null) return;
    const m = catalogQuery.data.merged;
    const row = catalogQuery.data.row;
    const enabled = m.enabledCollectionIds;
    setCatalogForm({
      restrictCollections: Boolean(enabled?.length),
      enabledIds: enabled?.length ? [...enabled] : [...ALL_STAC_IDS],
      stac_search_url: row?.stac_search_url ?? "",
      default_cloud_cover: m.defaultCloudCover,
      default_search_limit: m.defaultSearchLimit,
      bulk_ingest_max_items: m.bulkIngestMaxItems,
      date_range_days_default: m.dateRangeDaysDefault,
    });
  }, [tab, catalogQuery.data, catalogForm]);

  const saveCatalog = useMutation({
    mutationFn: async () => {
      if (!catalogForm) return;
      const enabled_collection_ids = catalogForm.restrictCollections
        ? catalogForm.enabledIds.filter((id) => ALL_STAC_IDS.includes(id))
        : null;
      const res = await fetch("/api/admin/catalog-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled_collection_ids:
            enabled_collection_ids && enabled_collection_ids.length > 0
              ? enabled_collection_ids
              : null,
          stac_search_url: catalogForm.stac_search_url.trim() || null,
          default_cloud_cover: catalogForm.default_cloud_cover,
          default_search_limit: catalogForm.default_search_limit,
          bulk_ingest_max_items: catalogForm.bulk_ingest_max_items,
          date_range_days_default: catalogForm.date_range_days_default,
        }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Save failed");
      }
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-catalog-settings"] });
      void qc.invalidateQueries({ queryKey: ["catalog-settings"] });
    },
  });

  const updateUserRole = useMutation({
    mutationFn: async ({
      userId,
      roleId,
    }: {
      userId: string;
      roleId: string;
    }) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Update failed");
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const resetCatalogFormFromServer = useCallback(() => {
    setCatalogForm(null);
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-col gap-2 border-b border-catalog-border pb-4">
        <div>
          <h1 className="text-xl font-semibold text-catalog-ink">
            Administration
          </h1>
        </div>
        <p className="text-sm text-catalog-muted">
          Manage users, catalog defaults, and ingestion limits. Changes apply to
          STAC search and ingest jobs.
        </p>
        <div className="flex flex-wrap gap-1">
          <TabButton
            id="overview"
            label="Overview"
            active={tab === "overview"}
            onClick={setTab}
          />
          <TabButton
            id="users"
            label="Users & roles"
            active={tab === "users"}
            onClick={setTab}
          />
          <TabButton
            id="catalog"
            label="Catalog & ingest"
            active={tab === "catalog"}
            onClick={setTab}
          />
          <TabButton
            id="system"
            label="System"
            active={tab === "system"}
            onClick={setTab}
          />
        </div>
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          {statsQuery.isLoading && (
            <p className="text-sm text-catalog-muted">Loading stats…</p>
          )}
          {statsQuery.data && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-catalog-border bg-catalog-panel p-4 shadow-sm">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-catalog-muted">
                  Scenes in catalog
                </div>
                <div className="mt-1 text-2xl font-semibold text-catalog-ink">
                  {statsQuery.data.sceneCount ?? "—"}
                </div>
              </div>
              <div className="rounded-xl border border-catalog-border bg-catalog-panel p-4 shadow-sm">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-catalog-muted">
                  Ingestion jobs (recent list)
                </div>
                <div className="mt-1 text-2xl font-semibold text-catalog-ink">
                  {statsQuery.data.ingestionJobCount}
                </div>
              </div>
            </div>
          )}
          <div className="rounded-lg border border-catalog-border bg-catalog-raised/40 p-4 text-sm text-catalog-muted">
            <p className="font-medium text-catalog-ink">Quick links</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                <Link className="text-catalog-accent hover:underline" href="/jobs">
                  Ingestion jobs
                </Link>
              </li>
              <li>
                <Link className="text-catalog-accent hover:underline" href="/catalog">
                  Public catalog
                </Link>
              </li>
            </ul>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-4">
          <DirectusUsersRolesNote />
          {usersQuery.isLoading || rolesQuery.isLoading ? (
            <p className="text-sm text-catalog-muted">Loading…</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-catalog-border bg-catalog-panel shadow-sm">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-catalog-border bg-catalog-raised/50 text-[10px] uppercase tracking-wide text-catalog-muted">
                    <th className="px-3 py-2 font-semibold">Email</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">App role</th>
                    <th className="px-3 py-2 font-semibold">Change role</th>
                  </tr>
                </thead>
                <tbody>
                  {usersQuery.data?.users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-catalog-border/80 last:border-0"
                    >
                      <td className="px-3 py-2 font-mono text-xs text-catalog-ink">
                        {u.email}
                      </td>
                      <td className="px-3 py-2 text-catalog-muted">{u.status}</td>
                      <td className="px-3 py-2 capitalize text-catalog-ink">
                        {u.role ? roleLabelForApp(u.role) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="w-full max-w-[14rem] rounded-md border border-catalog-border bg-catalog-canvas px-2 py-1 text-xs text-catalog-ink focus:border-catalog-accent focus:outline-none focus:ring-1 focus:ring-catalog-accent/40"
                          value={u.role?.id ?? ""}
                          disabled={updateUserRole.isPending}
                          onChange={(e) => {
                            const roleId = e.target.value;
                            if (!roleId || roleId === u.role?.id) return;
                            updateUserRole.mutate({ userId: u.id, roleId });
                          }}
                        >
                          <option value="" disabled>
                            Select role
                          </option>
                          {rolesQuery.data?.roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({roleLabelForApp(r)})
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {updateUserRole.isError && (
            <p className="text-sm text-red-600">
              {updateUserRole.error instanceof Error
                ? updateUserRole.error.message
                : "Update failed"}
            </p>
          )}
        </div>
      )}

      {tab === "catalog" && (
        <div className="space-y-6">
          {catalogQuery.isLoading && (
            <p className="text-sm text-catalog-muted">Loading settings…</p>
          )}
          {catalogQuery.data && (
            <>
              <button
                type="button"
                onClick={resetCatalogFormFromServer}
                className="text-sm text-catalog-accent hover:underline"
              >
                Reset form from server
              </button>
              {catalogForm && (
                <form
                  className="space-y-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveCatalog.mutate();
                  }}
                >
                  <div className="rounded-xl border border-catalog-border bg-catalog-panel p-4 shadow-sm">
                    <h2 className="text-sm font-semibold text-catalog-ink">
                      STAC endpoint
                    </h2>
                    <p className="mt-1 text-xs text-catalog-muted">
                      Override the STAC Item Search URL (empty = env / Earth
                      Search default).
                    </p>
                    <input
                      type="url"
                      className="mt-2 w-full rounded-lg border border-catalog-border bg-catalog-canvas px-3 py-2 text-sm text-catalog-ink focus:border-catalog-accent focus:outline-none focus:ring-1 focus:ring-catalog-accent/40"
                      placeholder="https://…/search"
                      value={catalogForm.stac_search_url}
                      onChange={(e) =>
                        setCatalogForm((f) =>
                          f
                            ? { ...f, stac_search_url: e.target.value }
                            : f
                        )
                      }
                    />
                    <p className="mt-1 font-mono text-[10px] text-catalog-muted">
                      Resolved: {catalogQuery.data.stacSearchUrl}
                    </p>
                  </div>

                  <div className="rounded-xl border border-catalog-border bg-catalog-panel p-4 shadow-sm">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-catalog-ink">
                      <input
                        type="checkbox"
                        checked={catalogForm.restrictCollections}
                        onChange={(e) =>
                          setCatalogForm((f) =>
                            f
                              ? {
                                  ...f,
                                  restrictCollections: e.target.checked,
                                  enabledIds: e.target.checked
                                    ? [...ALL_STAC_IDS]
                                    : [...ALL_STAC_IDS],
                                }
                              : f
                          )
                        }
                      />
                      Restrict allowed STAC collections
                    </label>
                    <p className="mt-1 text-xs text-catalog-muted">
                      When off, all collections below can be used. When on, only
                      checked IDs are sent to STAC.
                    </p>
                    {catalogForm.restrictCollections && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {ALL_STAC_IDS.map((id) => (
                          <label
                            key={id}
                            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-catalog-border bg-catalog-canvas px-2 py-1 text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={catalogForm.enabledIds.includes(id)}
                              onChange={() =>
                                setCatalogForm((f) => {
                                  if (!f) return f;
                                  const has = f.enabledIds.includes(id);
                                  const enabledIds = has
                                    ? f.enabledIds.filter((x) => x !== id)
                                    : [...f.enabledIds, id];
                                  return { ...f, enabledIds };
                                })
                              }
                            />
                            <span className="font-mono">{id}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="text-catalog-muted">
                        Default max cloud (%)
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="mt-1 w-full rounded-lg border border-catalog-border bg-catalog-canvas px-3 py-2 text-catalog-ink"
                        value={catalogForm.default_cloud_cover}
                        onChange={(e) =>
                          setCatalogForm((f) =>
                            f
                              ? {
                                  ...f,
                                  default_cloud_cover: Number(e.target.value),
                                }
                              : f
                          )
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-catalog-muted">
                        Default search limit
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        className="mt-1 w-full rounded-lg border border-catalog-border bg-catalog-canvas px-3 py-2 text-catalog-ink"
                        value={catalogForm.default_search_limit}
                        onChange={(e) =>
                          setCatalogForm((f) =>
                            f
                              ? {
                                  ...f,
                                  default_search_limit: Number(e.target.value),
                                }
                              : f
                          )
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-catalog-muted">
                        Bulk ingest max items
                      </span>
                      <input
                        type="number"
                        min={10}
                        max={50000}
                        className="mt-1 w-full rounded-lg border border-catalog-border bg-catalog-canvas px-3 py-2 text-catalog-ink"
                        value={catalogForm.bulk_ingest_max_items}
                        onChange={(e) =>
                          setCatalogForm((f) =>
                            f
                              ? {
                                  ...f,
                                  bulk_ingest_max_items: Number(e.target.value),
                                }
                              : f
                          )
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-catalog-muted">
                        Default date range (days)
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        className="mt-1 w-full rounded-lg border border-catalog-border bg-catalog-canvas px-3 py-2 text-catalog-ink"
                        value={catalogForm.date_range_days_default}
                        onChange={(e) =>
                          setCatalogForm((f) =>
                            f
                              ? {
                                  ...f,
                                  date_range_days_default: Number(
                                    e.target.value
                                  ),
                                }
                              : f
                          )
                        }
                      />
                    </label>
                  </div>

                  {saveCatalog.isError && (
                    <p className="text-sm text-red-600">
                      {saveCatalog.error instanceof Error
                        ? saveCatalog.error.message
                        : "Save failed"}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={saveCatalog.isPending}
                    className="rounded-lg bg-catalog-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-catalog-accent-hover disabled:opacity-50"
                  >
                    {saveCatalog.isPending ? "Saving…" : "Save catalog settings"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      )}

      {tab === "system" && (
        <div className="space-y-4 text-sm text-catalog-muted">
          <div className="rounded-xl border border-catalog-border bg-catalog-panel p-4 shadow-sm">
            <h2 className="font-semibold text-catalog-ink">Environment</h2>
            <p className="mt-2">
              TiTiler and high-resolution provider URLs are set via{" "}
              <code className="rounded bg-catalog-raised px-1 font-mono text-xs">
                .env
              </code>{" "}
              (
              <code className="font-mono text-xs">NEXT_PUBLIC_TITILER_URL</code>
              , provider keys). Restart the app after changing them.
            </p>
          </div>
          <div className="rounded-xl border border-catalog-border bg-catalog-panel p-4 shadow-sm">
            <h2 className="font-semibold text-catalog-ink">Directus</h2>
            <p className="mt-2">
              User accounts and roles are stored in Directus. This app maps role
              names containing &quot;admin&quot; or &quot;analyst&quot; to app
              roles; others become viewers.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
