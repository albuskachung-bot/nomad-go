import Link from "next/link";
import { ArrowLeft, Building2, Globe2, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import JobApplyModal from "@/components/jobs/JobApplyModal";
import { mockJobs } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Company, Job } from "@/lib/types";

type JobDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const sectionHeadings = new Set([
  "工作職責",
  "職務內容",
  "必備條件",
  "必要條件",
  "加分條件",
  "公司福利",
  "福利制度",
  "關於你",
  "Responsibilities",
  "Requirements",
  "Nice to haves",
  "Benefits"
]);

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

function renderJobDescription(markdownText: string) {
  const blocks: ReactNode[] = [];
  const lines = markdownText.replace(/\r\n/g, "\n").split("\n");
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  function flushParagraph() {
    if (paragraphLines.length === 0) {
      return;
    }

    const key = `paragraph-${blocks.length}`;

    if (paragraphLines.length > 1) {
      blocks.push(
        <ul key={key}>
          {paragraphLines.map((line, index) => (
            <li key={`${line}-${index}`}>{renderInlineMarkdown(line)}</li>
          ))}
        </ul>
      );
    } else {
      blocks.push(<p key={key}>{renderInlineMarkdown(paragraphLines[0])}</p>);
    }

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

    const markdownHeading = line.match(/^(#{2,4})\s+(.+)$/);

    if (markdownHeading) {
      flushParagraph();
      flushList();
      const HeadingTag = markdownHeading[1].length <= 2 ? "h2" : "h3";
      blocks.push(
        <HeadingTag key={`heading-${blocks.length}`}>
          {renderInlineMarkdown(markdownHeading[2].trim())}
        </HeadingTag>
      );
      return;
    }

    const normalizedHeading = line.replace(/[：:]\s*$/, "");

    if (sectionHeadings.has(normalizedHeading)) {
      flushParagraph();
      flushList();
      blocks.push(<h3 key={`heading-${blocks.length}`}>{normalizedHeading}</h3>);
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

  return blocks.length > 0 ? blocks : <p>此職缺尚未提供完整描述。</p>;
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  let job: Job | null = mockJobs.find((item) => item.id === id) ?? null;
  let company: Company | null = null;

  if (supabase) {
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();

    job = (data as Job | null) ?? job;

    if (job?.company_id) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .eq("id", job.company_id)
        .maybeSingle();

      company = (companyData as Company | null) ?? null;
    } else if (job?.employer_id) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .eq("employer_id", job.employer_id)
        .maybeSingle();

      company = (companyData as Company | null) ?? null;
    }
  }

  if (!job) {
    return (
      <main className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900">找不到職缺</h1>
          <Link href="/jobs" className="mt-5 inline-flex text-sm font-semibold text-blue-600">
            返回職缺列表
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
          <Link href="/jobs" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回職缺列表
          </Link>

          <div className="mt-8">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {job.job_type}
            </span>
            <h1 className="mt-4 text-4xl font-semibold tracking-normal text-gray-900">
              {job.title}
            </h1>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4" aria-hidden="true" />
                {job.company}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {job.location}
              </span>
            </div>
          </div>

          <div className="prose prose-blue mt-8 max-w-none prose-headings:tracking-normal prose-h2:text-2xl prose-h3:text-xl prose-p:leading-8 prose-li:leading-7">
            {renderJobDescription(job.description)}
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {job.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {tag}
              </span>
            ))}
          </div>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="text-base font-semibold text-gray-900">雇主資訊</h2>
            <div className="mt-5 flex items-center gap-3">
              {company?.logo_url ? (
                <div
                  className="h-12 w-12 rounded-xl bg-gray-100 bg-contain bg-center bg-no-repeat ring-1 ring-gray-200"
                  style={{ backgroundImage: `url(${company.logo_url})` }}
                  aria-hidden="true"
                />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <Building2 className="h-5 w-5" aria-hidden="true" />
                </span>
              )}
              <div>
                <div className="font-semibold text-gray-900">{company?.name ?? job.company}</div>
                {company?.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
                  >
                    <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
                    官方網站
                  </a>
                ) : null}
              </div>
            </div>
            {company?.description ? (
              <p className="mt-5 text-sm leading-6 text-gray-500">{company.description}</p>
            ) : null}
          </div>

          <JobApplyModal
            jobId={job.id}
            jobTitle={job.title}
            companyName={company?.name ?? job.company}
            screeningQuestions={job.screening_questions}
          />
        </aside>
      </div>
    </main>
  );
}
