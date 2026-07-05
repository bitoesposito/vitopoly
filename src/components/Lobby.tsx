import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGame } from "@/lib/store";
import { connect, createRoom } from "@/lib/ws";

export function Lobby() {
  const savedName = useGame((s) => s.name);
  const [name, setName] = useState(savedName);
  const [busy, setBusy] = useState(false);
  const room = new URLSearchParams(location.search).get("room"); // join via friend's link

  const go = async () => {
    setBusy(true);
    connect(room ?? (await createRoom()), name.trim());
  };

  return (
    <div className="h-screen flex flex-col m-auto max-w-xs gap-2 p-4 items-center justify-center">
      <h1 className="text-xl font-bold uppercase">vitopoly</h1>
      <Input placeholder="Il tuo nome" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
      <Button className="w-full" disabled={busy || !name.trim()} onClick={go}>
        {room ? "Entra" : "Crea stanza"}
      </Button>
    </div>
  );
}
