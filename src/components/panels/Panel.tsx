import { Card, CardContent } from "@/components/ui/card";

// Il riquadro della colonna destra. Un pannello = una responsabilità del giocatore
// (chi c'è, cosa si sta battendo, cosa si scambia, cosa possiedi).
export function Panel({ ring, children }: { ring?: string; children: React.ReactNode }) {
  return (
    <Card size="sm" className={ring}>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}
