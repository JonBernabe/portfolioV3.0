import Card from "../../Container/Card";
import Tags from "../../Container/Tags";
import Text from "../../Text/Text";

type Project = {
  title: string;
  description: string;
  tags: string[];
  siteUrl?: string;
  codeUrl?: string;
};

type Certification = {
  name: string;
  issuer: string;
  date: string;
  url: string;
};

const PROJECTS: Project[] = [
  {
    title: "Chloro AI Assistant",
    description:
      "A Jarvis-style voice assistant I built for myself in Python with the Claude API. It runs on my PC, where I can talk or type to it and it answers out loud. It can also look through my webcam, open apps and give me a briefing from Gmail and Google Sheets.",
    tags: ["Python", "Claude API", "TTS / STT", "OpenCV", "Google APIs"],
    codeUrl: "https://github.com/JonBernabe/chloro",
  },
  {
    title: "Binhi Learning Ground",
    description:
      "The website for an outdoor playschool in Malolos, Bulacan for kids ages 2 to 4. I planned the layout, built the UI and made it responsive, and used EmailJS for the inquiry and enrollment forms.",
    tags: ["React", "Tailwind CSS", "EmailJS", "Responsive design"],
    siteUrl: "https://www.binhilearningground.com",
  },
  {
    title: "SafeHub",
    description:
      "A mental health web system where students at La Consolacion University of the Philippines can connect with counselors online. I was part of the team and worked on the UI pages, the user flows and planning new features.",
    tags: ["UI design", "Frontend", "Team project"],
  },
  {
    title: "Task Manager App",
    description:
      "A full-stack task manager with user accounts, a dashboard and task CRUD. Each account can also set its own accent color and profile picture.",
    tags: ["React", "Vite", "FastAPI", "SQLAlchemy", "SQLite"],
    codeUrl: "https://github.com/JonBernabe/task-management-app",
  },
  {
    title: "Responder AI",
    description:
      "An AI chatbot that gives quick answers on all kinds of topics. I built the landing page and chat UI with React and TypeScript, and the replies come from an n8n workflow.",
    tags: ["React", "TypeScript", "Tailwind CSS", "n8n"],
    siteUrl: "https://chat-bot-p42q.vercel.app",
    codeUrl: "https://github.com/JonBernabe/ChatBot",
  },
  {
    title: "This portfolio",
    description:
      "The barrio you're standing in. The bahay kubo, people, jeepneys and tricycles are all built in code with three.js, so there are no 3D models. It follows your clock and the Philippine calendar, from Tag-ulan rain to Christmas parols.",
    tags: ["three.js", "WebGL", "Post-processing"],
  },
  {
    title: "My First Portfolio",
    description:
      "My first portfolio website, made to show my projects, skills and experience. Built with React and Tailwind CSS.",
    tags: ["React", "Tailwind CSS", "Supabase", "EmailJS"],
    siteUrl: "https://takehome-three.vercel.app",
    codeUrl: "https://github.com/JonBernabe/TakeHome",
  },
];

const CERTIFICATIONS: Certification[] = [
  {
    name: "Python",
    issuer: "freeCodeCamp",
    date: "Apr 2026",
    url: "https://www.freecodecamp.org/certification/fcc-3712b84d-008d-4e48-ba24-d63ece3abd96/python-v9",
  },
  {
    name: "Python Essentials 2",
    issuer: "Cisco Networking Academy",
    date: "Feb 2026",
    url: "/certificates/python-essentials-2.png",
  },
  {
    name: "Responsive Web Design",
    issuer: "freeCodeCamp",
    date: "Feb 2026",
    url: "https://www.freecodecamp.org/certification/fcc-3712b84d-008d-4e48-ba24-d63ece3abd96/responsive-web-design-v9",
  },
  {
    name: "Microsoft Access 2019 Expert",
    issuer: "Microsoft",
    date: "Dec 2025",
    url: "/certificates/access-2019-expert.png",
  },
  {
    name: "IT Specialist: Device Configuration and Management",
    issuer: "Certiport",
    date: "Dec 2025",
    url: "/certificates/device-configuration-and-management.png",
  },
  {
    name: "Introduction to Cybersecurity",
    issuer: "Cisco Networking Academy",
    date: "Dec 2025",
    url: "/certificates/introduction-to-cybersecurity.png",
  },
  {
    name: "Microsoft Excel 2019 Associate",
    issuer: "Microsoft",
    date: "May 2023",
    url: "/certificates/excel-2019-associate.png",
  },
];

export default function Projects() {
  return (
    <>
      <Text as="h2" variant="heading">
        Things I've <em className="text-accent not-italic">built.</em>
      </Text>
      {PROJECTS.map(({ title, description, tags, siteUrl, codeUrl }) => (
        <Card key={title}>
          <Text as="h4" variant="cardTitle">
            {title}
          </Text>
          <Text variant="cardBody">{description}</Text>
          <Tags items={tags} />
          {(siteUrl || codeUrl) && (
            <div className="mt-3 flex gap-3.5 text-[13px] font-medium">
              {siteUrl && (
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener"
                  className="text-accent hover:underline"
                >
                  Visit site →
                </a>
              )}
              {codeUrl && (
                <a
                  href={codeUrl}
                  target="_blank"
                  rel="noopener"
                  className="text-accent hover:underline"
                >
                  Code →
                </a>
              )}
            </div>
          )}
        </Card>
      ))}
      <Text as="h3" variant="label">
        CERTIFICATIONS
      </Text>
      <ul>
        {CERTIFICATIONS.map(({ name, issuer, date, url }) => (
          <li
            key={name}
            className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0"
          >
            <div>
              <Text className="text-sm font-semibold">{name}</Text>
              <Text className="mt-0.5 text-xs text-dim">
                {issuer} · {date}
              </Text>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener"
              aria-label={`View ${name} certificate`}
              className="shrink-0 text-[13px] font-medium text-accent hover:underline"
            >
              View →
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
