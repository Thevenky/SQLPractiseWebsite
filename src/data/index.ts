import type { DatasetDef } from "../types";
import { healthcareDataset } from "./healthcare";
import { ecommerceDataset } from "./ecommerce";
import { companyDataset } from "./company";

export const datasets: DatasetDef[] = [healthcareDataset, ecommerceDataset, companyDataset];

export const datasetById = (id: string): DatasetDef | undefined =>
  datasets.find((d) => d.id === id);

export const allDdl = datasets.map((d) => d.ddl).join("\n");
export const allSeed = datasets.map((d) => d.seed).join("\n");
