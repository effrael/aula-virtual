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
    PostgrestVersion: "14.4"
  }
  chatbot_redcuore: {
    Tables: {
      certificate_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          pdf_url: string
          name_x: number
          name_y: number
          name_y2: number
          name_w: number
          name_h: number
          name_font_size: number
          name_align: string
          name_line_spacing: number
          dni_x: number
          dni_y: number
          dni_w: number
          dni_h: number
          dni_font_size: number
          dni_align: string
          dni_line_spacing: number
          qr_x: number
          qr_y: number
          qr_size: number
          code_x: number
          code_y: number
          code_w: number
          code_h: number
          code_font_size: number
          code_align: string
          status_x: number
          status_y: number
          status_w: number
          status_h: number
          status_font_size: number
          status_align: string
          instructor_x: number
          instructor_y: number
          instructor_w: number
          instructor_h: number
          instructor_font_size: number
          instructor_align: string
          inst_id_x: number
          inst_id_y: number
          inst_id_w: number
          inst_id_h: number
          inst_id_font_size: number
          inst_id_align: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          pdf_url: string
          name_x?: number
          name_y?: number
          name_y2?: number
          name_w?: number
          name_h?: number
          name_font_size?: number
          name_align?: string
          name_line_spacing?: number
          dni_x?: number
          dni_y?: number
          dni_w?: number
          dni_h?: number
          dni_font_size?: number
          dni_align?: string
          dni_line_spacing?: number
          qr_x?: number
          qr_y?: number
          qr_size?: number
          code_x?: number
          code_y?: number
          code_w?: number
          code_h?: number
          code_font_size?: number
          code_align?: string
          status_x?: number
          status_y?: number
          status_w?: number
          status_h?: number
          status_font_size?: number
          status_align?: string
          instructor_x?: number
          instructor_y?: number
          instructor_w?: number
          instructor_h?: number
          instructor_font_size?: number
          instructor_align?: string
          inst_id_x?: number
          inst_id_y?: number
          inst_id_w?: number
          inst_id_h?: number
          inst_id_font_size?: number
          inst_id_align?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          pdf_url?: string
          name_x?: number
          name_y?: number
          name_y2?: number
          name_w?: number
          name_h?: number
          name_font_size?: number
          name_align?: string
          name_line_spacing?: number
          dni_x?: number
          dni_y?: number
          dni_w?: number
          dni_h?: number
          dni_font_size?: number
          dni_align?: string
          dni_line_spacing?: number
          qr_x?: number
          qr_y?: number
          qr_size?: number
          code_x?: number
          code_y?: number
          code_w?: number
          code_h?: number
          code_font_size?: number
          code_align?: string
          status_x?: number
          status_y?: number
          status_w?: number
          status_h?: number
          status_font_size?: number
          status_align?: string
          instructor_x?: number
          instructor_y?: number
          instructor_w?: number
          instructor_h?: number
          instructor_font_size?: number
          instructor_align?: string
          inst_id_x?: number
          inst_id_y?: number
          inst_id_w?: number
          inst_id_h?: number
          inst_id_font_size?: number
          inst_id_align?: string
          created_at?: string | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          id: string
          template_id: string | null
          user_id: string
          recipient_name: string
          dni: string
          cert_code: string
          status: string
          instructor: string
          inst_id: string
          issued_at: string
        }
        Insert: {
          id?: string
          template_id?: string | null
          user_id: string
          recipient_name: string
          dni: string
          cert_code?: string
          status?: string
          instructor?: string
          inst_id?: string
          issued_at?: string
        }
        Update: {
          id?: string
          template_id?: string | null
          user_id?: string
          recipient_name?: string
          dni?: string
          cert_code?: string
          status?: string
          instructor?: string
          inst_id?: string
          issued_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      bots: {
        Row: {
          button_icon: string | null
          color: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          position: string | null
          prompt: string | null
          site_url: string | null
          user_id: string
          webhook_url: string | null
          welcome_msg: string | null
          workspace_id: string | null
        }
        Insert: {
          button_icon?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          position?: string | null
          prompt?: string | null
          site_url?: string | null
          user_id: string
          webhook_url?: string | null
          welcome_msg?: string | null
          workspace_id?: string | null
        }
        Update: {
          button_icon?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          position?: string | null
          prompt?: string | null
          site_url?: string | null
          user_id?: string
          webhook_url?: string | null
          welcome_msg?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bots_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          bot_id: string
          content: string
          created_at: string | null
          id: string
          role: string
          session_id: string
        }
        Insert: {
          bot_id: string
          content: string
          created_at?: string | null
          id?: string
          role: string
          session_id: string
        }
        Update: {
          bot_id?: string
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_bot_config: { Args: { bot_uuid: string }; Returns: Json }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_owner: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
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

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "chatbot_redcuore">]

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
  chatbot_redcuore: {
    Enums: {},
  },
} as const
