"use client";

export function SkipToMainLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[10060] focus:rounded-md focus:border focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      onClick={(e) => {
        e.preventDefault();
        const main =
          document.getElementById("main-content") ??
          document.querySelector("main");
        if (main instanceof HTMLElement) {
          if (!main.id) main.id = "main-content";
          main.tabIndex = -1;
          main.focus();
          main.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }}
    >
      Skip to main content
    </a>
  );
}
