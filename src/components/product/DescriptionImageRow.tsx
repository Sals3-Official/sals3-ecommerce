import Image from 'next/image';
import type { ProductDescriptionBlock } from '@/lib/product-detail';

type DescriptionImageBlock = Extract<
  ProductDescriptionBlock,
  { type: 'image' }
>;

type DescriptionImageRowProps = {
  /** One adjacency group: consecutive image blocks from the description. */
  images: DescriptionImageBlock[];
};

/**
 * One row of seller-placed description photos.
 *
 * Layout is derived from adjacency, matching the portal's description studio:
 * a single image runs full width at 16:9; two or more consecutive images share
 * a grid at 4:3. There is no stored "row" container to render — the grouping
 * itself is the layout.
 *
 * Every `url` here has already passed `getAllowedProductImageUrl` in the
 * mapper, so this component renders what it is given and claims nothing about
 * hosts. `object-cover` inside a fixed aspect box keeps a mis-shaped upload
 * from reflowing the description around it.
 */
export default function DescriptionImageRow({
  images,
}: DescriptionImageRowProps) {
  const isSingle = images.length === 1;

  return (
    <div
      className={
        isSingle
          ? undefined
          : 'grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]'
      }
    >
      {images.map((image, index) => {
        // Index in the key: a seller may legitimately place the same photo
        // twice in one row, and the list is re-rendered whole from one payload.
        const key = `${image.url}-${index}`;

        return (
          <figure key={key}>
            <div
              className={`relative w-full overflow-hidden rounded-xl border border-border bg-white ${
                isSingle ? 'aspect-video' : 'aspect-[4/3]'
              }`}
            >
              <Image
                src={image.url}
                alt={image.alt}
                fill
                sizes={
                  isSingle
                    ? '(min-width: 1024px) 720px, 100vw'
                    : '(min-width: 640px) 33vw, 100vw'
                }
                className="object-cover"
              />
            </div>
            {image.caption === undefined ? null : (
              <figcaption className="mt-1.5 text-xs text-ink-muted">
                {image.caption}
              </figcaption>
            )}
          </figure>
        );
      })}
    </div>
  );
}
