/** "1 Nov 2026" in the viewer's zone. */
export const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
