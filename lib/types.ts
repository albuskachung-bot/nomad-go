export type Job = {
  id: string;
  title: string;
  company: string;
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
  apply_url: string | null;
  is_featured: boolean;
  employer_id: string | null;
  company_id?: string | null;
  rejection_reason: string | null;
  status: ContentStatus;
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

export type ProfileRole =
  | "member"
  | "super_admin"
  | "editor"
  | "reviewer";

export type AccountType = "employer" | "nomad";
export type CompanyApprovalStatus = "pending" | "approved" | "rejected";

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
  avatar_url: string | null;
  bio: string | null;
  skills: string[];
  location: string | null;
  status: ContentStatus;
  is_featured: boolean;
  is_banned: boolean;
  timezone: string | null;
  languages: string[];
  work_type: string[];
  portfolio_url: string | null;
  social_urls: Record<string, string>;
  work_experience: ProfileWorkExperience[];
  education: ProfileEducation[];
  sponsored_until: string | null;
  stripe_customer_id: string | null;
  created_at: string;
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
  tax_id: string | null;
  verification_doc_url: string | null;
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

export type SiteSettings = {
  id: number;
  hero_title: string;
  hero_subtitle: string;
  hero_image_url: string;
  announcement_text: string | null;
  announcement_enabled: boolean;
  updated_at: string;
};

export type PlatformSetting = {
  key_name: string;
  key_value: string;
  updated_at: string;
};

export type OrderStatus = "pending" | "paid" | "failed";

export type Order = {
  id: string;
  user_id: string;
  stripe_session_id: string;
  amount: number;
  status: OrderStatus;
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

export type Application = {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  resume_url: string;
  cover_letter: string | null;
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
      get_company_team_members: {
        Args: {
          target_company_id: string;
        };
        Returns: CompanyTeamMember[];
      };
      set_admin_role_by_email: {
        Args: {
          target_email: string;
          target_role: ProfileRole;
        };
        Returns: void;
      };
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
