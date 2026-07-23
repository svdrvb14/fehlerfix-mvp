import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FehlerFix – Rechtschreibung, die endlich Sinn ergibt",
  description:
    "FehlerFix erkennt Rechtschreibfehler direkt aus der Handschrift auf dem iPad und erklärt die Regel dahinter – statt nur rot anzustreichen. Jetzt für die Warteliste vormerken.",
  metadataBase: new URL("https://fehlerfix.de"),
  openGraph: {
    title: "FehlerFix – Rechtschreibung, die endlich Sinn ergibt",
    description:
      "KI-gestützte Rechtschreib-Lern-App fürs iPad mit Apple Pencil. Erkennt Fehler in der Handschrift und erklärt die Regel dahinter.",
    url: "https://fehlerfix.de",
    siteName: "FehlerFix",
    locale: "de_DE",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={poppins.variable}>
      <body className="font-sans antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
