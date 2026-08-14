/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js gibt statischen Seiten standardmäßig "s-maxage=31536000" (ein
  // Jahr!) ohne "max-age" mit - je nach Browser/Proxy kann das dazu führen,
  // dass nach einem neuen Deploy weiterhin die alte HTML-Seite (und damit
  // die alten, alten JS-Chunk-Referenzen) ausgeliefert wird, ohne dass der
  // Browser das je bemerkt (kein Fehler, einfach stiller alter Code - genau
  // das Symptom "Fix kommt nie an, obwohl der Code längst korrigiert ist").
  // Seiten müssen deshalb immer revalidiert werden; die inhaltsgehashten
  // /_next/static/-Assets bleiben von Next.js weiterhin unbegrenzt gecacht.
  async headers() {
    return [
      {
        source: "/((?!_next/).*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
