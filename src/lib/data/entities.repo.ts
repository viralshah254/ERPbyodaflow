import { MOCK_ENTITIES, type EntityRow } from "@/lib/mock/intercompany/entities";
import { loadStoredValue, saveStoredValue } from "@/lib/data/persisted-store";

const KEY = "odaflow_entities";

function seedEntities(): EntityRow[] {
  return MOCK_ENTITIES.map((row) => ({ ...row }));
}

export function listEntities(): EntityRow[] {
  return loadStoredValue(KEY, seedEntities).map((row) => ({ ...row }));
}

export function createEntity(body: Omit<EntityRow, "id">): EntityRow {
  const created: EntityRow = {
    ...body,
    id: `entity-${Date.now()}`,
  };
  saveStoredValue(KEY, [created, ...listEntities()]);
  return created;
}

