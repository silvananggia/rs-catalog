import type {
  IngestionJob,
  JobStatus,
  NormalizedScene,
  Role,
  SavedScene,
  STACSearchParams,
} from "./types";
import type { DirectusUser } from "./types";
import { mapDirectusRoleNameToRole } from "./auth";

function baseUrl(): string {
  const u = process.env.NEXT_PUBLIC_DIRECTUS_URL;
  if (!u) throw new Error("NEXT_PUBLIC_DIRECTUS_URL is not configured");
  return u.replace(/\/$/, "");
}

function adminHeaders(): HeadersInit {
  const t = process.env.DIRECTUS_ADMIN_TOKEN;
  if (!t) throw new Error("DIRECTUS_ADMIN_TOKEN is not configured");
  return {
    Authorization: `Bearer ${t}`,
    "Content-Type": "application/json",
  };
}

function userHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function directusAdminFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...adminHeaders(), ...init?.headers },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Directus ${res.status}: ${errText}`);
  }
  return res.json() as Promise<T>;
}

export async function directusUserFetch<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...userHeaders(token), ...init?.headers },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Directus ${res.status}: ${errText}`);
  }
  return res.json() as Promise<T>;
}

export async function getCurrentUser(token: string): Promise<DirectusUser | null> {
  try {
    const json = await directusUserFetch<{
      data: {
        id: string;
        email: string;
        role: { name: string } | string | null;
      };
    }>("/users/me?fields=id,email,role.name", token);

    const r = json.data.role;
    const roleName =
      typeof r === "object" && r !== null && "name" in r ? r.name : "";
    return {
      id: json.data.id,
      email: json.data.email,
      role: mapDirectusRoleNameToRole(roleName),
    };
  } catch {
    return null;
  }
}

export interface SceneRecord extends NormalizedScene {
  id: string;
}

export async function listScenesBySceneIds(
  sceneIds: string[]
): Promise<Set<string>> {
  if (sceneIds.length === 0) return new Set();
  const filter = {
    scene_id: { _in: sceneIds },
  };
  const q = new URLSearchParams({
    filter: JSON.stringify(filter),
    fields: "scene_id",
    limit: String(Math.min(sceneIds.length, 10000)),
  });
  const json = await directusAdminFetch<{ data: Array<{ scene_id: string }> }>(
    `/items/scenes?${q.toString()}`
  );
  return new Set(json.data.map((d) => d.scene_id));
}

export async function batchInsertScenes(
  scenes: NormalizedScene[],
  createdBy: string | null
): Promise<void> {
  if (scenes.length === 0) return;
  const payload = scenes.map((s) => ({
    scene_id: s.scene_id,
    collection: s.collection,
    datetime: s.datetime,
    cloud_cover: s.cloud_cover,
    bbox: s.bbox,
    footprint: s.footprint,
    thumbnail_url: s.thumbnail_url,
    assets: s.assets,
    provider: s.provider,
    resolution: s.resolution,
    is_high_resolution: s.is_high_resolution,
    ...(createdBy ? { created_by: createdBy } : {}),
  }));

  await directusAdminFetch<{ data: unknown }>(`/items/scenes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Upsert by unique scene_id; returns Directus row id */
export async function upsertScene(
  scene: NormalizedScene,
  createdBy: string | null
): Promise<string> {
  const filter = { scene_id: { _eq: scene.scene_id } };
  const q = new URLSearchParams({
    filter: JSON.stringify(filter),
    limit: "1",
    fields: "id",
  });
  const existing = await directusAdminFetch<{ data: Array<{ id: string }> }>(
    `/items/scenes?${q.toString()}`
  );
  if (existing.data[0]) {
    return existing.data[0].id;
  }

  const body = {
    scene_id: scene.scene_id,
    collection: scene.collection,
    datetime: scene.datetime,
    cloud_cover: scene.cloud_cover,
    bbox: scene.bbox,
    footprint: scene.footprint,
    thumbnail_url: scene.thumbnail_url,
    assets: scene.assets,
    provider: scene.provider,
    resolution: scene.resolution,
    is_high_resolution: scene.is_high_resolution,
    ...(createdBy ? { created_by: createdBy } : {}),
  };

  const created = await directusAdminFetch<{ data: { id: string } }>(
    `/items/scenes`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
  return created.data.id;
}

export async function getSceneBySceneId(
  sceneId: string
): Promise<SceneRecord | null> {
  const filter = { scene_id: { _eq: sceneId } };
  const q = new URLSearchParams({
    filter: JSON.stringify(filter),
    limit: "1",
  });
  try {
    const json = await directusAdminFetch<{ data: SceneRecord[] }>(
      `/items/scenes?${q.toString()}`
    );
    return json.data[0] ?? null;
  } catch {
    return null;
  }
}

export async function createIngestionJob(
  query: STACSearchParams,
  createdBy: string | null
): Promise<IngestionJob> {
  const body: Record<string, unknown> = {
    status: "queued" as JobStatus,
    query_params: query,
    result_count: 0,
  };
  if (createdBy) {
    body.created_by = createdBy;
  }

  const json = await directusAdminFetch<{ data: IngestionJob }>(
    `/items/ingestion_jobs`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
  return json.data;
}

export async function updateIngestionJob(
  id: string,
  patch: Partial<Pick<IngestionJob, "status" | "result_count">>
): Promise<void> {
  await directusAdminFetch(`/items/ingestion_jobs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function listIngestionJobs(limit = 50): Promise<IngestionJob[]> {
  const q = new URLSearchParams({
    sort: "-created_at",
    limit: String(limit),
  });
  const json = await directusAdminFetch<{ data: IngestionJob[] }>(
    `/items/ingestion_jobs?${q.toString()}`
  );
  return json.data;
}

export async function listIngestionJobsForUser(
  userId: string,
  limit = 100
): Promise<IngestionJob[]> {
  const filter = { created_by: { _eq: userId } };
  const q = new URLSearchParams({
    filter: JSON.stringify(filter),
    sort: "-created_at",
    limit: String(limit),
  });
  const json = await directusAdminFetch<{ data: IngestionJob[] }>(
    `/items/ingestion_jobs?${q.toString()}`
  );
  return json.data;
}

export async function listSavedScenesForUser(
  userId: string,
  token: string
): Promise<
  Array<{
    id: string;
    user_id: string;
    scene_id: SceneRecord | string;
  }>
> {
  const filter = { user_id: { _eq: userId } };
  const q = new URLSearchParams({
    filter: JSON.stringify(filter),
    fields: "id,user_id,scene_id.*",
    limit: "100",
  });
  const json = await directusUserFetch<{
    data: Array<{
      id: string;
      user_id: string;
      scene_id: SceneRecord | string;
    }>;
  }>(`/items/saved_scenes?${q.toString()}`, token);
  return json.data;
}

export async function createSavedScene(
  userId: string,
  sceneRowId: string,
  token: string
): Promise<SavedScene> {
  const json = await directusUserFetch<{ data: SavedScene }>(
    `/items/saved_scenes`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        scene_id: sceneRowId,
      }),
    }
  );
  return json.data;
}

export async function deleteSavedScene(id: string, token: string): Promise<void> {
  await directusUserFetch(`/items/saved_scenes/${id}`, token, {
    method: "DELETE",
  });
}

export async function listJobsForUserRole(
  userId: string,
  role: Role
): Promise<IngestionJob[]> {
  if (role === "admin") {
    return listIngestionJobs(100);
  }
  return listIngestionJobsForUser(userId, 100);
}
