const flagCache: Record<string, HTMLImageElement> = {};

export function getFlagImage(nationId: string) {
  if (!flagCache[nationId]) {
    const img = new Image();
    console.log(nationId);
    img.src = `/flags/${nationId.toLowerCase()}.png`;
    flagCache[nationId] = img;
  }

  return flagCache[nationId];
}

export function getNationFlagURL(nationId: string | undefined | null) {
  return nationId ? `/flags/${nationId.toLowerCase()}.png` : "/flags/tribes.png";
}
