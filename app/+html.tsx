import { ScrollViewStyleReset } from "expo-router/html";

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        <title>Lingo House Admin</title>
        <meta
          name="description"
          content="Internal admin console for Lingo House — manage studios, platform decks, and creator applications."
        />
        <meta name="theme-color" content="#C97C3B" />

        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        <meta property="og:title" content="Lingo House Admin" />
        <meta
          property="og:description"
          content="Internal admin console for Lingo House — manage studios, platform decks, and creator applications."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://admin.lingohouse.app" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
