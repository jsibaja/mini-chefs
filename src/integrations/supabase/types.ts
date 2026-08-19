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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      allergens: {
        Row: {
          code: string
          created_at: string
          id: string
          is_priority: boolean
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_priority?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_priority?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      child_achievements: {
        Row: {
          child_id: string
          code: string
          earned_at: string
          id: string
          title: string
        }
        Insert: {
          child_id: string
          code: string
          earned_at?: string
          id?: string
          title: string
        }
        Update: {
          child_id?: string
          code?: string
          earned_at?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_achievements_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      child_allergens: {
        Row: {
          allergen_id: string
          child_id: string
          created_at: string
          id: string
          notes: string | null
          severity: Database["public"]["Enums"]["allergen_severity"]
        }
        Insert: {
          allergen_id: string
          child_id: string
          created_at?: string
          id?: string
          notes?: string | null
          severity?: Database["public"]["Enums"]["allergen_severity"]
        }
        Update: {
          allergen_id?: string
          child_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          severity?: Database["public"]["Enums"]["allergen_severity"]
        }
        Relationships: [
          {
            foreignKeyName: "child_allergens_allergen_id_fkey"
            columns: ["allergen_id"]
            isOneToOne: false
            referencedRelation: "allergens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_allergens_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      child_food_preferences: {
        Row: {
          child_id: string
          created_at: string
          id: string
          ingredient_id: string
          preference: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          ingredient_id: string
          preference?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          ingredient_id?: string
          preference?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_food_preferences_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_food_preferences_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          attends_school: boolean
          avatar: string | null
          birth_date: string
          created_at: string
          gestational_weeks: number | null
          has_thermal_lunchbox: boolean
          id: string
          is_selective_eater: boolean
          mini_chef_level: number
          mini_chef_xp: number
          name: string
          school_nut_free: boolean
          texture_stage: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attends_school?: boolean
          avatar?: string | null
          birth_date: string
          created_at?: string
          gestational_weeks?: number | null
          has_thermal_lunchbox?: boolean
          id?: string
          is_selective_eater?: boolean
          mini_chef_level?: number
          mini_chef_xp?: number
          name: string
          school_nut_free?: boolean
          texture_stage?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attends_school?: boolean
          avatar?: string | null
          birth_date?: string
          created_at?: string
          gestational_weeks?: number | null
          has_thermal_lunchbox?: boolean
          id?: string
          is_selective_eater?: boolean
          mini_chef_level?: number
          mini_chef_xp?: number
          name?: string
          school_nut_free?: boolean
          texture_stage?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      children_deleted_log: {
        Row: {
          child_id: string
          child_name: string | null
          db_user: string | null
          deleted_at: string
          deleted_by: string | null
          id: string
          related: Json | null
          snapshot: Json
          user_id: string | null
        }
        Insert: {
          child_id: string
          child_name?: string | null
          db_user?: string | null
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          related?: Json | null
          snapshot: Json
          user_id?: string | null
        }
        Update: {
          child_id?: string
          child_name?: string | null
          db_user?: string | null
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          related?: Json | null
          snapshot?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      decisor_daily_uses: {
        Row: {
          id: string
          used_on: string
          user_id: string
          uses: number
        }
        Insert: {
          id?: string
          used_on: string
          user_id: string
          uses?: number
        }
        Update: {
          id?: string
          used_on?: string
          user_id?: string
          uses?: number
        }
        Relationships: []
      }
      favorites: {
        Row: {
          child_id: string | null
          created_at: string
          id: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          child_id?: string | null
          created_at?: string
          id?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          child_id?: string | null
          created_at?: string
          id?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_allergens: {
        Row: {
          allergen_id: string
          ingredient_id: string
        }
        Insert: {
          allergen_id: string
          ingredient_id: string
        }
        Update: {
          allergen_id?: string
          ingredient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_allergens_allergen_id_fkey"
            columns: ["allergen_id"]
            isOneToOne: false
            referencedRelation: "allergens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_allergens_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          category: string | null
          choking_risk: boolean
          code: string
          created_at: string
          id: string
          is_common_pantry: boolean
          is_cow_milk_drink: boolean
          is_free_sugar: boolean
          is_honey: boolean
          is_juice: boolean
          is_priority_allergen: boolean
          is_trackable_food: boolean
          is_vegetable: boolean
          is_whole_nut: boolean
          min_age_months: number | null
          name: string
          store_section: string | null
          veggie_color: string | null
        }
        Insert: {
          category?: string | null
          choking_risk?: boolean
          code: string
          created_at?: string
          id?: string
          is_common_pantry?: boolean
          is_cow_milk_drink?: boolean
          is_free_sugar?: boolean
          is_honey?: boolean
          is_juice?: boolean
          is_priority_allergen?: boolean
          is_trackable_food?: boolean
          is_vegetable?: boolean
          is_whole_nut?: boolean
          min_age_months?: number | null
          name: string
          store_section?: string | null
          veggie_color?: string | null
        }
        Update: {
          category?: string | null
          choking_risk?: boolean
          code?: string
          created_at?: string
          id?: string
          is_common_pantry?: boolean
          is_cow_milk_drink?: boolean
          is_free_sugar?: boolean
          is_honey?: boolean
          is_juice?: boolean
          is_priority_allergen?: boolean
          is_trackable_food?: boolean
          is_vegetable?: boolean
          is_whole_nut?: boolean
          min_age_months?: number | null
          name?: string
          store_section?: string | null
          veggie_color?: string | null
        }
        Relationships: []
      }
      lunchboxes: {
        Row: {
          child_id: string
          created_at: string
          for_date: string
          id: string
          items: Json
          user_id: string
        }
        Insert: {
          child_id: string
          created_at?: string
          for_date: string
          id?: string
          items: Json
          user_id: string
        }
        Update: {
          child_id?: string
          created_at?: string
          for_date?: string
          id?: string
          items?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lunchboxes_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_entries: {
        Row: {
          custom_title: string | null
          entry_date: string
          id: string
          is_done: boolean
          meal_plan_id: string
          recipe_id: string | null
          slot: Database["public"]["Enums"]["meal_slot"]
        }
        Insert: {
          custom_title?: string | null
          entry_date: string
          id?: string
          is_done?: boolean
          meal_plan_id: string
          recipe_id?: string | null
          slot: Database["public"]["Enums"]["meal_slot"]
        }
        Update: {
          custom_title?: string | null
          entry_date?: string
          id?: string
          is_done?: boolean
          meal_plan_id?: string
          recipe_id?: string | null
          slot?: Database["public"]["Enums"]["meal_slot"]
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_entries_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_entries_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          child_id: string
          created_at: string
          id: string
          notes: string | null
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          budget_mode: Database["public"]["Enums"]["budget_mode"]
          cooking_mode: Database["public"]["Enums"]["cooking_mode"]
          country_code: string | null
          created_at: string
          dessert_weekly_limit: number
          display_name: string | null
          equipment: Json | null
          household_size: number
          id: string
          legal_accepted_at: string | null
          onboarding_completed_at: string | null
          protein_targets: Json | null
          theme: string | null
          timezone: string | null
          updated_at: string
          vacation_mode: boolean
          weekday_time_budget: number | null
        }
        Insert: {
          budget_mode?: Database["public"]["Enums"]["budget_mode"]
          cooking_mode?: Database["public"]["Enums"]["cooking_mode"]
          country_code?: string | null
          created_at?: string
          dessert_weekly_limit?: number
          display_name?: string | null
          equipment?: Json | null
          household_size?: number
          id: string
          legal_accepted_at?: string | null
          onboarding_completed_at?: string | null
          protein_targets?: Json | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string
          vacation_mode?: boolean
          weekday_time_budget?: number | null
        }
        Update: {
          budget_mode?: Database["public"]["Enums"]["budget_mode"]
          cooking_mode?: Database["public"]["Enums"]["cooking_mode"]
          country_code?: string | null
          created_at?: string
          dessert_weekly_limit?: number
          display_name?: string | null
          equipment?: Json | null
          household_size?: number
          id?: string
          legal_accepted_at?: string | null
          onboarding_completed_at?: string | null
          protein_targets?: Json | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string
          vacation_mode?: boolean
          weekday_time_budget?: number | null
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          amount: number | null
          id: string
          ingredient_id: string
          note: string | null
          recipe_id: string
          sort_order: number
          unit: string | null
        }
        Insert: {
          amount?: number | null
          id?: string
          ingredient_id: string
          note?: string | null
          recipe_id: string
          sort_order?: number
          unit?: string | null
        }
        Update: {
          amount?: number | null
          id?: string
          ingredient_id?: string
          note?: string | null
          recipe_id?: string
          sort_order?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_notes: {
        Row: {
          created_at: string
          id: string
          note: string
          recipe_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string
          recipe_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          recipe_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_notes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_steps: {
        Row: {
          id: string
          instruction: string
          is_safety_critical: boolean
          recipe_id: string
          step_number: number
        }
        Insert: {
          id?: string
          instruction: string
          is_safety_critical?: boolean
          recipe_id: string
          step_number: number
        }
        Update: {
          id?: string
          instruction?: string
          is_safety_critical?: boolean
          recipe_id?: string
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_variants: {
        Row: {
          adaptation_text: string
          age_band: Database["public"]["Enums"]["age_band"]
          id: string
          recipe_id: string
        }
        Insert: {
          adaptation_text: string
          age_band: Database["public"]["Enums"]["age_band"]
          id?: string
          recipe_id: string
        }
        Update: {
          adaptation_text?: string
          age_band?: Database["public"]["Enums"]["age_band"]
          id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_variants_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          carb_base: string | null
          category: Database["public"]["Enums"]["recipe_category"]
          conservation: Database["public"]["Enums"]["conservation_kind"]
          cook_minutes: number
          created_at: string
          description: string | null
          difficulty: number
          fallback_image: string | null
          family_mode_note: string | null
          freezer_months: number | null
          has_free_sugars: boolean
          id: string
          image_filename: string | null
          is_batch_friendly: boolean
          is_economic: boolean
          is_freezable: boolean
          is_lunchbox_friendly: boolean
          is_occasional_sweet: boolean
          is_published: boolean
          max_age_months: number | null
          min_age_months: number
          nutrition_blurb: string | null
          prep_minutes: number
          protein_group: Database["public"]["Enums"]["protein_group"] | null
          requires_blender: boolean
          requires_oven: boolean
          servings: number
          slug: string
          source_book: string | null
          source_numbers: number[] | null
          suitable_slots: Database["public"]["Enums"]["meal_slot"][]
          texture_stages: number[]
          tips: string | null
          title: string
          updated_at: string
          veggie_colors: string[]
        }
        Insert: {
          carb_base?: string | null
          category: Database["public"]["Enums"]["recipe_category"]
          conservation?: Database["public"]["Enums"]["conservation_kind"]
          cook_minutes?: number
          created_at?: string
          description?: string | null
          difficulty?: number
          fallback_image?: string | null
          family_mode_note?: string | null
          freezer_months?: number | null
          has_free_sugars?: boolean
          id?: string
          image_filename?: string | null
          is_batch_friendly?: boolean
          is_economic?: boolean
          is_freezable?: boolean
          is_lunchbox_friendly?: boolean
          is_occasional_sweet?: boolean
          is_published?: boolean
          max_age_months?: number | null
          min_age_months?: number
          nutrition_blurb?: string | null
          prep_minutes?: number
          protein_group?: Database["public"]["Enums"]["protein_group"] | null
          requires_blender?: boolean
          requires_oven?: boolean
          servings?: number
          slug: string
          source_book?: string | null
          source_numbers?: number[] | null
          suitable_slots?: Database["public"]["Enums"]["meal_slot"][]
          texture_stages?: number[]
          tips?: string | null
          title: string
          updated_at?: string
          veggie_colors?: string[]
        }
        Update: {
          carb_base?: string | null
          category?: Database["public"]["Enums"]["recipe_category"]
          conservation?: Database["public"]["Enums"]["conservation_kind"]
          cook_minutes?: number
          created_at?: string
          description?: string | null
          difficulty?: number
          fallback_image?: string | null
          family_mode_note?: string | null
          freezer_months?: number | null
          has_free_sugars?: boolean
          id?: string
          image_filename?: string | null
          is_batch_friendly?: boolean
          is_economic?: boolean
          is_freezable?: boolean
          is_lunchbox_friendly?: boolean
          is_occasional_sweet?: boolean
          is_published?: boolean
          max_age_months?: number | null
          min_age_months?: number
          nutrition_blurb?: string | null
          prep_minutes?: number
          protein_group?: Database["public"]["Enums"]["protein_group"] | null
          requires_blender?: boolean
          requires_oven?: boolean
          servings?: number
          slug?: string
          source_book?: string | null
          source_numbers?: number[] | null
          suitable_slots?: Database["public"]["Enums"]["meal_slot"][]
          texture_stages?: number[]
          tips?: string | null
          title?: string
          updated_at?: string
          veggie_colors?: string[]
        }
        Relationships: []
      }
      safety_rules: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          ingredient_predicate: string | null
          kind: Database["public"]["Enums"]["safety_rule_kind"]
          max_age_months: number | null
          min_age_months: number | null
          sort_order: number
          title: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          ingredient_predicate?: string | null
          kind: Database["public"]["Enums"]["safety_rule_kind"]
          max_age_months?: number | null
          min_age_months?: number | null
          sort_order?: number
          title: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          ingredient_predicate?: string | null
          kind?: Database["public"]["Enums"]["safety_rule_kind"]
          max_age_months?: number | null
          min_age_months?: number | null
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          billing_interval_months: number
          code: Database["public"]["Enums"]["subscription_plan_code"]
          created_at: string
          description: string | null
          hotmart_offer_code: string | null
          id: string
          is_active: boolean
          is_best_value: boolean
          name: string
          price_usd: number
          sort_order: number
        }
        Insert: {
          billing_interval_months: number
          code: Database["public"]["Enums"]["subscription_plan_code"]
          created_at?: string
          description?: string | null
          hotmart_offer_code?: string | null
          id?: string
          is_active?: boolean
          is_best_value?: boolean
          name: string
          price_usd: number
          sort_order?: number
        }
        Update: {
          billing_interval_months?: number
          code?: Database["public"]["Enums"]["subscription_plan_code"]
          created_at?: string
          description?: string | null
          hotmart_offer_code?: string | null
          id?: string
          is_active?: boolean
          is_best_value?: boolean
          name?: string
          price_usd?: number
          sort_order?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          hotmart_offer_code: string | null
          hotmart_subscriber_code: string | null
          hotmart_transaction_ref: string | null
          id: string
          plan_id: string
          raw_payload: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          hotmart_offer_code?: string | null
          hotmart_subscriber_code?: string | null
          hotmart_transaction_ref?: string | null
          id?: string
          plan_id: string
          raw_payload?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          hotmart_offer_code?: string | null
          hotmart_subscriber_code?: string | null
          hotmart_transaction_ref?: string | null
          id?: string
          plan_id?: string
          raw_payload?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
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
      admin_change_email: {
        Args: { _email: string; _user_id: string }
        Returns: Json
      }
      admin_change_password: {
        Args: { _password: string; _user_id: string }
        Returns: Json
      }
      admin_create_user: {
        Args: {
          _display_name?: string
          _email: string
          _password: string
          _plan_code?: string
          _role?: string
        }
        Returns: Json
      }
      admin_delete_user: { Args: { _user_id: string }; Returns: Json }
      admin_grant_access_service: {
        Args: { _plan_code: string; _user_id: string }
        Returns: undefined
      }
      admin_list_users: {
        Args: { _search?: string }
        Returns: {
          created_at: string
          current_period_end: string
          display_name: string
          email: string
          is_paid: boolean
          plan_code: string
          plan_name: string
          role: string
          status: string
          user_id: string
        }[]
      }
      admin_set_access: {
        Args: {
          _active: boolean
          _months?: number
          _plan_code?: string
          _user_id: string
        }
        Returns: Json
      }
      admin_stats: { Args: never; Returns: Json }
      admin_update_user: {
        Args: {
          _display_name?: string
          _plan_code?: string
          _role?: string
          _status?: string
          _user_id: string
        }
        Returns: Json
      }
      consume_decisor_use: { Args: { _daily_limit?: number }; Returns: boolean }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _uid?: string }; Returns: boolean }
      my_role: { Args: never; Returns: string }
      owns_child: { Args: { _child_id: string }; Returns: boolean }
      restore_deleted_child: { Args: { _log_id: string }; Returns: string }
    }
    Enums: {
      age_band: "6_8m" | "9_11m" | "12_24m" | "2_5a" | "6_9a"
      allergen_severity: "leve" | "moderada" | "severa"
      app_role: "owner" | "admin" | "user"
      budget_mode: "normal" | "economic"
      conservation_kind: "estable_ambiente" | "requiere_frio" | "requiere_termo"
      cooking_mode: "daily" | "batch"
      meal_slot:
        | "desayuno"
        | "colacion_am"
        | "almuerzo"
        | "colacion_pm"
        | "cena"
        | "lonchera"
      protein_group:
        | "pescado"
        | "carne_roja"
        | "pollo_pavo"
        | "huevo"
        | "legumbre"
        | "lacteo"
      recipe_category:
        | "papilla"
        | "desayuno"
        | "almuerzo"
        | "cena"
        | "colacion"
        | "lonchera"
        | "postre"
        | "bebida"
      safety_rule_kind: "prohibido" | "evitar" | "precaucion" | "porcion_maxima"
      subscription_plan_code: "mensual" | "semestral" | "anual"
      subscription_status: "pendiente" | "activa" | "vencida" | "cancelada"
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
      age_band: ["6_8m", "9_11m", "12_24m", "2_5a", "6_9a"],
      allergen_severity: ["leve", "moderada", "severa"],
      app_role: ["owner", "admin", "user"],
      budget_mode: ["normal", "economic"],
      conservation_kind: [
        "estable_ambiente",
        "requiere_frio",
        "requiere_termo",
      ],
      cooking_mode: ["daily", "batch"],
      meal_slot: [
        "desayuno",
        "colacion_am",
        "almuerzo",
        "colacion_pm",
        "cena",
        "lonchera",
      ],
      protein_group: [
        "pescado",
        "carne_roja",
        "pollo_pavo",
        "huevo",
        "legumbre",
        "lacteo",
      ],
      recipe_category: [
        "papilla",
        "desayuno",
        "almuerzo",
        "cena",
        "colacion",
        "lonchera",
        "postre",
        "bebida",
      ],
      safety_rule_kind: ["prohibido", "evitar", "precaucion", "porcion_maxima"],
      subscription_plan_code: ["mensual", "semestral", "anual"],
      subscription_status: ["pendiente", "activa", "vencida", "cancelada"],
    },
  },
} as const
