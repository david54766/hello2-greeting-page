export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          completed_at: string | null
          id: string
          platform: string
          requested_at: string
          status: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          platform: string
          requested_at?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          platform?: string
          requested_at?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      centers: {
        Row: {
          ages_served: string | null
          capacity: number | null
          city: string | null
          created_at: string
          enrollment_size: number | null
          id: string
          name: string
          notes: string | null
          staff_count: number | null
          state: string | null
          tuition_range: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ages_served?: string | null
          capacity?: number | null
          city?: string | null
          created_at?: string
          enrollment_size?: number | null
          id?: string
          name: string
          notes?: string | null
          staff_count?: number | null
          state?: string | null
          tuition_range?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ages_served?: string | null
          capacity?: number | null
          city?: string | null
          created_at?: string
          enrollment_size?: number | null
          id?: string
          name?: string
          notes?: string | null
          staff_count?: number | null
          state?: string | null
          tuition_range?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coaching_sessions: {
        Row: {
          created_at: string
          id: string
          mode: Database["public"]["Enums"]["coaching_mode"]
          prompt: string
          response: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode: Database["public"]["Enums"]["coaching_mode"]
          prompt: string
          response: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: Database["public"]["Enums"]["coaching_mode"]
          prompt?: string
          response?: Json
          user_id?: string
        }
        Relationships: []
      }
      cookie_consents: {
        Row: {
          choice: string
          created_at: string
          id: string
          ip_address: string | null
          policy_version: string
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          choice: string
          created_at?: string
          id?: string
          ip_address?: string | null
          policy_version: string
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          choice?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          policy_version?: string
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      daily_recommendations: {
        Row: {
          created_at: string
          for_date: string
          id: string
          recommendation: string
          user_id: string
        }
        Insert: {
          created_at?: string
          for_date: string
          id?: string
          recommendation: string
          user_id: string
        }
        Update: {
          created_at?: string
          for_date?: string
          id?: string
          recommendation?: string
          user_id?: string
        }
        Relationships: []
      }
      elite_applications: {
        Row: {
          admin_notes: string | null
          annual_revenue: string | null
          business_name: string
          centers_count: number | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          email: string
          full_name: string
          goals: string
          id: string
          referral: string | null
          role: string | null
          state: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          annual_revenue?: string | null
          business_name: string
          centers_count?: number | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email: string
          full_name: string
          goals: string
          id?: string
          referral?: string | null
          role?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          annual_revenue?: string | null
          business_name?: string
          centers_count?: number | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email?: string
          full_name?: string
          goals?: string
          id?: string
          referral?: string | null
          role?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      elite_requests: {
        Row: {
          created_at: string
          id: string
          preferred_times: string | null
          status: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preferred_times?: string | null
          status?: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preferred_times?: string | null
          status?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      elite_signup_requests: {
        Row: {
          admin_notes: string | null
          annual_revenue: string | null
          business_name: string
          centers_count: number | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          email: string
          full_name: string
          goals: string
          id: string
          invited_user_id: string | null
          referral: string | null
          role: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          annual_revenue?: string | null
          business_name: string
          centers_count?: number | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email: string
          full_name: string
          goals: string
          id?: string
          invited_user_id?: string | null
          referral?: string | null
          role?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          annual_revenue?: string | null
          business_name?: string
          centers_count?: number | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email?: string
          full_name?: string
          goals?: string
          id?: string
          invited_user_id?: string | null
          referral?: string | null
          role?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      elite_thread_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          image_urls: string[]
          thread_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          image_urls?: string[]
          thread_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          image_urls?: string[]
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elite_thread_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "elite_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      elite_threads: {
        Row: {
          body: string
          created_at: string
          id: string
          image_urls: string[]
          pinned: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          image_urls?: string[]
          pinned?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          image_urls?: string[]
          pinned?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_acceptances: {
        Row: {
          accepted_at: string
          app_version: string | null
          id: string
          platform: string
          privacy_version: string
          terms_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          app_version?: string | null
          id?: string
          platform: string
          privacy_version: string
          terms_version: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          app_version?: string | null
          id?: string
          platform?: string
          privacy_version?: string
          terms_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          ai_product_updates: boolean
          coaching_replies: boolean
          created_at: string
          daily_brief: boolean
          elite_activity: boolean
          elite_reminders: boolean
          email_brief: boolean
          marketing: boolean
          push_alerts: boolean
          quiet_hours_end: number | null
          quiet_hours_start: number | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_product_updates?: boolean
          coaching_replies?: boolean
          created_at?: string
          daily_brief?: boolean
          elite_activity?: boolean
          elite_reminders?: boolean
          email_brief?: boolean
          marketing?: boolean
          push_alerts?: boolean
          quiet_hours_end?: number | null
          quiet_hours_start?: number | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_product_updates?: boolean
          coaching_replies?: boolean
          created_at?: string
          daily_brief?: boolean
          elite_activity?: boolean
          elite_reminders?: boolean
          email_brief?: boolean
          marketing?: boolean
          push_alerts?: boolean
          quiet_hours_end?: number | null
          quiet_hours_start?: number | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_name: string | null
          created_at: string
          enrollment_size: number | null
          full_name: string | null
          id: string
          staff_count: number | null
          state: string | null
          timezone: string
          tuition_range: string | null
          updated_at: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          enrollment_size?: number | null
          full_name?: string | null
          id: string
          staff_count?: number | null
          state?: string | null
          timezone?: string
          tuition_range?: string | null
          updated_at?: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          enrollment_size?: number | null
          full_name?: string | null
          id?: string
          staff_count?: number | null
          state?: string | null
          timezone?: string
          tuition_range?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_notification_deliveries: {
        Row: {
          admin_user_id: string | null
          audience: string | null
          body: string | null
          created_at: string
          data: Json | null
          error: string | null
          error_summary: string | null
          failed_count: number
          id: string
          preference_key: string | null
          provider_message_id: string | null
          sent_count: number
          skipped_count: number
          status: string
          title: string | null
          token_id: string | null
          user_id: string | null
        }
        Insert: {
          admin_user_id?: string | null
          audience?: string | null
          body?: string | null
          created_at?: string
          data?: Json | null
          error?: string | null
          error_summary?: string | null
          failed_count?: number
          id?: string
          preference_key?: string | null
          provider_message_id?: string | null
          sent_count?: number
          skipped_count?: number
          status?: string
          title?: string | null
          token_id?: string | null
          user_id?: string | null
        }
        Update: {
          admin_user_id?: string | null
          audience?: string | null
          body?: string | null
          created_at?: string
          data?: Json | null
          error?: string | null
          error_summary?: string | null
          failed_count?: number
          id?: string
          preference_key?: string | null
          provider_message_id?: string | null
          sent_count?: number
          skipped_count?: number
          status?: string
          title?: string | null
          token_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_deliveries_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "push_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          app_version: string | null
          created_at: string
          device_label: string | null
          device_model: string | null
          enabled: boolean
          id: string
          last_seen_at: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_label?: string | null
          device_model?: string | null
          enabled?: boolean
          id?: string
          last_seen_at?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_label?: string | null
          device_model?: string | null
          enabled?: boolean
          id?: string
          last_seen_at?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qa_seed_accounts: {
        Row: {
          auth_user_id: string | null
          batch_id: string
          created_at: string
          display_name: string | null
          email: string
          id: string
          purpose: string | null
          removed_at: string | null
          status: string
          tier: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          batch_id: string
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          purpose?: string | null
          removed_at?: string | null
          status?: string
          tier?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          batch_id?: string
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          purpose?: string | null
          removed_at?: string | null
          status?: string
          tier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_seed_accounts_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "qa_seed_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_seed_batches: {
        Row: {
          batch_key: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          removed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          batch_key: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          removed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          batch_key?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          removed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      qa_seed_records: {
        Row: {
          account_id: string | null
          batch_id: string
          created_at: string
          id: string
          record_id: string | null
          removed_at: string | null
          status: string
          summary: Json | null
          table_name: string
        }
        Insert: {
          account_id?: string | null
          batch_id: string
          created_at?: string
          id?: string
          record_id?: string | null
          removed_at?: string | null
          status?: string
          summary?: Json | null
          table_name: string
        }
        Update: {
          account_id?: string | null
          batch_id?: string
          created_at?: string
          id?: string
          record_id?: string | null
          removed_at?: string | null
          status?: string
          summary?: Json | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_seed_records_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "qa_seed_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_seed_records_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "qa_seed_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_documents: {
        Row: {
          created_at: string
          id: string
          status: string
          storage_path: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          storage_path: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          storage_path?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      raven_availability: {
        Row: {
          active: boolean
          created_at: string
          end_time: string
          id: string
          slot_minutes: number
          start_time: string
          updated_at: string
          weekday: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          end_time: string
          id?: string
          slot_minutes?: number
          start_time: string
          updated_at?: string
          weekday: number
        }
        Update: {
          active?: boolean
          created_at?: string
          end_time?: string
          id?: string
          slot_minutes?: number
          start_time?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: []
      }
      raven_bookings: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          starts_at: string
          status: string
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          starts_at: string
          status?: string
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          starts_at?: string
          status?: string
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      raven_meeting_settings: {
        Row: {
          advance_days: number
          buffer_minutes: number
          created_at: string
          id: string
          room_url: string
          singleton: boolean
          timezone: string
          updated_at: string
        }
        Insert: {
          advance_days?: number
          buffer_minutes?: number
          created_at?: string
          id?: string
          room_url?: string
          singleton?: boolean
          timezone?: string
          updated_at?: string
        }
        Update: {
          advance_days?: number
          buffer_minutes?: number
          created_at?: string
          id?: string
          room_url?: string
          singleton?: boolean
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      raven_videos: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          published: boolean
          sort_order: number
          storage_path: string
          thumbnail_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          published?: boolean
          sort_order?: number
          storage_path: string
          thumbnail_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          published?: boolean
          sort_order?: number
          storage_path?: string
          thumbnail_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      revenue_profiles: {
        Row: {
          active_center_id: string | null
          created_at: string
          goals: Json
          id: string
          model: Json
          scope_mode: string
          skipped: boolean
          snapshot: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          active_center_id?: string | null
          created_at?: string
          goals?: Json
          id?: string
          model?: Json
          scope_mode?: string
          skipped?: boolean
          snapshot?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          active_center_id?: string | null
          created_at?: string
          goals?: Json
          id?: string
          model?: Json
          scope_mode?: string
          skipped?: boolean
          snapshot?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          category: Database["public"]["Enums"]["template_category"]
          created_at: string
          description: string | null
          id: string
          is_elite: boolean
          storage_path: string
          tier_required: Database["public"]["Enums"]["subscription_tier"]
          title: string
        }
        Insert: {
          category: Database["public"]["Enums"]["template_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_elite?: boolean
          storage_path: string
          tier_required?: Database["public"]["Enums"]["subscription_tier"]
          title: string
        }
        Update: {
          category?: Database["public"]["Enums"]["template_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_elite?: boolean
          storage_path?: string
          tier_required?: Database["public"]["Enums"]["subscription_tier"]
          title?: string
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_first_admin: { Args: never; Returns: boolean }
      has_any_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_elite: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      coaching_mode: "ceo" | "revenue" | "marketing" | "compliance" | "systems"
      subscription_tier: "essentials" | "pro" | "elite"
      template_category: "hiring" | "enrollment" | "operations"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      coaching_mode: ["ceo", "revenue", "marketing", "compliance", "systems"],
      subscription_tier: ["essentials", "pro", "elite"],
      template_category: ["hiring", "enrollment", "operations"],
    },
  },
} as const
