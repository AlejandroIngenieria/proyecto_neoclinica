export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[#071a3b] text-white md:h-screen md:flex-row md:items-stretch">
      <div className="relative hidden h-full flex-none overflow-hidden md:block md:w-[42vw]">
        <div className="h-full w-full bg-white/5" />
      </div>

      <div className="flex max-h-screen w-full flex-1 items-stretch overflow-y-auto px-4 py-4 sm:px-6 md:min-w-0 md:px-8 md:py-6 lg:px-10 lg:py-6">
        <div className="flex w-full min-w-0 flex-col justify-center">
          <div className="mx-auto flex w-full max-w-[29rem] flex-col items-center">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-4 h-16 w-16 animate-pulse rounded-full border border-cyan-400/20 bg-cyan-400/10" />
              <div className="h-10 w-48 animate-pulse bg-white/10" />
              <div className="mt-3 h-1 w-16 animate-pulse bg-cyan-400/40" />
            </div>

            <div className="w-full max-w-[27rem] space-y-3 sm:space-y-4">
              <div className="h-14 w-full animate-pulse rounded-2xl border border-sky-400/20 bg-white/5" />
              <div className="h-14 w-full animate-pulse rounded-2xl border border-sky-400/20 bg-white/5" />
              <div className="h-14 w-full animate-pulse rounded-2xl border border-sky-400/20 bg-white/5" />
              <div className="grid gap-3">
                <div className="h-11 w-full animate-pulse rounded-2xl bg-white/90" />
                <div className="h-11 w-full animate-pulse rounded-2xl bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}