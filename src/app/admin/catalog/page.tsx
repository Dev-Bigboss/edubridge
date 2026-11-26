import type { Metadata } from "next";
import { CatalogAdmin } from "@/components/admin/catalog-admin";

export const metadata: Metadata = { title: "Categories and modalities" };

export default function CatalogPage() {
  return <CatalogAdmin />;
}
