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
          is_undecided: boolean
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          voter_id: string
          name?: string
          dates: string[]
          is_undecided?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          voter_id?: string
          name?: string
          dates?: string[]
          is_undecided?: boolean
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
      lunch_menus: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      dining_venues: {
        Row: {
          id: string
          room_id: string
          name: string
          description: string | null
          location: string
          cost_per_person: string | null
          has_private_room: boolean
          map_url: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          name: string
          description?: string | null
          location: string
          cost_per_person?: string | null
          has_private_room?: boolean
          map_url?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          name?: string
          description?: string | null
          location?: string
          cost_per_person?: string | null
          has_private_room?: boolean
          map_url?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      dining_votes: {
        Row: {
          id: string
          room_id: string
          venue_id: string
          voter_id: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          venue_id: string
          voter_id: string
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          venue_id?: string
          voter_id?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_room_vote_stats: {
        Args: { p_room_id: string }
        Returns: Json
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Room = Database['public']['Tables']['rooms']['Row']
// 참여자/관리자 화면에 내려보내는 방 정보 — admin_token은 클라이언트로 보내지 않는다.
export type PublicRoom = Omit<Room, 'admin_token'>
export const ROOM_PUBLIC_SELECT = 'id, title, question, status, multi_select, type, months, created_at'
export type RoomVoteStats = { unique_voters: number; counts: Record<string, number> }
export type Option = Database['public']['Tables']['options']['Row']
export type Vote = Database['public']['Tables']['votes']['Row']
export type Opinion = Database['public']['Tables']['opinions']['Row']
export type Schedule = Database['public']['Tables']['schedules']['Row']
export type LunchMenu = Database['public']['Tables']['lunch_menus']['Row']

export interface OptionWithCount extends Option {
  count: number
}

export type DiningVenue = Database['public']['Tables']['dining_venues']['Row']
export type DiningVote = Database['public']['Tables']['dining_votes']['Row']

export interface DiningVenueWithCount extends DiningVenue {
  count: number
}
