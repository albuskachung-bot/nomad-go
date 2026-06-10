import {
  AlertTriangle,
  ArrowUpRight,
  Brain,
  BriefcaseBusiness,
  Router,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import WeatherCard from "@/components/WeatherCard";
import { getTools } from "@/lib/data";

export const dynamic = "force-dynamic";

const categoryIcons = {
  "跨國網路與通訊": Router,
  "生產力與大腦擴充": Brain,
  "跨國資安與防護": ShieldCheck,
  "工作環境與差旅": BriefcaseBusiness
};

export default async function ToolkitPage() {
  const tools = await getTools();

  return (
    <div className="bg-gray-50">
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-600">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Toolkit
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-normal text-gray-900 sm:text-5xl">
              出發工具
            </h1>
            <p className="mt-4 text-lg leading-8 text-gray-500">
              數位遊牧生存百寶箱：整理跨國網路、生產力、資安與 workation 差旅工具，讓出發前的準備更穩。
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <WeatherCard />

          {tools.map((tool) => {
            const Icon =
              categoryIcons[tool.category as keyof typeof categoryIcons] ?? BriefcaseBusiness;

            return (
              <article
                key={tool.id}
                className="flex h-full flex-col rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 transition duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {tool.category}
                  </span>
                </div>

                <h2 className="mt-5 text-xl font-semibold tracking-normal text-gray-900">
                  {tool.name}
                </h2>
                <p className="mt-3 text-sm leading-6 text-gray-500">{tool.description}</p>

                {tool.warning ? (
                  <div className="mt-5 rounded-lg border border-orange-100 bg-orange-50 p-4 text-sm leading-6 text-orange-800">
                    <div className="flex gap-2">
                      <AlertTriangle
                        className="mt-0.5 h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{tool.warning}</span>
                    </div>
                  </div>
                ) : null}

                <div className="mb-6 mt-5 flex flex-wrap gap-2">
                  {tool.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <a
                  href={tool.url ?? "https://example.com"}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-md"
                >
                  查看詳情
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
