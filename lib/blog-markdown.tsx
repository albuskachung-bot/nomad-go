import type { ReactNode } from "react";

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
  return markdownText
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
