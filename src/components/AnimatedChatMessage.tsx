import React, { useEffect, useRef } from "react";
import { Player } from "@lottiefiles/react-lottie-player";
import gsap from "gsap";

type Props = {
  author: "user" | "bot";
  children: React.ReactNode;
  lottieJson?: any; // import a lottie JSON if you want an icon
  className?: string;
};

export default function AnimatedChatMessage({ author, children, lottieJson, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lottieRef = useRef<any>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Entrance animation using GSAP
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 12, scale: 0.995 },
      { duration: 0.6, autoAlpha: 1, y: 0, scale: 1, ease: "power3.out" }
    );
  }, []);

  return (
    <div
      ref={containerRef}
      role="article"
      aria-label={`${author} message`}
      className={className}
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        margin: "8px 0",
        maxWidth: "80%",
        alignSelf: author === "user" ? "flex-end" : "flex-start",
      }}
    >
      {lottieJson ? (
        <Player
          ref={lottieRef}
          autoplay
          loop
          src={lottieJson}
          style={{ width: 48, height: 48 }}
        />
      ) : null}
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          background: author === "user" ? "#0b93f6" : "#f1f0f0",
          color: author === "user" ? "#fff" : "#111",
          boxShadow: "0 6px 18px rgba(10,10,10,0.08)",
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
