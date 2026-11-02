import { useCallback, useEffect, useState, type ComponentType } from "react";
import NoWebGL from "./Components/3D/NoWebGL";
import StreetScene from "./Components/3D/StreetScene";
import Hud from "./Components/Container/Hud";
import Loader from "./Components/Container/Loader";
import Panel from "./Components/Container/Panel";
import About from "./Components/Page/About/About";
import ContactMe from "./Components/Page/ContactMe/ContactMe";
import Projects from "./Components/Page/Projects/Projects";
import Skills from "./Components/Page/Skills/Skills";
import WorkExp from "./Components/Page/WorkExp/WorkExp";
import type { SectionId } from "./Components/Page/sections";
import { navigateToSection, useHashSection } from "./hooks/useHashSection";

type Status = "loading" | "ready" | "unsupported";

const PAGES: Record<SectionId, ComponentType> = {
  about: About,
  projects: Projects,
  career: WorkExp,
  skills: Skills,
  contact: ContactMe,
};

// Lets the camera start moving before the panel slides in.
const PANEL_DELAY_MS = 380;
const HINT_DURATION_MS = 7000;

function closePanel() {
  navigateToSection(null);
}

function App() {
  const route = useHashSection();
  const [status, setStatus] = useState<Status>("loading");
  const [progress, setProgress] = useState(0);
  const [hintHidden, setHintHidden] = useState(false);
  const [panel, setPanel] = useState<{ id: SectionId; open: boolean }>({
    id: "about",
    open: false,
  });

  const loaded = status !== "loading";
  const section = loaded ? route : null;
  const Page = PAGES[panel.id];

  const handleReady = useCallback(() => setStatus("ready"), []);
  const handleUnsupported = useCallback(() => setStatus("unsupported"), []);
  const hideHint = useCallback(() => setHintHidden(true), []);

  useEffect(() => {
    const delay = section && status === "ready" ? PANEL_DELAY_MS : 0;
    const timer = setTimeout(() => {
      setPanel((current) =>
        section ? { id: section, open: true } : { ...current, open: false },
      );
    }, delay);
    return () => clearTimeout(timer);
  }, [section, status]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && section) closePanel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [section]);

  useEffect(() => {
    if (!loaded) return;

    const timer = setTimeout(hideHint, HINT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [loaded, hideHint]);

  return (
    <>
      <Loader progress={progress} done={loaded} />
      <StreetScene
        section={section}
        onSelect={navigateToSection}
        onInteract={hideHint}
        onProgress={setProgress}
        onReady={handleReady}
        onUnsupported={handleUnsupported}
      />
      {status === "unsupported" && <NoWebGL />}
      <Hud
        active={panel.open ? panel.id : null}
        hintHidden={hintHidden}
        onNavigate={navigateToSection}
      />
      <Panel section={panel.id} open={panel.open} onClose={closePanel}>
        <Page />
      </Panel>
    </>
  );
}

export default App;
