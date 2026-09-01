import type { DatasetDef } from "../types";
import type { PdfPracticeSet } from "./types";

/** Adapt a PdfPracticeSet's tables into the shape SchemaExplorer already knows how to render. */
export function pdfSetToDatasetDef(set: PdfPracticeSet): DatasetDef {
  const relationships: DatasetDef["relationships"] = [];
  for (const t of set.tables) {
    for (const c of t.columns) {
      if (c.fk) relationships.push({ from: t.name, fromCol: c.name, to: c.fk.table, toCol: c.fk.column });
    }
  }
  return {
    id: set.id,
    name: set.name,
    description: `Extracted from ${set.sourceFileName}`,
    tables: set.tables.map((t) => ({
      name: t.name,
      description: "",
      columns: t.columns.map((c) => ({ name: c.name, type: c.type ?? "?", pk: c.pk, fk: c.fk })),
    })),
    ddl: set.ddl,
    seed: set.seed,
    relationships,
  };
}
