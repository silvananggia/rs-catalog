import { NextResponse } from "next/server";
import { resolveStacSearchUrl } from "@/lib/catalog-settings";
import { getMergedCatalogSettings } from "@/lib/catalog-settings-server";

/** Public read: merged catalog defaults + resolved STAC URL for browser search */
export async function GET() {
  try {
    const merged = await getMergedCatalogSettings();
    return NextResponse.json({
      merged,
      stacSearchUrl: resolveStacSearchUrl(merged),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Settings unavailable";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
