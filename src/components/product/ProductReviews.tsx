import type { ProductReview } from '@/lib/product-detail';

type ProductReviewsProps = {
  reviews: ProductReview[];
};

export default function ProductReviews({ reviews }: ProductReviewsProps) {
  return (
    <section
      className="mt-10 border-t border-border pt-6"
      aria-labelledby="reviews-heading"
    >
      <h2 id="reviews-heading" className="text-xl font-bold">
        Reviews
      </h2>
      {reviews.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No reviews yet.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-xl border border-border bg-white p-3.5"
            >
              <div className="flex items-center justify-between">
                <span
                  aria-label={`Rating: ${review.starsLine}`}
                  className="text-sm text-brand-600"
                >
                  {review.starsLine}
                </span>
                <span className="text-xs text-ink-faint">
                  {review.dateLine}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-subtle">
                {review.reviewerName}
              </p>
              <p className="mt-2 text-sm text-ink-muted text-pretty">
                {review.comment}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
