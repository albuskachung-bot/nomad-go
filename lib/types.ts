export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  job_type: string;
  salary_range: string | null;
  tags: string[];
  description: string;
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
  | "user"
  | "super_admin"
  | "editor";

export type AccountType = "employer" | "nomad";

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
  website: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
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

export type ApplicationStatus = "pending" | "reviewed" | "interview";

export type Application = {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  applied_at: string;
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
        Insert: Omit<Company, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Company>;
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
        Insert: Omit<Application, "id" | "applied_at"> & {
          id?: string;
          applied_at?: string;
        };
        Update: Partial<Application>;
        Relationships: [];
      };
    };
    Functions: {
      set_admin_role_by_email: {
        Args: {
          target_email: string;
          target_role: "user" | "editor" | "super_admin";
        };
        Returns: void;
      };
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
