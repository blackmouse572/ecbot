import type { FileUIPart } from "ai";

/** A data URL file part (what the chat input hands over) back into the File
 *  an upload endpoint takes. */
export async function toFile(part: FileUIPart): Promise<File> {
  const blob = await (await fetch(part.url)).blob();
  return new File([blob], part.filename ?? "file", { type: part.mediaType });
}
