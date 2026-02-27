import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  equipmentId: string;
  name: string;
  category: string;
  quantity: number;
  imageUrl?: string; // ✅ 사진 주소 추가 (있을 수도, 없을 수도 있음)
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (equipmentId: string) => void;
  updateQuantity: (equipmentId: string, quantity: number) => void;
  increaseQuantity: (equipmentId: string) => void;
  decreaseQuantity: (equipmentId: string) => void;
  clearCart: () => void;
}

export const useCartStore = create(
  persist<CartState>(
    (set) => ({
      items: [],

      // 장비리스트 담기
      addItem: (newItem) =>
        set((state) => {
          const existingItem = state.items.find(
            (i) => i.equipmentId === newItem.equipmentId
          );
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.equipmentId === newItem.equipmentId
                  ? { ...i, quantity: i.quantity + newItem.quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, newItem] };
        }),

      // 삭제
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.equipmentId !== id),
        })),

      // 수량 직접 설정
      updateQuantity: (id, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((i) => i.equipmentId !== id),
            };
          }
          return {
            items: state.items.map((i) =>
              i.equipmentId === id ? { ...i, quantity } : i
            ),
          };
        }),

      // 수량 증가
      increaseQuantity: (id) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.equipmentId === id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        })),

      // 수량 감소
      decreaseQuantity: (id) =>
        set((state) => {
          const item = state.items.find((i) => i.equipmentId === id);
          if (!item) return state;

          if (item.quantity <= 1) {
            return {
              items: state.items.filter((i) => i.equipmentId !== id),
            };
          }

          return {
            items: state.items.map((i) =>
              i.equipmentId === id ? { ...i, quantity: i.quantity - 1 } : i
            ),
          };
        }),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: "cart-storage",
    }
  )
);
