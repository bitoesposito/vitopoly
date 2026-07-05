import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGame } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { connect, createRoom } from "@/lib/ws";

export function Lobby() {
  const savedName = useGame((s) => s.name);
  const t = useT();
  const [name, setName] = useState(savedName);
  const [busy, setBusy] = useState(false);
  const room = new URLSearchParams(location.search).get("room"); // join via friend's link

  const go = async () => {
    setBusy(true);
    connect(room ?? (await createRoom()), name.trim());
  };

  return (
    <div className="m-auto flex h-dvh max-w-xs flex-col items-center justify-center gap-2 p-4">
      <h1 className="text-xl font-bold uppercase">vitopoly</h1>
      <p className="text-center text-sm text-muted-foreground">
        {room ? <>{t("lobby.joining")} <span className="font-semibold text-foreground">{room}</span></> : t("lobby.creating")}
      </p>
      <Input placeholder={t("lobby.name")} value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
      <Button className="w-full" disabled={busy || !name.trim()} onClick={go}>
        {room ? t("lobby.enter") : t("lobby.create")}
      </Button>
    </div>
  );
}
