"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type TextAlignMode = "left" | "center" | "right";

type LayoutKey =
  | "1"
  | "2h"
  | "2v"
  | "4h"
  | "4v"
  | "6h"
  | "6v"
  | "9h"
  | "9v";

type LayoutPreset = {
  key: LayoutKey;
  label: string;
  count: number;
  cols: number;
  rows: number;
  previewAspect: string;
};

type SizePreset = {
  label: string;
  w: number;
  h: number;
};

type Offset = { x: number; y: number };

const DEFAULT_OFFSET: Offset = { x: 0, y: 0 };
const DEFAULT_ZOOM = 1.15;

const LAYOUT_PRESETS: LayoutPreset[] = [
  { key: "1", label: "1컷", count: 1, cols: 1, rows: 1, previewAspect: "3 / 4" },

  { key: "2h", label: "2컷 가로", count: 2, cols: 2, rows: 1, previewAspect: "4 / 3" },
  { key: "2v", label: "2컷 세로", count: 2, cols: 1, rows: 2, previewAspect: "3 / 4" },

  { key: "4h", label: "4컷 가로", count: 4, cols: 2, rows: 2, previewAspect: "4 / 3" },
  { key: "4v", label: "4컷 세로", count: 4, cols: 2, rows: 2, previewAspect: "3 / 4" },

  { key: "6h", label: "6컷 가로", count: 6, cols: 3, rows: 2, previewAspect: "4 / 3" },
  { key: "6v", label: "6컷 세로", count: 6, cols: 2, rows: 3, previewAspect: "3 / 4" },

  { key: "9h", label: "9컷 가로", count: 9, cols: 3, rows: 3, previewAspect: "4 / 3" },
  { key: "9v", label: "9컷 세로", count: 9, cols: 3, rows: 3, previewAspect: "3 / 4" },
];

const SIZE_PRESETS: SizePreset[] = [
  { label: "4x6 세로 · 300dpi", w: 1200, h: 1800 },
  { label: "4x6 가로 · 300dpi", w: 1800, h: 1200 },
  { label: "SNS 세로 1080x1440", w: 1080, h: 1440 },
  { label: "SNS 가로 1440x1080", w: 1440, h: 1080 },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지 로드 실패"));
    img.src = url;
  });
}

function fitCover(iw: number, ih: number, cw: number, ch: number) {
  const imgRatio = iw / ih;
  const cellRatio = cw / ch;

  let drawW = cw;
  let drawH = ch;

  if (imgRatio > cellRatio) {
    drawH = ch;
    drawW = ch * imgRatio;
  } else {
    drawW = cw;
    drawH = cw / imgRatio;
  }

  return { drawW, drawH };
}

function drawCoverWithOffsetAndZoom(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  offset: Offset,
  zoom: number
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  const z = clamp(zoom, 1, 3);
  const { drawW: baseW, drawH: baseH } = fitCover(iw, ih, w, h);

  const scaledW = baseW * z;
  const scaledH = baseH * z;

  const overflowX = Math.max(0, scaledW - w);
  const overflowY = Math.max(0, scaledH - h);

  const offsetXPx = (clamp(offset.x, -100, 100) / 100) * (overflowX / 2);
  const offsetYPx = (clamp(offset.y, -100, 100) / 100) * (overflowY / 2);

  const dx = x - overflowX / 2 + offsetXPx;
  const dy = y - overflowY / 2 + offsetYPx;

  ctx.drawImage(img, dx, dy, scaledW, scaledH);
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pickIndexRef = useRef<number>(0);

  const [layoutKey, setLayoutKey] = useState<LayoutKey>("2h");
  const currentLayout = LAYOUT_PRESETS.find((p) => p.key === layoutKey)!;

  const [slots, setSlots] = useState<(File | null)[]>(
    Array.from({ length: currentLayout.count }, () => null)
  );
  const [offsets, setOffsets] = useState<Offset[]>(
    Array.from({ length: currentLayout.count }, () => ({ ...DEFAULT_OFFSET }))
  );
  const [zooms, setZooms] = useState<number[]>(
    Array.from({ length: currentLayout.count }, () => DEFAULT_ZOOM)
  );

  const [selectedSlot, setSelectedSlot] = useState(0);

  const dragRef = useRef<{
    idx: number;
    startX: number;
    startY: number;
    startOffset: Offset;
    cellW: number;
    cellH: number;
  } | null>(null);

  const [bottomText, setBottomText] = useState("사랑해♥");
  const [textAlignMode, setTextAlignMode] = useState<TextAlignMode>("center");

  const [bgColor, setBgColor] = useState("#ead4b3");
  const [frameColor, setFrameColor] = useState("#ffffff");
  const [padding, setPadding] = useState(32);
  const [gap, setGap] = useState(20);

  const [textColor, setTextColor] = useState("#111111");
  const [fontSize, setFontSize] = useState(42);
  const [fontWeight, setFontWeight] = useState<"400" | "600" | "700">("600");

  const [sizePresetIdx, setSizePresetIdx] = useState(0);
  const sizePreset = SIZE_PRESETS[sizePresetIdx];

  useEffect(() => {
    const need = currentLayout.count;

    setSlots((prev) => {
      const next = prev.slice(0, need);
      while (next.length < need) next.push(null);
      return next;
    });

    setOffsets((prev) => {
      const next = prev.slice(0, need);
      while (next.length < need) next.push({ ...DEFAULT_OFFSET });
      return next;
    });

    setZooms((prev) => {
      const next = prev.slice(0, need);
      while (next.length < need) next.push(DEFAULT_ZOOM);
      return next;
    });

    setSelectedSlot((prev) => clamp(prev, 0, need - 1));
  }, [currentLayout.count]);

  const slotUrls = useMemo(() => {
    return slots.map((f) => (f ? URL.createObjectURL(f) : null));
  }, [slots]);

  useEffect(() => {
    return () => {
      slotUrls.forEach((u) => u && URL.revokeObjectURL(u));
    };
  }, [slotUrls]);

  const openPickerFor = (index: number) => {
    pickIndexRef.current = index;
    fileInputRef.current?.click();
  };

  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const picked = e.target.files?.[0] ?? null;
    const idx = pickIndexRef.current;

    setSlots((prev) => {
      const next = [...prev];
      next[idx] = picked;
      return next;
    });

    setOffsets((prev) => {
      const next = [...prev];
      next[idx] = { ...DEFAULT_OFFSET };
      return next;
    });

    setZooms((prev) => {
      const next = [...prev];
      next[idx] = DEFAULT_ZOOM;
      return next;
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearAll = () => {
    setSlots(Array.from({ length: currentLayout.count }, () => null));
    setOffsets(Array.from({ length: currentLayout.count }, () => ({ ...DEFAULT_OFFSET })));
    setZooms(Array.from({ length: currentLayout.count }, () => DEFAULT_ZOOM));
  };

  const clearSelectedSlot = () => {
    setSlots((prev) => {
      const next = [...prev];
      next[selectedSlot] = null;
      return next;
    });
    setOffsets((prev) => {
      const next = [...prev];
      next[selectedSlot] = { ...DEFAULT_OFFSET };
      return next;
    });
    setZooms((prev) => {
      const next = [...prev];
      next[selectedSlot] = DEFAULT_ZOOM;
      return next;
    });
  };

  const resetPos = (idx: number) => {
    setOffsets((prev) => {
      const next = [...prev];
      next[idx] = { ...DEFAULT_OFFSET };
      return next;
    });
  };

  const resetZoom = (idx: number) => {
    setZooms((prev) => {
      const next = [...prev];
      next[idx] = DEFAULT_ZOOM;
      return next;
    });
  };

  const changeZoom = (idx: number, delta: number) => {
    setZooms((prev) => {
      const next = [...prev];
      next[idx] = clamp((next[idx] ?? DEFAULT_ZOOM) + delta, 1, 3);
      return next;
    });
  };

  const onCellWheel = (e: React.WheelEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();

    const delta = e.deltaY < 0 ? 0.1 : -0.1;

    setSelectedSlot(idx);
    setZooms((prev) => {
      const next = [...prev];
      next[idx] = clamp((next[idx] ?? DEFAULT_ZOOM) + delta, 1, 3);
      return next;
    });
  };

  const hasAnyImage = slots.some(Boolean);
  const selectedHasImage = !!slots[selectedSlot];

  const onCellPointerDown = (
    e: React.PointerEvent,
    idx: number,
    cellW: number,
    cellH: number
  ) => {
    setSelectedSlot(idx);

    if (!slotUrls[idx]) return;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    dragRef.current = {
      idx,
      startX: e.clientX,
      startY: e.clientY,
      startOffset: offsets[idx] ?? { ...DEFAULT_OFFSET },
      cellW,
      cellH,
    };
  };

  const onCellPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    e.preventDefault();

    const { idx, startX, startY, startOffset, cellW, cellH } = dragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const sensitivity = 1.2;

    const nextX = clamp(startOffset.x + (dx / Math.max(1, cellW)) * 100 * sensitivity, -100, 100);
    const nextY = clamp(startOffset.y + (dy / Math.max(1, cellH)) * 100 * sensitivity, -100, 100);

    setOffsets((prev) => {
      const next = [...prev];
      next[idx] = { x: nextX, y: nextY };
      return next;
    });
  };

  const onCellPointerUp = () => {
    dragRef.current = null;
  };

  async function downloadPNG() {
    const W = sizePreset.w;
    const H = sizePreset.h;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);

    const pad = clamp(padding, 0, Math.min(W, H) / 3);
    const innerX = pad;
    const innerY = pad;
    const innerW = W - pad * 2;
    const innerH = H - pad * 2;

    ctx.fillStyle = frameColor;
    ctx.fillRect(innerX, innerY, innerW, innerH);

    const bottomH = bottomText.trim() ? Math.round(fontSize * 1.8) : 0;

    const imgAreaX = innerX;
    const imgAreaY = innerY;
    const imgAreaW = innerW;
    const imgAreaH = innerH - bottomH;

    const cols = currentLayout.cols;
    const rows = currentLayout.rows;
    const g = clamp(gap, 0, 200);

    const cellW = Math.floor((imgAreaW - g * (cols - 1)) / cols);
    const cellH = Math.floor((imgAreaH - g * (rows - 1)) / rows);

    for (let i = 0; i < currentLayout.count; i++) {
      const url = slotUrls[i];
      if (!url) continue;

      const r = Math.floor(i / cols);
      const c = i % cols;

      const x = imgAreaX + c * (cellW + g);
      const y = imgAreaY + r * (cellH + g);

      try {
        const img = await loadImageFromUrl(url);
        const offset = offsets[i] ?? DEFAULT_OFFSET;
        const zoom = zooms[i] ?? DEFAULT_ZOOM;
        drawCoverWithPositionAndZoom(ctx, img, x, y, cellW, cellH, offset, zoom);
      } catch {}
    }

    if (bottomText.trim()) {
      ctx.fillStyle = textColor;
      ctx.textBaseline = "middle";
      ctx.font = `${fontWeight} ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;

      if (textAlignMode === "left") {
        ctx.textAlign = "left";
        ctx.fillText(bottomText, innerX + 24, innerY + imgAreaH + bottomH / 2);
      } else if (textAlignMode === "right") {
        ctx.textAlign = "right";
        ctx.fillText(bottomText, innerX + innerW - 24, innerY + imgAreaH + bottomH / 2);
      } else {
        ctx.textAlign = "center";
        ctx.fillText(bottomText, innerX + innerW / 2, innerY + imgAreaH + bottomH / 2);
      }
    }

    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `barabom-${layoutKey}-${W}x${H}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="min-h-screen bg-[#f5f5f3] text-zinc-900">
      <header className="border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-2xl bg-zinc-900" />
            <div>
              <div className="text-2xl font-semibold tracking-tight">바라봄 스튜디오</div>
              <div className="text-sm text-zinc-500">Studio Cut Editor</div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <section className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
            <div className="mb-6">
              <h1 className="text-3xl font-semibold tracking-tight">컷 편집기</h1>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                하단 문구, 정렬, 확대/축소, 위치 이동까지 한 번에 편집하세요.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickFile}
            />

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">프레임</label>
                <select
                  value={layoutKey}
                  onChange={(e) => setLayoutKey(e.target.value as LayoutKey)}
                  className="h-12 w-full rounded-2xl border border-zinc-300 px-4 text-sm"
                >
                  {LAYOUT_PRESETS.map((preset) => (
                    <option key={preset.key} value={preset.key}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">하단 문구</label>
                <input
                  value={bottomText}
                  onChange={(e) => setBottomText(e.target.value)}
                  placeholder="예) 바라봄 스튜디오"
                  className="h-12 w-full rounded-2xl border border-zinc-300 px-4 text-sm outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">텍스트 정렬</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setTextAlignMode("left")}
                    className={`h-11 rounded-2xl border text-sm ${
                      textAlignMode === "left"
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300 bg-white hover:bg-zinc-50"
                    }`}
                  >
                    왼쪽
                  </button>
                  <button
                    onClick={() => setTextAlignMode("center")}
                    className={`h-11 rounded-2xl border text-sm ${
                      textAlignMode === "center"
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300 bg-white hover:bg-zinc-50"
                    }`}
                  >
                    가운데
                  </button>
                  <button
                    onClick={() => setTextAlignMode("right")}
                    className={`h-11 rounded-2xl border text-sm ${
                      textAlignMode === "right"
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300 bg-white hover:bg-zinc-50"
                    }`}
                  >
                    오른쪽
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-zinc-50/60 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-600">배경색</label>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-300"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-600">프레임색</label>
                    <input
                      type="color"
                      value={frameColor}
                      onChange={(e) => setFrameColor(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-300"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-600">여백</label>
                    <input
                      type="number"
                      value={padding}
                      onChange={(e) => setPadding(clamp(Number(e.target.value), 0, 200))}
                      className="h-11 w-full rounded-xl border border-zinc-300 px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-600">간격</label>
                    <input
                      type="number"
                      value={gap}
                      onChange={(e) => setGap(clamp(Number(e.target.value), 0, 80))}
                      className="h-11 w-full rounded-xl border border-zinc-300 px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-600">텍스트색</label>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-300"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-600">폰트 크기</label>
                    <input
                      type="number"
                      value={fontSize}
                      onChange={(e) => setFontSize(clamp(Number(e.target.value), 18, 120))}
                      className="h-11 w-full rounded-xl border border-zinc-300 px-3 text-sm"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="mb-2 block text-xs font-medium text-zinc-600">굵기</label>
                  <select
                    value={fontWeight}
                    onChange={(e) => setFontWeight(e.target.value as any)}
                    className="h-11 w-full rounded-xl border border-zinc-300 px-3 text-sm"
                  >
                    <option value="400">보통</option>
                    <option value="600">세미볼드</option>
                    <option value="700">볼드</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">저장 크기</label>
                <select
                  value={sizePresetIdx}
                  onChange={(e) => setSizePresetIdx(Number(e.target.value))}
                  className="h-12 w-full rounded-2xl border border-zinc-300 px-4 text-sm"
                >
                  {SIZE_PRESETS.map((p, idx) => (
                    <option key={p.label} value={idx}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={clearAll}
                  className="h-12 rounded-2xl border border-zinc-300 bg-white text-sm hover:bg-zinc-50"
                >
                  전체 초기화
                </button>
                <button
                  onClick={downloadPNG}
                  disabled={!hasAnyImage}
                  className="h-12 rounded-2xl bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800 disabled:bg-zinc-300"
                >
                  PNG 저장
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">미리보기</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  컷 선택 후 사진 넣기, 드래그 이동, 휠 확대/축소가 가능해요.
                </p>
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
                {hasAnyImage ? "편집중" : "대기중"}
              </span>
            </div>

            <div
              className="w-full overflow-hidden rounded-[32px] border border-black/10"
              style={{ background: bgColor }}
            >
              <div className="mx-auto max-w-[760px] p-6">
                <div
                  className="overflow-hidden rounded-[26px]"
                  style={{ background: frameColor, padding }}
                >
                  <div
                    style={{
                      display: "grid",
                      gap,
                      gridTemplateColumns: `repeat(${currentLayout.cols}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${currentLayout.rows}, minmax(0, 1fr))`,
                      aspectRatio: currentLayout.previewAspect,
                    }}
                  >
                    {Array.from({ length: currentLayout.count }).map((_, i) => {
                      const url = slotUrls[i];
                      const offset = offsets[i] ?? DEFAULT_OFFSET;
                      const zoom = zooms[i] ?? DEFAULT_ZOOM;
                      const isSelected = selectedSlot === i;

                      return (
                        <div
                          key={i}
                          className={`relative overflow-hidden rounded-[20px] border bg-zinc-100 ${
                            isSelected ? "border-zinc-900 ring-2 ring-zinc-900/20" : "border-black/10"
                          }`}
                        >
                          <button
                            type="button"
                            className="absolute inset-0"
                            style={{ touchAction: "none" }}
                            onClick={() => setSelectedSlot(i)}
                            onWheel={(e) => onCellWheel(e, i)}
                            onPointerDown={(e) => {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              onCellPointerDown(e, i, rect.width, rect.height);
                            }}
                            onPointerMove={onCellPointerMove}
                            onPointerUp={onCellPointerUp}
                            onPointerCancel={onCellPointerUp}
                            title={url ? "드래그 이동 / 휠 확대·축소" : "클릭해서 선택"}
                          >
                            {url ? (
                              <img
                                src={url}
                                alt={`slot-${i + 1}`}
                                className="absolute left-1/2 top-1/2 h-full w-full"
                                style={{
                                  objectFit: "cover",
                                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
                                  transformOrigin: "center center",
                                  pointerEvents: "none",
                                  userSelect: "none",
                                }}
                                draggable={false}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center px-3 text-center text-sm text-zinc-500">
                                {i + 1}번 컷
                                <br />
                                선택 후 사진 넣기
                              </div>
                            )}
                          </button>

                          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] text-zinc-700 shadow-sm">
                            {i + 1}컷
                          </div>

                          {url ? (
                            <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] text-zinc-700 shadow-sm">
                              줌 {zoom.toFixed(1)}x
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {bottomText.trim() ? (
                    <div
                      className={`pt-5 text-[18px] tracking-tight ${
                        textAlignMode === "left"
                          ? "text-left"
                          : textAlignMode === "right"
                          ? "text-right"
                          : "text-center"
                      }`}
                      style={{ color: textColor, fontWeight }}
                    >
                      {bottomText}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => openPickerFor(selectedSlot)}
                className="h-12 rounded-2xl bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800"
              >
                선택 컷 사진 넣기
              </button>
              <button
                onClick={clearSelectedSlot}
                className="h-12 rounded-2xl border border-zinc-300 bg-white text-sm hover:bg-zinc-50"
              >
                선택 컷 비우기
              </button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <button
                onClick={() => changeZoom(selectedSlot, -0.1)}
                disabled={!selectedHasImage}
                className="h-11 rounded-2xl border border-zinc-300 bg-white text-sm hover:bg-zinc-50 disabled:bg-zinc-100 disabled:text-zinc-400"
              >
                축소
              </button>
              <button
                onClick={() => changeZoom(selectedSlot, 0.1)}
                disabled={!selectedHasImage}
                className="h-11 rounded-2xl border border-zinc-300 bg-white text-sm hover:bg-zinc-50 disabled:bg-zinc-100 disabled:text-zinc-400"
              >
                확대
              </button>
              <button
                onClick={() => resetZoom(selectedSlot)}
                disabled={!selectedHasImage}
                className="h-11 rounded-2xl border border-zinc-300 bg-white text-sm hover:bg-zinc-50 disabled:bg-zinc-100 disabled:text-zinc-400"
              >
                줌 초기화
              </button>
              <button
                onClick={() => resetPos(selectedSlot)}
                disabled={!selectedHasImage}
                className="h-11 rounded-2xl border border-zinc-300 bg-white text-sm hover:bg-zinc-50 disabled:bg-zinc-100 disabled:text-zinc-400"
              >
                위치 초기화
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
