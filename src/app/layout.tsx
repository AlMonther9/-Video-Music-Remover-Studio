import type { Metadata } from "next";
import { Tajawal, Amiri } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "أداة إزالة الموسيقى | المنذر عبد الحفيظ",
  description: "أداة شخصية ومحلية لإزالة الموسيقى من الفيديوهات وعزل الصوت البشري - إعداد المنذر عبد الحفيظ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="auto"
      suppressHydrationWarning
      className={`${tajawal.variable} ${amiri.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-[#F5F2EB] text-[#362A21] selection:bg-[#A4C3B2] selection:text-[#362A21]">
        {children}
      </body>
    </html>
  );
}
