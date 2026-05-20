import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUI } from "@/stores/ui";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

export function SettingsDialog() {
  const {
    settingsOpen,
    setSettings,
    theme,
    setTheme,
    fontSize,
    setFontSize,
    minimap,
    setMinimap,
    resultDensity,
    setResultDensity,
  } = useUI();

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettings}>
      <DialogContent className="glass max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-xs">
          <Row label="Theme" desc="Appearance">
            <div className="flex gap-1 rounded-md bg-white/5 p-0.5">
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`rounded px-2 py-0.5 capitalize ${
                    theme === t
                      ? "bg-white/10 text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Editor font size" desc={`${fontSize}px`}>
            <div className="w-40">
              <Slider
                value={[fontSize]}
                min={11}
                max={20}
                step={1}
                onValueChange={([v]) => setFontSize(v)}
              />
            </div>
          </Row>
          <Row label="Editor minimap" desc="Show overview map">
            <Switch checked={minimap} onCheckedChange={setMinimap} />
          </Row>
          <Row label="Result density" desc="Row spacing">
            <div className="flex gap-1 rounded-md bg-white/5 p-0.5">
              {(["compact", "comfortable"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setResultDensity(d)}
                  className={`rounded px-2 py-0.5 capitalize ${
                    resultDensity === d
                      ? "bg-white/10 text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </Row>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
      <div>
        <div className="font-medium text-foreground">{label}</div>
        {desc && <div className="text-[11px] text-muted-foreground">{desc}</div>}
      </div>
      {children}
    </div>
  );
}
