import { notFound } from "next/navigation";
import { loadGardenById } from "@/actions/gardenActions";
import { GardenViewActions } from "./GardenViewActions";

// ─── Types (runtime shapes differ from TS interfaces) ─────────────────────────

type Position = { x: number; y: number };

type Shape = {
  id: string;
  type: "circle" | "rectangle" | "line" | "freehand";
  startPos: Position;
  endPos: Position;
  strokeWidth?: number;
  name?: string;
  points?: Position[];
};

type BedPath = {
  id: string;
  vertices?: Position[];
  points?: Position[];
  path?: Position[];
  isClosed?: boolean;
  name?: string;
  attributes?: {
    soilType?: string;
    sunExposure?: string;
    soilDepth?: string;
    drainage?: string;
    moisture?: string;
    soilPh?: string;
    notes?: string;
  };
};

type PlantEntry = {
  id: number;
  common_name: string | null;
  scientific_name: string | string[];
  image_url?: string;
  plantedAt?: string;
  daysToMaturity?: number;
};

// ─── Color helpers ────────────────────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = s.charCodeAt(i) + ((h << 5) - h);
    h |= 0;
  }
  return Math.abs(h);
}

function speciesColor(key: string): string {
  const h = hashStr(key);
  return `hsl(${h % 360}, ${62 + (h % 10)}%, ${48 + ((h >> 3) % 10)}%)`;
}

function normalizeKey(p: PlantEntry): string {
  const sci = Array.isArray(p.scientific_name) ? p.scientific_name[0] : p.scientific_name;
  return (sci || p.common_name || String(p.id)).toLowerCase().trim();
}

function fillForId(id: string, bedPlants: Record<string, PlantEntry[]>): string {
  const plants = bedPlants[id] ?? [];
  if (plants.length === 0) return "rgba(180,180,170,0.35)";
  const hsl = speciesColor(normalizeKey(plants[0]));
  // add alpha by appending to hsl string
  return hsl.replace(")", ", 0.55)").replace("hsl(", "hsla(");
}

function strokeForId(id: string, bedPlants: Record<string, PlantEntry[]>): string {
  const plants = bedPlants[id] ?? [];
  return plants.length === 0 ? "#9ca3af" : speciesColor(normalizeKey(plants[0]));
}

function colorForId(id: string, bedPlants: Record<string, PlantEntry[]>): string {
  const plants = bedPlants[id] ?? [];
  return plants.length === 0 ? "#9ca3af" : speciesColor(normalizeKey(plants[0]));
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function getVertices(bed: BedPath): Position[] | null {
  const v = bed.vertices ?? bed.points ?? bed.path;
  return Array.isArray(v) && v.length >= 2 ? (v as Position[]) : null;
}

function ptStr(pts: Position[]) {
  return pts.map((p) => `${p.x},${p.y}`).join(" ");
}

function pathD(pts: Position[]) {
  return `M ${pts.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`;
}

type Bbox = { minX: number; minY: number; maxX: number; maxY: number };

function computeBbox(shapes: Record<string, Shape>, beds: Record<string, BedPath>): Bbox | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const exp = (x: number, y: number) => {
    if (x < minX) minX = x; if (y < minY) minY = y;
    if (x > maxX) maxX = x; if (y > maxY) maxY = y;
  };

  for (const s of Object.values(shapes)) {
    if (s.type === "line") continue;
    exp(s.startPos.x, s.startPos.y);
    exp(s.endPos.x, s.endPos.y);
    if (s.points) for (const p of s.points) exp(p.x, p.y);
  }
  for (const bed of Object.values(beds)) {
    const v = getVertices(bed);
    if (v) for (const p of v) exp(p.x, p.y);
  }

  return isFinite(minX) ? { minX, minY, maxX, maxY } : null;
}

// ─── SVG garden map ───────────────────────────────────────────────────────────

function GardenMap({
  shapes,
  beds,
  bedPlants,
}: {
  shapes: Record<string, Shape>;
  beds: Record<string, BedPath>;
  bedPlants: Record<string, PlantEntry[]>;
}) {
  const PAD = 40;
  const bbox = computeBbox(shapes, beds);

  if (!bbox) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        No layout drawn yet
      </div>
    );
  }

  const vbW = bbox.maxX - bbox.minX + PAD * 2;
  const vbH = bbox.maxY - bbox.minY + PAD * 2;
  const ox = bbox.minX - PAD;
  const oy = bbox.minY - PAD;

  const shapeList = Object.values(shapes).filter((s) => s.type !== "line");
  const bedList = Object.values(beds)
    .filter((b) => b.isClosed !== false)
    .map((b) => ({ b, v: getVertices(b) }))
    .filter((x): x is { b: BedPath; v: Position[] } => x.v !== null);

  return (
    <svg
      viewBox={`${ox} ${oy} ${vbW} ${vbH}`}
      width="100%"
      style={{ display: "block", maxHeight: "52vh" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {bedList.map(({ b, v }) => (
        <path
          key={b.id}
          d={pathD(v)}
          fill={fillForId(b.id, bedPlants)}
          stroke={strokeForId(b.id, bedPlants)}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}

      {shapeList.map((s) => {
        const fill = fillForId(s.id, bedPlants);
        const stroke = strokeForId(s.id, bedPlants);
        const sw = s.strokeWidth ?? 2;

        if (s.type === "circle") {
          const r = Math.max(
            Math.abs(s.endPos.x - s.startPos.x),
            Math.abs(s.endPos.y - s.startPos.y)
          );
          return (
            <ellipse
              key={s.id}
              cx={s.startPos.x}
              cy={s.startPos.y}
              rx={r}
              ry={r}
              fill={fill}
              stroke={stroke}
              strokeWidth={sw}
            />
          );
        }

        if (s.type === "rectangle") {
          return (
            <rect
              key={s.id}
              x={Math.min(s.startPos.x, s.endPos.x)}
              y={Math.min(s.startPos.y, s.endPos.y)}
              width={Math.abs(s.endPos.x - s.startPos.x)}
              height={Math.abs(s.endPos.y - s.startPos.y)}
              fill={fill}
              stroke={stroke}
              strokeWidth={sw}
            />
          );
        }

        if (s.type === "freehand" && s.points && s.points.length > 1) {
          return (
            <polygon
              key={s.id}
              points={ptStr(s.points)}
              fill={fill}
              stroke={stroke}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
          );
        }

        return null;
      })}
    </svg>
  );
}

// ─── Bed card ─────────────────────────────────────────────────────────────────

function BedCard({
  label,
  plants,
  attributes,
  color,
}: {
  label: string;
  plants: PlantEntry[];
  attributes?: BedPath["attributes"];
  color: string;
}) {
  const attrs: [string, string][] = (
    [
      ["Soil", attributes?.soilType],
      ["Sun", attributes?.sunExposure],
      ["Depth", attributes?.soilDepth],
      ["pH", attributes?.soilPh],
      ["Drainage", attributes?.drainage],
      ["Moisture", attributes?.moisture],
    ] as [string, string | undefined][]
  ).filter(([, v]) => v) as [string, string][];

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm print:break-inside-avoid">
      <div className="mb-3 flex items-center gap-2.5">
        <div
          className="h-3.5 w-3.5 shrink-0 rounded-full"
          style={{ background: color, boxShadow: `0 0 0 2px white, 0 0 0 3px ${color}40` }}
        />
        <span className="font-bold text-slate-800 leading-tight">{label}</span>
        {plants.length > 0 && (
          <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 shrink-0">
            {plants.length} plant{plants.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {attrs.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {attrs.map(([k, v]) => (
            <span key={k} className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {k}: <span className="font-semibold text-slate-700">{v}</span>
            </span>
          ))}
        </div>
      )}

      {plants.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No plants added yet</p>
      ) : (
        <ul className="space-y-2">
          {plants.map((p, i) => {
            const name = (() => {
              const sci = Array.isArray(p.scientific_name) ? p.scientific_name[0] : p.scientific_name;
              const c = p.common_name?.trim();
              const s = sci?.trim();
              if (c && s && c.toLowerCase() !== s.toLowerCase()) return `${c} (${s})`;
              return c || s || `Plant ${p.id}`;
            })();

            return (
              <li key={`${p.id}-${i}`} className="flex items-start gap-2.5">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt=""
                    className="mt-0.5 h-9 w-9 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-base">
                    🌱
                  </div>
                )}
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-semibold leading-tight text-slate-800">{name}</p>
                  {(p.plantedAt || p.daysToMaturity) && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {p.plantedAt &&
                        `Planted ${new Date(p.plantedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}`}
                      {p.plantedAt && p.daysToMaturity && " · "}
                      {p.daysToMaturity && `${p.daysToMaturity}d to harvest`}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {attributes?.notes && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500 leading-relaxed">
          {attributes.notes}
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function GardenViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const garden = await loadGardenById(id);
  if (!garden) notFound();

  const shapes = (garden.shapes ?? {}) as Record<string, Shape>;
  const bedsRaw = (garden.beds ?? {}) as Record<string, BedPath>;
  const bedPlants = (garden.bedPlants ?? {}) as Record<string, PlantEntry[]>;

  type Entry = { id: string; label: string; plants: PlantEntry[]; attributes?: BedPath["attributes"]; color: string };

  const seen = new Set<string>();
  const entries: Entry[] = [];
  let idx = 1;

  const mkEntry = (id: string, name?: string, attrs?: BedPath["attributes"]): Entry => ({
    id,
    label: name?.trim() || `Garden Bed ${idx++}`,
    plants: bedPlants[id] ?? [],
    attributes: attrs,
    color: colorForId(id, bedPlants),
  });

  // Polygon beds (sorted by numeric id = creation order)
  for (const bed of Object.values(bedsRaw).sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0))) {
    if (seen.has(bed.id)) continue;
    seen.add(bed.id);
    entries.push(mkEntry(bed.id, bed.name, bed.attributes));
  }

  // Shape-based beds (circle, rectangle, freehand)
  for (const s of Object.values(shapes)
    .filter((s) => s.type === "circle" || s.type === "rectangle" || s.type === "freehand")
    .sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0))) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    entries.push(mkEntry(s.id, s.name));
  }

  const totalPlants = Object.values(bedPlants).reduce((n, arr) => n + arr.length, 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-20 print:pt-4 print:bg-white">
      <div className="mx-auto max-w-lg px-4">
        <GardenViewActions
          gardenName={garden.name}
          bedCount={entries.length}
          plantCount={totalPlants}
        />

        {/* Map */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm print:border-slate-300 print:shadow-none">
          <GardenMap shapes={shapes} beds={bedsRaw} bedPlants={bedPlants} />
        </div>

        {/* Bed list */}
        {entries.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
            No beds in this garden yet.
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((e) => (
              <BedCard
                key={e.id}
                label={e.label}
                plants={e.plants}
                attributes={e.attributes}
                color={e.color}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
