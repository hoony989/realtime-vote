export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string
          title: string
          question: string
          status: 'waiting' | 'open' | 'closed'
          admin_token: string
          multi_select: boolean
          type: string
          months: string[]
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          question: string
          status?: 'waiting' | 'open' | 'closed'
          admin_token?: string
          multi_select?: boolean
          type?: string
          months?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          question?: string
          status?: 'waiting' | 'open' | 'closed'
          admin_token?: string
          multi_select?: boolean
          type?: string
          months?: string[]
          created_at?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          id: string
          room_id: string
          voter_id: string
          name: string
          dates: string[]
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          voter_id: string
          name?: string
          dates: string[]
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          voter_id?: string
          name?: string
          dates?: string[]
          created_at?: string
        }
        Relationships: []
      }
      schedule_pins: {
        Row: {
          schedule_id: string
          pin_hash: string
        }
        Insert: {
          schedule_id: string
          pin_hash: string
        }
        Update: {
          schedule_id?: string
          pin_hash?: string
        }
        Relationships: []
      }
      options: {
        Row: {
          id: string
          room_id: string
          label: string
          sort_order: number
        }
        Insert: {
          id?: string
          room_id: string
          label: string
          sort_order?: number
        }
        Update: {
          id?: string
          room_id?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      votes: {
        Row: {
          id: string
          room_id: string
          option_id: string
          voter_id: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          option_id: string
          voter_id: string
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          option_id?: string
          voter_id?: string
          created_at?: string
        }
        Relationships: []
      }
      opinions: {
        Row: {
          id: string
          room_id: string
          content: string
          voter_id: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          content: string
          voter_id: string
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          content?: string
          voter_id?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Room = Database['public']['Tables']['rooms']['Row']
export type Option = Database['public']['Tables']['options']['Row']
export type Vote = Database['public']['Tables']['votes']['Row']
export type Opinion = Database['public']['Tables']['opinions']['Row']
export type Schedule = Database['public']['Tables']['schedules']['Row']

export interface OptionWithCount extends Option {
  count: number
}
