const MAX_CONTENT_CHARS = 9000;

export async function extractFromUrl(
  rawUrl: string
): Promise<{ title: string; content: string; url: string }> {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  new URL(url);

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Page returned ${res.status}`);

  const html = await res.text();
  const title =
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? url;
  const metaDesc =
    html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i
    )?.[1] ??
    html.match(
      /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i
    )?.[1] ??
    "";
  const ogDesc =
    html.match(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i
    )?.[1] ?? "";

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  const content = [
    metaDesc && `META DESCRIPTION: ${metaDesc}`,
    ogDesc && ogDesc !== metaDesc && `OG DESCRIPTION: ${ogDesc}`,
    `PAGE TEXT: ${text}`,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_CONTENT_CHARS);

  if (text.length < 80) {
    throw new Error(
      "Couldn't read enough content from that page (it may be JS-rendered). Try pasting a description instead."
    );
  }

  return { title: decodeTitle(title), content, url };
}

function decodeTitle(t: string): string {
  return t
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .slice(0, 120);
}
