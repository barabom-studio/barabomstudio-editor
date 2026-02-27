export default function Home() {
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
          <section className="rounded-2xl bg-white p-7 shadow-sm">
            <h1 className="text-2xl font-semibold leading-8">
              셀프사진관용 <span className="underline decoration-zinc-300">컷 편집기</span>
            </h1>
            <p className="mt-3 text-zinc-600">
              사진 업로드 → 레이아웃 선택(1/2/4/6/9컷) → 텍스트/프레임 → 저장(인화용).
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button className="h-12 rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800">
                사진 업로드 (준비중)
              </button>
              <button className="h-12 rounded-xl border px-5 text-sm font-medium hover:bg-zinc-50">
                프레임 선택 (준비중)
              </button>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border p-4">
                <div className="text-sm font-semibold">레이아웃</div>
                <div className="mt-1 text-sm text-zinc-600">1/2/4/6/9컷</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-sm font-semibold">프레임</div>
                <div className="mt-1 text-sm text-zinc-600">색상/두께/여백</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-sm font-semibold">텍스트</div>
                <div className="mt-1 text-sm text-zinc-600">상단/하단 문구</div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">미리보기</h2>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
                준비중
              </span>
            </div>

            <div className="mt-5 aspect-[3/4] w-full rounded-2xl border bg-zinc-100" />

            <div className="mt-5 grid grid-cols-3 gap-3">
              <button className="h-11 rounded-xl border text-sm hover:bg-zinc-50">
                1컷
              </button>
              <button className="h-11 rounded-xl border text-sm hover:bg-zinc-50">
                4컷
              </button>
              <button className="h-11 rounded-xl border text-sm hover:bg-zinc-50">
                6컷
              </button>
            </div>

            <button className="mt-3 h-12 w-full rounded-xl bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800">
              저장/다운로드 (준비중)
            </button>

            <p className="mt-3 text-xs text-zinc-500">
              다음 단계: 업로드/레이아웃/저장 기능을 실제로 연결할 거야.
            </p>
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