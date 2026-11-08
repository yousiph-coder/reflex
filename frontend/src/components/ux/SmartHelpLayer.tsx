// src/components/ux/SmartHelpLayer.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { getAIHelpContext, ContextualHelpResponse } from "@/lib/ux-ai-engine";

export function SmartHelpLayer() {
  const [active, setActive] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const [tip, setTip] = useState<ContextualHelpResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [cardPos, setCardPos] = useState<{ top: number; left: number; placement: "bottom" | "top" }>({
    top: 0,
    left: 0,
    placement: "bottom",
  });

  const cacheRef = useRef<Map<string, ContextualHelpResponse>>(new Map());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const recentActionsRef = useRef<string[]>([]);
  const lastElementRef = useRef<HTMLElement | null>(null);

  // حساب موقع الكارت العائم مع منع الخروج عن الشاشة
  const computeCardPosition = useCallback((rect: DOMRect) => {
    const cardWidth = 320;
    const cardHeight = 190;
    const padding = 16;

    let left = rect.left + rect.width / 2 - cardWidth / 2;
    left = Math.max(padding, Math.min(left, window.innerWidth - cardWidth - padding));

    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow >= cardHeight + 20) {
      return { top: rect.bottom + 12, left, placement: "bottom" as const };
    }
    return { top: Math.max(padding, rect.top - cardHeight - 12), left, placement: "top" as const };
  }, []);

  const fetchContextualTip = useCallback(
    async (el: HTMLElement, trigger: "hover" | "click") => {
      const ctx = getAIHelpContext(el, trigger, recentActionsRef.current);
      const cacheKey = `${ctx.page.currentRoute}::${ctx.element.label}::${ctx.element.errorText}`;

      if (cacheRef.current.has(cacheKey)) {
        setTip(cacheRef.current.get(cacheKey)!);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/ux-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "contextual_help", payload: { context: ctx } }),
        });
        if (!res.ok) throw new Error("Failed");
        const data: ContextualHelpResponse = await res.json();
        cacheRef.current.set(cacheKey, data);
        setTip(data);
      } catch {
        // Fallback فوري بدون كسر التجربة
        const fallback: ContextualHelpResponse = {
          title: ctx.element.label.slice(0, 32) || "Workspace Element",
          tooltip: `Interactive ${ctx.element.type} inside ${ctx.page.sectionName}.`,
          expanded_help:
            ctx.element.nearbyText.slice(0, 110) ||
            "Part of your autonomous remediation workflow. Safe to inspect or trigger.",
          suggested_action: ctx.element.buttonText
            ? `Select "${ctx.element.buttonText}"`
            : "Click to interact",
          confidence: "medium",
        };
        setTip(fallback);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // إغلاق عبر زر Escape أو Alt+H
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && active) {
        setActive(false);
        setHoveredRect(null);
        setTip(null);
      }
      if (e.altKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setActive((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  // تتبع الماوس والعناصر التفاعلية أثناء تفعيل الوضع
  useEffect(() => {
    if (!active) {
      setHoveredRect(null);
      setTip(null);
      return;
    }

    const onMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });

      const target = e.target as HTMLElement | null;
      if (!target || target.closest("[data-smart-help-ignore]")) return;

      const interactiveEl = target.closest(
        'button, a, input, select, textarea, [role="button"], [data-help-label], [data-error], [data-empty-state]'
      ) as HTMLElement | null;

      if (!interactiveEl) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        return;
      }

      if (interactiveEl === lastElementRef.current) return;
      lastElementRef.current = interactiveEl;

      const rect = interactiveEl.getBoundingClientRect();
      setHoveredRect(rect);
      setCardPos(computeCardPosition(rect));

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchContextualTip(interactiveEl, "hover");
      }, 220);
    };

    const onClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.closest("[data-smart-help-ignore]")) return;

      const interactiveEl = target.closest(
        'button, a, input, select, [role="button"], [data-help-label]'
      ) as HTMLElement | null;

      if (interactiveEl) {
        e.preventDefault();
        e.stopPropagation();
        const rect = interactiveEl.getBoundingClientRect();
        setHoveredRect(rect);
        setCardPos(computeCardPosition(rect));
        fetchContextualTip(interactiveEl, "click");
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("click", onClickCapture, true);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClickCapture, true);
    };
  }, [active, computeCardPosition, fetchContextualTip]);

  return (
    <>
      {/* زر التفعيل العلوي المدمج في الهيدر أو العائم بهدوء */}
      <button
        type="button"
        data-smart-help-ignore="true"
        onClick={() => setActive((prev) => !prev)}
        className={`fixed bottom-5 right-5 z-[90] flex items-center gap-2.5 rounded-full px-4 py-2 font-mono text-xs tracking-wider uppercase transition-all duration-200 backdrop-blur-xl border ${
          active
            ? "bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-[0_0_25px_rgba(34,211,238,0.35)]"
            : "bg-white/[0.04] border-white/10 text-zinc-300 hover:border-cyan-400/50 hover:text-white"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            active ? "bg-cyan-400 animate-ping" : "bg-cyan-400/70"
          }`}
        />
        <span>{active ? "Exit Help Mode [ESC]" : "AI Help [Alt+H]"}</span>
      </button>

      {/* المؤشر المضيء المخصص + التحديد الناعم + الكارت العائم */}
      {active && (
        <div data-smart-help-ignore="true" className="pointer-events-none fixed inset-0 z-[85]">
          {/* Glowing AI Pointer */}
          <div
            style={{
              transform: `translate3d(${cursorPos.x - 10}px, ${cursorPos.y - 10}px, 0)`,
            }}
            className="fixed top-0 left-0 h-5 w-5 rounded-full border border-cyan-300 bg-cyan-400/20 shadow-[0_0_18px_rgba(34,211,238,0.85)] transition-transform duration-75 ease-out flex items-center justify-center"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse" />
          </div>

          {/* تحديد العنصر بدون تحريك الـ Layout */}
          {hoveredRect && (
            <div
              style={{
                top: hoveredRect.top - 3,
                left: hoveredRect.left - 3,
                width: hoveredRect.width + 6,
                height: hoveredRect.height + 6,
              }}
              className="fixed rounded-lg border border-cyan-400/70 bg-cyan-400/[0.04] shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all duration-150"
            />
          )}

          {/* الكارت العائم المرتبط بالعنصر */}
          {hoveredRect && (
            <div
              style={{ top: cardPos.top, left: cardPos.left }}
              className="pointer-events-auto fixed w-80 rounded-xl bg-zinc-950/90 backdrop-blur-2xl border border-cyan-400/30 p-4 text-left shadow-[0_16px_40px_rgba(0,0,0,0.85),0_0_20px_rgba(34,211,238,0.15)] transition-all duration-150"
            >
              {/* Signature Corner Brackets */}
              <span className="absolute top-0 left-0 h-2 w-2 border-t border-l border-cyan-400" />
              <span className="absolute top-0 right-0 h-2 w-2 border-t border-r border-cyan-400" />
              <span className="absolute bottom-0 left-0 h-2 w-2 border-b border-l border-cyan-400" />
              <span className="absolute bottom-0 right-0 h-2 w-2 border-b border-r border-cyan-400" />

              {/* السهم الصغير */}
              <div
                className={`absolute left-1/2 -translate-x-1/2 h-2.5 w-2.5 rotate-45 border-cyan-400/30 bg-zinc-950 ${
                  cardPos.placement === "bottom"
                    ? "-top-1.5 border-t border-l"
                    : "-bottom-1.5 border-b border-r"
                }`}
              />

              {loading ? (
                <div className="flex items-center gap-3 py-3 text-xs font-mono text-cyan-300">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                  <span>Generating help...</span>
                </div>
              ) : (
                tip && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-400">
                        [ CONTEXT_LENS // {tip.confidence.toUpperCase()} ]
                      </span>
                    </div>
                    <h4 className="font-mono text-sm font-semibold text-white">{tip.title}</h4>
                    <p className="text-xs leading-relaxed text-zinc-200">{tip.tooltip}</p>
                    <p className="text-[11px] leading-relaxed text-zinc-400 border-t border-white/[0.08] pt-2">
                      {tip.expanded_help}
                    </p>
                    <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-emerald-400">
                      <span>→ {tip.suggested_action}</span>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}