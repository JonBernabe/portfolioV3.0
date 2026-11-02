import type { CSSProperties } from "react";
import { SECTIONS, SECTION_IDS, type SectionId } from "../Page/sections";
import BambooFrame from "./BambooFrame";

type HudProps = {
  active: SectionId | null;
  hintHidden: boolean;
  onNavigate: (id: SectionId) => void;
};

const OVERLAY = "pointer-events-none fixed z-10 *:pointer-events-auto";

export default function Hud({ active, hintHidden, onNavigate }: HudProps) {
  return (
    <>
      <div className={`${OVERLAY} top-5 left-5 md:top-7 md:left-8`}>
        <BambooFrame small />
        <div className="plank px-3.5 py-2.5">
          <div className="font-display text-2xl leading-none font-extrabold md:text-[28px]">
            JON.
          </div>
          <div className="mt-1.5 text-xs font-medium">
            frontend developer · PH
          </div>
        </div>
      </div>

      <nav
        aria-label="Sections"
        className={`${OVERLAY} right-1/2 bottom-4 flex translate-x-1/2 gap-1.5 pt-3.5 max-[349px]:gap-1 md:top-[22px] md:right-8 md:bottom-auto md:translate-x-0`}
      >
        <span
          aria-hidden="true"
          className="bamboo pointer-events-none absolute -inset-x-2.5 top-0 h-2.5"
        />
        {SECTION_IDS.map((id) => {
          const { label, paint } = SECTIONS[id];
          const isActive = active === id;

          return (
            <button
              key={id}
              type="button"
              aria-current={isActive ? "true" : undefined}
              onClick={() => onNavigate(id)}
              style={{ "--c": paint } as CSSProperties}
              className={`plank hanging px-[11px] py-[9px] font-display text-[10px] font-bold tracking-[.06em] max-[379px]:px-2 max-[349px]:px-1 md:px-3 md:text-xs md:tracking-[.08em] ${
                isActive ? "underline decoration-2 underline-offset-3" : ""
              }`}
            >
              {label}
            </button>
          );
        })}
      </nav>

      <div
        className={`${OVERLAY} abaca bottom-[78px] left-1/2 -translate-x-1/2 rounded-[3px] border border-wood px-3.5 py-2 text-xs whitespace-nowrap text-soft transition-opacity duration-400 md:bottom-[22px] ${
          hintHidden ? "opacity-0" : ""
        }`}
      >
        drag to look around · tap a kubo
      </div>
    </>
  );
}
