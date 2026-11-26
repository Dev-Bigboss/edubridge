"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import type { CatalogPage, Category, Modality } from "@/lib/api/schemas/catalog";
import { PRICE_BANDS } from "@/lib/domain/catalog";
import { cn } from "@/lib/cn";
import { languageName } from "@/lib/domain/training";

export const FILTER_KEYS = ["category", "modality", "price", "language", "instructor"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
export type FilterValues = Partial<Record<FilterKey, string>>;

/**
 * TRN-6 filters. Category, format and price are short lists, so they are radio groups you can
 * scan; language and instructor can grow, so they are selects.
 */
export function CatalogFilters({
  values,
  onChange,
  categories,
  modalities,
  facets,
}: {
  values: FilterValues;
  onChange: (key: FilterKey, value: string) => void;
  categories: Category[];
  modalities: Modality[];
  facets: CatalogPage["facets"] | undefined;
}) {
  const t = useTranslations("catalog.filters");
  return (
    <div className="flex flex-col gap-7">
      <RadioGroup
        legend={t("category")}
        name="category"
        value={values.category ?? ""}
        onChange={(v) => onChange("category", v)}
        options={[{ value: "", label: t("all") }, ...categories.map((c) => ({ value: c.slug, label: c.name }))]}
      />
      <RadioGroup
        legend={t("format")}
        name="modality"
        value={values.modality ?? ""}
        onChange={(v) => onChange("modality", v)}
        options={[
          { value: "", label: t("allFormats") },
          ...modalities.filter((m) => m.active).map((m) => ({ value: m.code, label: m.name })),
        ]}
      />
      <RadioGroup
        legend={t("price")}
        name="price"
        value={values.price ?? ""}
        onChange={(v) => onChange("price", v)}
        options={[{ value: "", label: t("anyPrice") }, ...PRICE_BANDS.map((b) => ({ value: b.key, label: t(`bands.${b.key}`) }))]}
      />
      <Field label={t("language")}>
        {(control) => (
        <Select {...control} value={values.language ?? ""} onChange={(e) => onChange("language", e.target.value)}>
          <option value="">{t("anyLanguage")}</option>
          {facets?.languages.map((code) => (
            <option key={code} value={code}>
              {languageName(code)}
            </option>
          ))}
        </Select>
        )}
      </Field>
      <Field label={t("instructor")}>
        {(control) => (
        <Select {...control} value={values.instructor ?? ""} onChange={(e) => onChange("instructor", e.target.value)}>
          <option value="">{t("anyInstructor")}</option>
          {facets?.instructors.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </Select>
        )}
      </Field>
    </div>
  );
}

function RadioGroup({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <fieldset>
      <legend className="mb-2 font-heading text-[15px] font-semibold text-heading">{legend}</legend>
      <div className="flex flex-col">
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label
              key={o.value || "all"}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-2 text-[15px] transition-colors duration-150 hover:bg-surface-1",
                checked && "text-heading",
              )}
            >
              <input
                type="radio"
                name={`${id}-${name}`}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="size-[18px] shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
