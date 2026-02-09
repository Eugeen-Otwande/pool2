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
          checked_in_by: string | null
          created_at: string
          group_id: string | null
          id: string
          notes: string | null
          schedule_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          check_in_time?: string
          check_out_time?: string | null
          checked_in_by?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          notes?: string | null
          schedule_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          check_in_time?: string
          check_out_time?: string | null
          checked_in_by?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          notes?: string | null
          schedule_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "pool_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_check_ins_schedule"
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
          quantity_available: number | null
          quantity_total: number | null
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
          quantity_available?: number | null
          quantity_total?: number | null
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
          quantity_available?: number | null
          quantity_total?: number | null
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
          quantity_borrowed: number | null
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
          quantity_borrowed?: number | null
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
          quantity_borrowed?: number | null
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
          {
            foreignKeyName: "fk_equipment_loans_equipment"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          member_email: string | null
          member_name: string
          member_phone: string | null
          member_role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          member_email?: string | null
          member_name: string
          member_phone?: string | null
          member_role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          member_email?: string | null
          member_name?: string
          member_phone?: string | null
          member_role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      groups: {
        Row: {
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          expected_session_time: string | null
          group_type: string
          id: string
          name: string
          notes: string | null
          organization: string | null
          schedule_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          expected_session_time?: string | null
          group_type?: string
          id?: string
          name: string
          notes?: string | null
          organization?: string | null
          schedule_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          expected_session_time?: string | null
          group_type?: string
          id?: string
          name?: string
          notes?: string | null
          organization?: string | null
          schedule_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "pool_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          message: string
          phone: string | null
          responded_at: string | null
          responded_by: string | null
          response: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          message: string
          phone?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          message?: string
          phone?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
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
            foreignKeyName: "fk_message_replies_message"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_message_replies_message"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "v_messages_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_message_replies_message_id"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_message_replies_message_id"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "v_messages_summary"
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
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_status: string
          visitor_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_status?: string
          visitor_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_status?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
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
      pool_visits: {
        Row: {
          activity: string
          created_at: string
          date: string
          id: string
          resident_id: string
          time: string
        }
        Insert: {
          activity: string
          created_at?: string
          date: string
          id?: string
          resident_id: string
          time: string
        }
        Update: {
          activity?: string
          created_at?: string
          date?: string
          id?: string
          resident_id?: string
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_visits_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
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
          check_in_at: string | null
          check_in_status: string | null
          check_out_at: string | null
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
          check_in_at?: string | null
          check_in_status?: string | null
          check_out_at?: string | null
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
          check_in_at?: string | null
          check_in_status?: string | null
          check_out_at?: string | null
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
      residence_members: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          hostel_admission: string
          id: string
          phone_number: string
          school: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          hostel_admission: string
          id?: string
          phone_number: string
          school: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          hostel_admission?: string
          id?: string
          phone_number?: string
          school?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      residents: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          full_name: string | null
          hostel_admission: string | null
          id: string
          name: string
          password_hash: string | null
          phone: string | null
          phone_number: string | null
          role: string
          school: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          full_name?: string | null
          hostel_admission?: string | null
          id?: string
          name: string
          password_hash?: string | null
          phone?: string | null
          phone_number?: string | null
          role?: string
          school?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string | null
          hostel_admission?: string | null
          id?: string
          name?: string
          password_hash?: string | null
          phone?: string | null
          phone_number?: string | null
          role?: string
          school?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      visitors: {
        Row: {
          check_in_status: string
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          date_of_visit: string
          email: string
          first_name: string
          id: string
          last_name: string
          num_guests: number
          payment_status: string
          phone: string
          receipt_url: string | null
          time_of_visit: string
        }
        Insert: {
          check_in_status?: string
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          date_of_visit: string
          email: string
          first_name: string
          id?: string
          last_name: string
          num_guests?: number
          payment_status?: string
          phone: string
          receipt_url?: string | null
          time_of_visit: string
        }
        Update: {
          check_in_status?: string
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          date_of_visit?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          num_guests?: number
          payment_status?: string
          phone?: string
          receipt_url?: string | null
          time_of_visit?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_messages_summary: {
        Row: {
          content: string | null
          created_at: string | null
          id: string | null
          message_type: string | null
          read_at: string | null
          recipient_id: string | null
          recipient_name: string | null
          recipient_role: string | null
          reply_count: number | null
          sender_id: string | null
          sender_name: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_recent_activities: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          notes: string | null
          role: string | null
          status: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_checkin: {
        Args: { approved_by_user_id: string; checkin_id: string }
        Returns: Json
      }
      bulk_group_checkin: {
        Args: {
          p_checked_in_by?: string
          p_group_id: string
          p_schedule_id?: string
        }
        Returns: Json
      }
      bulk_group_checkout: {
        Args: { p_checked_out_by?: string; p_group_id: string }
        Returns: Json
      }
      cleanup_old_checkins: { Args: never; Returns: number }
      force_checkout: {
        Args: {
          checkin_id: string
          force_reason?: string
          forced_by_user_id: string
        }
        Returns: Json
      }
      get_user_checkin_status: {
        Args: { _user_id: string }
        Returns: {
          check_in_time: string
          is_checked_in: boolean
          latest_checkin_id: string
        }[]
      }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _uid: string }; Returns: boolean }
      is_rcmrd_official: { Args: { _uid: string }; Returns: boolean }
      is_rcmrd_team: { Args: { _uid: string }; Returns: boolean }
      is_staff: { Args: { _uid: string }; Returns: boolean }
      reject_checkin: {
        Args: {
          checkin_id: string
          rejected_by_user_id: string
          rejection_reason?: string
        }
        Returns: Json
      }
      residence_member_checkin: {
        Args: { member_id: string; schedule_id?: string }
        Returns: string
      }
      resident_toggle_checkin: {
        Args: { p_schedule_id?: string; p_user_id: string }
        Returns: Json
      }
      student_toggle_checkin: {
        Args: { p_schedule_id?: string; p_user_id: string }
        Returns: Json
      }
      toggle_checkin: {
        Args: { p_schedule_id?: string; p_user_id: string }
        Returns: Json
      }
      toggle_checkin_for_user: {
        Args: { _schedule_id?: string; _user_id: string }
        Returns: {
          check_in_id: string
          check_in_time: string
          check_out_time: string
          message: string
          status: string
          user_id: string
        }[]
      }
      update_user_role: {
        Args: { _new_role: string; _updated_by: string; _user_id: string }
        Returns: Json
      }
      validate_checkin: {
        Args: { p_schedule_id?: string; p_user_id: string }
        Returns: Json
      }
      visitor_checkin_checkout: {
        Args: { action: string; visitor_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "staff"
        | "student"
        | "resident"
        | "member"
        | "rcmrd_official"
        | "rcmrd_team"
        | "visitor"
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
      app_role: [
        "admin",
        "staff",
        "student",
        "resident",
        "member",
        "rcmrd_official",
        "rcmrd_team",
        "visitor",
      ],
    },
  },
} as const
