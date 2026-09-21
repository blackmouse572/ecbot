import { ToolkitRetrieveResponse } from '@composio/core';

export type ComposioCatalogResponse = {
    items: Array<{
        slug: string;
        name: string;
        auth_schemes: Array<string>;
        composio_managed_auth_schemes: Array<string>;
        is_local_toolkit: boolean;
        no_auth: boolean;
        auth_guide_url: string;
        deprecated: {
            toolkitId: string;
        };
        meta: {
            created_at: string;
            updated_at: string;
            description: string;
            logo: string;
            app_url: string;
            categories: Array<{
                id: string;
                name: string;
            }>;
            triggers_count: number;
            tools_count: number;
            version: string;
        };
    }>;
    next_cursor: string;
    total_pages: number;
    current_page: number;
    total_items: number;
};

export type ComposioCatalogRequestParams = {
    category?: string;
    search?: string;
    managed_by?: 'composio' | 'all' | 'project';
    sort_by?: 'composio' | 'all' | 'project';
    include_deprecated?: boolean;
    limit?: number;
    cursor?: string;
};

export interface ComposioToolkit {
    slug: string;
    name: string;
    description?: string;
    categories?:
        | {
              id: string;
              name: string;
          }[]
        | undefined;
    logo?: string;
}

export interface ComposioToolkitPage {
    items: ComposioToolkit[];
    total: number;
}

export interface ComposioToolkitAuthField {
    name: string;
    displayName: string;
    default: string;
    type: string;
    description: string;
    required: boolean;
    is_secret: boolean;
    advanced: boolean;
}

export interface ComposioToolkitAuthConfigDetail {
    mode: string;
    name: string;
    auth_hint_url?: string;
    fields: {
        auth_config_creation: {
            required: ComposioToolkitAuthField[];
            optional: ComposioToolkitAuthField[];
        };
        connected_account_initiation: {
            required: ComposioToolkitAuthField[];
            optional: ComposioToolkitAuthField[];
        };
    };
    proxy?: { base_url: string };
}

// Detail shape is identical to ToolkitRetrieveResponse today; kept as a named
// alias so call sites read intent. (An empty `interface ... extends` trips
// @typescript-eslint/no-empty-object-type, so use a type alias.)
export type ComposioToolkitDetail = ToolkitRetrieveResponse;
