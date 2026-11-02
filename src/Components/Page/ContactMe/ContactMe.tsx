import { useState, type ReactNode } from "react";
import Text from "../../Text/Text";

const EMAIL = "bernabejonalfred@gmail.com";

const LINKS = [
  {
    label: "GITHUB",
    href: "https://github.com/JonBernabe",
    text: "github.com/JonBernabe ↗",
  },
  {
    label: "LINKEDIN",
    href: "https://www.linkedin.com/in/jon-bernabe-9676b6367/",
    text: "linkedin.com/in/jon-bernabe-9676b6367 ↗",
  },
];

type RowProps = {
  label: string;
  children: ReactNode;
};

function Row({ label, children }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-3.5">
      <span className="font-display text-xs font-bold tracking-[.1em] text-dim">
        {label}
      </span>
      {children}
    </div>
  );
}

export default function ContactMe() {
  const [copyLabel, setCopyLabel] = useState("Copy email");

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopyLabel("Copied ✓");
    } catch {
      setCopyLabel("Select the address above");
    }
  }

  return (
    <>
      <Text as="h2" variant="heading">
        Let's <em className="text-accent not-italic">talk.</em>
      </Text>
      <Text variant="body">
        Looking for entry-level frontend or full-stack roles. Message me — I
        reply fast.
      </Text>
      <Row label="EMAIL">
        <span className="text-[15px]">{EMAIL}</span>
      </Row>
      {LINKS.map(({ label, href, text }) => (
        <Row key={label} label={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener"
            className="text-[15px] hover:text-accent"
          >
            {text}
          </a>
        </Row>
      ))}
      <Row label="RESUME">
        <a href="#contact" className="text-[15px] hover:text-accent">
          add a link ↗
        </a>
      </Row>
      <button
        type="button"
        onClick={copyEmail}
        className="plank mt-4.5 inline-flex items-center gap-2 px-4.5 py-3 font-display text-[14px] font-bold transition-[filter] hover:brightness-110"
      >
        {copyLabel}
      </button>
    </>
  );
}
