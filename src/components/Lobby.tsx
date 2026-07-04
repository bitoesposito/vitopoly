import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/lib/store";
import { connect, createRoom } from "@/lib/ws";

const inputCls =
  "h-9 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-400";

export function Lobby() {
  const savedName = useGame((s) => s.name);
  const error = useGame((s) => s.error);
  const [name, setName] = useState(savedName);
  const [code, setCode] = useState(new URLSearchParams(location.search).get("room") ?? "");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    connect(await createRoom(), name.trim());
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-[#0d0d22] p-4 text-slate-100">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-center text-3xl font-black tracking-tight text-indigo-300">vitopoly</h1>
        <input className={inputCls} placeholder="Il tuo nome" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
        <Button className="w-full rounded-md" disabled={busy || !name.trim()} onClick={create}>
          Crea stanza
        </Button>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="h-px flex-1 bg-white/10" /> oppure <div className="h-px flex-1 bg-white/10" />
        </div>
        <div className="flex gap-2">
          <input className={inputCls} placeholder="codice stanza" value={code} onChange={(e) => setCode(e.target.value)} />
          <Button variant="secondary" className="rounded-md" disabled={!name.trim() || !code.trim()} onClick={() => connect(code.trim().toLowerCase(), name.trim())}>
            Entra
          </Button>
        </div>
        {error && <p className="text-sm text-rose-400">{error}</p>}
      </div>
    </div>
  );
}
