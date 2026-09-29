/** The title a picked file suggests: its name without the extension. */
export const fileTitle = (fileName: string) =>
  fileName.replace(/\.[^/.]+$/, "") || fileName;
