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

        <title>Lingo House Creators</title>
        <meta
          name="description"
          content="Manage your Lingo House creator account, build language learning content, and grow your audience."
        />
        <meta name="theme-color" content="#C97C3B" />

        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        <meta property="og:title" content="Lingo House Creators" />
        <meta
          property="og:description"
          content="Manage your Lingo House creator account, build language learning content, and grow your audience."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://creators.lingohouse.app" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
