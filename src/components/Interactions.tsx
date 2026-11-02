"use client";

import { useEffect } from "react";

/**
 * Page-wide progressive enhancements. Everything here is optional: without JS
 * the page is fully readable (reveal styles only apply once `.js` is set).
 */
export default function Interactions() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Fade sections up as they enter the viewport
    const revealIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            revealIO.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => revealIO.observe(el));

    // Highlight the nav item for the section in view
    const links = new Map<string, HTMLElement>();
    document.querySelectorAll<HTMLAnchorElement>(".topbar__links a[href^='#']").forEach((a) => {
      links.set(a.getAttribute("href")!.slice(1), a);
    });
    const navIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const link = links.get(e.target.id);
          if (!link) continue;
          if (e.isIntersecting) {
            links.forEach((l) => l.removeAttribute("aria-current"));
            link.setAttribute("aria-current", "true");
          }
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    links.forEach((_, id) => {
      const section = document.getElementById(id);
      if (section) navIO.observe(section);
    });

    // Solid nav background once we've scrolled off the hero
    const onScroll = () => root.classList.toggle("is-scrolled", window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Gentle 3D tilt on project cards
    const cards = Array.from(document.querySelectorAll<HTMLElement>(".project"));
    const onCardMove = (e: PointerEvent) => {
      if (reduce || e.pointerType !== "mouse") return;
      const card = e.currentTarget as HTMLElement;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty("--rx", `${(-y * 6).toFixed(2)}deg`);
      card.style.setProperty("--ry", `${(x * 8).toFixed(2)}deg`);
      card.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(1)}%`);
      card.style.setProperty("--my", `${((y + 0.5) * 100).toFixed(1)}%`);
    };
    const onCardLeave = (e: PointerEvent) => {
      const card = e.currentTarget as HTMLElement;
      card.style.removeProperty("--rx");
      card.style.removeProperty("--ry");
    };
    cards.forEach((c) => {
      c.addEventListener("pointermove", onCardMove);
      c.addEventListener("pointerleave", onCardLeave);
    });

    return () => {
      revealIO.disconnect();
      navIO.disconnect();
      window.removeEventListener("scroll", onScroll);
      cards.forEach((c) => {
        c.removeEventListener("pointermove", onCardMove);
        c.removeEventListener("pointerleave", onCardLeave);
      });
    };
  }, []);

  return null;
}
