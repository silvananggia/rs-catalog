import { mergeCatalogSettings, type MergedCatalogSettings } from "./catalog-settings";
import { getCatalogSettingsRow } from "./directus";

export async function getMergedCatalogSettings(): Promise<MergedCatalogSettings> {
  const row = await getCatalogSettingsRow();
  return mergeCatalogSettings(row);
}
