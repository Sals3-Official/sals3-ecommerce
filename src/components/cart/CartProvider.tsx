'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { Money } from '@/lib/money';
import {
  addCartItem,
  cartLineId,
  CART_STORAGE_KEY,
  EMPTY_CART,
  getCartItemCount,
  getCartSubtotal,
  LEGACY_CART_STORAGE_KEYS,
  lineIdOf,
  parseCartState,
  removeCartItem,
  repriceCartItems,
  setCartItemQuantity,
  type CartLineItem,
  type CartState,
  type CartToastMessage,
} from '@/lib/cart';
import { trackKlaviyoAddedToCart } from '@/lib/klaviyo/client';
import CartToast from '@/components/cart/CartToast';

type CartContextValue = {
  items: CartLineItem[];
  itemCount: number;
  subtotal: Money;
  addItem: (item: Omit<CartLineItem, 'quantity'>, quantity?: number) => void;
  /** `lineId`, not a product id: two variants of one product are two lines. */
  setQuantity: (lineId: string, quantity: number) => void;
  removeItem: (lineId: string) => void;
  /**
   * Writes today's prices onto the lines named.
   *
   * Called by the checkout, which asks the server what everything costs now
   * before it shows a total. Silent by design — the notice belongs beside the
   * summary, where the buyer is looking, not in a toast that has moved on by
   * the time they read the figure.
   */
  reprice: (prices: { lineId: string; unitPrice: Money }[]) => void;
  /**
   * Empties the cart outright. Used once a checkout is paid — those lines are
   * an order now, not purchase intent. Deliberately silent: `removeItem` is a
   * buyer's decision worth confirming, this is a consequence of one they
   * already made and the receipt beside it is the feedback.
   */
  clear: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

/**
 * A tiny external store, one per CartProvider instance. useSyncExternalStore
 * (not setState-in-an-effect) is what lets the client read localStorage
 * after mount without a hydration mismatch against the server's empty cart.
 */
function createCartStore() {
  let state: CartState = EMPTY_CART;
  const listeners = new Set<() => void>();

  function notify() {
    listeners.forEach((listener) => listener());
  }

  function persist() {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    getServerSnapshot: () => EMPTY_CART,
    hydrate() {
      state = parseCartState(window.localStorage.getItem(CART_STORAGE_KEY));
      // A v1 blob is PHP-priced and product-keyed; the schema already rejects
      // it, so this only removes what is left behind. Purchase intent should
      // not sit in storage under a key nothing reads.
      LEGACY_CART_STORAGE_KEYS.forEach((key) => {
        window.localStorage.removeItem(key);
      });
      notify();
    },
    update(updater: (current: CartState) => CartState) {
      state = updater(state);
      persist();
      notify();
      return state;
    },
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createCartStore);
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const [toast, setToast] = useState<CartToastMessage | null>(null);

  useEffect(() => {
    store.hydrate();
  }, [store]);

  const value = useMemo<CartContextValue>(
    () => ({
      items: state.items,
      itemCount: getCartItemCount(state),
      subtotal: getCartSubtotal(state),
      addItem: (item, quantity = 1) => {
        const id = cartLineId(item.productId, item.variant?.id);
        const previousLine = state.items.find((line) => lineIdOf(line) === id);
        const nextState = store.update((current) =>
          addCartItem(current, item, quantity),
        );
        const nextLine = nextState.items.find((line) => lineIdOf(line) === id);
        const addedQuantity =
          (nextLine?.quantity ?? 0) - (previousLine?.quantity ?? 0);

        if (nextLine && addedQuantity > 0) {
          trackKlaviyoAddedToCart({
            items: nextState.items,
            addedItem: { ...nextLine, quantity: addedQuantity },
            addedItemCategory: item.category,
          });
        }

        setToast({ id: Date.now(), text: 'Added to your cart.' });
      },
      setQuantity: (lineId, quantity) =>
        store.update((current) =>
          setCartItemQuantity(current, lineId, quantity),
        ),
      removeItem: (lineId) =>
        store.update((current) => removeCartItem(current, lineId)),
      reprice: (prices) =>
        store.update((current) => repriceCartItems(current, prices)),
      clear: () => {
        store.update(() => EMPTY_CART);
      },
    }),
    [state, store],
  );

  return (
    <CartContext value={value}>
      {children}
      <CartToast
        key={toast?.id}
        toast={toast}
        onDismiss={() => setToast(null)}
      />
    </CartContext>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within a CartProvider.');
  }

  return context;
}
