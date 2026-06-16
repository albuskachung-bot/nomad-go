export type Job = {
  id: string;
  title: string;
  company: string;
  company_name?: string | null;
  location: string;
  job_type: string;
  category: string | null;
  experience_level: string | null;
  employment_type: string | null;
  salary_range: string | null;
  tags: string[];
  description: string;
  responsibilities: string | null;
  requirements: string | null;
  nice_to_haves: string | null;
  benefits: string | null;
  screening_questions?: string[] | null;
  apply_url: string | null;
  is_featured: boolean;
  employer_id: string | null;
  company_id?: string | null;
  rejection_reason: string | null;
  status: JobStatus;
  created_at: string;
};

export type Transaction = {
  id: string;
  transaction_id: string;
  company_name: string;
  tax_id: string | null;
  plan_name: string | null;
  amount: number;
  status: string;
  created_at: string;
};

export type ProfileView = {
  id: string;
  viewer_company_id: string;
  viewer_company_name: string;
  target_user_id: string;
  viewed_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  content: string;
  link_url: string | null;
  action_url: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

export type Guide = {
  id: string;
  city: string;
  country: string;
  region: string;
  summary: string;
  cover_image_url: string | null;
  monthly_budget_usd: number | null;
  internet_speed_mbps: number | null;
  timezone: string | null;
  tags: string[];
  is_featured: boolean;
  status: ContentStatus;
  created_at: string;
};

export type CityGuide = {
  id: string;
  city_name: string;
  country: string;
  budget_est: string;
  internet_speed: string;
  timezone: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
};

export type Tool = {
  id: string;
  name: string;
  category: string;
  description: string;
  url: string | null;
  pricing: string | null;
  warning: string | null;
  tags: string[];
  is_featured: boolean;
  created_at: string;
};

export type ContentStatus = "pending" | "published" | "rejected";
export type JobStatus = "draft" | "pending" | "reviewed" | "published" | "closed" | "rejected";

export type ProfileRole =
  | "member"
  | "super_admin"
  | "editor"
  | "reviewer";

export type AccountType = "employer" | "nomad" | "talent";
export type CompanyApprovalStatus = "pending" | "approved" | "rejected";
export type CompanySubscriptionPlan = "free" | "pro" | "boost";
export type TalentSubscriptionPlan = "free" | "pro" | "vip";
export type EdmProvider = "none" | "sendgrid" | "ses";
export type EdmCampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "waiting_for_ab_result"
  | "completed";
export type EdmAudienceSegment = "all" | "paid" | "free";
export type EdmVariant = "a" | "b" | "winner";
export type EdmRecipientStatus =
  | "queued"
  | "sent"
  | "waiting_for_ab_result"
  | "skipped";
export type EdmAutomationTrigger =
  | "cart_abandoned"
  | "esim_expiry_reminder"
  | "pre_trip"
  | "re_engagement";
export type EdmAutomationLogStatus = "sent" | "failed" | "skipped";
export type EdmTrackingEventType =
  | "delivered"
  | "open"
  | "click"
  | "bounce"
  | "spam_report";
export type EdmOmnichannelChannel = "whatsapp" | "sms";
export type EdmOmnichannelStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "failed"
  | "skipped";
export type PlatformPlacementLocation =
  | "announcement_bar"
  | "hero_banner"
  | "in_feed_ad";

export type EdmCommunicationPreferences = {
  email?: boolean;
  sms?: boolean;
  whatsapp?: boolean;
  phone_number?: string | null;
  sms_to?: string | null;
  whatsapp_to?: string | null;
};

export type EdmTargetSegment = {
  audience: EdmAudienceSegment;
};

export type ProfileWorkExperience = {
  company: string;
  job_title: string;
  start_date: string;
  end_date: string | null;
  description: string;
};

export type ProfileEducation = {
  school: string;
  degree: string;
  graduation_year: string;
};

export type Profile = {
  id: string;
  role: ProfileRole;
  account_type: AccountType | null;
  full_name: string | null;
  title: string | null;
  job_title?: string | null;
  avatar_url: string | null;
  banner_url?: string | null;
  bio: string | null;
  skills: string[];
  location: string | null;
  status: ContentStatus;
  is_featured: boolean;
  is_featured_talent?: boolean | null;
  featured_sort_order?: number | null;
  is_banned: boolean;
  timezone: string | null;
  languages: string[];
  work_type: string[];
  portfolio_url: string | null;
  social_urls: Record<string, string>;
  work_experience: ProfileWorkExperience[];
  education: ProfileEducation[];
  is_public?: boolean;
  is_virtual_author?: boolean;
  subscription_plan?: TalentSubscriptionPlan;
  direct_connect_tokens?: number | null;
  plan_expires_at?: string | null;
  free_ai_usage_count?: number;
  quota_reset_date?: string | null;
  communication_preferences?: EdmCommunicationPreferences;
  email_bounced?: boolean;
  last_opened_at?: string | null;
  edm_lifecycle_tags?: string[];
  sponsored_until: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicTalent = {
  id: string;
  account_type?: AccountType | null;
  full_name: string | null;
  title: string | null;
  job_title: string | null;
  avatar_url: string | null;
  skills: string[];
  location: string | null;
  timezone: string | null;
  work_type: string[];
  is_featured: boolean;
  is_featured_talent?: boolean | null;
  featured_sort_order?: number | null;
  status?: ContentStatus;
  is_public?: boolean;
  updated_at: string;
};

export type Company = {
  id: string;
  employer_id: string;
  name: string;
  logo_url: string | null;
  banner_url?: string | null;
  website: string | null;
  description: string | null;
  approval_status: CompanyApprovalStatus;
  industry?: string | null;
  company_size?: string | null;
  hq_location?: string | null;
  headquarters?: string | null;
  remote_policy?: string | null;
  perks_tags?: string[] | null;
  benefit_tags?: string[] | null;
  tech_stack?: string[] | null;
  team_locations?: string[] | null;
  culture_video_url?: string | null;
  tax_id: string | null;
  verification_doc_url: string | null;
  subscription_plan?: CompanySubscriptionPlan;
  plan_expires_at?: string | null;
  max_active_jobs?: number;
  unlocked_applicants_count?: number;
  free_unlock_limit?: number;
  applicant_unlock_reset_date?: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyMemberRole = "admin" | "recruiter";

export type CompanyMember = {
  id: string;
  company_id: string;
  user_id: string;
  role: CompanyMemberRole;
  created_at: string;
};

export type CompanyInviteStatus = "pending" | "accepted";

export type CompanyInvite = {
  id: string;
  company_id: string;
  token: string;
  email: string | null;
  status: CompanyInviteStatus;
  expires_at: string;
  created_by: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
};

export type CompanyInviteLookup = {
  invite_id: string;
  company_id: string;
  company_name: string;
  email: string | null;
  status: CompanyInviteStatus;
  expires_at: string;
  is_expired: boolean;
};

export type CompanyTeamMember = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: CompanyMemberRole;
  created_at: string;
};

export type Talent = {
  id: string;
  profile_id: string | null;
  headline: string;
  summary: string;
  portfolio_url: string | null;
  skills: string[];
  location: string | null;
  is_featured: boolean;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  category: string;
  content: string;
  tags: string[];
  cover_image_url: string | null;
  is_published: boolean;
  is_official?: boolean;
  created_at: string;
  updated_at: string;
};

export type SiteSettings = {
  id: number;
  hero_title: string;
  hero_subtitle: string;
  hero_image_url: string;
  announcement_text: string | null;
  announcement_enabled: boolean;
  footer_description: string;
  contact_email: string;
  social_links: Record<string, string>;
  updated_at: string;
};

export type PlatformSetting = {
  key_name: string;
  key_value: string;
  updated_at: string;
};

export type PlatformPlacement = {
  id: string;
  location: PlatformPlacementLocation;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  link_text: string | null;
  is_active: boolean;
  is_marquee: boolean;
  marquee_speed: number;
  sort_order: number;
};

export type TalentPool = {
  id: string;
  full_name: string;
  job_title: string;
  timezone: string;
  available_hours: string;
  skills: string[];
  avatar_url: string | null;
  is_active: boolean;
  sort_order: number;
};

export type UsageQuotaRpcRow = {
  allowed: boolean;
  reason: string | null;
  usage_count: number;
  free_limit: number;
  reset_date: string | null;
  subscription_plan: TalentSubscriptionPlan;
};

export type DirectConnectRpcRow = {
  application_id: string;
  remaining_tokens: number;
};

export type CreateApplicationRpcRow = {
  application_id: string;
  owner_id: string;
  job_title: string;
  company_name: string;
};

export type OrderStatus = "pending" | "paid" | "failed";

export type Order = {
  id: string;
  user_id: string;
  stripe_session_id: string;
  amount: number;
  status: OrderStatus;
  checkout_type: string;
  product_type?: string | null;
  plan_id?: string | null;
  plan_name?: string | null;
  company_id?: string | null;
  company_name?: string | null;
  tax_id?: string | null;
  stripe_customer_id?: string | null;
  paid_at?: string | null;
  departure_at?: string | null;
  created_at: string;
};

export type SavedItemType = "job" | "guide" | "tool";

export type SavedItem = {
  id: string;
  user_id: string;
  item_type: SavedItemType;
  item_id: string;
  created_at: string;
};

export type ApplicationStatus = "pending" | "reviewed" | "interview" | "rejected" | "hired";

export type ScreeningAnswer = {
  question: string;
  answer: string;
};

export type Application = {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  resume_url: string;
  cover_letter: string | null;
  screening_answers?: ScreeningAnswer[] | null;
  internal_notes: string | null;
  applied_at: string;
};

export type Message = {
  id: string;
  application_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

export type CompanyApplicationWithNotes = Application & {
  applicant_email: string | null;
  contact_unlocked?: boolean;
};

export type EmployerApplicantUnlockRpcRow = {
  allowed: boolean;
  reason: string | null;
  application_id: string | null;
  applicant_id: string | null;
  applicant_email: string | null;
  unlocked_count: number;
  unlock_limit: number;
  reset_date: string | null;
  subscription_plan: CompanySubscriptionPlan;
  already_unlocked: boolean;
  portfolio_url: string | null;
  social_urls: Record<string, string>;
};

export type EdmSettings = {
  id: string;
  provider: EdmProvider;
  api_key: string | null;
  sender_name: string | null;
  sender_email: string | null;
  created_at: string;
  updated_at: string;
};

export type EdmCampaign = {
  id: string;
  name: string;
  subject: string;
  content: string;
  target_segment: EdmTargetSegment;
  status: EdmCampaignStatus;
  scheduled_at: string | null;
  created_by: string | null;
  is_ab_test?: boolean;
  variant_a_subject?: string | null;
  variant_b_subject?: string | null;
  test_percentage?: number;
  test_duration_hours?: number;
  winning_variant?: "a" | "b" | null;
  created_at: string;
  updated_at: string;
};

export type EdmAutomationRule = {
  id: string;
  name: string;
  event_trigger: EdmAutomationTrigger;
  delay_hours: number;
  email_subject: string;
  email_content: string;
  is_active: boolean;
  is_critical?: boolean;
  fallback_delay_hours?: number;
  fallback_message?: string | null;
  created_at: string;
  updated_at: string;
};

export type EdmAutomationLog = {
  id: string;
  rule_id: string;
  user_id: string | null;
  reference_id?: string | null;
  recipient_email?: string | null;
  email_sent_at?: string | null;
  opened_at?: string | null;
  fallback_channel?: EdmOmnichannelChannel | null;
  fallback_sent_at?: string | null;
  triggered_at: string;
  status: EdmAutomationLogStatus;
};

export type EdmCampaignMetrics = {
  campaign_id: string;
  sent_count: number;
  delivered_count: number;
  open_count: number;
  click_count: number;
  bounce_count: number;
  created_at: string;
  updated_at: string;
};

export type EdmTrackingLog = {
  id: string;
  campaign_id: string | null;
  automation_log_id?: string | null;
  automation_rule_id?: string | null;
  recipient_email: string;
  event_type: EdmTrackingEventType;
  url: string | null;
  variant?: EdmVariant | null;
  created_at: string;
};

export type EdmDynamicBlock = {
  id: string;
  name: string;
  target_role: string;
  html_content: string;
  created_at: string;
  updated_at: string;
};

export type EdmOmnichannelSettings = {
  id: string;
  provider: "twilio" | "none";
  account_sid: string | null;
  auth_token: string | null;
  messaging_service_sid?: string | null;
  sms_from: string | null;
  whatsapp_from: string | null;
  enabled_channels: Partial<Record<EdmOmnichannelChannel, boolean>>;
  created_at: string;
  updated_at: string;
};

export type EdmOmnichannelLog = {
  id: string;
  automation_log_id: string | null;
  automation_rule_id: string | null;
  campaign_id: string | null;
  user_id: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  channel: EdmOmnichannelChannel;
  provider: "twilio" | "none";
  provider_message_id: string | null;
  status: EdmOmnichannelStatus;
  message: string;
  conversion_event: string | null;
  conversion_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type EdmCampaignRecipient = {
  id: string;
  campaign_id: string;
  user_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  variant: EdmVariant | null;
  status: EdmRecipientStatus;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EdmCampaignVariantMetrics = {
  campaign_id: string;
  variant: EdmVariant;
  sent_count: number;
  delivered_count: number;
  open_count: number;
  click_count: number;
  bounce_count: number;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Profile>;
        Relationships: [];
      };
      jobs: {
        Row: Job;
        Insert: Omit<Job, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Job>;
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Transaction>;
        Relationships: [];
      };
      profile_views: {
        Row: ProfileView;
        Insert: Omit<ProfileView, "id" | "viewed_at"> & {
          id?: string;
          viewed_at?: string;
        };
        Update: Partial<ProfileView>;
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: Omit<
          Notification,
          | "id"
          | "created_at"
          | "is_read"
          | "title"
          | "message"
          | "content"
          | "link_url"
          | "action_url"
          | "metadata"
        > & {
          id?: string;
          title?: string;
          message?: string;
          content?: string;
          link_url?: string | null;
          action_url?: string | null;
          metadata?: Record<string, unknown>;
          is_read?: boolean;
          created_at?: string;
        };
        Update: Partial<Notification>;
        Relationships: [];
      };
      companies: {
        Row: Company;
        Insert: Omit<
          Company,
          "id" | "created_at" | "updated_at" | "approval_status" | "tax_id" | "verification_doc_url"
        > & {
          id?: string;
          approval_status?: CompanyApprovalStatus;
          tax_id?: string | null;
          verification_doc_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Company>;
        Relationships: [];
      };
      company_members: {
        Row: CompanyMember;
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          role?: CompanyMemberRole;
          created_at?: string;
        };
        Update: Partial<CompanyMember>;
        Relationships: [];
      };
      company_invites: {
        Row: CompanyInvite;
        Insert: {
          id?: string;
          company_id: string;
          token?: string;
          email?: string | null;
          status?: CompanyInviteStatus;
          expires_at?: string;
          created_by?: string | null;
          accepted_by?: string | null;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: Partial<CompanyInvite>;
        Relationships: [];
      };
      guides: {
        Row: Guide;
        Insert: Omit<Guide, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Guide>;
        Relationships: [];
      };
      city_guides: {
        Row: CityGuide;
        Insert: Omit<CityGuide, "id"> & {
          id?: string;
        };
        Update: Partial<CityGuide>;
        Relationships: [];
      };
      talents: {
        Row: Talent;
        Insert: Omit<Talent, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Talent>;
        Relationships: [];
      };
      talent_pool: {
        Row: TalentPool;
        Insert: Omit<TalentPool, "id"> & {
          id?: string;
        };
        Update: Partial<TalentPool>;
        Relationships: [];
      };
      posts: {
        Row: Post;
        Insert: Omit<Post, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Post>;
        Relationships: [];
      };
      tools: {
        Row: Tool;
        Insert: Omit<Tool, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Tool>;
        Relationships: [];
      };
      site_settings: {
        Row: SiteSettings;
        Insert: Partial<SiteSettings> & {
          id?: number;
        };
        Update: Partial<SiteSettings>;
        Relationships: [];
      };
      platform_settings: {
        Row: PlatformSetting;
        Insert: PlatformSetting | {
          key_name: string;
          key_value: string;
          updated_at?: string;
        };
        Update: Partial<PlatformSetting>;
        Relationships: [];
      };
      platform_placements: {
        Row: PlatformPlacement;
        Insert: Omit<PlatformPlacement, "id"> & {
          id?: string;
        };
        Update: Partial<PlatformPlacement>;
        Relationships: [];
      };
      edm_settings: {
        Row: EdmSettings;
        Insert: Omit<EdmSettings, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EdmSettings>;
        Relationships: [];
      };
      edm_campaigns: {
        Row: EdmCampaign;
        Insert: Omit<EdmCampaign, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EdmCampaign>;
        Relationships: [];
      };
      edm_dynamic_blocks: {
        Row: EdmDynamicBlock;
        Insert: Omit<EdmDynamicBlock, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EdmDynamicBlock>;
        Relationships: [];
      };
      edm_campaign_recipients: {
        Row: EdmCampaignRecipient;
        Insert: Omit<EdmCampaignRecipient, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EdmCampaignRecipient>;
        Relationships: [];
      };
      edm_omnichannel_settings: {
        Row: EdmOmnichannelSettings;
        Insert: Omit<EdmOmnichannelSettings, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EdmOmnichannelSettings>;
        Relationships: [];
      };
      edm_omnichannel_logs: {
        Row: EdmOmnichannelLog;
        Insert: Omit<EdmOmnichannelLog, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EdmOmnichannelLog>;
        Relationships: [];
      };
      edm_automation_rules: {
        Row: EdmAutomationRule;
        Insert: Omit<EdmAutomationRule, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EdmAutomationRule>;
        Relationships: [];
      };
      edm_automation_logs: {
        Row: EdmAutomationLog;
        Insert: Omit<EdmAutomationLog, "id" | "triggered_at"> & {
          id?: string;
          triggered_at?: string;
        };
        Update: Partial<EdmAutomationLog>;
        Relationships: [];
      };
      edm_campaign_metrics: {
        Row: EdmCampaignMetrics;
        Insert: Omit<EdmCampaignMetrics, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EdmCampaignMetrics>;
        Relationships: [];
      };
      edm_campaign_variant_metrics: {
        Row: EdmCampaignVariantMetrics;
        Insert: Omit<EdmCampaignVariantMetrics, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EdmCampaignVariantMetrics>;
        Relationships: [];
      };
      edm_tracking_logs: {
        Row: EdmTrackingLog;
        Insert: Omit<EdmTrackingLog, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<EdmTrackingLog>;
        Relationships: [];
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Order>;
        Relationships: [];
      };
      saved_items: {
        Row: SavedItem;
        Insert: Omit<SavedItem, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<SavedItem>;
        Relationships: [];
      };
      applications: {
        Row: Application;
        Insert: Omit<Application, "id" | "applied_at" | "internal_notes"> & {
          id?: string;
          internal_notes?: string | null;
          applied_at?: string;
        };
        Update: Partial<Application>;
        Relationships: [];
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, "id" | "created_at" | "is_read"> & {
          id?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: Partial<Message>;
        Relationships: [];
      };
    };
    Functions: {
      accept_company_invite: {
        Args: {
          target_token: string;
        };
        Returns: string;
      };
      get_company_invite_by_token: {
        Args: {
          target_token: string;
        };
        Returns: CompanyInviteLookup[];
      };
      get_company_applications_with_notes: {
        Args: {
          target_company_id: string;
        };
        Returns: CompanyApplicationWithNotes[];
      };
      unlock_company_applicant: {
        Args: {
          target_application_id: string;
        };
        Returns: EmployerApplicantUnlockRpcRow[];
      };
      get_company_team_members: {
        Args: {
          target_company_id: string;
        };
        Returns: CompanyTeamMember[];
      };
      consume_ai_usage_quota: {
        Args: Record<PropertyKey, never>;
        Returns: UsageQuotaRpcRow[];
      };
      create_application_with_notification: {
        Args: {
          target_job_id: string;
          target_user_id: string;
          target_resume_url: string;
          target_cover_letter?: string | null;
          target_screening_answers?: ScreeningAnswer[] | null;
        };
        Returns: CreateApplicationRpcRow[];
      };
      execute_direct_connect: {
        Args: {
          target_job_id: string;
          target_user_id: string;
          message_content?: string | null;
        };
        Returns: DirectConnectRpcRow[];
      };
      set_admin_role_by_email: {
        Args: {
          target_email: string;
          target_role: ProfileRole;
        };
        Returns: void;
      };
      increment_edm_campaign_metric: {
        Args: {
          target_campaign_id: string;
          target_metric: string;
          increment_by?: number;
        };
        Returns: void;
      };
      increment_edm_campaign_variant_metric: {
        Args: {
          target_campaign_id: string;
          target_variant: string;
          target_metric: string;
          increment_by?: number;
        };
        Returns: void;
      };
    };
    Views: {
      public_talents: {
        Row: PublicTalent;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
