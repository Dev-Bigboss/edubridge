import { Head, Html, Main, NextScript } from 'next/document'

export default function Document() {
    return (
      <Html lang="en">
        <Head />
        <link rel="shortcut icon" href="/assets/img/favicon.png" />
        <link rel="preconnect" href="https://fonts.bunny.net" />
        <link
          href="https://fonts.bunny.net/css?family=hind:400,500,600|lexend:400,500,600"
          rel="stylesheet"
        />
        <script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
          integrity="sha384-kenU1KFdBIe4zVF0s0G1M5b4hcpxyD9F7jL+0w1L5nU5Y5y5q5m5L+0k2y2k2Y+5"
          crossOrigin="anonymous"
        ></script>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
}
