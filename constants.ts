
import { ProductCategory } from './types';

export const LIFESTYLE_PROMPTS: Record<ProductCategory, string[]> = {
  [ProductCategory.CLOTHING]: [
    "on a stylish mannequin in a minimalist boutique setting with soft, natural lighting.",
    "worn by a blurry, faceless person walking through a modern city street.",
    "neatly folded on a rustic wooden surface next to a small plant and a leather accessory.",
    "hanging on a simple rack against a clean, textured wall like concrete or brick.",
  ],
  [ProductCategory.HOME_GOODS]: [
    "placed in a beautifully styled, bright living room on a coffee table next to books.",
    "on a modern kitchen counter with out-of-focus ingredients in the background.",
    "in a cozy, minimalist bedroom setting on a nightstand or shelf.",
    "showcased on a simple, elegant pedestal against a soft, single-color background.",
  ],
  [ProductCategory.GADGETS]: [
    "on a clean, modern wooden desk next to a sleek laptop, a notebook, and a cup of coffee.",
    "being held in a hand with a blurred, aesthetically pleasing background like an office or cafe.",
    "placed on a minimalist floating shelf against a wall with subtle geometric patterns.",
    "on a tech workbench with subtle, stylish tools and components around it, in soft focus.",
  ],
};