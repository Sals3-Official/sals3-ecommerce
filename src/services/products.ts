/**
 * Barrel for the storefront service layer.
 *
 * The implementation moved into `src/services/storefront/` when the contract
 * grew a detail shape (`schemas.ts`), a cache policy (`client.ts`), and per-row
 * salvage — one 900-line module would have been three concerns in one file. This
 * re-export keeps every existing `@/services/products` import and test path
 * working, so the split is not also a rename.
 */
export {
  DEFAULT_STOREFRONT_API_URL,
  ProductsApiError,
  STOREFRONT_CATEGORIES_PATH,
  STOREFRONT_FREIGHT_QUOTES_PATH,
  STOREFRONT_PRODUCTS_PATH,
  STOREFRONT_SEARCH_PATH,
} from './storefront/client';

export {
  DEFAULT_PRODUCTS_PAGE_SIZE,
  MAX_PRODUCTS_PAGE,
  MAX_PRODUCTS_PAGE_SIZE,
  ProductCategoriesResponseSchema,
  ProductsResponseSchema,
  StorefrontProductDetailSchema,
  StorefrontProductSchema,
  type Product,
  type ProductCategory,
  type ProductDescriptionBlock,
  type ProductPayloadDetail,
  type ProductsPagination,
  type ProductsResponse,
  type ProductSpecsPayload,
  type ProductVariantPayload,
  type StorefrontSection,
} from './storefront/schemas';

export {
  fetchCategoryProducts,
  fetchProductBySlug,
  fetchProductCategories,
  fetchProducts,
  fetchProductsByCategory,
  fetchSearchProducts,
  getProductsTotalPages,
  parseProductsPagination,
  type CategoryProductsSort,
} from './storefront/products';

export {
  getAllowedProductImageUrl,
  toHomeCategory,
  toHomeProduct,
  toProductDetail,
  toProductOptionAxes,
} from './storefront/mappers';
