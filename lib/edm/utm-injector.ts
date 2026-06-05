const hrefPattern = /(<a\b[^>]*\bhref\s*=\s*)(["'])([^"']+)(\2)/gi;

function shouldSkipHref(href: string) {
  const normalizedHref = href.trim().toLowerCase();

  return (
    normalizedHref.length === 0 ||
    normalizedHref.startsWith("#") ||
    normalizedHref.startsWith("mailto:") ||
    normalizedHref.startsWith("tel:") ||
    normalizedHref.startsWith("sms:") ||
    normalizedHref.includes("{{")
  );
}

function injectUtmIntoHref(href: string, campaignId: string) {
  if (shouldSkipHref(href)) {
    return href;
  }

  try {
    const isRelative = href.startsWith("/");
    const url = new URL(href, isRelative ? "https://nomad-go.local" : undefined);
    url.searchParams.set("utm_source", "nomad-go");
    url.searchParams.set("utm_medium", "email");
    url.searchParams.set("utm_campaign", campaignId);

    if (isRelative) {
      return `${url.pathname}${url.search}${url.hash}`;
    }

    return url.toString();
  } catch {
    const hashIndex = href.indexOf("#");
    const hrefWithoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
    const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
    const separator = hrefWithoutHash.includes("?") ? "&" : "?";
    const params = new URLSearchParams({
      utm_source: "nomad-go",
      utm_medium: "email",
      utm_campaign: campaignId
    });

    return `${hrefWithoutHash}${separator}${params.toString()}${hash}`;
  }
}

export function injectEdmUtmParameters(html: string, campaignId: string) {
  if (!html || !campaignId) {
    return html;
  }

  return html.replace(
    hrefPattern,
    (_match, prefix: string, quote: string, href: string, suffix: string) =>
      `${prefix}${quote}${injectUtmIntoHref(href, campaignId)}${suffix}`
  );
}
