'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * The Sals3 SKU of the variant the buyer currently has selected, shared between
 * the buy panel that owns the selection and the specifications band far below
 * it that prints the code.
 *
 * ## Why a context and not a prop
 *
 * The two live on opposite sides of the page. `ProductRecordPanel` is a client
 * component holding the selection in `useState`; `ProductSpecifications` is a
 * server component in a different branch of `page.tsx`. Chip clicks deliberately
 * do **not** navigate — ADR-016, so the price cannot repaint after paint — so
 * the server band has no way to learn that the buyer moved from Black to Blue.
 *
 * ## Why publish rather than lift the state
 *
 * The panel keeps owning its selection. This only mirrors the resulting SKU
 * outward, which means the buy box's own logic — defaults, URL resolution,
 * availability, the price the buttons act on — is untouched by this feature.
 * A bug here can make the printed code stale. It cannot sell the wrong variant.
 *
 * Outside a provider both hooks are inert, so either component still renders
 * alone in a test or anywhere else it is dropped.
 */
type SelectedSkuValue = {
  sku: string | undefined;
  publish: (sku: string | undefined) => void;
};

const SelectedSkuContext = createContext<SelectedSkuValue | null>(null);

export function SelectedSkuProvider({
  initialSku,
  children,
}: {
  /**
   * The SKU resolved on the server for this request — the `?variant=` one, or
   * the honest default. It is what renders before hydration, so the code is
   * correct in the HTML rather than appearing a frame later.
   */
  initialSku?: string;
  children: ReactNode;
}) {
  const [sku, setSku] = useState(initialSku);
  const value = useMemo(() => ({ sku, publish: setSku }), [sku]);

  return <SelectedSkuContext value={value}>{children}</SelectedSkuContext>;
}

/** Read the current SKU. `undefined` outside a provider, and before publish. */
export function useSelectedSku(): string | undefined {
  return useContext(SelectedSkuContext)?.sku;
}

/**
 * Mirror the panel's selection outward.
 *
 * In an effect rather than during render because it writes state owned by an
 * ancestor: doing that in the render body is the "cannot update a component
 * while rendering a different component" warning, and React is right about it.
 */
export function usePublishSelectedSku(sku: string | undefined): void {
  const publish = useContext(SelectedSkuContext)?.publish;

  useEffect(() => {
    publish?.(sku);
  }, [publish, sku]);
}
