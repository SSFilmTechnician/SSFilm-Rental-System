import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  equipmentItemId: string;
  equipmentMasterId: string;
  name: string;
  serialNumber: string;
  manufacturer: string | null;
  imageUrl: string | null;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (equipmentItemId: string) => void;
  clearCart: () => void;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          if (
            state.items.some((i) => i.equipmentItemId === item.equipmentItemId)
          ) {
            alert("이미 장바구니에 담긴 장비입니다.");
            return state;
          }
          return { items: [...state.items, item] };
        }),

      removeItem: (equipmentItemId) =>
        set((state) => ({
          items: state.items.filter(
            (i) => i.equipmentItemId !== equipmentItemId
          ),
        })),

      clearCart: () => set({ items: [] }),

      getItemCount: () => get().items.length,
    }),
    {
      name: "ssfilm-cart-storage",
    }
  )
);
