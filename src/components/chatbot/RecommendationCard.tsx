// src/components/chatbot/RecommendationCard.tsx
import { Camera, ShoppingCart, Check } from "lucide-react";
import { useState } from "react";
import { useConvexAuth } from "convex/react";
import type { EquipmentRecommendation } from "@/lib/chatbot/types";
import { PRIORITY_LABELS } from "@/lib/chatbot/equipmentRules";
import { useCartStore } from "@/stores/useCartStore";

interface RecommendationCardProps {
  recommendation: EquipmentRecommendation;
}

export default function RecommendationCard({
  recommendation,
}: RecommendationCardProps) {
  const [added, setAdded] = useState(false);
  const { isAuthenticated } = useConvexAuth();
  const addItem = useCartStore((state) => state.addItem);

  const priorityConfig = PRIORITY_LABELS[recommendation.priority];

  const handleAddToCart = () => {
    addItem({
      equipmentId: recommendation.equipmentId,
      name: recommendation.name,
      category: recommendation.category,
      quantity: recommendation.quantity,
      imageUrl: recommendation.imageUrl,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
      <div className="flex gap-3">
        {/* Thumbnail */}
        <div className="w-14 h-14 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center">
          {recommendation.imageUrl ? (
            <img
              src={recommendation.imageUrl}
              alt={recommendation.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Camera className="w-6 h-6 text-gray-300" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-gray-900 truncate">
                {recommendation.name}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                {priorityConfig && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${priorityConfig.color}`}
                  >
                    {priorityConfig.label}
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  x{recommendation.quantity}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
            {recommendation.reason}
          </p>
        </div>
      </div>

      {/* Add to Cart Button - 로그인한 경우에만 표시 */}
      {isAuthenticated && (
        <button
          onClick={handleAddToCart}
          disabled={added}
          className={`w-full mt-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            added
              ? "bg-green-100 text-green-700"
              : "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]"
          }`}
        >
          {added ? (
            <>
              <Check className="w-3.5 h-3.5" />
              담김
            </>
          ) : (
            <>
              <ShoppingCart className="w-3.5 h-3.5" />
              장바구니 담기
            </>
          )}
        </button>
      )}
    </div>
  );
}
