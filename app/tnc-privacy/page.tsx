import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ketentuan Layanan & Kebijakan Privasi | Threadify",
  description: "Ketentuan layanan dan kebijakan privasi platform Threadify.",
};

/**
 * Terms & Conditions and Privacy Policy page.
 * Simple, clean, center-aligned text layout.
 */
export default function TncPrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-center">
      <div className="mb-8">
        <Link
          href="/register"
          className="mb-4 inline-flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary"
        >
          ← Kembali
        </Link>
        <div>
          <Link
            href="/feed"
            className="text-headline-lg font-bold text-primary"
          >
            Threadify
          </Link>
        </div>
      </div>

      {/* Terms of Service */}
      <section className="mb-12">
        <h1 className="mb-4 text-title-md font-semibold text-on-surface">
          Ketentuan Layanan
        </h1>
        <div className="space-y-4 text-body-sm leading-relaxed text-on-surface-variant">
          <p>
            Dengan menggunakan Threadify, Anda menyetujui ketentuan berikut.
            Threadify adalah platform media sosial yang mengutamakan keamanan
            komunitas melalui moderasi konten berbasis AI.
          </p>
          <p>
            Anda bertanggung jawab atas konten yang Anda publikasikan. Konten
            yang mengandung ujaran kebencian, SARA, NSFW, cyberbullying, atau
            manipulasi akan diblokir secara otomatis oleh sistem moderasi kami.
          </p>
          <p>
            Pelanggaran berulang akan mengakibatkan pembatasan bertahap:
            peringatan pertama, pembatasan posting 24 jam, suspensi 72 jam,
            hingga pelarangan permanen.
          </p>
          <p>
            Anda berhak mengajukan banding atas keputusan moderasi. Tim kami
            akan meninjau banding dalam waktu 1x24 jam.
          </p>
          <p>
            Threadify berhak mengubah ketentuan ini sewaktu-waktu. Perubahan
            akan diinformasikan melalui platform.
          </p>
        </div>
      </section>

      {/* Privacy Policy */}
      <section className="mb-12">
        <h2 className="mb-4 text-title-md font-semibold text-on-surface">
          Kebijakan Privasi
        </h2>
        <div className="space-y-4 text-body-sm leading-relaxed text-on-surface-variant">
          <p>
            Threadify berkomitmen melindungi data pribadi Anda sesuai dengan
            Undang-Undang Perlindungan Data Pribadi (UU PDP) Republik Indonesia.
          </p>
          <p>
            <strong className="text-on-surface">Data yang kami kumpulkan:</strong>{" "}
            Nomor telepon (untuk verifikasi OTP), nama tampilan, username, foto
            profil, dan konten yang Anda publikasikan.
          </p>
          <p>
            <strong className="text-on-surface">Penggunaan data:</strong> Data
            Anda digunakan untuk autentikasi, moderasi konten, dan pengalaman
            pengguna. Kami tidak menjual data Anda kepada pihak ketiga.
          </p>
          <p>
            <strong className="text-on-surface">Hak Anda:</strong> Anda berhak
            mengekspor data pribadi Anda dan menghapus akun secara permanen
            kapan saja. Data akan dihapus dalam 30 hari setelah permintaan
            penghapusan.
          </p>
          <p>
            <strong className="text-on-surface">Keamanan:</strong> Semua data
            dienkripsi saat transit (HTTPS/TLS). Nomor telepon tidak pernah
            ditampilkan secara publik atau dicatat dalam log aplikasi.
          </p>
          <p>
            <strong className="text-on-surface">Penyimpanan:</strong> Data
            disimpan di server Supabase wilayah Asia Tenggara dengan Row Level
            Security aktif di semua tabel.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-outline-variant/30 pt-6 text-label-xs text-on-surface-variant">
        <p>Terakhir diperbarui: 2 Maret 2026</p>
        <p className="mt-2">© 2026 Threadify. Seluruh hak dilindungi.</p>
      </footer>
    </main>
  );
}
