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
      buddies: {
        Row: {
          accepted_at: string | null
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["buddy_status"]
        }
        Insert: {
          accepted_at?: string | null
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["buddy_status"]
        }
        Update: {
          accepted_at?: string | null
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["buddy_status"]
        }
        Relationships: []
      }
      courses_cache: {
        Row: {
          city: string | null
          club_name: string | null
          country: string | null
          fetched_at: string
          holes: Json
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          photo_checked_at: string | null
          photo_name: string | null
          raw: Json | null
          region: string | null
          tee_boxes: Json
          updated_at: string
        }
        Insert: {
          city?: string | null
          club_name?: string | null
          country?: string | null
          fetched_at?: string
          holes?: Json
          id: string
          latitude?: number | null
          longitude?: number | null
          name: string
          photo_checked_at?: string | null
          photo_name?: string | null
          raw?: Json | null
          region?: string | null
          tee_boxes?: Json
          updated_at?: string
        }
        Update: {
          city?: string | null
          club_name?: string | null
          country?: string | null
          fetched_at?: string
          holes?: Json
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          photo_checked_at?: string | null
          photo_name?: string | null
          raw?: Json | null
          region?: string | null
          tee_boxes?: Json
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string
          handicap: number
          id: string
          last_name: string
          mobile: string
          suburb: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string
          handicap?: number
          id: string
          last_name?: string
          mobile?: string
          suburb?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string
          handicap?: number
          id?: string
          last_name?: string
          mobile?: string
          suburb?: string
          updated_at?: string
        }
        Relationships: []
      }
      round_holes: {
        Row: {
          drive_distance: number | null
          fairway_direction: string | null
          fairway_hit: boolean | null
          gir: boolean | null
          handicap: number | null
          hole_number: number
          id: string
          notes: string | null
          par: number
          penalties: number
          putts: number | null
          round_id: string
          round_player_id: string | null
          sand_save: boolean | null
          sand_shots: number
          score: number | null
          up_down: boolean | null
          updated_at: string
          yardage: number | null
        }
        Insert: {
          drive_distance?: number | null
          fairway_direction?: string | null
          fairway_hit?: boolean | null
          gir?: boolean | null
          handicap?: number | null
          hole_number: number
          id?: string
          notes?: string | null
          par?: number
          penalties?: number
          putts?: number | null
          round_id: string
          round_player_id?: string | null
          sand_save?: boolean | null
          sand_shots?: number
          score?: number | null
          up_down?: boolean | null
          updated_at?: string
          yardage?: number | null
        }
        Update: {
          drive_distance?: number | null
          fairway_direction?: string | null
          fairway_hit?: boolean | null
          gir?: boolean | null
          handicap?: number | null
          hole_number?: number
          id?: string
          notes?: string | null
          par?: number
          penalties?: number
          putts?: number | null
          round_id?: string
          round_player_id?: string | null
          sand_save?: boolean | null
          sand_shots?: number
          score?: number | null
          up_down?: boolean | null
          updated_at?: string
          yardage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "round_holes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      round_players: {
        Row: {
          created_at: string
          group_number: number
          guest_hcp: number | null
          guest_name: string | null
          id: string
          playing_hcp: number | null
          position: number
          round_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          group_number?: number
          guest_hcp?: number | null
          guest_name?: string | null
          id?: string
          playing_hcp?: number | null
          position?: number
          round_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          group_number?: number
          guest_hcp?: number | null
          guest_name?: string | null
          id?: string
          playing_hcp?: number | null
          position?: number
          round_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "round_players_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          course_id: string
          course_name: string
          created_at: string
          ended_at: string | null
          fairways_hit: number
          fairways_possible: number
          go_live: boolean
          gps_only: boolean
          greens_in_reg: number
          handicap_round: boolean
          hcp_allowance: number
          holes_combination: string
          id: string
          join_token: string
          mode: string
          notes: string | null
          owner_user_id: string | null
          penalties: number
          player_id: string
          scoring_format: string
          started_at: string
          starts_at: string | null
          status: string
          tee_box: string | null
          total_par: number
          total_putts: number
          total_score: number
          updated_at: string
          weather: string | null
        }
        Insert: {
          course_id: string
          course_name: string
          created_at?: string
          ended_at?: string | null
          fairways_hit?: number
          fairways_possible?: number
          go_live?: boolean
          gps_only?: boolean
          greens_in_reg?: number
          handicap_round?: boolean
          hcp_allowance?: number
          holes_combination?: string
          id?: string
          join_token?: string
          mode?: string
          notes?: string | null
          owner_user_id?: string | null
          penalties?: number
          player_id: string
          scoring_format?: string
          started_at?: string
          starts_at?: string | null
          status?: string
          tee_box?: string | null
          total_par?: number
          total_putts?: number
          total_score?: number
          updated_at?: string
          weather?: string | null
        }
        Update: {
          course_id?: string
          course_name?: string
          created_at?: string
          ended_at?: string | null
          fairways_hit?: number
          fairways_possible?: number
          go_live?: boolean
          gps_only?: boolean
          greens_in_reg?: number
          handicap_round?: boolean
          hcp_allowance?: number
          holes_combination?: string
          id?: string
          join_token?: string
          mode?: string
          notes?: string | null
          owner_user_id?: string | null
          penalties?: number
          player_id?: string
          scoring_format?: string
          started_at?: string
          starts_at?: string | null
          status?: string
          tee_box?: string | null
          total_par?: number
          total_putts?: number
          total_score?: number
          updated_at?: string
          weather?: string | null
        }
        Relationships: []
      }
      shots: {
        Row: {
          club: string | null
          created_at: string
          distance_yards: number | null
          hole_number: number
          id: string
          latitude: number | null
          longitude: number | null
          round_id: string
          shot_number: number
        }
        Insert: {
          club?: string | null
          created_at?: string
          distance_yards?: number | null
          hole_number: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          round_id: string
          shot_number: number
        }
        Update: {
          club?: string | null
          created_at?: string
          distance_yards?: number | null
          hole_number?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          round_id?: string
          shot_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "shots_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      signups: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          mobile: string
          suburb: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          mobile: string
          suburb: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          mobile?: string
          suburb?: string
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
      buddy_status: "pending" | "accepted" | "blocked"
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
      buddy_status: ["pending", "accepted", "blocked"],
    },
  },
} as const
