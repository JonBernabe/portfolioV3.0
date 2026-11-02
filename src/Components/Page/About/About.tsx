import Text from "../../Text/Text";

const FACTS = [
  { title: "React + TS", note: "DAILY DRIVER" },
  { title: "Full-stack", note: "NODE · FLASK · JAVA" },
  { title: "EN · TL · CEB", note: "I SHIP I18N" },
  { title: "Open to work", note: "ENTRY-LEVEL ROLES" },
];

export default function About() {
  return (
    <>
      <Text as="h2" variant="heading">
        Hi, I'm Jon.
        <br />
        <em className="text-accent not-italic">I build for the web.</em>
      </Text>
      <Text variant="body">
        I'm a Frontend developer who like creating interactive and engaging user
        experiences (like this barrio you're standing in).
      </Text>
      <Text variant="body">
        I have a strong foundation in web development, with experience in
        building responsive and accessible web applications using modern
        technologies like React, TypeScript, and Tailwind CSS.
      </Text>
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        {FACTS.map(({ title, note }) => (
          <div key={title} className="rounded-md border border-line bg-white/45 p-3">
            <b className="block font-display text-[18px]">{title}</b>
            <small className="text-[11px] tracking-[.04em] text-dim">
              {note}
            </small>
          </div>
        ))}
      </div>
    </>
  );
}
