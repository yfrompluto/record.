// =====================================================================
//    Dynamic cover slide show
//    (for devs) Totally customisable - feel free to add any covers you cant in
//    frontend/public/covers/n.jpg
// =====================================================================

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause } from 'lucide-react';

export const COVER_COUNT = 29;
export const COVERS = Array.from({ length: COVER_COUNT }, (_, i) => ({
   src: `/covers/${i + 1}.jpg`,
   label: `cover`,
}));

export function buildColumn(colIndex: number, total: number, count: number) {
   const out = [];
   for (let i = 0; i < count; i++) {
      out.push(COVERS[(colIndex * 7 + i) % COVERS.length]);
   }
   return out;
}

function CoverTile({ cover }: { cover: { src: string; label: string } }) {
   return (
      <div
         className="relative rounded-xl overflow-hidden shrink-0 group"
         style={{
            width: "100%",
            aspectRatio: "1",
            boxShadow: "0 4px 16px rgba(0,0,0,0.45)",
            transition: "transform 0.22s cubic-bezier(0.34,1.26,0.64,1), box-shadow 0.22s ease",
         }}
         onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 10px 28px rgba(0,0,0,0.6)";
         }}
         onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.45)";
         }}
      >
         <img
            src={cover.src}
            alt={cover.label}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
         />
         <div
            className="absolute inset-0 flex items-end p-2"
            style={{
               background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%)",
               opacity: 0,
               transition: "opacity 0.18s ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0"; }}
         >
            <span className="text-white/50 text-xs font-medium leading-tight truncate">{cover.label}</span>
         </div>
      </div>
   );
}

export function CoverColumn({
   colIndex,
   direction,
   speed,
   paused,
   itemsPerCol = 6,
}: {
   colIndex: number;
   direction: "up" | "down";
   speed: number;
   paused: boolean;
   itemsPerCol?: number;
}) {
   const items = buildColumn(colIndex, 3, itemsPerCol);
   const looped = [...items, ...items];

   return (
      <div
         aria-hidden="true"
         className="flex flex-col gap-3 overflow-hidden"
         style={{ maskImage: "linear-gradient(to bottom, transparent 0%, black 8%, black 90.2%, transparent 100%)" }}
      >
         <div
            style={{
               display: "flex",
               flexDirection: "column",
               gap: "12px",
               animation: `scroll-${direction} ${speed}s linear infinite`,
               animationPlayState: paused ? "paused" : "running",
               willChange: "transform",
            }}
         >
            {looped.map((cover, i) => (
               <CoverTile key={i} cover={cover} />
            ))}
         </div>
      </div>
   );
}

// Accessibility compliance; user can pause the slideshow
export function CoverSlideshow() {
   const { t } = useTranslation();
   const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

   const [paused, setPaused] = useState(prefersReducedMotion ?? false);

   return (
      <div className="relative h-full">
         <div
            className="grid gap-3 h-full box-border"
            style={{ gridTemplateColumns: "repeat(3, minmax(90px, 1fr))", padding: "24px 16px" }}
         >
            <CoverColumn colIndex={0} direction="down" speed={22} paused={paused} />
            <CoverColumn colIndex={1} direction="up" speed={18} paused={paused} />
            <CoverColumn colIndex={2} direction="down" speed={25} paused={paused} />
         </div>

         <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? t('covers.resume', { defaultValue: 'Resume cover animation' }) : t('covers.pause', { defaultValue: 'Pause cover animation' })}
            aria-pressed={paused}
            className="absolute top-4 right-4 z-20 flex items-center justify-center w-9 h-9 rounded-full bg-black/40 text-white/80 backdrop-blur-sm border border-white/20 cursor-pointer transition-colors hover:text-orange hover:border-orange focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
         >
            {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
         </button>
      </div>
   );
}