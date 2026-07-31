import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { EngineConsole } from "./ui/EngineConsole";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <EngineConsole />
  </StrictMode>,
);
