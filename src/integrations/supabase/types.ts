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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      check_ins: {
        Row: {
          check_in_time: string
          check_out_time: string | null
          created_at: string
          id: string
          notes: string | null
          schedule_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          check_in_time?: string
          check_out_time?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          schedule_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          check_in_time?: string
          check_out_time?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          schedule_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "pool_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          barcode: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          replacement_cost: number | null
          status: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          replacement_cost?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          replacement_cost?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipment_loans: {
        Row: {
          approved_by: string | null
          created_at: string
          damage_notes: string | null
          damage_reported: boolean | null
          due_back_at: string
          equipment_id: string
          equipment_type: string | null
          id: string
          late_return: boolean | null
          loaned_at: string
          notes: string | null
          returned_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          damage_notes?: string | null
          damage_reported?: boolean | null
          due_back_at: string
          equipment_id: string
          equipment_type?: string | null
          id?: string
          late_return?: boolean | null
          loaned_at?: string
          notes?: string | null
          returned_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          damage_notes?: string | null
          damage_reported?: boolean | null
          due_back_at?: string
          equipment_id?: string
          equipment_type?: string | null
          id?: string
          late_return?: boolean | null
          loaned_at?: string
          notes?: string | null
          returned_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_loans_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      message_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          message_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_message_replies_message_id"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string
          read_at: string | null
          recipient_id: string | null
          recipient_role: string | null
          sender_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type?: string
          read_at?: string | null
          recipient_id?: string | null
          recipient_role?: string | null
          sender_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          read_at?: string | null
          recipient_id?: string | null
          recipient_role?: string | null
          sender_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pool_logs: {
        Row: {
          checked_by: string | null
          checked_by_signature: string | null
          chemical_notes: string | null
          chemicals_added: string | null
          chlorine_ppm: number | null
          cleaning_status: string | null
          confirmed_by: string | null
          confirmed_by_signature: string | null
          created_at: string
          date: string
          filtration_system: string | null
          id: string
          lighting_status: string | null
          maintenance_performed: string | null
          members_count: number | null
          occurrence_details: string | null
          occurrence_reported: boolean | null
          ph_level: number | null
          pumps_status: string | null
          residents_count: number | null
          safety_equipment: string | null
          session: string
          staff_count: number | null
          students_count: number | null
          system_notes: string | null
          total_swimmers: number | null
          updated_at: string
          water_clarity: string | null
        }
        Insert: {
          checked_by?: string | null
          checked_by_signature?: string | null
          chemical_notes?: string | null
          chemicals_added?: string | null
          chlorine_ppm?: number | null
          cleaning_status?: string | null
          confirmed_by?: string | null
          confirmed_by_signature?: string | null
          created_at?: string
          date: string
          filtration_system?: string | null
          id?: string
          lighting_status?: string | null
          maintenance_performed?: string | null
          members_count?: number | null
          occurrence_details?: string | null
          occurrence_reported?: boolean | null
          ph_level?: number | null
          pumps_status?: string | null
          residents_count?: number | null
          safety_equipment?: string | null
          session: string
          staff_count?: number | null
          students_count?: number | null
          system_notes?: string | null
          total_swimmers?: number | null
          updated_at?: string
          water_clarity?: string | null
        }
        Update: {
          checked_by?: string | null
          checked_by_signature?: string | null
          chemical_notes?: string | null
          chemicals_added?: string | null
          chlorine_ppm?: number | null
          cleaning_status?: string | null
          confirmed_by?: string | null
          confirmed_by_signature?: string | null
          created_at?: string
          date?: string
          filtration_system?: string | null
          id?: string
          lighting_status?: string | null
          maintenance_performed?: string | null
          members_count?: number | null
          occurrence_details?: string | null
          occurrence_reported?: boolean | null
          ph_level?: number | null
          pumps_status?: string | null
          residents_count?: number | null
          safety_equipment?: string | null
          session?: string
          staff_count?: number | null
          students_count?: number | null
          system_notes?: string | null
          total_swimmers?: number | null
          updated_at?: string
          water_clarity?: string | null
        }
        Relationships: []
      }
      pool_schedules: {
        Row: {
          allowed_roles: string[]
          capacity_limit: number
          created_at: string
          created_by: string | null
          days_of_week: number[]
          description: string | null
          end_time: string
          id: string
          is_active: boolean
          max_members: number | null
          max_residents: number | null
          max_staff: number | null
          max_students: number | null
          session_name: string | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          allowed_roles: string[]
          capacity_limit?: number
          created_at?: string
          created_by?: string | null
          days_of_week: number[]
          description?: string | null
          end_time: string
          id?: string
          is_active?: boolean
          max_members?: number | null
          max_residents?: number | null
          max_staff?: number | null
          max_students?: number | null
          session_name?: string | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          allowed_roles?: string[]
          capacity_limit?: number
          created_at?: string
          created_by?: string | null
          days_of_week?: number[]
          description?: string | null
          end_time?: string
          id?: string
          is_active?: boolean
          max_members?: number | null
          max_residents?: number | null
          max_staff?: number | null
          max_students?: number | null
          session_name?: string | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pre_existing_accounts: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          role: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string
          status?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          emergency_contact: string | null
          emergency_phone: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string
          status: string
          subscription_expires_at: string | null
          subscription_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          emergency_contact?: string | null
          emergency_phone?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role: string
          status?: string
          subscription_expires_at?: string | null
          subscription_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          emergency_contact?: string | null
          emergency_phone?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string
          status?: string
          subscription_expires_at?: string | null
          subscription_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports_metadata: {
        Row: {
          created_at: string
          date_range_end: string | null
          date_range_start: string | null
          file_path: string | null
          filters: Json | null
          generated_by: string
          id: string
          report_name: string
          report_type: string
        }
        Insert: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          file_path?: string | null
          filters?: Json | null
          generated_by: string
          id?: string
          report_name: string
          report_type: string
        }
        Update: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          file_path?: string | null
          filters?: Json | null
          generated_by?: string
          id?: string
          report_name?: string
          report_type?: string
        }
        Relationships: []
      }
      sports_inventory: {
        Row: {
          barcode: string | null
          category: string
          condition: string
          created_at: string
          description: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          quantity_available: number
          quantity_total: number
          replacement_cost: number | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category: string
          condition?: string
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          quantity_available?: number
          quantity_total?: number
          replacement_cost?: number | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: string
          condition?: string
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          quantity_available?: number
          quantity_total?: number
          replacement_cost?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_approvals: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          requested_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          requested_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          requested_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
