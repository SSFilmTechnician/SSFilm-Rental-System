import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SLIDES = [
  {
    id: 1,
    image:
      "https://res.cloudinary.com/dd8pp8ngj/image/upload/v1769081325/_1.1.1_g8dym2.png",
    title: "SSFilm Equipment Reservation System",
    subtitle: "숭실대학교 영화예술전공 장비예약 시스템",
  },
  {
    id: 2,
    image:
      "https://res.cloudinary.com/dd8pp8ngj/image/upload/v1769083290/IMG_3326_yiphiv.jpg",
    title: "Anyone, Anytime",
    subtitle: "누구나, 언제든지",
  },
  {
    id: 3,
    image:
      "https://res.cloudinary.com/dd8pp8ngj/image/upload/v1769081550/IMG_6881_mvsfgx.jpg",
    // ✅ 모바일에서만 줄바꿈이 일어나도록 JSX로 수정
    title: (
      <>
        Beyond Basics, <br className="block md:hidden" />
        Set the Standard
      </>
    ),
    subtitle: "기본을 넘어, 기준을 세워",
  },
];

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev === SLIDES.length - 1 ? 0 : prev + 1));
    }, 5000);

    return () => clearInterval(timer);
  }, [isHovered]);

  const prevSlide = () => {
    setCurrent((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev === SLIDES.length - 1 ? 0 : prev + 1));
  };

  return (
    <div
      className="relative w-full h-[480px] md:h-[800px] overflow-hidden bg-black"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {SLIDES.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
            index === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          <div className="absolute inset-0 bg-black/40 z-10" />
          <img
            src={slide.image}
            alt={typeof slide.title === "string" ? slide.title : "Slide Image"}
            className="w-full h-full object-cover"
          />

          <div className="absolute inset-0 z-20 flex flex-col justify-center items-center text-center text-white px-6 md:px-4">
            <h3
              className={`text-sm md:text-2xl font-light tracking-[0.15em] md:tracking-[0.2em] mb-1 md:mb-0 text-gray-200 transform transition-all duration-1000 delay-300 leading-snug text-[shadow:0_2px_4px_rgba(0,0,0,0.8)] ${
                index === current
                  ? "translate-y-0 opacity-100"
                  : "translate-y-10 opacity-0"
              }`}
            >
              {slide.subtitle}
            </h3>

            <h1
              className={`text-3xl md:text-7xl font-bold tracking-tighter mt-0 transform transition-all duration-1000 delay-500 leading-[0.95] md:leading-[0.9] text-[shadow:0_4px_15px_rgba(0,0,0,1.0)] ${
                index === current
                  ? "translate-y-0 opacity-100"
                  : "translate-y-10 opacity-0"
              }`}
            >
              {slide.title}
            </h1>
          </div>
        </div>
      ))}

      {/* 모바일에서도 보이도록 opacity 조정된 버튼 */}
      <button
        onClick={prevSlide}
        className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 z-30 p-2 md:p-3 rounded-full bg-white/20 md:bg-white/10 hover:bg-white/30 text-white backdrop-blur-sm transition-all active:scale-95 md:hover:scale-110"
      >
        <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 z-30 p-2 md:p-3 rounded-full bg-white/20 md:bg-white/10 hover:bg-white/30 text-white backdrop-blur-sm transition-all active:scale-95 md:hover:scale-110"
      >
        <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
      </button>

      <div className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-30 flex gap-2 md:gap-3">
        {SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`h-1 rounded-full transition-all duration-500 ${
              index === current
                ? "w-12 bg-white"
                : "w-2 bg-white/40 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
