import { Biome } from "@repo/shared";

export function getBiomeTexture(biome: Biome) {
  return `/biomes/${biome}.png`;
}

export function getBiomePreview(biome: Biome) {
  return `/biome_types/${biome.toLowerCase()}.png`;
}

export function getTextureImage(texture: string) {
  return `/textures/${texture.toLowerCase()}.png`;
}
