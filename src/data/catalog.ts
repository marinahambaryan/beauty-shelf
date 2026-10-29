import type { Supabase } from '@/lib/supabase';
import type { ProductCategory } from '@/domain/library';
import { catalogImageUrl } from './images';

export type CatalogSearchResult = {
  productId: string;
  name: string;
  brand: string;
  category: ProductCategory;
  imageUrl: string | null;
  variantCount: number;
  /** Set when the product has no real shades/sizes — add it directly, no picker. */
  defaultVariantId: string | null;
};

export type CatalogVariant = {
  id: string;
  label: string | null;
  shadeName: string | null;
  sizeLabel: string | null;
  imageUrl: string | null;
  isDefault: boolean;
};

export type CatalogProduct = {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  description: string | null;
  imageUrl: string | null;
  variants: CatalogVariant[];
};

/**
 * The catalog is behind a provider interface so the seeded Supabase catalog can later be
 * joined or replaced by a licensed external source without touching screens (brief §9).
 */
export interface CatalogProvider {
  search(params: { query: string; category?: ProductCategory; limit?: number; offset?: number }): Promise<CatalogSearchResult[]>;
  getProduct(productId: string): Promise<CatalogProduct | null>;
}

export function supabaseCatalog(db: Supabase): CatalogProvider {
  return {
    async search({ query, category, limit = 30, offset = 0 }) {
      const { data, error } = await db.rpc('search_catalog', {
        p_query: query,
        p_category: category,
        p_limit: limit,
        p_offset: offset,
      });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        productId: r.product_id,
        name: r.product_name,
        brand: r.brand_name,
        category: r.category,
        imageUrl: catalogImageUrl(r.image_url),
        variantCount: r.variant_count,
        defaultVariantId: r.variant_count === 1 ? (r.default_variant_id ?? null) : null,
      }));
    },

    async getProduct(productId) {
      const { data, error } = await db
        .from('products')
        .select(
          'id, name, category, description, image_url, brands(name), product_variants(id, label, shade_name, size_label, image_url, is_default, sort_order)',
        )
        .eq('id', productId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        name: data.name,
        brand: data.brands?.name ?? '',
        category: data.category,
        description: data.description,
        imageUrl: catalogImageUrl(data.image_url),
        variants: [...data.product_variants]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((v) => ({
            id: v.id,
            label: v.label,
            shadeName: v.shade_name,
            sizeLabel: v.size_label,
            imageUrl: catalogImageUrl(v.image_url),
            isDefault: v.is_default,
          })),
      };
    },
  };
}
