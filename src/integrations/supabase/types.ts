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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      lp_positions: {
        Row: {
          deposited: number
          id: string
          shares: number
          updated_at: string
          user_id: string
        }
        Insert: {
          deposited?: number
          id?: string
          shares?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          deposited?: number
          id?: string
          shares?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      markets: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_leverage: number
          name: string
          open_price_24h: number
          price: number
          price_24h_at: string
          symbol: string
          volatility: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_leverage?: number
          name: string
          open_price_24h: number
          price: number
          price_24h_at?: string
          symbol: string
          volatility?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_leverage?: number
          name?: string
          open_price_24h?: number
          price?: number
          price_24h_at?: string
          symbol?: string
          volatility?: number
        }
        Relationships: []
      }
      pool_events: {
        Row: {
          amount: number | null
          created_at: string
          detail: string | null
          id: number
          kind: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          detail?: string | null
          id?: number
          kind: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          detail?: string | null
          id?: number
          kind?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pool_state: {
        Row: {
          fees_earned: number
          id: number
          total_assets: number
          total_borrowed: number
          total_shares: number
          updated_at: string
        }
        Insert: {
          fees_earned?: number
          id?: number
          total_assets?: number
          total_borrowed?: number
          total_shares?: number
          updated_at?: string
        }
        Update: {
          fees_earned?: number
          id?: number
          total_assets?: number
          total_borrowed?: number
          total_shares?: number
          updated_at?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          borrow_fee_paid: number
          borrowed: number
          closed_at: string | null
          collateral: number
          entry_price: number
          exit_price: number | null
          id: string
          leverage: number
          liq_price: number
          market_id: string
          open_fee: number
          opened_at: string
          realized_pnl: number | null
          side: Database["public"]["Enums"]["position_side"]
          size: number
          status: Database["public"]["Enums"]["position_status"]
          user_id: string
        }
        Insert: {
          borrow_fee_paid?: number
          borrowed: number
          closed_at?: string | null
          collateral: number
          entry_price: number
          exit_price?: number | null
          id?: string
          leverage: number
          liq_price: number
          market_id: string
          open_fee?: number
          opened_at?: string
          realized_pnl?: number | null
          side: Database["public"]["Enums"]["position_side"]
          size: number
          status?: Database["public"]["Enums"]["position_status"]
          user_id: string
        }
        Update: {
          borrow_fee_paid?: number
          borrowed?: number
          closed_at?: string | null
          collateral?: number
          entry_price?: number
          exit_price?: number | null
          id?: string
          leverage?: number
          liq_price?: number
          market_id?: string
          open_fee?: number
          opened_at?: string
          realized_pnl?: number | null
          side?: Database["public"]["Enums"]["position_side"]
          size?: number
          status?: Database["public"]["Enums"]["position_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      price_ticks: {
        Row: {
          created_at: string
          id: number
          market_id: string
          price: number
        }
        Insert: {
          created_at?: string
          id?: number
          market_id: string
          price: number
        }
        Update: {
          created_at?: string
          id?: number
          market_id?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_ticks_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          balance: number
          created_at: string
          display_name: string | null
          id: string
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          balance?: number
          created_at?: string
          display_name?: string | null
          id?: string
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          balance?: number
          created_at?: string
          display_name?: string | null
          id?: string
          user_id?: string
          wallet_address?: string | null
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
      claim_admin: { Args: never; Returns: boolean }
      close_position: {
        Args: { _position_id: string }
        Returns: {
          borrow_fee_paid: number
          borrowed: number
          closed_at: string | null
          collateral: number
          entry_price: number
          exit_price: number | null
          id: string
          leverage: number
          liq_price: number
          market_id: string
          open_fee: number
          opened_at: string
          realized_pnl: number | null
          side: Database["public"]["Enums"]["position_side"]
          size: number
          status: Database["public"]["Enums"]["position_status"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "positions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_profile: {
        Args: { _display_name?: string }
        Returns: {
          balance: number
          created_at: string
          display_name: string | null
          id: string
          user_id: string
          wallet_address: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      open_position: {
        Args: {
          _collateral: number
          _leverage: number
          _market_id: string
          _side: Database["public"]["Enums"]["position_side"]
        }
        Returns: {
          borrow_fee_paid: number
          borrowed: number
          closed_at: string | null
          collateral: number
          entry_price: number
          exit_price: number | null
          id: string
          leverage: number
          liq_price: number
          market_id: string
          open_fee: number
          opened_at: string
          realized_pnl: number | null
          side: Database["public"]["Enums"]["position_side"]
          size: number
          status: Database["public"]["Enums"]["position_status"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "positions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      pool_deposit: {
        Args: { _amount: number }
        Returns: {
          deposited: number
          id: string
          shares: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "lp_positions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      pool_withdraw: {
        Args: { _shares: number }
        Returns: {
          deposited: number
          id: string
          shares: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "lp_positions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      tick_prices: {
        Args: never
        Returns: {
          created_at: string
          id: string
          is_active: boolean
          max_leverage: number
          name: string
          open_price_24h: number
          price: number
          price_24h_at: string
          symbol: string
          volatility: number
        }[]
        SetofOptions: {
          from: "*"
          to: "markets"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      app_role: "admin" | "user"
      position_side: "long" | "short"
      position_status: "open" | "closed" | "liquidated"
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
      position_side: ["long", "short"],
      position_status: ["open", "closed", "liquidated"],
    },
  },
} as const
