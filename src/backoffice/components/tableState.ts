import { buildCsv, downloadCsv } from "@/utils/adminCsv";

export type ExportColumn = {
  title: string;
  value: string | number | null | undefined;
};

export function exportCsvFile(filename: string, headers: string[], rows: ExportColumn[][]): void {
  downloadCsv(
    filename,
    buildCsv(
      headers,
      rows.map((row) => row.map((cell) => cell.value))
    )
  );
}

export async function exportXlsxFile(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): Promise<void> {
  const xlsx = await import("xlsx");
  const sheet = xlsx.utils.aoa_to_sheet([
    headers,
    ...rows.map((row) => row.map((cell) => (cell == null ? "" : cell))),
  ]);
  const book = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(book, sheet, "Export");
  xlsx.writeFile(book, filename);
}

export type SavedView = { id: string; name: string; search: string };

export function readSavedViews(tableId: string): SavedView[] {
  try {
    const raw = localStorage.getItem(`ecom360_bo_views_${tableId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedView[];
    return Array.isArray(parsed) ? parsed.filter((view) => view.id && view.name) : [];
  } catch {
    return [];
  }
}

export function writeSavedViews(tableId: string, views: SavedView[]): void {
  localStorage.setItem(`ecom360_bo_views_${tableId}`, JSON.stringify(views));
}

export function readHiddenColumns(tableId: string): string[] {
  try {
    const raw = localStorage.getItem(`ecom360_bo_cols_${tableId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeHiddenColumns(tableId: string, keys: string[]): void {
  localStorage.setItem(`ecom360_bo_cols_${tableId}`, JSON.stringify(keys));
}
