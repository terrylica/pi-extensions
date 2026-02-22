import { ExaProvider } from "./exa";
import { LinkupProvider } from "./linkup";
import { SyntheticProvider } from "./synthetic";
import type { ScoutProviderBase, ScoutProviderId } from "./types";

export function createScoutProviders(): ScoutProviderBase[] {
  return [new ExaProvider(), new LinkupProvider(), new SyntheticProvider()];
}

export function getProviderById(
  id: ScoutProviderId,
): ScoutProviderBase | undefined {
  return createScoutProviders().find((provider) => provider.id === id);
}
