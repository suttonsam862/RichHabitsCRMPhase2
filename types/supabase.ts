export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          state: string
          address: string | null
          phone: string | null
          email: string | null
          created_at: string
          updated_at: string
          notes: string | null
          universal_discounts: Json | null
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          state: string
          address?: string | null
          phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
          notes?: string | null
          universal_discounts?: Json | null
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          state?: string
          address?: string | null
          phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
          notes?: string | null
          universal_discounts?: Json | null
        }
      }
      sports: {
        Row: {
          id: string
          organization_id: string
          name: string
          assigned_salesperson: string | null
          contact_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          assigned_salesperson?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          assigned_salesperson?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          organization_id: string
          order_number: string
          customer_name: string
          status: 'pending' | 'in_production' | 'completed' | 'cancelled'
          total_amount: number | null
          items: Json | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          order_number: string
          customer_name: string
          status?: 'pending' | 'in_production' | 'completed' | 'cancelled'
          total_amount?: number | null
          items?: Json | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          order_number?: string
          customer_name?: string
          status?: 'pending' | 'in_production' | 'completed' | 'cancelled'
          total_amount?: number | null
          items?: Json | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          role: 'admin' | 'user'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          role?: 'admin' | 'user'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'admin' | 'user'
          created_at?: string
          updated_at?: string
        }
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