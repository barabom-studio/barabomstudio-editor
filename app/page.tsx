"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Layout = 1 | 4 | 6;

type SizePreset = {
  label: string;
  w: number;
  h: number;
};

const SIZE_PRESETS: SizePreset[] = [
  { label: "4x6 (세로) 300dpi (1200x1800)", w: 1200, h: 1800 },
  { label: "4x6 (가로) 300dpi (1800x1200)", w: 1800, h: 1200 },
  { label: "1080x1440 (세로, SNS용)", w: 1080, h: 1440 },
  { label: "1440x1080 (가로, SNS용)", w: 1440, h: 1080 },
];

type Pos = { xPct: number; yPct: number }; // object-position (%)
const DEFAULT_POS: Pos = { xPct: 50, yPct: 50 };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getGrid(layout: Layout) {
  if (layout === 1) return { cols: 1, rows: 1 };
  if (layout === 4) return { cols: 2, rows: 2 };
  return { cols: 2, rows: 3 };
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지 로드 실패"));
    img.src = url;
  });
}

/**
 * object-fit: cover + object-position(xPct,yPct) 처럼 캔버스에 그리기
 * - cover로 크롭될 때, xPct/yPct로 크롭 위치를 이동한다.
 */
function drawCoverWithPosition(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  pos: Pos
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  const targetRatio = w / h;
  const imgRatio = iw / ih;

  let sx = 0,
    sy = 0,
    sw = iw,
    sh = ih;

  if (imgRatio > targetRatio) {
    // 이미지가 더 넓음 -> 좌우가 크롭됨 (xPct 적용)
    sh = ih;
    sw = Math.round(ih * targetRatio);
    const extraX = iw - sw; // 좌우로 이동 가능한 여유 픽셀
    sx = Math.round(extraX * (clamp(pos.xPct, 0, 100) / 100));
    sy = 0;
  } else {
    // 이미지가 더 높음 -> 상하가 크롭됨 (yPct 적용)
    sw = iw;
    sh = Math.round(iw / targetRatio);
    const extraY = ih - sh; // 상하로 이동 가능한 여유 픽셀
    sx = 0;
    sy = Math.round(extraY * (clamp(pos.yPct, 0, 100) / 100));
  }

  // 안전 클램프
  sx = clamp(sx, 0, iw - sw);
  sy = clamp(sy, 0, ih - sh);

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pickIndexRef = useRef<number>(0);

  const [layout, setLayout] = useState<Layout>(1);

  // 각 칸 파일
  const [slots, setSlots] = useState<(File | null)[]>([null]);

  // 각 칸 크롭 위치 (드래그로 변경)
  const [positions, setPositions] = useState<Pos[]>([DEFAULT_POS]);

  // 드래그 상태
  const dragRef = useRef<{
    idx: number;
    startX: number;
    startY: number;
    startPos: Pos;
    cellW: number;
    cellH: number;
  } | null>(null);

  // 텍스트
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");

  // 프레임/여백
  const [bgColor, setBgColor] = useState("#f4f4f5");
  const [frameColor, setFrameColor] = useState("#ffffff");
  const [padding, setPadding] = useState(40);
  const [gap, setGap] = useState(16);

  // 텍스트 스타일(저장용)
  const [textColor, setTextColor] = useState("#111827");
  const [fontSize, setFontSize] = useState(44);
  const [fontWeight, setFontWeight] = useState<"400" | "600" | "700">("700");

  // 저장 크기
  const [sizePresetIdx, setSizePresetIdx] = useState(0);
  const sizePreset = SIZE_PRESETS[sizePresetIdx];

  // 레이아웃 변경 시 배열 길이 맞추기
  useEffect(() => {
    const need = layout;
    setSlots((prev) => {
      const next = prev.slice(0, need);
      while (next.length < need) next.push(null);
      return next;
    });
    setPositions((prev) => {
      const next = prev.slice(0, need);
      while (next.length < need) next.push({ ...DEFAULT_POS });
      return next;
    });
  }, [layout]);

  // 미리보기 URL
  const slotUrls = useMemo(() => {
    return slots.map((f) => (f ? URL.createObjectURL(f) : null));
  }, [slots]);

  // URL 해제
  useEffect(() => {
    return () => {
      slotUrls.forEach((u) => u && URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotUrls.join("|")]);

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

    // 새 사진 넣으면 위치는 중앙으로 리셋(원하면 제거 가능)
    setPositions((prev) => {
      const next = [...prev];
      next[idx] = { ...DEFAULT_POS };
      return next;
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearAll = () => {
    setSlots(Array.from({ length: layout }, () => null));
    setPositions(Array.from({ length: layout }, () => ({ ...DEFAULT_POS })));
  };

  const hasAnyImage = slots.some(Boolean);

  // ===== 드래그로 크롭 이동 =====
  const onCellPointerDown = (
    e: React.PointerEvent,
    idx: number,
    cellW: number,
    cellH: number
  ) => {
    // 사진이 있는 칸만 드래그 의미 있음
    if (!slotUrls[idx]) return;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    dragRef.current = {
      idx,
      startX: e.clientX,
      startY: e.clientY,
      startPos: positions[idx] ?? { ...DEFAULT_POS },
      cellW,
      cellH,
    };
  };

  const onCellPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    e.preventDefault();

    const { idx, startX, startY, startPos, cellW, cellH } = dragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // 이동량을 %로 환산 (대략: 셀 가로/세로 기준)
    // cover의 “실제 이동 가능 범위”는 사진 비율에 따라 달라지지만,
    // 여기서는 UX용으로 %를 바꾸고, 저장에서도 같은 %를 사용.
    const nextX = clamp(startPos.xPct + (dx / Math.max(1, cellW)) * 100, 0, 100);
    const nextY = clamp(startPos.yPct + (dy / Math.max(1, cellH)) * 100, 0, 100);

    setPositions((prev) => {
      const next = [...prev];
      next[idx] = { xPct: nextX, yPct: nextY };
      return next;
    });
  };

  const onCellPointerUp = () => {
    dragRef.current = null;
  };

  const resetPos = (idx: number) => {
    setPositions((prev) => {
      const next = [...prev];
      next[idx] = { ...DEFAULT_POS };
      return next;
    });
  };

  // ===== PNG 저장 (드래그 위치 반영) =====
  async function downloadPNG() {
    const W = sizePreset.w;
    const H = sizePreset.h;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 배경
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);

    // 프레임 영역
    const pad = clamp(padding, 0, Math.min(W, H) / 3);
    const innerX = pad;
    const innerY = pad;
    const innerW = W - pad * 2;
    const innerH = H - pad * 2;

    ctx.fillStyle = frameColor;
    ctx.fillRect(innerX, innerY, innerW, innerH);

    // 텍스트 영역(있을 때만)
    const topH = topText.trim() ? Math.round(fontSize * 1.6) : 0;
    const bottomH = bottomText.trim() ? Math.round(fontSize * 1.6) : 0;

    const imgAreaX = innerX;
    const imgAreaY = innerY + topH;
    const imgAreaW = innerW;
    const imgAreaH = innerH - topH - bottomH;

    const { cols, rows } = getGrid(layout);
    const g = clamp(gap, 0, 200);

    const cellW = Math.floor((imgAreaW - g * (cols - 1)) / cols);
    const cellH = Math.floor((imgAreaH - g * (rows - 1)) / rows);

    // 이미지
    for (let i = 0; i < layout; i++) {
      const url = slotUrls[i];
      if (!url) continue;

      const r = Math.floor(i / cols);
      const c = i % cols;

      const x = imgAreaX + c * (cellW + g);
      const y = imgAreaY + r * (cellH + g);

      try {
        const img = await loadImageFromUrl(url);
        const pos = positions[i] ?? DEFAULT_POS;
        drawCoverWithPosition(ctx, img, x, y, cellW, cellH, pos);
      } catch {
        // 로드 실패시 스킵
      }
    }

    // 텍스트
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${fontWeight} ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;

    if (topH) {
      ctx.fillText(topText, innerX + innerW / 2, innerY + topH / 2);
    }
    if (bottomH) {
      ctx.fillText(
        bottomText,
        innerX + innerW / 2,
        innerY + topH + imgAreaH + bottomH / 2
      );
    }

    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `barabom-${layout}cut-${W}x${H}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-zinc-900" />
            <div>
              <div className="text-lg font-semibold leading-5">바라봄 스튜디오</div>
              <div className="text-sm text-zinc-500">컷 편집기</div>
            </div>
          </div>

          <a
            className="rounded-full border px-4 py-2 text-sm hover:bg-zinc-50"
            href="https://github.com/barabom-studio/barabomstudio-editor"
            target="_blank"
            rel="noreferrer"
          >
            GitHub 보기
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 왼쪽: 설정 */}
          <section className="rounded-2xl bg-white p-7 shadow-sm">
            <h1 className="text-2xl font-semibold leading-8">
              셀프사진관용{" "}
              <span className="underline decoration-zinc-300">컷 편집기</span>
            </h1>
            <p className="mt-3 text-zinc-600">
              사진 넣기 → 레이아웃 → (칸 드래그로 위치 이동) → 문구 → PNG 저장
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickFile}
            />

            <div className="mt-6 grid gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium w-24">레이아웃</span>
                <div className="grid grid-cols-3 gap-2 flex-1">
                  <button
                    onClick={() => setLayout(1)}
                    className={`h-11 rounded-xl border text-sm hover:bg-zinc-50 ${
                      layout === 1 ? "bg-zinc-900 text-white hover:bg-zinc-800" : ""
                    }`}
                  >
                    1컷
                  </button>
                  <button
                    onClick={() => setLayout(4)}
                    className={`h-11 rounded-xl border text-sm hover:bg-zinc-50 ${
                      layout === 4 ? "bg-zinc-900 text-white hover:bg-zinc-800" : ""
                    }`}
                  >
                    4컷
                  </button>
                  <button
                    onClick={() => setLayout(6)}
                    className={`h-11 rounded-xl border text-sm hover:bg-zinc-50 ${
                      layout === 6 ? "bg-zinc-900 text-white hover:bg-zinc-800" : ""
                    }`}
                  >
                    6컷
                  </button>
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">상단 문구</label>
                <input
                  value={topText}
                  onChange={(e) => setTopText(e.target.value)}
                  placeholder="예) BARABOM STUDIO"
                  className="h-11 w-full rounded-xl border px-4 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">하단 문구</label>
                <input
                  value={bottomText}
                  onChange={(e) => setBottomText(e.target.value)}
                  placeholder="예) 2026.02.28"
                  className="h-11 w-full rounded-xl border px-4 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                />
              </div>

              <div className="grid gap-3 rounded-xl border p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">배경색</label>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="h-10 w-full rounded-lg border"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">프레임색</label>
                    <input
                      type="color"
                      value={frameColor}
                      onChange={(e) => setFrameColor(e.target.value)}
                      className="h-10 w-full rounded-lg border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">여백</label>
                    <input
                      type="number"
                      value={padding}
                      onChange={(e) => setPadding(clamp(Number(e.target.value), 0, 200))}
                      className="h-10 rounded-lg border px-3 text-sm"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">간격</label>
                    <input
                      type="number"
                      value={gap}
                      onChange={(e) => setGap(clamp(Number(e.target.value), 0, 80))}
                      className="h-10 rounded-lg border px-3 text-sm"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">텍스트색</label>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="h-10 w-full rounded-lg border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">폰트 크기(저장)</label>
                    <input
                      type="number"
                      value={fontSize}
                      onChange={(e) => setFontSize(clamp(Number(e.target.value), 18, 120))}
                      className="h-10 rounded-lg border px-3 text-sm"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">굵기</label>
                    <select
                      value={fontWeight}
                      onChange={(e) => setFontWeight(e.target.value as any)}
                      className="h-10 rounded-lg border px-3 text-sm"
                    >
                      <option value="400">보통(400)</option>
                      <option value="600">세미볼드(600)</option>
                      <option value="700">볼드(700)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">저장 크기(인화/용도)</label>
                <select
                  value={sizePresetIdx}
                  onChange={(e) => setSizePresetIdx(Number(e.target.value))}
                  className="h-11 rounded-xl border px-4 text-sm"
                >
                  {SIZE_PRESETS.map((p, idx) => (
                    <option key={p.label} value={idx}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-zinc-500">
                  PNG 해상도: {sizePreset.w} x {sizePreset.h}
                </p>
              </div>

              <div className="mt-2 flex gap-3">
                <button
                  onClick={clearAll}
                  className="h-11 flex-1 rounded-xl border text-sm hover:bg-zinc-50"
                >
                  전체 초기화
                </button>
                <button
                  onClick={downloadPNG}
                  disabled={!hasAnyImage}
                  className="h-11 flex-1 rounded-xl bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                  title={!hasAnyImage ? "사진을 먼저 넣어 주세요" : ""}
                >
                  PNG 저장
                </button>
              </div>
            </div>
          </section>

          {/* 오른쪽: 미리보기 + 드래그 */}
          <section className="rounded-2xl bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">미리보기</h2>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
                {hasAnyImage ? "편집중" : "대기중"}
              </span>
            </div>

            <div className="mt-3 text-xs text-zinc-500">
              ✅ 사진이 들어간 칸을 <b>드래그</b>해서 위치를 이동할 수 있어요.
            </div>

            <div
              className="mt-5 aspect-[3/4] w-full overflow-hidden rounded-2xl border"
              style={{ background: bgColor }}
            >
              <div className="h-full w-full" style={{ padding }}>
                <div
                  className="h-full w-full overflow-hidden rounded-xl"
                  style={{ background: frameColor }}
                >
                  {topText.trim() ? (
                    <div
                      className="px-4 py-3 text-center"
                      style={{ color: textColor, fontWeight }}
                    >
                      {topText}
                    </div>
                  ) : null}

                  {(() => {
                    const { cols, rows } = getGrid(layout);
                    const g = gap;

                    return (
                      <div
                        className="h-full w-full"
                        style={{
                          height: "calc(100% - 0px)",
                          padding: 12,
                          display: "grid",
                          gap: g,
                          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                        }}
                      >
                        {Array.from({ length: layout }).map((_, i) => {
                          const url = slotUrls[i];
                          const pos = positions[i] ?? DEFAULT_POS;

                          return (
                            <div key={i} className="relative overflow-hidden rounded-xl border bg-white">
                              <button
                                type="button"
                                className="absolute inset-0"
                                style={{ touchAction: "none" }}
                                onClick={() => openPickerFor(i)}
                                onPointerDown={(e) => {
                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  onCellPointerDown(e, i, rect.width, rect.height);
                                }}
                                onPointerMove={onCellPointerMove}
                                onPointerUp={onCellPointerUp}
                                onPointerCancel={onCellPointerUp}
                                title={url ? "드래그로 위치 이동 / 클릭으로 사진 변경" : "클릭해서 사진 선택"}
                              >
                                {url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={url}
                                    alt={`slot-${i + 1}`}
                                    className="h-full w-full"
                                    style={{
                                      objectFit: "cover",
                                      objectPosition: `${pos.xPct}% ${pos.yPct}%`,
                                      pointerEvents: "none", // 드래그는 버튼이 받도록
                                      userSelect: "none",
                                    }}
                                    draggable={false}
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-zinc-500">
                                    {i + 1}번 컷
                                    <br />
                                    클릭해서 사진 선택
                                  </div>
                                )}
                              </button>

                              {url ? (
                                <div className="absolute right-2 top-2 flex gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      resetPos(i);
                                    }}
                                    className="rounded-lg bg-white/90 px-2 py-1 text-[11px] text-zinc-700 shadow-sm hover:bg-white"
                                    title="이 칸 위치 초기화"
                                  >
                                    위치 초기화
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {bottomText.trim() ? (
                    <div
                      className="px-4 py-3 text-center"
                      style={{ color: textColor, fontWeight }}
                    >
                      {bottomText}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => openPickerFor(0)}
                className="h-11 rounded-xl bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800"
              >
                1번 컷 사진 넣기
              </button>
              <button
                onClick={() => openPickerFor(Math.min(layout - 1, 1))}
                className="h-11 rounded-xl border text-sm hover:bg-zinc-50"
              >
                다른 컷 사진 넣기
              </button>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-5xl px-6 py-6 text-sm text-zinc-500">
          © {new Date().getFullYear()} 바라봄 스튜디오 · editor
        </div>
      </footer>
    </div>
  );
}