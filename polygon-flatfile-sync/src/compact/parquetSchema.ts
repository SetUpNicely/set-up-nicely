// Matches your daily writer's schema exactly.
import { ParquetSchema } from "parquetjs-lite";

export type Session = "RTH" | "EXTENDED";
export type TF = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d";

export interface CandleRow {
  t: number; o: number; h: number; l: number; c: number; v: number;
  vw?: number;
  symbol: string; tf: TF; session: Session;
}

export function parquetSchemaForTF(_tf: TF) {
  return new ParquetSchema({
    t:       { type: "INT64"  },
    o:       { type: "DOUBLE" },
    h:       { type: "DOUBLE" },
    l:       { type: "DOUBLE" },
    c:       { type: "DOUBLE" },
    v:       { type: "INT64"  },
    vw:      { type: "DOUBLE", optional: true },
    symbol:  { type: "UTF8"   },
    tf:      { type: "UTF8"   },
    session: { type: "UTF8"   },
  } as const);
}
