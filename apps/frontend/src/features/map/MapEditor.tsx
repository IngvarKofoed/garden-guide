import { useEffect, useRef, useState } from 'react';
import type { GardenMap, Zone } from '@garden-guide/shared';
import { Button } from '../../components/ui';
import { useZones } from '../zones/hooks';
import { ZONE_PALETTE } from '../zones/palette';
import { Swatch } from '../zones/Swatch';
import { ZoneForm } from '../zones/ZoneForm';
import { GooFilter } from './GooFilter';
import { decodeCells, encodeCells } from './cells';
import { useSaveMap } from './hooks';

const BASE_CELL_PX = 6;
const HISTORY_LIMIT = 50;
const AUTOSAVE_DELAY_MS = 800;
const MIN_BRUSH = 1;
const MAX_BRUSH = 10;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3;

type Tool = 'paint' | 'erase' | 'pan';
type BrushShape = 'circle' | 'square';

interface CellState {
  cells: Uint16Array;
  zoneIndex: string[];
}

export function MapEditor({
  map,
  onSwitchToList,
}: {
  map: GardenMap;
  onSwitchToList: () => void;
}) {
  const zones = useZones();
  const save = useSaveMap();

  const width = map.width;
  const height = map.height;

  const [state, setState] = useState<CellState>(() => ({
    cells: decodeCells(map.cells, width * height),
    zoneIndex: map.zoneIndex,
  }));

  const [tool, setTool] = useState<Tool>('paint');
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState(2);
  const [brushShape, setBrushShape] = useState<BrushShape>('circle');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [showCreateZone, setShowCreateZone] = useState(false);
  // Mirror history lengths into state so undo/redo buttons re-render.
  const [, setHistoryVersion] = useState(0);
  const bumpHistory = () => setHistoryVersion((v) => v + 1);

  // Default to first zone once zones load.
  useEffect(() => {
    if (activeZoneId === null && zones.data && zones.data.length > 0) {
      setActiveZoneId(zones.data[0]!.id);
    }
  }, [zones.data, activeZoneId]);

  const historyRef = useRef<CellState[]>([]);
  const redoRef = useRef<CellState[]>([]);
  const dirtyRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Auto-save: debounced PUT after the last change.
  useEffect(() => {
    if (!dirtyRef.current) return;
    const handle = setTimeout(() => {
      const cur = stateRef.current;
      save.mutate({
        width,
        height,
        cells: encodeCells(cur.cells),
        zoneIndex: cur.zoneIndex,
      });
      dirtyRef.current = false;
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(handle);
  }, [state, width, height, save]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const strokingRef = useRef<{ lastCell: { cx: number; cy: number } | null } | null>(null);
  const panningRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  // Re-render the canvas when cell data or zones (palette) change.
  useEffect(() => {
    renderCanvas(canvasRef.current, state.cells, state.zoneIndex, width, height, zones.data ?? []);
  }, [state, width, height, zones.data]);

  // Keyboard shortcuts.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (meta && (e.key === 'Z' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (e.key === '[') {
        setBrushSize((b) => Math.max(MIN_BRUSH, b - 1));
      } else if (e.key === ']') {
        setBrushSize((b) => Math.min(MAX_BRUSH, b + 1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clientToCell(e: { clientX: number; clientY: number }): { cx: number; cy: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * canvas.width) / rect.width;
    const y = ((e.clientY - rect.top) * canvas.height) / rect.height;
    const cx = Math.floor(x / BASE_CELL_PX);
    const cy = Math.floor(y / BASE_CELL_PX);
    if (cx < 0 || cx >= width || cy < 0 || cy >= height) return null;
    return { cx, cy };
  }

  function snapshot(s: CellState): CellState {
    return { cells: new Uint16Array(s.cells), zoneIndex: [...s.zoneIndex] };
  }

  function pushHistory() {
    historyRef.current.push(snapshot(stateRef.current));
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift();
    redoRef.current = [];
    bumpHistory();
  }

  function undo() {
    if (historyRef.current.length === 0) return;
    redoRef.current.push(snapshot(stateRef.current));
    setState(historyRef.current.pop()!);
    dirtyRef.current = true;
    bumpHistory();
  }

  function redo() {
    if (redoRef.current.length === 0) return;
    historyRef.current.push(snapshot(stateRef.current));
    setState(redoRef.current.pop()!);
    dirtyRef.current = true;
    bumpHistory();
  }

  function paintBrushAt(
    cells: Uint16Array,
    cx: number,
    cy: number,
    value: number,
    radius: number,
    shape: BrushShape,
  ) {
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (shape === 'circle' && dx * dx + dy * dy > r2) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        cells[y * width + x] = value;
      }
    }
  }

  function paintLine(
    cells: Uint16Array,
    from: { cx: number; cy: number },
    to: { cx: number; cy: number },
    value: number,
    radius: number,
    shape: BrushShape,
  ) {
    const dx = to.cx - from.cx;
    const dy = to.cy - from.cy;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const cx = Math.round(from.cx + dx * t);
      const cy = Math.round(from.cy + dy * t);
      paintBrushAt(cells, cx, cy, value, radius, shape);
    }
  }

  function applyStroke(prev: CellState, cell: { cx: number; cy: number }, last: { cx: number; cy: number } | null): CellState {
    let value = 0;
    let zoneIndex = prev.zoneIndex;
    if (tool === 'paint' && activeZoneId) {
      const idx = zoneIndex.indexOf(activeZoneId);
      if (idx >= 0) {
        value = idx + 1;
      } else {
        zoneIndex = [...zoneIndex, activeZoneId];
        value = zoneIndex.length;
      }
    }
    const cells = new Uint16Array(prev.cells);
    if (last) paintLine(cells, last, cell, value, brushSize, brushShape);
    else paintBrushAt(cells, cell.cx, cell.cy, value, brushSize, brushShape);
    return { cells, zoneIndex };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (tool === 'pan') {
      panningRef.current = { startX: e.clientX, startY: e.clientY, baseX: pan.x, baseY: pan.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    if (tool === 'paint' && !activeZoneId) return;
    const cell = clientToCell(e);
    if (!cell) return;
    pushHistory();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    strokingRef.current = { lastCell: cell };
    setState((prev) => applyStroke(prev, cell, null));
    dirtyRef.current = true;
  }

  function onPointerMove(e: React.PointerEvent) {
    setCursorPos({ x: e.clientX, y: e.clientY });
    if (panningRef.current) {
      const dx = e.clientX - panningRef.current.startX;
      const dy = e.clientY - panningRef.current.startY;
      setPan({ x: panningRef.current.baseX + dx, y: panningRef.current.baseY + dy });
      return;
    }
    if (!strokingRef.current) return;
    const cell = clientToCell(e);
    if (!cell) return;
    const last = strokingRef.current.lastCell;
    setState((prev) => applyStroke(prev, cell, last));
    strokingRef.current.lastCell = cell;
    dirtyRef.current = true;
  }

  function onPointerUp(e: React.PointerEvent) {
    panningRef.current = null;
    strokingRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore — pointer might not be captured
    }
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const factor = 1 - e.deltaY / 500;
    setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor)));
  }

  function onPointerLeave() {
    setCursorPos(null);
    strokingRef.current = null;
  }

  // Brush preview size in screen pixels.
  const cellPxOnScreen = canvasRef.current
    ? canvasRef.current.getBoundingClientRect().width / width
    : BASE_CELL_PX * zoom;
  const brushPx = brushSize * cellPxOnScreen * 2;

  const containerRect = containerRef.current?.getBoundingClientRect();
  const activeZone = activeZoneId ? (zones.data ?? []).find((z) => z.id === activeZoneId) ?? null : null;
  const activeColor = activeZone ? ZONE_PALETTE[activeZone.colorToken].fill : '#0F0F0F';

  const canUndo = historyRef.current.length > 0;
  const canRedo = redoRef.current.length > 0;

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[480px] gap-4">
      <Toolbar
        tool={tool}
        onTool={setTool}
        brushSize={brushSize}
        onBrushSize={setBrushSize}
        brushShape={brushShape}
        onBrushShape={setBrushShape}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        saving={save.isPending}
        dirty={dirtyRef.current}
        onSwitchToList={onSwitchToList}
      />
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden rounded-3xl border border-hairline bg-ivory shadow-card"
        onWheel={onWheel}
      >
        <GooFilter />
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center',
          }}
        >
          <div style={{ filter: 'url(#goo)' }}>
            <canvas
              ref={canvasRef}
              width={width * BASE_CELL_PX}
              height={height * BASE_CELL_PX}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerLeave}
              style={{
                display: 'block',
                touchAction: 'none',
                cursor: tool === 'pan' ? 'grab' : 'none',
              }}
            />
          </div>
        </div>
        {cursorPos && tool !== 'pan' && containerRect && (
          <div
            className={`pointer-events-none absolute border-2 ${
              brushShape === 'circle' ? 'rounded-full' : 'rounded-md'
            }`}
            style={{
              left: cursorPos.x - containerRect.left - brushPx / 2,
              top: cursorPos.y - containerRect.top - brushPx / 2,
              width: brushPx,
              height: brushPx,
              background: tool === 'erase' ? 'rgba(15,15,15,0.04)' : `${activeColor}55`,
              borderColor: tool === 'erase' ? '#0F0F0F' : activeColor,
            }}
          />
        )}
        {(zones.data ?? []).length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="rounded-full bg-cream px-5 py-2 text-sm text-muted shadow-card">
              Create a zone to start painting.
            </p>
          </div>
        )}
      </div>
      <ZonesRail
        zones={zones.data ?? []}
        activeZoneId={activeZoneId}
        onSelect={(id) => {
          setActiveZoneId(id);
          setTool('paint');
        }}
        onNewZone={() => setShowCreateZone(true)}
      />
      {showCreateZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
          <div className="w-full max-w-lg">
            <ZoneForm
              onClose={() => setShowCreateZone(false)}
              onSaved={(zone) => {
                setShowCreateZone(false);
                setActiveZoneId(zone.id);
                setTool('paint');
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function renderCanvas(
  canvas: HTMLCanvasElement | null,
  cells: Uint16Array,
  zoneIndex: string[],
  width: number,
  height: number,
  zones: Zone[],
) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const colors = zoneIndex.map((id) => {
    const z = zones.find((zone) => zone.id === id);
    return z ? ZONE_PALETTE[z.colorToken].fill : null;
  });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = cells[y * width + x] ?? 0;
      if (v === 0) continue;
      const color = colors[v - 1];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * BASE_CELL_PX, y * BASE_CELL_PX, BASE_CELL_PX, BASE_CELL_PX);
    }
  }
}

interface ToolbarProps {
  tool: Tool;
  onTool: (t: Tool) => void;
  brushSize: number;
  onBrushSize: (n: number) => void;
  brushShape: BrushShape;
  onBrushShape: (s: BrushShape) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
  dirty: boolean;
  onSwitchToList: () => void;
}

function Toolbar({
  tool,
  onTool,
  brushSize,
  onBrushSize,
  brushShape,
  onBrushShape,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  saving,
  dirty,
  onSwitchToList,
}: ToolbarProps) {
  return (
    <div className="flex w-44 flex-col gap-3 rounded-3xl bg-cream p-4 shadow-card">
      <div className="flex flex-col gap-1">
        <ToolButton label="Paint" active={tool === 'paint'} onClick={() => onTool('paint')} />
        <ToolButton label="Erase" active={tool === 'erase'} onClick={() => onTool('erase')} />
        <ToolButton label="Pan" active={tool === 'pan'} onClick={() => onTool('pan')} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wide text-muted">Brush</span>
        <ShapeToggle value={brushShape} onChange={onBrushShape} />
        <input
          id="brush-size"
          type="range"
          min={MIN_BRUSH}
          max={MAX_BRUSH}
          value={brushSize}
          onChange={(e) => onBrushSize(Number(e.target.value))}
          className="accent-ink"
          aria-label="Brush size"
        />
        <span className="text-xs text-muted">size {brushSize}</span>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={onUndo} disabled={!canUndo}>
          Undo
        </Button>
        <Button variant="secondary" size="sm" onClick={onRedo} disabled={!canRedo}>
          Redo
        </Button>
      </div>

      <p className="text-xs text-muted">
        {saving ? 'Saving…' : dirty ? 'Unsaved' : 'Saved'}
      </p>

      <div className="mt-auto">
        <Button variant="ghost" size="sm" onClick={onSwitchToList}>
          View as list
        </Button>
      </div>
    </div>
  );
}

function ToolButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-left text-sm transition ${
        active ? 'bg-ink text-cream' : 'text-ink hover:bg-ivory'
      }`}
    >
      {label}
    </button>
  );
}

function ShapeToggle({
  value,
  onChange,
}: {
  value: BrushShape;
  onChange: (s: BrushShape) => void;
}) {
  return (
    <div className="inline-flex w-fit self-start items-center rounded-full border border-hairline bg-cream p-1">
      {(['circle', 'square'] as const).map((s) => {
        const active = s === value;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            aria-pressed={active}
            aria-label={s === 'circle' ? 'Circle brush' : 'Square brush'}
            className={`flex h-8 w-10 items-center justify-center rounded-full leading-none transition ${
              active ? 'bg-ink' : 'hover:bg-ivory'
            }`}
          >
            <span
              aria-hidden="true"
              className={`block h-4 w-4 border-2 ${active ? 'border-cream' : 'border-ink'} ${
                s === 'circle' ? 'rounded-full' : 'rounded-sm'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

function ZonesRail({
  zones,
  activeZoneId,
  onSelect,
  onNewZone,
}: {
  zones: Zone[];
  activeZoneId: string | null;
  onSelect: (id: string) => void;
  onNewZone: () => void;
}) {
  return (
    <div className="flex w-56 flex-col gap-2 overflow-y-auto rounded-3xl bg-cream p-4 shadow-card">
      <h3 className="px-2 text-xs uppercase tracking-wide text-muted">Zones</h3>
      {zones.length === 0 && (
        <p className="px-2 text-sm text-muted">No zones yet.</p>
      )}
      {zones.map((zone) => {
        const active = zone.id === activeZoneId;
        return (
          <button
            key={zone.id}
            type="button"
            onClick={() => onSelect(zone.id)}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-left transition ${
              active ? 'bg-ink text-cream' : 'text-ink hover:bg-ivory'
            }`}
            aria-pressed={active}
          >
            <Swatch token={zone.colorToken} size={24} />
            <span className="min-w-0 flex-1 truncate text-sm">{zone.name}</span>
          </button>
        );
      })}
      <Button variant="secondary" size="sm" onClick={onNewZone} className="mt-2">
        + New zone
      </Button>
    </div>
  );
}
