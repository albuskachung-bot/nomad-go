import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BriefcaseBusiness,
  Building2,
  Inbox,
  MessageSquareText,
  Send
} from "lucide-react";
import { sendApplicantMessage } from "@/app/dashboard/applications/messages/actions";
import { getWorkspaceErrorMessage } from "@/lib/employer-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Application, Company, Job, Message } from "@/lib/types";

type ApplicantMessagesPageProps = {
  searchParams?: Promise<{
    application_id?: string | string[];
    error?: string | string[];
  }>;
};

type ApplicantConversation = {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  unreadCount: number;
  lastMessage: Message | null;
};

type ApplicantInboxData = {
  conversations: ApplicantConversation[];
  selectedConversation: ApplicantConversation | null;
  selectedMessages: Message[];
  viewerId: string;
  error: string | null;
};

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "C";
}

function groupMessagesByApplication(messages: Message[]) {
  return messages.reduce<Map<string, Message[]>>((map, message) => {
    const current = map.get(message.application_id) ?? [];
    current.push(message);
    map.set(message.application_id, current);
    return map;
  }, new Map<string, Message[]>());
}

async function loadApplicantInbox(selectedApplicationId: string | null): Promise<ApplicantInboxData> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      conversations: [],
      selectedConversation: null,
      selectedMessages: [],
      viewerId: "",
      error: "尚未設定 Supabase 環境變數，無法讀取訊息中心。"
    };
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/");
  }

  const { data: applicationRows, error: applicationError } = await supabase
    .from("applications")
    .select("id,user_id,job_id,status,resume_url,cover_letter,applied_at")
    .eq("user_id", user.id)
    .order("applied_at", { ascending: false });

  if (applicationError) {
    return {
      conversations: [],
      selectedConversation: null,
      selectedMessages: [],
      viewerId: user.id,
      error: getWorkspaceErrorMessage(applicationError)
    };
  }

  const applications = (applicationRows ?? []) as Application[];
  const applicationIds = applications.map((application) => application.id);

  if (applicationIds.length === 0) {
    return {
      conversations: [],
      selectedConversation: null,
      selectedMessages: [],
      viewerId: user.id,
      error: null
    };
  }

  const jobIds = Array.from(new Set(applications.map((application) => application.job_id)));
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("*")
    .in("id", jobIds);

  if (jobsError) {
    return {
      conversations: [],
      selectedConversation: null,
      selectedMessages: [],
      viewerId: user.id,
      error: getWorkspaceErrorMessage(jobsError)
    };
  }

  const typedJobs = (jobs ?? []) as Job[];
  const companyIds = Array.from(
    new Set(typedJobs.map((job) => job.company_id).filter((companyId): companyId is string => Boolean(companyId)))
  );

  const { data: companies, error: companiesError } = companyIds.length
    ? await supabase.from("companies").select("*").in("id", companyIds)
    : { data: [], error: null };

  if (companiesError) {
    return {
      conversations: [],
      selectedConversation: null,
      selectedMessages: [],
      viewerId: user.id,
      error: getWorkspaceErrorMessage(companiesError)
    };
  }

  const { data: messageRows, error: messagesError } = await supabase
    .from("messages")
    .select("*")
    .in("application_id", applicationIds)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return {
      conversations: [],
      selectedConversation: null,
      selectedMessages: [],
      viewerId: user.id,
      error: getWorkspaceErrorMessage(messagesError)
    };
  }

  const typedCompanies = (companies ?? []) as Company[];
  const typedMessages = (messageRows ?? []) as Message[];
  const jobsById = new Map(typedJobs.map((job) => [job.id, job]));
  const companiesById = new Map(typedCompanies.map((company) => [company.id, company]));
  const messagesByApplication = groupMessagesByApplication(typedMessages);

  const conversations = applications
    .map<ApplicantConversation | null>((application) => {
      const messages = messagesByApplication.get(application.id) ?? [];
      const shouldShow = messages.length > 0 || application.id === selectedApplicationId;

      if (!shouldShow) {
        return null;
      }

      const job = jobsById.get(application.job_id) ?? null;
      const company = job?.company_id ? companiesById.get(job.company_id) : null;

      return {
        applicationId: application.id,
        jobId: application.job_id,
        jobTitle: job?.title ?? "職缺資料目前不可用",
        companyName: company?.name ?? job?.company ?? "未命名公司",
        unreadCount: messages.filter((message) => message.sender_id !== user.id && !message.is_read).length,
        lastMessage: messages.at(-1) ?? null
      };
    })
    .filter((conversation): conversation is ApplicantConversation => conversation !== null)
    .sort((left, right) => {
      const leftTime = left.lastMessage ? new Date(left.lastMessage.created_at).getTime() : 0;
      const rightTime = right.lastMessage ? new Date(right.lastMessage.created_at).getTime() : 0;
      return rightTime - leftTime;
    });

  const selectedConversation =
    conversations.find((conversation) => conversation.applicationId === selectedApplicationId) ??
    conversations[0] ??
    null;

  return {
    conversations,
    selectedConversation,
    selectedMessages: selectedConversation
      ? messagesByApplication.get(selectedConversation.applicationId) ?? []
      : [],
    viewerId: user.id,
    error: null
  };
}

export default async function ApplicantMessagesPage({ searchParams }: ApplicantMessagesPageProps) {
  const params = searchParams ? await searchParams : {};
  const selectedApplicationId = readParam(params.application_id)?.trim() || null;
  const actionError = readParam(params.error)?.trim() || null;
  const { conversations, selectedConversation, selectedMessages, viewerId, error } =
    await loadApplicantInbox(selectedApplicationId);

  return (
    <main className="min-h-screen bg-sky-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Inbox
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">站內訊息</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              與企業團隊溝通面試安排、補件需求與後續流程。
            </p>
          </div>
          <Link
            href="/dashboard/applications"
            className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-emerald-100 transition hover:bg-emerald-50"
          >
            返回投遞紀錄
          </Link>
        </section>

        {error || actionError ? (
          <section className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
            {error ?? actionError}
          </section>
        ) : null}

        <section className="grid min-h-[680px] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-emerald-100 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="border-b border-emerald-100 lg:border-b-0 lg:border-r">
            <div className="border-b border-emerald-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-950">企業對話</h2>
            </div>

            {conversations.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {conversations.map((conversation) => {
                  const isActive = conversation.applicationId === selectedConversation?.applicationId;

                  return (
                    <Link
                      key={conversation.applicationId}
                      href={`/dashboard/applications/messages?application_id=${conversation.applicationId}`}
                      className={`flex gap-3 px-5 py-4 transition ${
                        isActive ? "bg-emerald-50" : "hover:bg-emerald-50/60"
                      }`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
                        {getInitial(conversation.companyName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-950">
                            {conversation.companyName}
                          </span>
                          {conversation.unreadCount > 0 ? (
                            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                              {conversation.unreadCount}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block truncate text-xs text-slate-500">
                          {conversation.jobTitle}
                        </span>
                        <span className="mt-2 block truncate text-xs text-slate-400">
                          {conversation.lastMessage?.content ?? "尚無訊息，開始第一則聯絡。"}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="px-6 py-14 text-center">
                <Inbox className="mx-auto h-10 w-10 text-emerald-200" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-slate-600">目前沒有對話紀錄。</p>
              </div>
            )}
          </aside>

          <section className="flex min-h-[680px] flex-col">
            {selectedConversation ? (
              <>
                <header className="flex flex-col gap-4 border-b border-emerald-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-base font-semibold text-white">
                      {getInitial(selectedConversation.companyName)}
                    </span>
                    <div>
                      <h2 className="text-base font-semibold text-slate-950">
                        {selectedConversation.companyName}
                      </h2>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
                        {selectedConversation.jobTitle}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/jobs/${selectedConversation.jobId}`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-emerald-100 transition hover:bg-emerald-50"
                  >
                    <Building2 className="h-4 w-4" aria-hidden="true" />
                    查看職缺
                  </Link>
                </header>

                <div className="flex-1 space-y-4 overflow-y-auto bg-emerald-50/40 px-6 py-6">
                  {selectedMessages.length > 0 ? (
                    selectedMessages.map((message) => {
                      const isMine = message.sender_id === viewerId;

                      return (
                        <article
                          key={message.id}
                          className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                              isMine
                                ? "bg-emerald-600 text-white"
                                : "bg-white text-slate-700 ring-1 ring-emerald-100"
                            }`}
                          >
                            <p className="whitespace-pre-line leading-6">{message.content}</p>
                            <time
                              dateTime={message.created_at}
                              className={`mt-2 block text-xs ${
                                isMine ? "text-emerald-100" : "text-slate-400"
                              }`}
                            >
                              {formatDateTime(message.created_at)}
                            </time>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="flex h-full min-h-[360px] items-center justify-center text-center">
                      <div>
                        <MessageSquareText className="mx-auto h-11 w-11 text-emerald-200" aria-hidden="true" />
                        <p className="mt-3 text-sm font-medium text-slate-600">
                          尚無訊息，從下方輸入框開始聯絡企業。
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <form action={sendApplicantMessage} className="border-t border-emerald-100 p-5">
                  <input type="hidden" name="application_id" value={selectedConversation.applicationId} />
                  <label className="sr-only" htmlFor="applicant-message-content">
                    輸入訊息
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <textarea
                      id="applicant-message-content"
                      name="content"
                      rows={3}
                      required
                      maxLength={4000}
                      placeholder="輸入想詢問的面試安排、補件或職缺問題..."
                      className="min-h-24 flex-1 rounded-xl border border-emerald-100 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      <Send className="h-4 w-4" aria-hidden="true" />
                      送出
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center px-6 py-16 text-center">
                <div>
                  <Building2 className="mx-auto h-12 w-12 text-emerald-200" aria-hidden="true" />
                  <h2 className="mt-4 text-base font-semibold text-slate-950">選擇一個對話</h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    從投遞進度追蹤頁點擊「聯絡企業」即可建立新的站內訊息對話。
                  </p>
                </div>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
