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
  CART_STORAGE_KEY,
  EMPTY_CART,
  getCartItemCount,
  getCartSubtotal,
  parseCartState,
  removeCartItem,
  setCartItemQuantity,
  type CartLineItem,
  type CartState,
  type CartToastMessage,
} from '@/lib/cart';
import CartToast from '@/components/cart/CartToast';

type CartContextValue = {
  items: CartLineItem[];
  itemCount: number;
  subtotal: Money;
  addItem: (item: Omit<CartLineItem, 'quantity'>, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
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
      notify();
    },
    update(updater: (current: CartState) => CartState) {
      state = updater(state);
      persist();
      notify();
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
        store.update((current) => addCartItem(current, item, quantity));
        setToast({ id: Date.now(), text: 'Added to your cart.' });
      },
      setQuantity: (productId, quantity) =>
        store.update((current) =>
          setCartItemQuantity(current, productId, quantity),
        ),
      removeItem: (productId) =>
        store.update((current) => removeCartItem(current, productId)),
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
