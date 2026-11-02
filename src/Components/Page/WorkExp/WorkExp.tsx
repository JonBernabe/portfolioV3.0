import Card from "../../Container/Card";
import Text from "../../Text/Text";

type Job = {
  company: string;
  role: string;
  highlights: string[];
  siteUrl?: string;
};

const JOBS: Job[] = [
  {
    company: "Freelance",
    role: "Frontend Developer",
    highlights: [
      "Developed the website for Binhi Learning Ground, an outdoor playschool for kids ages 2–4.",
    ],
    siteUrl: "https://www.binhilearningground.com",
  },
  {
    company: "Enov8tive",
    role: "Frontend Developer",
    highlights: [
      "Helped integrate multi-language support into the system.",
      "Enhanced the system's UI.",
      "Contributed to Enov8tive2.0, with adjustments across the whole system.",
    ],
  },
];

export default function WorkExp() {
  return (
    <>
      <Text as="h2" variant="heading">
        Work <em className="text-accent not-italic">experience.</em>
      </Text>
      <Text variant="body">
        I'm a developer with a passion for learning new things and adapting to
        challenges.
      </Text>
      {JOBS.map(({ company, role, highlights, siteUrl }) => (
        <Card key={company}>
          <Text as="h4" variant="cardTitle">
            {company}
          </Text>
          <Text className="mb-2.5 text-xs text-dim">
            {role}
          </Text>
          <ul className="list-disc pl-4 marker:text-accent">
            {highlights.map((highlight) => (
              <Text
                as="li"
                key={highlight}
                className="mb-1 text-sm/[1.6] text-soft last:mb-0"
              >
                {highlight}
              </Text>
            ))}
          </ul>
          {siteUrl && (
            <div className="mt-3 flex gap-3.5 text-[13px] font-medium">
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener"
                className="text-accent hover:underline"
              >
                Visit site →
              </a>
            </div>
          )}
        </Card>
      ))}
    </>
  );
}
