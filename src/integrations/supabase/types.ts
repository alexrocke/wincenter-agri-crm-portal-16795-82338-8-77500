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
      client_drone_info: {
        Row: {
          client_id: string
          controller_serial: string | null
          controller_version: string | null
          created_at: string
          drone_serial: string | null
          drone_version: string | null
          id: string
          login: string | null
          name: string | null
          password: string | null
          purchase_date: string | null
        }
        Insert: {
          client_id: string
          controller_serial?: string | null
          controller_version?: string | null
          created_at?: string
          drone_serial?: string | null
          drone_version?: string | null
          id?: string
          login?: string | null
          name?: string | null
          password?: string | null
          purchase_date?: string | null
        }
        Update: {
          client_id?: string
          controller_serial?: string | null
          controller_version?: string | null
          created_at?: string
          drone_serial?: string | null
          drone_version?: string | null
          id?: string
          login?: string | null
          name?: string | null
          password?: string | null
          purchase_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_drone_info_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_client_drone_info_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          cep: string | null
          city: string | null
          contact_name: string | null
          cpf_cnpj: string | null
          created_at: string
          crops: string[] | null
          email: string | null
          farm_name: string | null
          hectares: number | null
          id: string
          lat: number | null
          lead_source: string | null
          legal_name: string | null
          lng: number | null
          location_link: string | null
          owner_user_id: string | null
          phone: string | null
          region: string | null
          relationship_status: Database["public"]["Enums"]["relationship_status"]
          seller_auth_id: string
          state: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          cep?: string | null
          city?: string | null
          contact_name?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          crops?: string[] | null
          email?: string | null
          farm_name?: string | null
          hectares?: number | null
          id?: string
          lat?: number | null
          lead_source?: string | null
          legal_name?: string | null
          lng?: number | null
          location_link?: string | null
          owner_user_id?: string | null
          phone?: string | null
          region?: string | null
          relationship_status: Database["public"]["Enums"]["relationship_status"]
          seller_auth_id: string
          state?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          cep?: string | null
          city?: string | null
          contact_name?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          crops?: string[] | null
          email?: string | null
          farm_name?: string | null
          hectares?: number | null
          id?: string
          lat?: number | null
          lead_source?: string | null
          legal_name?: string | null
          lng?: number | null
          location_link?: string | null
          owner_user_id?: string | null
          phone?: string | null
          region?: string | null
          relationship_status?: Database["public"]["Enums"]["relationship_status"]
          seller_auth_id?: string
          state?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "clients_seller_auth_id_fkey"
            columns: ["seller_auth_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          active: boolean
          base: Database["public"]["Enums"]["commission_base"]
          category: string | null
          created_at: string
          id: string
          percent: number
          product_id: string | null
          scope: string
        }
        Insert: {
          active?: boolean
          base: Database["public"]["Enums"]["commission_base"]
          category?: string | null
          created_at?: string
          id?: string
          percent: number
          product_id?: string | null
          scope: string
        }
        Update: {
          active?: boolean
          base?: Database["public"]["Enums"]["commission_base"]
          category?: string | null
          created_at?: string
          id?: string
          percent?: number
          product_id?: string | null
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          base: Database["public"]["Enums"]["commission_base"]
          created_at: string
          id: string
          notes: string | null
          pay_status: Database["public"]["Enums"]["commission_pay_status"]
          pay_status_date: string | null
          percent: number
          receipt_url: string | null
          sale_id: string
          seller_auth_id: string
        }
        Insert: {
          amount: number
          base: Database["public"]["Enums"]["commission_base"]
          created_at?: string
          id?: string
          notes?: string | null
          pay_status?: Database["public"]["Enums"]["commission_pay_status"]
          pay_status_date?: string | null
          percent: number
          receipt_url?: string | null
          sale_id: string
          seller_auth_id: string
        }
        Update: {
          amount?: number
          base?: Database["public"]["Enums"]["commission_base"]
          created_at?: string
          id?: string
          notes?: string | null
          pay_status?: Database["public"]["Enums"]["commission_pay_status"]
          pay_status_date?: string | null
          percent?: number
          receipt_url?: string | null
          sale_id?: string
          seller_auth_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      company_costs: {
        Row: {
          category: string | null
          competence_ym: string
          cost_type: Database["public"]["Enums"]["cost_type"]
          created_at: string
          description: string | null
          id: string
          monthly_value: number | null
          notes: string | null
        }
        Insert: {
          category?: string | null
          competence_ym: string
          cost_type: Database["public"]["Enums"]["cost_type"]
          created_at?: string
          description?: string | null
          id?: string
          monthly_value?: number | null
          notes?: string | null
        }
        Update: {
          category?: string | null
          competence_ym?: string
          cost_type?: Database["public"]["Enums"]["cost_type"]
          created_at?: string
          description?: string | null
          id?: string
          monthly_value?: number | null
          notes?: string | null
        }
        Relationships: []
      }
      demonstrations: {
        Row: {
          assigned_users: string[] | null
          cancellation_reason: string | null
          city: string | null
          client_evaluation: string | null
          client_id: string | null
          completion_notes: string | null
          created_at: string | null
          crop: string | null
          date: string
          demo_types: string[] | null
          equipment_checklist: Json | null
          hectares: number | null
          id: string
          images: string[] | null
          notes: string | null
          products: string[] | null
          property_name: string | null
          status: Database["public"]["Enums"]["demo_status"]
          weather_city: string | null
          weather_description: string | null
          weather_fetched_at: string | null
          weather_humidity: number | null
          weather_temperature: number | null
          weather_will_rain: boolean | null
          weather_wind_speed: number | null
        }
        Insert: {
          assigned_users?: string[] | null
          cancellation_reason?: string | null
          city?: string | null
          client_evaluation?: string | null
          client_id?: string | null
          completion_notes?: string | null
          created_at?: string | null
          crop?: string | null
          date: string
          demo_types?: string[] | null
          equipment_checklist?: Json | null
          hectares?: number | null
          id?: string
          images?: string[] | null
          notes?: string | null
          products?: string[] | null
          property_name?: string | null
          status?: Database["public"]["Enums"]["demo_status"]
          weather_city?: string | null
          weather_description?: string | null
          weather_fetched_at?: string | null
          weather_humidity?: number | null
          weather_temperature?: number | null
          weather_will_rain?: boolean | null
          weather_wind_speed?: number | null
        }
        Update: {
          assigned_users?: string[] | null
          cancellation_reason?: string | null
          city?: string | null
          client_evaluation?: string | null
          client_id?: string | null
          completion_notes?: string | null
          created_at?: string | null
          crop?: string | null
          date?: string
          demo_types?: string[] | null
          equipment_checklist?: Json | null
          hectares?: number | null
          id?: string
          images?: string[] | null
          notes?: string | null
          products?: string[] | null
          property_name?: string | null
          status?: Database["public"]["Enums"]["demo_status"]
          weather_city?: string | null
          weather_description?: string | null
          weather_fetched_at?: string | null
          weather_humidity?: number | null
          weather_temperature?: number | null
          weather_will_rain?: boolean | null
          weather_wind_speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "demonstrations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          id: string
          level: Database["public"]["Enums"]["goal_level"]
          period_ym: string
          proposals_goal: number | null
          sales_goal: number | null
          seller_auth_id: string | null
          visits_goal: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          level: Database["public"]["Enums"]["goal_level"]
          period_ym: string
          proposals_goal?: number | null
          sales_goal?: number | null
          seller_auth_id?: string | null
          visits_goal?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["goal_level"]
          period_ym?: string
          proposals_goal?: number | null
          sales_goal?: number | null
          seller_auth_id?: string | null
          visits_goal?: number | null
        }
        Relationships: []
      }
      notification_tracker: {
        Row: {
          created_at: string
          id: string
          last_notified_at: string
          notification_type: string
          reference_id: string
          user_auth_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_notified_at?: string
          notification_type: string
          reference_id: string
          user_auth_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_notified_at?: string
          notification_type?: string
          reference_id?: string
          user_auth_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          category: string | null
          created_at: string
          fcm_error: string | null
          fcm_sent: boolean | null
          fcm_sent_at: string | null
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          message: string | null
          metadata: Json | null
          read: boolean
          title: string | null
          user_auth_id: string
          whatsapp_sent: boolean | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          fcm_error?: string | null
          fcm_sent?: boolean | null
          fcm_sent_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          message?: string | null
          metadata?: Json | null
          read?: boolean
          title?: string | null
          user_auth_id: string
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          fcm_error?: string | null
          fcm_sent?: boolean | null
          fcm_sent_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          message?: string | null
          metadata?: Json | null
          read?: boolean
          title?: string | null
          user_auth_id?: string
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          card_brand: string | null
          client_id: string
          created_at: string
          estimated_margin: number | null
          expected_close_date: string | null
          final_value_with_fee: number | null
          gross_value: number | null
          history: string | null
          id: string
          installment_fee: number | null
          installments: number | null
          loss_reason: string | null
          payment_method: string | null
          probability: number | null
          product_ids: string[] | null
          seller_auth_id: string
          stage: Database["public"]["Enums"]["opportunity_stage"]
          updated_at: string
        }
        Insert: {
          card_brand?: string | null
          client_id: string
          created_at?: string
          estimated_margin?: number | null
          expected_close_date?: string | null
          final_value_with_fee?: number | null
          gross_value?: number | null
          history?: string | null
          id?: string
          installment_fee?: number | null
          installments?: number | null
          loss_reason?: string | null
          payment_method?: string | null
          probability?: number | null
          product_ids?: string[] | null
          seller_auth_id: string
          stage: Database["public"]["Enums"]["opportunity_stage"]
          updated_at?: string
        }
        Update: {
          card_brand?: string | null
          client_id?: string
          created_at?: string
          estimated_margin?: number | null
          expected_close_date?: string | null
          final_value_with_fee?: number | null
          gross_value?: number | null
          history?: string | null
          id?: string
          installment_fee?: number | null
          installments?: number | null
          loss_reason?: string | null
          payment_method?: string | null
          probability?: number | null
          product_ids?: string[] | null
          seller_auth_id?: string
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_items: {
        Row: {
          created_at: string
          discount_percent: number
          id: string
          opportunity_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount_percent?: number
          id?: string
          opportunity_id: string
          product_id: string
          quantity?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          discount_percent?: number
          id?: string
          opportunity_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_items_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price_history: {
        Row: {
          change_type: string
          changed_by: string | null
          created_at: string
          id: string
          new_cost: number | null
          new_price: number | null
          notes: string | null
          old_cost: number | null
          old_price: number | null
          product_id: string
          profit_margin_percent: number | null
          tax_percent: number | null
        }
        Insert: {
          change_type: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_cost?: number | null
          new_price?: number | null
          notes?: string | null
          old_cost?: number | null
          old_price?: number | null
          product_id: string
          profit_margin_percent?: number | null
          tax_percent?: number | null
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_cost?: number | null
          new_price?: number | null
          notes?: string | null
          old_cost?: number | null
          old_price?: number | null
          product_id?: string
          profit_margin_percent?: number | null
          tax_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          cost: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          low_stock_threshold: number
          max_discount_percent: number
          name: string
          price: number
          pricing_mode: string | null
          profit_margin_percent: number | null
          sku: string | null
          status: Database["public"]["Enums"]["product_status"]
          stock: number
          tax_percent: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          cost: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          low_stock_threshold?: number
          max_discount_percent?: number
          name: string
          price: number
          pricing_mode?: string | null
          profit_margin_percent?: number | null
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          tax_percent?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          low_stock_threshold?: number
          max_discount_percent?: number
          name?: string
          price?: number
          pricing_mode?: string | null
          profit_margin_percent?: number | null
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          tax_percent?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          discount_percent: number
          id: string
          product_id: string
          qty: number
          sale_id: string
          unit_price: number
        }
        Insert: {
          discount_percent?: number
          id?: string
          product_id: string
          qty: number
          sale_id: string
          unit_price: number
        }
        Update: {
          discount_percent?: number
          id?: string
          product_id?: string
          qty?: number
          sale_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          client_id: string
          created_at: string
          estimated_profit: number
          final_discount_percent: number | null
          gross_value: number
          id: string
          payment_method_1: string | null
          payment_method_2: string | null
          payment_received: boolean | null
          payment_value_1: number | null
          payment_value_2: number | null
          region: string | null
          seller_auth_id: string
          service_id: string | null
          sold_at: string
          status: Database["public"]["Enums"]["sale_status"]
          tax_percent: number | null
          total_cost: number
        }
        Insert: {
          client_id: string
          created_at?: string
          estimated_profit?: number
          final_discount_percent?: number | null
          gross_value?: number
          id?: string
          payment_method_1?: string | null
          payment_method_2?: string | null
          payment_received?: boolean | null
          payment_value_1?: number | null
          payment_value_2?: number | null
          region?: string | null
          seller_auth_id: string
          service_id?: string | null
          sold_at?: string
          status?: Database["public"]["Enums"]["sale_status"]
          tax_percent?: number | null
          total_cost?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          estimated_profit?: number
          final_discount_percent?: number | null
          gross_value?: number
          id?: string
          payment_method_1?: string | null
          payment_method_2?: string | null
          payment_received?: boolean | null
          payment_value_1?: number | null
          payment_value_2?: number | null
          region?: string | null
          seller_auth_id?: string
          service_id?: string | null
          sold_at?: string
          status?: Database["public"]["Enums"]["sale_status"]
          tax_percent?: number | null
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          service_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          service_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          service_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_files_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_items: {
        Row: {
          bottles_qty: number | null
          created_at: string
          discount_percent: number
          dose_per_hectare: number | null
          id: string
          product_id: string
          product_name: string | null
          qty: number
          service_id: string
          unit_price: number
          volume_total: number | null
        }
        Insert: {
          bottles_qty?: number | null
          created_at?: string
          discount_percent?: number
          dose_per_hectare?: number | null
          id?: string
          product_id: string
          product_name?: string | null
          qty?: number
          service_id: string
          unit_price?: number
          volume_total?: number | null
        }
        Update: {
          bottles_qty?: number | null
          created_at?: string
          discount_percent?: number
          dose_per_hectare?: number | null
          id?: string
          product_id?: string
          product_name?: string | null
          qty?: number
          service_id?: string
          unit_price?: number
          volume_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          assigned_users: string[] | null
          cancellation_reason: string | null
          city: string | null
          client_id: string
          client_items: Json | null
          client_present: boolean | null
          client_signature: string | null
          completion_notes: string | null
          created_at: string
          created_by: string | null
          crop: string | null
          date: string
          equipment_checklist: Json | null
          equipment_model: string | null
          equipment_serial: string | null
          equipment_year: number | null
          fixed_value: number | null
          followup_objective: string | null
          followup_results: string | null
          hectares: number | null
          id: string
          images: string[] | null
          installment_dates: Json | null
          installments: number | null
          invoice_number: string | null
          invoiced: boolean | null
          notes: string | null
          payment_method_1: string | null
          payment_method_2: string | null
          product_used: string | null
          property_name: string | null
          reported_defect: string | null
          service_category: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["service_status"]
          technical_checklist: string | null
          total_value: number | null
          under_warranty: boolean | null
          updated_at: string
          value_per_hectare: number | null
          warranty: boolean | null
          weather_city: string | null
          weather_description: string | null
          weather_fetched_at: string | null
          weather_humidity: number | null
          weather_temperature: number | null
          weather_wind_speed: number | null
        }
        Insert: {
          assigned_users?: string[] | null
          cancellation_reason?: string | null
          city?: string | null
          client_id: string
          client_items?: Json | null
          client_present?: boolean | null
          client_signature?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          crop?: string | null
          date: string
          equipment_checklist?: Json | null
          equipment_model?: string | null
          equipment_serial?: string | null
          equipment_year?: number | null
          fixed_value?: number | null
          followup_objective?: string | null
          followup_results?: string | null
          hectares?: number | null
          id?: string
          images?: string[] | null
          installment_dates?: Json | null
          installments?: number | null
          invoice_number?: string | null
          invoiced?: boolean | null
          notes?: string | null
          payment_method_1?: string | null
          payment_method_2?: string | null
          product_used?: string | null
          property_name?: string | null
          reported_defect?: string | null
          service_category?: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["service_status"]
          technical_checklist?: string | null
          total_value?: number | null
          under_warranty?: boolean | null
          updated_at?: string
          value_per_hectare?: number | null
          warranty?: boolean | null
          weather_city?: string | null
          weather_description?: string | null
          weather_fetched_at?: string | null
          weather_humidity?: number | null
          weather_temperature?: number | null
          weather_wind_speed?: number | null
        }
        Update: {
          assigned_users?: string[] | null
          cancellation_reason?: string | null
          city?: string | null
          client_id?: string
          client_items?: Json | null
          client_present?: boolean | null
          client_signature?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          crop?: string | null
          date?: string
          equipment_checklist?: Json | null
          equipment_model?: string | null
          equipment_serial?: string | null
          equipment_year?: number | null
          fixed_value?: number | null
          followup_objective?: string | null
          followup_results?: string | null
          hectares?: number | null
          id?: string
          images?: string[] | null
          installment_dates?: Json | null
          installments?: number | null
          invoice_number?: string | null
          invoiced?: boolean | null
          notes?: string | null
          payment_method_1?: string | null
          payment_method_2?: string | null
          product_used?: string | null
          property_name?: string | null
          reported_defect?: string | null
          service_category?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["service_status"]
          technical_checklist?: string | null
          total_value?: number | null
          under_warranty?: boolean | null
          updated_at?: string
          value_per_hectare?: number | null
          warranty?: boolean | null
          weather_city?: string | null
          weather_description?: string | null
          weather_fetched_at?: string | null
          weather_humidity?: number | null
          weather_temperature?: number | null
          weather_wind_speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          accent_color: string | null
          id: string
          login_banner_url: string | null
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          accent_color?: string | null
          id?: string
          login_banner_url?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          accent_color?: string | null
          id?: string
          login_banner_url?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      task_update_history: {
        Row: {
          edited_at: string
          edited_by: string
          id: string
          old_content: string
          task_update_id: string
        }
        Insert: {
          edited_at?: string
          edited_by: string
          id?: string
          old_content: string
          task_update_id: string
        }
        Update: {
          edited_at?: string
          edited_by?: string
          id?: string
          old_content?: string
          task_update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_update_history_task_update_id_fkey"
            columns: ["task_update_id"]
            isOneToOne: false
            referencedRelation: "task_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      task_updates: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          edit_count: number | null
          edited: boolean | null
          id: string
          task_id: string
          updated_at: string | null
          user_auth_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          edit_count?: number | null
          edited?: boolean | null
          id?: string
          task_id: string
          updated_at?: string | null
          user_auth_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          edit_count?: number | null
          edited?: boolean | null
          id?: string
          task_id?: string
          updated_at?: string | null
          user_auth_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_updates_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_users: string[]
          client_id: string | null
          created_at: string
          due_at: string
          id: string
          notes: string | null
          priority: string
          related_entity_id: string | null
          responsible_auth_id: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          assigned_users?: string[]
          client_id?: string | null
          created_at?: string
          due_at: string
          id?: string
          notes?: string | null
          priority?: string
          related_entity_id?: string | null
          responsible_auth_id: string
          status?: string
          title?: string
          type: string
          updated_at?: string
        }
        Update: {
          assigned_users?: string[]
          client_id?: string | null
          created_at?: string
          due_at?: string
          id?: string
          notes?: string | null
          priority?: string
          related_entity_id?: string | null
          responsible_auth_id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          fcm_token: string | null
          id: string
          invite_expires_at: string | null
          invite_token: string | null
          invited_at: string | null
          invited_by: string | null
          name: string
          phone: string | null
          region: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          fcm_token?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_at?: string | null
          invited_by?: string | null
          name: string
          phone?: string | null
          region?: string | null
          role: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          fcm_token?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_at?: string | null
          invited_by?: string | null
          name?: string
          phone?: string | null
          region?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          attachments: string[] | null
          client_id: string
          created_at: string
          duration_min: number | null
          id: string
          lat: number | null
          lng: number | null
          next_steps: string | null
          notes: string | null
          objective: string | null
          scheduled_at: string | null
          seller_auth_id: string
          status: Database["public"]["Enums"]["visit_status"]
        }
        Insert: {
          attachments?: string[] | null
          client_id: string
          created_at?: string
          duration_min?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          next_steps?: string | null
          notes?: string | null
          objective?: string | null
          scheduled_at?: string | null
          seller_auth_id: string
          status?: Database["public"]["Enums"]["visit_status"]
        }
        Update: {
          attachments?: string[] | null
          client_id?: string
          created_at?: string
          duration_min?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          next_steps?: string | null
          notes?: string | null
          objective?: string | null
          scheduled_at?: string | null
          seller_auth_id?: string
          status?: Database["public"]["Enums"]["visit_status"]
        }
        Relationships: [
          {
            foreignKeyName: "visits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_commission_for_sale: {
        Args: { p_sale_id: string }
        Returns: undefined
      }
      create_notification: {
        Args: {
          p_category?: string
          p_kind: Database["public"]["Enums"]["notification_kind"]
          p_message: string
          p_title: string
          p_user_auth_id: string
        }
        Returns: string
      }
      create_task: {
        Args: {
          p_assigned_users: string[]
          p_client_id: string
          p_due_at: string
          p_notes: string
          p_priority: string
          p_related_entity_id: string
          p_responsible_auth_id: string
          p_type: string
        }
        Returns: string
      }
      format_currency: { Args: { amount: number }; Returns: string }
      get_admin_user_ids: {
        Args: never
        Returns: {
          auth_user_id: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      recalc_sale_totals: { Args: { p_sale: string }; Returns: undefined }
      should_create_notification: {
        Args: {
          p_category: string
          p_hours_threshold?: number
          p_title: string
          p_user_auth_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      commission_base:
        | "profit"
        | "gross"
        | "maintenance"
        | "revision"
        | "spraying"
      commission_pay_status: "pending" | "approved" | "paid" | "canceled"
      cost_type: "fixed" | "variable"
      demo_status: "scheduled" | "completed" | "cancelled" | "in_progress"
      goal_level: "team" | "seller"
      notification_kind:
        | "visit_late_30"
        | "visit_late_60"
        | "goal_risk"
        | "low_stock"
        | "demo_assigned"
        | "demo_reminder"
        | "sale_pending"
        | "opportunity_pending"
        | "commission_payment"
        | "info"
        | "success"
        | "warning"
        | "alert"
      opportunity_stage:
        | "lead"
        | "qualified"
        | "proposal"
        | "closing"
        | "won"
        | "lost"
      product_status: "active" | "inactive"
      relationship_status: "prospect" | "negotiation" | "customer" | "lost"
      sale_status: "closed" | "canceled"
      service_status:
        | "scheduled"
        | "completed"
        | "cancelled"
        | "in_progress"
        | "open"
      service_type: "maintenance" | "revision" | "spraying"
      user_role: "admin" | "seller" | "technician"
      user_status: "active" | "inactive" | "invited" | "pending"
      visit_status: "scheduled" | "completed" | "cancelled"
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
      commission_base: [
        "profit",
        "gross",
        "maintenance",
        "revision",
        "spraying",
      ],
      commission_pay_status: ["pending", "approved", "paid", "canceled"],
      cost_type: ["fixed", "variable"],
      demo_status: ["scheduled", "completed", "cancelled", "in_progress"],
      goal_level: ["team", "seller"],
      notification_kind: [
        "visit_late_30",
        "visit_late_60",
        "goal_risk",
        "low_stock",
        "demo_assigned",
        "demo_reminder",
        "sale_pending",
        "opportunity_pending",
        "commission_payment",
        "info",
        "success",
        "warning",
        "alert",
      ],
      opportunity_stage: [
        "lead",
        "qualified",
        "proposal",
        "closing",
        "won",
        "lost",
      ],
      product_status: ["active", "inactive"],
      relationship_status: ["prospect", "negotiation", "customer", "lost"],
      sale_status: ["closed", "canceled"],
      service_status: [
        "scheduled",
        "completed",
        "cancelled",
        "in_progress",
        "open",
      ],
      service_type: ["maintenance", "revision", "spraying"],
      user_role: ["admin", "seller", "technician"],
      user_status: ["active", "inactive", "invited", "pending"],
      visit_status: ["scheduled", "completed", "cancelled"],
    },
  },
} as const
