// src/components/chatbot/ChatbotWindow.tsx
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, RotateCcw, Loader2 } from "lucide-react";
import { useAction, useQuery, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useChatbotStore } from "@/stores/useChatbotStore";
import type { ChatOption } from "@/lib/chatbot/types";
import {
  BOT_RESPONSES,
  CATEGORY_FLOW_ORDER,
  getNextCategoryInFlow,
  getFlowOptions,
} from "@/lib/chatbot/prompts";
import ChatMessage from "./ChatMessage";

export default function ChatbotWindow() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useConvexAuth();

  const {
    isOpen,
    messages,
    currentStep,
    selections,
    isLoading,
    addMessage,
    setStep,
    setSelection,
    addSelectedCategory,
    setLoading,
    resetChat,
    closeChat,
  } = useChatbotStore();

  // Convex queries and actions
  const equipment = useQuery(api.equipment.getList, {});
  const categories = useQuery(api.equipment.getCategories, {});
  const getRecommendations = useAction(api.chatbot.getRecommendations);

  // Create category map for looking up category names by ID
  const categoryMap = new Map(
    (categories || []).map((cat) => [cat._id, cat])
  );

  // Get category name from equipment's categoryId
  const getCategoryName = (categoryId: string) => {
    const category = categoryMap.get(categoryId as never);
    if (!category) return "";

    // If category has a parent, use parent's name (main category)
    if (category.parentId) {
      const parent = categoryMap.get(category.parentId as never);
      return parent?.name || category.name;
    }
    return category.name;
  };

  // Filter equipment by selected category
  const filterEquipmentByCategory = (
    allEquipment: typeof equipment,
    targetCategory: string
  ) => {
    if (!allEquipment) return [];

    const normalize = (str: string) =>
      str.toLowerCase().trim().replace(/[\s·]+/g, "");

    const normalizedTarget = normalize(targetCategory);

    return allEquipment.filter((eq) => {
      const categoryName = getCategoryName(eq.categoryId);
      const normalizedCategoryName = normalize(categoryName);

      // Check if the equipment's category matches the target
      return (
        normalizedCategoryName === normalizedTarget ||
        normalizedCategoryName.includes(normalizedTarget) ||
        normalizedTarget.includes(normalizedCategoryName)
      );
    });
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Get category label by value
  const getCategoryLabel = (value: string) => {
    const cat = CATEGORY_FLOW_ORDER.find((c) => c.value === value);
    return cat?.label || value;
  };

  // Handle option selection
  const handleOptionSelect = async (option: ChatOption) => {
    // Add user's selection as a message
    addMessage({
      sender: "user",
      content: option.label,
    });

    switch (currentStep) {
      case "team_size":
        setSelection("teamSize", option.value);
        // Automatically start with first category (Camera)
        const firstCategory = CATEGORY_FLOW_ORDER[0];
        setSelection("mainCategory", firstCategory.value);
        addSelectedCategory(firstCategory.value);
        setStep("recommendations");

        addMessage({
          sender: "bot",
          content: BOT_RESPONSES.afterTeamSize(option.label),
        });

        addMessage({
          sender: "bot",
          content: BOT_RESPONSES.beforeRecommendation(firstCategory.label),
        });

        // Fetch recommendations for the first category
        await fetchRecommendations(option.value, firstCategory.value);
        break;

      case "flow_control":
        if (option.value === "finish") {
          // User chose to finish
          setStep("completed");
          addMessage({
            sender: "bot",
            content: BOT_RESPONSES.completed(),
          });
          // Navigate to cart and close chatbot
          setTimeout(() => {
            closeChat();
            navigate("/cart");
          }, 500);
        } else if (option.value === "skip") {
          // Skip current and move to next category
          const currentCategory = selections.mainCategory;
          const nextAfterCurrent = currentCategory
            ? getNextCategoryInFlow(currentCategory)
            : null;

          if (nextAfterCurrent) {
            setSelection("mainCategory", nextAfterCurrent.value);
            addSelectedCategory(nextAfterCurrent.value);
            setStep("recommendations");

            addMessage({
              sender: "bot",
              content: BOT_RESPONSES.skipCategory(
                getCategoryLabel(currentCategory || ""),
                nextAfterCurrent.label
              ),
            });

            addMessage({
              sender: "bot",
              content: BOT_RESPONSES.beforeRecommendation(nextAfterCurrent.label),
            });

            await fetchRecommendations(
              selections.teamSize!,
              nextAfterCurrent.value
            );
          } else {
            // No more categories to skip to
            setStep("completed");
            addMessage({
              sender: "bot",
              content: BOT_RESPONSES.completed(),
            });
          }
        } else {
          // User selected next category (option.value is the category value)
          setSelection("mainCategory", option.value);
          addSelectedCategory(option.value);
          setStep("recommendations");

          addMessage({
            sender: "bot",
            content: BOT_RESPONSES.beforeRecommendation(
              getCategoryLabel(option.value)
            ),
          });

          await fetchRecommendations(selections.teamSize!, option.value);
        }
        break;
    }
  };

  // Fetch recommendations from AI
  const fetchRecommendations = async (
    teamSize: string,
    mainCategory: string
  ) => {
    setLoading(true);

    try {
      // Filter equipment by the selected category BEFORE sending to AI
      const filteredEquipment = filterEquipmentByCategory(
        equipment,
        mainCategory
      );

      // Prepare equipment data for AI (only filtered items)
      const availableEquipment = filteredEquipment.map((eq) => ({
        id: eq._id,
        name: eq.name,
        category: getCategoryName(eq.categoryId), // Use actual category name
        totalQuantity: eq.totalQuantity,
        imageUrl: eq.imageUrl || undefined,
      }));

      const result = await getRecommendations({
        teamSize,
        mainCategory,
        availableEquipment,
      });

      // Add recommendation message
      addMessage({
        sender: "bot",
        content: BOT_RESPONSES.recommendationIntro(getCategoryLabel(mainCategory)),
        recommendations: result.recommendations,
        warnings: result.warnings,
      });

      // Get next category in the flow
      const nextCategory = getNextCategoryInFlow(mainCategory);

      if (nextCategory) {
        // Show flow control options
        setStep("flow_control");
        const flowOptions = getFlowOptions(nextCategory);
        addMessage({
          sender: "bot",
          content: BOT_RESPONSES.afterRecommendation(nextCategory.label),
          options: flowOptions,
        });
      } else {
        // No more categories - completed
        setStep("completed");
        addMessage({
          sender: "bot",
          content: BOT_RESPONSES.completed(),
        });
      }
    } catch (error) {
      console.error("Failed to get recommendations:", error);
      addMessage({
        sender: "bot",
        content: BOT_RESPONSES.error(),
      });
    } finally {
      setLoading(false);
    }
  };

  // 로그인하지 않은 경우 챗봇 창 숨김
  if (!isAuthenticated || !isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 z-40 w-[380px] max-h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-fadeIn md:w-[380px] max-md:w-[calc(100%-48px)] max-md:left-6 max-md:right-6 max-md:bottom-24 max-md:max-h-[70vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold">SSFILM 장비 추천</h3>
            <p className="text-[10px] text-gray-400">AI 어시스턴트</p>
          </div>
        </div>
        <button
          onClick={resetChat}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title="대화 초기화"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            onOptionSelect={handleOptionSelect}
            isLatest={index === messages.length - 1}
          />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start mb-3">
            <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">추천 장비를 분석하고 있습니다...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer info */}
      <div className="px-4 py-2 bg-gray-100 border-t border-gray-200">
        <p className="text-[10px] text-gray-400 text-center">
          AI 추천은 참고용입니다. 정확한 장비 선택은 관리자와 상담하세요.
        </p>
      </div>
    </div>
  );
}
