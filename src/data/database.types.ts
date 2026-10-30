export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      brands: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          normalized_name: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          normalized_name?: never;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          normalized_name?: never;
        };
        Relationships: [];
      };
      collection_items: {
        Row: {
          catalog_variant_id: string | null;
          checked: boolean | null;
          collection_id: string;
          created_at: string;
          desired_quantity: number | null;
          id: string;
          library_item_id: string | null;
          note: string | null;
          personal_product_id: string | null;
          sort_order: number;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          catalog_variant_id?: string | null;
          checked?: boolean | null;
          collection_id: string;
          created_at?: string;
          desired_quantity?: number | null;
          id?: string;
          library_item_id?: string | null;
          note?: string | null;
          personal_product_id?: string | null;
          sort_order?: number;
          user_id?: string;
        };
        Update: {
          catalog_variant_id?: string | null;
          checked?: boolean | null;
          collection_id?: string;
          created_at?: string;
          desired_quantity?: number | null;
          id?: string;
          library_item_id?: string | null;
          note?: string | null;
          personal_product_id?: string | null;
          sort_order?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collection_items_catalog_variant_id_fkey";
            columns: ["catalog_variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_items_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_items_library_item_id_fkey";
            columns: ["library_item_id"];
            isOneToOne: false;
            referencedRelation: "library_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_items_personal_product_id_fkey";
            columns: ["personal_product_id"];
            isOneToOne: false;
            referencedRelation: "personal_products";
            referencedColumns: ["id"];
          },
        ];
      };
      collections: {
        Row: {
          cover_path: string | null;
          created_at: string;
          description: string | null;
          id: string;
          look: Database["public"]["Enums"]["collection_look"];
          name: string;
          type: Database["public"]["Enums"]["collection_type"];
          updated_at: string;
          user_id: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          cover_path?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          look?: Database["public"]["Enums"]["collection_look"];
          name: string;
          type: Database["public"]["Enums"]["collection_type"];
          updated_at?: string;
          user_id?: string;
          version?: number;
        };
        Update: {
          cover_path?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          look?: Database["public"]["Enums"]["collection_look"];
          name?: string;
          type?: Database["public"]["Enums"]["collection_type"];
          updated_at?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [];
      };
      library_items: {
        Row: {
          catalog_variant_id: string | null;
          created_at: string;
          finished_at: string | null;
          id: string;
          notes: string | null;
          ownership_status: Database["public"]["Enums"]["ownership_status"];
          personal_product_id: string | null;
          photo_path: string | null;
          rating: number | null;
          repurchase_intent:
            Database["public"]["Enums"]["repurchase_intent"] | null;
          updated_at: string;
          usage_status: Database["public"]["Enums"]["usage_status"] | null;
          user_id: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          catalog_variant_id?: string | null;
          created_at?: string;
          finished_at?: string | null;
          id?: string;
          notes?: string | null;
          ownership_status: Database["public"]["Enums"]["ownership_status"];
          personal_product_id?: string | null;
          photo_path?: string | null;
          rating?: number | null;
          repurchase_intent?:
            Database["public"]["Enums"]["repurchase_intent"] | null;
          updated_at?: string;
          usage_status?: Database["public"]["Enums"]["usage_status"] | null;
          user_id?: string;
          version?: number;
        };
        Update: {
          catalog_variant_id?: string | null;
          created_at?: string;
          finished_at?: string | null;
          id?: string;
          notes?: string | null;
          ownership_status?: Database["public"]["Enums"]["ownership_status"];
          personal_product_id?: string | null;
          photo_path?: string | null;
          rating?: number | null;
          repurchase_intent?:
            Database["public"]["Enums"]["repurchase_intent"] | null;
          updated_at?: string;
          usage_status?: Database["public"]["Enums"]["usage_status"] | null;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "library_items_catalog_variant_id_fkey";
            columns: ["catalog_variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "library_items_personal_product_id_fkey";
            columns: ["personal_product_id"];
            isOneToOne: false;
            referencedRelation: "personal_products";
            referencedColumns: ["id"];
          },
        ];
      };
      personal_products: {
        Row: {
          brand_name: string;
          category: Database["public"]["Enums"]["product_category"];
          created_at: string;
          id: string;
          image_path: string | null;
          linked_variant_id: string | null;
          name: string;
          updated_at: string;
          user_id: string;
          variant_label: string | null;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          brand_name: string;
          category: Database["public"]["Enums"]["product_category"];
          created_at?: string;
          id?: string;
          image_path?: string | null;
          linked_variant_id?: string | null;
          name: string;
          updated_at?: string;
          user_id?: string;
          variant_label?: string | null;
          version?: number;
        };
        Update: {
          brand_name?: string;
          category?: Database["public"]["Enums"]["product_category"];
          created_at?: string;
          id?: string;
          image_path?: string | null;
          linked_variant_id?: string | null;
          name?: string;
          updated_at?: string;
          user_id?: string;
          variant_label?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "personal_products_linked_variant_id_fkey";
            columns: ["linked_variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      product_events: {
        Row: {
          event_type: Database["public"]["Enums"]["product_event_type"];
          from_status: Database["public"]["Enums"]["ownership_status"] | null;
          id: string;
          library_item_id: string;
          metadata: NonNullable<Json>;
          occurred_at: string;
          to_status: Database["public"]["Enums"]["ownership_status"] | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          event_type: Database["public"]["Enums"]["product_event_type"];
          from_status?: Database["public"]["Enums"]["ownership_status"] | null;
          id?: string;
          library_item_id: string;
          metadata?: NonNullable<Json>;
          occurred_at?: string;
          to_status?: Database["public"]["Enums"]["ownership_status"] | null;
          user_id: string;
        };
        Update: {
          event_type?: Database["public"]["Enums"]["product_event_type"];
          from_status?: Database["public"]["Enums"]["ownership_status"] | null;
          id?: string;
          library_item_id?: string;
          metadata?: NonNullable<Json>;
          occurred_at?: string;
          to_status?: Database["public"]["Enums"]["ownership_status"] | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_events_library_item_id_fkey";
            columns: ["library_item_id"];
            isOneToOne: false;
            referencedRelation: "library_items";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          barcode: string | null;
          created_at: string;
          id: string;
          image_url: string | null;
          is_default: boolean;
          label: string | null;
          product_id: string;
          shade_name: string | null;
          size_label: string | null;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          barcode?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          is_default?: boolean;
          label?: string | null;
          product_id: string;
          shade_name?: string | null;
          size_label?: string | null;
          sort_order?: number;
        };
        Update: {
          barcode?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          is_default?: boolean;
          label?: string | null;
          product_id?: string;
          shade_name?: string | null;
          size_label?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          brand_id: string;
          catalog_status: Database["public"]["Enums"]["catalog_status"];
          category: Database["public"]["Enums"]["product_category"];
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          name: string;
          search_text: string;
        };
        ComputedFields: never;
        Insert: {
          brand_id: string;
          catalog_status?: Database["public"]["Enums"]["catalog_status"];
          category: Database["public"]["Enums"]["product_category"];
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          name: string;
          search_text?: string;
        };
        Update: {
          brand_id?: string;
          catalog_status?: Database["public"]["Enums"]["catalog_status"];
          category?: Database["public"]["Enums"]["product_category"];
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          name?: string;
          search_text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_variant_to_library: {
        Args: {
          p_notes?: string;
          p_status: Database["public"]["Enums"]["ownership_status"];
          p_usage?: Database["public"]["Enums"]["usage_status"];
          p_variant_id: string;
        };
        Returns: {
          created: boolean;
          library_item_id: string;
        }[];
      };
      claim_collection_version: {
        Args: { p_collection_id: string; p_expected_version: number };
        Returns: {
          cover_path: string | null;
          created_at: string;
          description: string | null;
          id: string;
          look: Database["public"]["Enums"]["collection_look"];
          name: string;
          type: Database["public"]["Enums"]["collection_type"];
          updated_at: string;
          user_id: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "collections";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_personal_product: {
        Args: {
          p_brand_name: string;
          p_category: Database["public"]["Enums"]["product_category"];
          p_image_path?: string;
          p_name: string;
          p_notes?: string;
          p_status: Database["public"]["Enums"]["ownership_status"];
          p_variant_label?: string;
        };
        Returns: string;
      };
      log_purchase_event: {
        Args: { p_library_item_id: string; p_shopping_item_id: string };
        Returns: undefined;
      };
      mark_shopping_item_purchased: {
        Args: { p_item_id: string; p_remove?: boolean };
        Returns: string;
      };
      save_shelf: {
        Args: {
          p_collection_id: string;
          p_expected_version: number;
          p_library_item_ids: string[];
        };
        Returns: number;
      };
      save_shelf_layout: {
        Args: {
          p_collection_id: string;
          p_expected_version: number;
          p_library_item_ids: string[];
          p_notes: string[];
        };
        Returns: number;
      };
      search_catalog: {
        Args: {
          p_category?: Database["public"]["Enums"]["product_category"];
          p_limit?: number;
          p_offset?: number;
          p_query: string;
        };
        Returns: {
          brand_name: string;
          category: Database["public"]["Enums"]["product_category"];
          default_variant_id: string;
          image_url: string;
          product_id: string;
          product_name: string;
          variant_count: number;
        }[];
      };
      set_collection_order: {
        Args: {
          p_collection_id: string;
          p_expected_version: number;
          p_item_ids: string[];
        };
        Returns: number;
      };
      shelf_capacity: { Args: Record<PropertyKey, never>; Returns: number };
    };
    Enums: {
      catalog_status: "active" | "archived";
      collection_look: "board" | "mini_shelf" | "pouch" | "basket";
      collection_type: "custom" | "shopping" | "shelf";
      ownership_status: "owned" | "wishlist" | "finished";
      product_category:
        | "makeup"
        | "skincare"
        | "fragrance"
        | "haircare"
        | "body"
        | "tools"
        | "other";
      product_event_type:
        "added" | "status_changed" | "finished" | "repurchased" | "purchased";
      repurchase_intent: "yes" | "no" | "unsure";
      usage_status: "unopened" | "using" | "paused";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      catalog_status: ["active", "archived"],
      collection_look: ["board", "mini_shelf", "pouch", "basket"],
      collection_type: ["custom", "shopping", "shelf"],
      ownership_status: ["owned", "wishlist", "finished"],
      product_category: [
        "makeup",
        "skincare",
        "fragrance",
        "haircare",
        "body",
        "tools",
        "other",
      ],
      product_event_type: [
        "added",
        "status_changed",
        "finished",
        "repurchased",
        "purchased",
      ],
      repurchase_intent: ["yes", "no", "unsure"],
      usage_status: ["unopened", "using", "paused"],
    },
  },
} as const;
