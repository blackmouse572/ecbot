/**
 * Formats a file size in bytes into a human-readable string with appropriate units (bytes, KB, MB, GB).
 *
 * @param size - The file size in bytes.
 * @returns A formatted string representing the file size with the most suitable unit.
 */

import type { Location } from "react-router-dom";

//
export function formatFileSize(size: number) {
  if (size < 1024) return `${size} bytes`;
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

/**
 * Fetches a file from the specified path and returns it as a `File` object.
 *
 * @param path - The URL or path to fetch the file from.
 * @param fileName - The desired name for the resulting `File` object.
 * @param type - The MIME type of the file. Defaults to "text/csv".
 * @returns A promise that resolves to a `File` object containing the fetched data.
 *
 * @remarks
 * This function performs a network request to retrieve the file data as a blob,
 * then constructs a new `File` object with the provided name and type.
 */
export async function fetchFileFromPath(
  path: string,
  fileName: string,
  type = "text/csv",
): Promise<File> {
  const response = await fetch(path);
  const blob = await response.blob();
  return new File([blob], fileName, { type });
}

//
/**
 * Triggers a download of the provided `File` object in the browser.
 *
 * @param file - The `File` object to be downloaded.
 * @remarks
 * This function creates a temporary object URL for the file, generates a hidden anchor element,
 * triggers a click to start the download, and then cleans up the created elements and object URL.
 */
export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchorElement = document.createElement("a");
  anchorElement.style.display = "none";
  anchorElement.href = url;
  anchorElement.download = file.name;
  document.body.appendChild(anchorElement);
  anchorElement.click();
  document.body.removeChild(anchorElement);
  URL.revokeObjectURL(url);
}

export function toPrevPath({ state, search }: Location, defaultPath = "/") {
  if (state?.prevPath) return state.prevPath;

  const params = new URLSearchParams(search);
  if (params.has("prevPath")) return params.get("prevPath") as string;

  return defaultPath;
}
