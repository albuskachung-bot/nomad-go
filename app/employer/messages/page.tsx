import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BriefcaseBusiness,
  FileText,
  Inbox,
  MessageSquareText,
  UserRound
} from "lucide-react";
import EmployerMessageComposer from "@/app/employer/components/EmployerMessageComposer";
import { getEmployerWorkspaceContext, getWorkspaceErrorMessage } from "@/lib/employer-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CompanyApplicationWithNotes, Job, Message, Profile } from "@/lib/types";

type EmployerMessagesPageProps = {
  searchParams?: Promise<{
    application_id?: string | string[];
    error?: string | string[];
  }>;
};

type EmployerConversation = {
  applicationId: string;
  applicantId: string;
  applicantName: string;
  applicantTitle: string | null;
  jobTitle: string;
  unreadCount: number;
  lastMessage: Message | null;
};

type EmployerInboxData = {
  conversations: EmployerConversation[];
  selectedConversation: EmployerConversation | null;
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
  return name.trim().slice(0, 1).toUpperCase() || "U";
}

function groupMessagesByApplication(messages: Message[]) {
  return messages.reduce<Map<string, Message[]>>((map, message) => {
    const current = map.get(message.application_id) ?? [];
    current.push(message);
    map.set(message.application_id, current);
    return map;
  }, new Map<string, Message[]>());
}

async function loadEmployerInbox(selectedApplicationId: string | null): Promise<EmployerInboxData> {
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

  const workspace = await getEmployerWorkspaceContext(supabase, user.id);

  if (workspace.error) {
    return {
      conversations: [],
      selectedConversation: null,
      selectedMessages: [],
      viewerId: user.id,
      error: workspace.error
    };
  }

  if (!workspace.context?.company) {
    return {
      conversations: [],
      selectedConversation: null,
      selectedMessages: [],
      viewerId: user.id,
      error: "找不到可管理的公司 workspace。"
    };
  }

  const { data: applicationRows, error: applicationError } = await supabase.rpc(
    "get_company_applications_with_notes",
    {
      target_company_id: workspace.context.company.id
    }
  );

  if (applicationError) {
    return {
      conversations: [],
      selectedConversation: null,
      selectedMessages: [],
      viewerId: user.id,
      error: getWorkspaceErrorMessage(applicationError)
    };
  }

  const applications = (applicationRows ?? []) as CompanyApplicationWithNotes[];
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
  const applicantIds = Array.from(new Set(applications.map((application) => application.user_id)));

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

  const { data: profiles, error: profilesError } = applicantIds.length
    ? await supabase.from("profiles").select("*").in("id", applicantIds)
    : { data: [], error: null };

  if (profilesError) {
    return {
      conversations: [],
      selectedConversation: null,
      selectedMessages: [],
      viewerId: user.id,
      error: getWorkspaceErrorMessage(profilesError)
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

  const typedJobs = (jobs ?? []) as Job[];
  const typedProfiles = (profiles ?? []) as Profile[];
  const typedMessages = (messageRows ?? []) as Message[];
  const jobsById = new Map(typedJobs.map((job) => [job.id, job]));
  const profilesById = new Map(typedProfiles.map((profile) => [profile.id, profile]));
  const messagesByApplication = groupMessagesByApplication(typedMessages);

  const conversations = applications
    .map<EmployerConversation | null>((application) => {
      const messages = messagesByApplication.get(application.id) ?? [];
      const shouldShow = messages.length > 0 || application.id === selectedApplicationId;

      if (!shouldShow) {
        return null;
      }

      const profile = profilesById.get(application.user_id) ?? null;
      const job = jobsById.get(application.job_id) ?? null;
      const applicantName =
        profile?.full_name?.trim() ||
        application.applicant_email?.split("@")[0] ||
        application.user_id;

      return {
        applicationId: application.id,
        applicantId: application.user_id,
        applicantName,
        applicantTitle: profile?.title ?? profile?.location ?? null,
        jobTitle: job?.title ?? "職缺資料目前不可用",
        unreadCount: messages.filter((message) => message.sender_id === application.user_id && !message.is_read)
          .length,
        lastMessage: messages.at(-1) ?? null
      };
    })
    .filter((conversation): conversation is EmployerConversation => conversation !== null)
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

export default async function EmployerMessagesPage({ searchParams }: EmployerMessagesPageProps) {
  const params = searchParams ? await searchParams : {};
  const selectedApplicationId = readParam(params.application_id)?.trim() || null;
  const actionError = readParam(params.error)?.trim() || null;
  const { conversations, selectedConversation, selectedMessages, viewerId, error } =
    await loadEmployerInbox(selectedApplicationId);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Inbox
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">訊息中心</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            與應徵者集中溝通後續面試安排，訊息會綁定到單一應徵紀錄。
          </p>
        </div>
        <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
          {conversations.length} 個對話
        </div>
      </section>

      {error || actionError ? (
        <section className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
          {error ?? actionError}
        </section>
      ) : null}

      <section className="grid min-h-[680px] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-950">應徵者對話</h2>
          </div>

          {conversations.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {conversations.map((conversation) => {
                const isActive = conversation.applicationId === selectedConversation?.applicationId;

                return (
                  <Link
                    key={conversation.applicationId}
                    href={`/employer/messages?application_id=${conversation.applicationId}`}
                    className={`flex gap-3 px-5 py-4 transition ${
                      isActive ? "bg-slate-100" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                      {getInitial(conversation.applicantName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-slate-950">
                          {conversation.applicantName}
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
              <Inbox className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-slate-600">目前沒有對話紀錄。</p>
            </div>
          )}
        </aside>

        <main className="flex min-h-[680px] flex-col">
          {selectedConversation ? (
            <>
              <header className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-base font-semibold text-white">
                    {getInitial(selectedConversation.applicantName)}
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">
                      {selectedConversation.applicantName}
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
                      {selectedConversation.jobTitle}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/employer/applicants/${selectedConversation.applicantId}`}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  查看履歷
                </Link>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-6 py-6">
                {selectedMessages.length > 0 ? (
                  selectedMessages.map((message) => {
                    const isCompanyMessage = message.sender_id !== selectedConversation.applicantId;

                    return (
                      <article
                        key={message.id}
                        className={`flex ${isCompanyMessage ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                            isCompanyMessage
                              ? "bg-slate-950 text-white"
                              : "bg-white text-slate-700 ring-1 ring-slate-200"
                          }`}
                        >
                          <p className="whitespace-pre-line leading-6">{message.content}</p>
                          <time
                            dateTime={message.created_at}
                            className={`mt-2 block text-xs ${
                              isCompanyMessage ? "text-slate-300" : "text-slate-400"
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
                      <MessageSquareText className="mx-auto h-11 w-11 text-slate-300" aria-hidden="true" />
                      <p className="mt-3 text-sm font-medium text-slate-600">
                        尚無訊息，從下方輸入框開始聯絡應徵者。
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <EmployerMessageComposer applicationId={selectedConversation.applicationId} />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 py-16 text-center">
              <div>
                <UserRound className="mx-auto h-12 w-12 text-slate-300" aria-hidden="true" />
                <h2 className="mt-4 text-base font-semibold text-slate-950">選擇一個對話</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  從應徵者管理頁點擊「發送站內信」即可建立新的站內訊息對話。
                </p>
              </div>
            </div>
          )}
        </main>
      </section>
    </div>
  );
}
