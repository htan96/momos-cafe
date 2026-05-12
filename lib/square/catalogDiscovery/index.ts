export type { CatalogDiscoveryMode } from "./types";
export type {
  CatalogAnalysisReport,
  CommerceGraph,
  ItemInspection,
} from "./types";
export type { CatalogSnapshot } from "./snapshot";
export { buildCatalogSnapshot, createSquareClientFromEnv } from "./snapshot";
export {
  analyzeCatalogSnapshot,
  buildCommerceGraph,
  buildAllItemInspections,
  inspectItem,
} from "./analyze";
import type { SquareClient } from "square";
import { analyzeCatalogSnapshot, buildCommerceGraph } from "./analyze";
import { buildCatalogSnapshot, createSquareClientFromEnv } from "./snapshot";

/**
 * Read-only full pipeline: Square → snapshot → analysis → commerce graph.
 */
export async function runCatalogDiscovery(options?: {
  client?: SquareClient;
  includeInventory?: boolean;
}) {
  const client = options?.client ?? createSquareClientFromEnv();
  const snapshot = await buildCatalogSnapshot(client);
  const report = await analyzeCatalogSnapshot(snapshot, client, {
    includeInventory: options?.includeInventory,
  });
  const graph = buildCommerceGraph(snapshot, report);
  return { snapshot, report, graph };
}
