import type { ReactNode } from "react";
import sanitizeHtml, { type IOptions } from "sanitize-html";

const htmlTagPattern =
  /<\/?(?:article|aside|blockquote|br|code|div|em|figcaption|figure|h[1-6]|hr|iframe|img|li|ol|p|pre|section|span|strong|table|tbody|td|th|thead|tr|ul|a|b|i)\b[^>]*>/i;

const postHtmlSanitizeOptions: IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    "article",
    "aside",
    "figure",
    "figcaption",
    "h1",
    "h2",
    "img",
    "iframe",
    "section",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td"
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ["href", "name", "target", "rel", "title"],
    img: ["src", "srcset", "alt", "title", "width", "height", "loading"],
    iframe: [
      "src",
      "width",
      "height",
      "title",
      "allow",
      "allowfullscreen",
      "frameborder",
      "scrolling",
      "referrerpolicy"
    ],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"]
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: {
    img: ["http", "https"]
  },
  allowedIframeHostnames: [
    "www.youtube.com",
    "youtube.com",
    "www.youtube-nocookie.com",
    "player.vimeo.com",
    "www.google.com",
    "maps.google.com",
    "open.spotify.com"
  ],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      rel: "noreferrer",
      target: "_blank"
    }),
    iframe: sanitizeHtml.simpleTransform("iframe", {
      loading: "lazy"
    })
  }
};

export function isHtmlContent(content: string) {
  return htmlTagPattern.test(content);
}

export function sanitizePostHtml(content: string) {
  return sanitizeHtml(content, postHtmlSanitizeOptions).trim();
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const inlinePattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlinePattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];

    if (token.startsWith("**")) {
      nodes.push(<strong key={`${token}-${match.index}`}>{token.slice(2, -2)}</strong>);
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);

      if (linkMatch) {
        nodes.push(
          <a
            key={`${token}-${match.index}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
          >
            {linkMatch[1]}
          </a>
        );
      }
    }

    lastIndex = inlinePattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function renderMarkdownContent(markdownText: string) {
  const blocks: ReactNode[] = [];
  const lines = markdownText.replace(/\r\n/g, "\n").split("\n");
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  function flushParagraph() {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push(
      <p key={`paragraph-${blocks.length}`}>
        {renderInlineMarkdown(paragraphLines.join(" "))}
      </p>
    );
    paragraphLines = [];
  }

  function flushList() {
    if (listItems.length === 0) {
      return;
    }

    blocks.push(
      <ul key={`list-${blocks.length}`}>
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`}>{renderInlineMarkdown(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    const headingMatch = line.match(/^(#{2,4})\s+(.+)$/);

    if (headingMatch) {
      flushParagraph();
      flushList();
      const HeadingTag = headingMatch[1].length <= 2 ? "h2" : "h3";

      blocks.push(
        <HeadingTag key={`heading-${blocks.length}`}>
          {renderInlineMarkdown(headingMatch[2].trim())}
        </HeadingTag>
      );
      return;
    }

    const listMatch = line.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);

    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1].trim());
      return;
    }

    paragraphLines.push(line);
  });

  flushParagraph();
  flushList();

  return blocks.length > 0 ? blocks : <p>這篇文章尚未提供內容。</p>;
}

export function getPlainTextFromMarkdown(markdownText: string) {
  const withoutHtml = sanitizeHtml(markdownText, {
    allowedTags: [],
    allowedAttributes: {}
  });

  return withoutHtml
    .replace(/\r\n/g, "\n")
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getPostDescription(markdownText: string, maxLength = 150) {
  const plainText = getPlainTextFromMarkdown(markdownText);

  if (plainText.length <= maxLength) {
    return plainText || "NOMAD-GO 遊牧專欄文章。";
  }

  return `${plainText.slice(0, maxLength).trim()}...`;
}
