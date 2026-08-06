"use client";

import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BrandWordmark } from "@/components/brand/BrandWordmark";

type SplashScreenProps = {
  onComplete: () => void;
};

const SPLASH_KEY = "cc_splash_done";

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<"anim" | "wordmark" | "tagline" | "exit">("anim");
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (sessionStorage.getItem(SPLASH_KEY)) {
      onComplete();
      return;
    }

    if (reducedMotion) {
      const t = setTimeout(() => {
        sessionStorage.setItem(SPLASH_KEY, "1");
        onComplete();
      }, 400);
      return () => clearTimeout(t);
    }

    const t1 = setTimeout(() => setPhase("wordmark"), 450);
    const t2 = setTimeout(() => setPhase("tagline"), 650);
    const t3 = setTimeout(() => setPhase("exit"), 1000);
    const t4 = setTimeout(() => {
      sessionStorage.setItem(SPLASH_KEY, "1");
      onComplete();
    }, 1250);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete, reducedMotion]);

  return (
    <div
      className={`splash-screen ${phase === "exit" ? "splash-screen--exit" : ""}`}
      aria-hidden
    >
      <div className="flex flex-col items-center">
        <div className={`splash-logo ${reducedMotion ? "splash-logo--static" : ""}`}>
          <BrandLogo size={56} className="text-navy" />
        </div>
        <BrandWordmark
          size="lg"
          className={`mt-6 transition-all duration-300 ${
            phase === "anim" && !reducedMotion
              ? "translate-y-2 opacity-0"
              : "translate-y-0 opacity-100"
          }`}
        />
        <p
          className={`mt-2 text-body-md text-on-variant transition-all duration-300 ${
            phase === "tagline" || phase === "exit" || reducedMotion
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0"
          }`}
        >
          Where GIM moves together.
        </p>
      </div>
    </div>
  );
}
