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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      generated_playlists: {
        Row: {
          created_at: string
          id: string
          public_description: string | null
          public_slug: string | null
          published_at: string | null
          prompt_text: string
          source: string
          user_id: string
          visibility: string
          youtube_playlist_id: string | null
          semantic_topic: string | null
          last_synced_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          public_description?: string | null
          public_slug?: string | null
          published_at?: string | null
          prompt_text: string
          source?: string
          user_id: string
          visibility?: string
          youtube_playlist_id?: string | null
          semantic_topic?: string | null
          last_synced_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          public_description?: string | null
          public_slug?: string | null
          published_at?: string | null
          prompt_text?: string
          source?: string
          user_id?: string
          visibility?: string
          youtube_playlist_id?: string | null
          semantic_topic?: string | null
          last_synced_at?: string | null
        }
        Relationships: []
      }
      playlist_learning_paths: {
        Row: {
          created_at: string
          difficulty: string | null
          estimated_minutes: number | null
          learning_objectives: Json
          modules: Json
          playlist_id: string
          summary: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          estimated_minutes?: number | null
          learning_objectives?: Json
          modules?: Json
          playlist_id: string
          summary: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          estimated_minutes?: number | null
          learning_objectives?: Json
          modules?: Json
          playlist_id?: string
          summary?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_learning_paths_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: true
            referencedRelation: "generated_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_items: {
        Row: {
          id: string
          playlist_id: string
          youtube_video_id: string
          position: number | null
          status: string
          added_at: string
          watch_state: string
          started_at: string | null
          completed_at: string | null
          learner_note: string | null
        }
        Insert: {
          id?: string
          playlist_id: string
          youtube_video_id: string
          position?: number | null
          status?: string
          added_at?: string
          watch_state?: string
          started_at?: string | null
          completed_at?: string | null
          learner_note?: string | null
        }
        Update: {
          id?: string
          playlist_id?: string
          youtube_video_id?: string
          position?: number | null
          status?: string
          added_at?: string
          watch_state?: string
          started_at?: string | null
          completed_at?: string | null
          learner_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "generated_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_songs: {
        Row: {
          artist_name: string
          created_at: string
          id: string
          playlist_id: string
          spotify_id: string | null
          track_name: string
          youtube_id: string | null
        }
        Insert: {
          artist_name: string
          created_at?: string
          id?: string
          playlist_id: string
          spotify_id?: string | null
          track_name: string
          youtube_id?: string | null
        }
        Update: {
          artist_name?: string
          created_at?: string
          id?: string
          playlist_id?: string
          spotify_id?: string | null
          track_name?: string
          youtube_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playlist_songs_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "generated_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          id: string
          youtube_video_id: string
          title: string
          channel_name: string | null
          description: string | null
          privacy_status: string
          thumbnail_url: string | null
          duration: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          youtube_video_id: string
          title: string
          channel_name?: string | null
          description?: string | null
          privacy_status?: string
          thumbnail_url?: string | null
          duration?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          youtube_video_id?: string
          title?: string
          channel_name?: string | null
          description?: string | null
          privacy_status?: string
          thumbnail_url?: string | null
          duration?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      video_embeddings: {
        Row: {
          id: string
          youtube_video_id: string
          embedding: unknown
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          youtube_video_id: string
          embedding: unknown
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          youtube_video_id?: string
          embedding?: unknown
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_embeddings_youtube_video_id_fkey"
            columns: ["youtube_video_id"]
            isOneToOne: true
            referencedRelation: "videos"
            referencedColumns: ["youtube_video_id"]
          },
        ]
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
