import { useState } from "react";
import { EngineConsole } from "./EngineConsole";
import { SeasonConsole } from "./SeasonConsole";

const tabStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "#a3e635" : "rgba(255,255,255,.08)",
  color: active ? "#0b1220" : "#e8eef7",
  border: "1px solid rgba(255,255,255,.15)",
  fontWeight: 800,
  padding: "7px 16px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
});

export function App() {
  const [tab, setTab] = useState<"season" | "engine">("season");
  return (
    <div style={{ background: "#0b1220", minHeight: "100vh" }}>
      <div style={{ display: "flex", gap: 8, padding: "14px 28px 0" }}>
        <button style={tabStyle(tab === "season")} onClick={() => setTab("season")}>Sæson-konsol</button>
        <button style={tabStyle(tab === "engine")} onClick={() => setTab("engine")}>Engine-konsol</button>
      </div>
      {tab === "season" ? <SeasonConsole /> : <EngineConsole />}
    </div>
  );
}
