import Link from "next/link";

interface TrendingItem {
  category: string;
  hashtag: string;
  threadCount: string;
}

const TRENDING_ITEMS: TrendingItem[] = [
  { category: "Teknologi • Trending", hashtag: "#DesainSistem", threadCount: "2,4rb Thread" },
  { category: "Politik • Trending", hashtag: "#WebBersih", threadCount: "1,2rb Thread" },
  { category: "Gaya Hidup • Trending", hashtag: "#MinimalisDigital", threadCount: "890 Thread" },
];

/**
 * Right sidebar showing trending topics and suggested accounts.
 * Visible only on xl+ screens. Static for now — will be hydrated with real data.
 */
export function TrendingSidebar() {
  return (
    <aside className="sticky top-16 hidden h-fit w-80 space-y-gutter p-margin-desktop xl:block">
      {/* Trending Section */}
      <section className="space-y-4 rounded-xl border border-outline-variant bg-surface-container-low p-sm">
        <h3 className="px-2 text-title-md text-on-surface">Sedang Trending</h3>
        <div className="space-y-4">
          {TRENDING_ITEMS.map((item) => (
            <div
              key={item.hashtag}
              className="cursor-pointer rounded-lg p-2 px-2 transition-colors hover:bg-surface-container"
            >
              <p className="text-label-xs text-on-surface-variant">{item.category}</p>
              <p className="text-label-md font-bold text-on-surface">{item.hashtag}</p>
              <p className="text-label-xs text-on-surface-variant">{item.threadCount}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="w-full py-2 text-label-md text-primary hover:underline"
        >
          Lihat selengkapnya
        </button>
      </section>

      {/* Footer */}
      <footer className="flex flex-wrap gap-x-4 gap-y-2 px-2 text-label-xs text-on-surface-variant">
        <Link href="/terms" className="hover:underline">Ketentuan</Link>
        <Link href="/privacy" className="hover:underline">Kebijakan Privasi</Link>
        <Link href="/accessibility" className="hover:underline">Aksesibilitas</Link>
        <span>© 2026 Threadify</span>
      </footer>
    </aside>
  );
}
