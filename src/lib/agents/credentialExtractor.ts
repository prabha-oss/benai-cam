export interface CredentialField {
    name: string;
    label: string;
    type: "text" | "password";
    required: boolean;
    default?: string;
}

export interface SimpleCredential {
    type: string;
    displayName: string;
    instances: number;
    fields: CredentialField[];
    isOAuth?: boolean;
    oAuthNote?: string;
}

export interface SpecialCredential {
    type: string;
    displayName: string;
    instances: number;
    fields: CredentialField[];
    keyword: string; // Required for special credentials
}

// Union type for internal use
export type Credential = SimpleCredential | SpecialCredential;

export interface CredentialSchema {
    simple: SimpleCredential[];
    special: SpecialCredential[];
}

export function extractCredentials(workflowJSON: any): CredentialSchema {
    // Internal type for building the map
    interface InternalCredential {
        type: string;
        displayName: string;
        instances: number;
        fields: CredentialField[];
        keyword?: string;
        isOAuth?: boolean;
        oAuthNote?: string;
    }

    const credentialMap = new Map<string, InternalCredential>();

    if (!workflowJSON.nodes || !Array.isArray(workflowJSON.nodes)) {
        throw new Error("Invalid workflow JSON: missing 'nodes' array");
    }

    // Step 1: Iterate through all nodes
    for (const node of workflowJSON.nodes) {
        if (!node.credentials) continue;

        // Step 2: Extract credential types
        for (const [credType, credData] of Object.entries(node.credentials)) {
            // For simple creds, key is just type. For special, we might want to group differently, 
            // but PRD suggests grouping by type first, then identifying special ones.
            // Wait, PRD "special" matches by keyword. The extraction should find UNIQUE credential requirements.
            // If a node has { "httpHeaderAuth": { "id": "123", "name": "DataforSEO" } }, we look at the name.

            const isSpecial = isSpecialType(credType);
            const name = (credData as any).name || "";

            // key for map: separate entry for each special credential name variation?
            // PRD example: "HTTP Header: DataforSEO" vs "HTTP Header: Replicate"
            // So if special, include name in key. If simple, just type.

            const key = isSpecial ? `${credType}:${name}` : credType;

            if (!credentialMap.has(key)) {
                const oAuthInfo = isOAuthCredential(credType);
                const oAuthNote = getOAuthNote(credType);

                credentialMap.set(key, {
                    type: credType,
                    displayName: formatDisplayName(credType, isSpecial ? name : undefined),
                    instances: 0,
                    fields: getFieldsForType(credType),
                    ...(isSpecial ? { keyword: extractKeyword(name) } : {}),
                    ...(oAuthInfo ? { isOAuth: true } : {}),
                    ...(oAuthNote ? { oAuthNote } : {})
                });
            }

            const cred = credentialMap.get(key)!;
            cred.instances++;
        }
    }

    // Step 3: Categorize into simple vs special with proper types
    const simple: SimpleCredential[] = [];
    const special: SpecialCredential[] = [];

    for (const cred of credentialMap.values()) {
        if (isSpecialType(cred.type) && cred.keyword !== undefined) {
            special.push({
                type: cred.type,
                displayName: cred.displayName,
                instances: cred.instances,
                fields: cred.fields,
                keyword: cred.keyword,
            });
        } else {
            simple.push({
                type: cred.type,
                displayName: cred.displayName,
                instances: cred.instances,
                fields: cred.fields,
                ...(cred.isOAuth ? { isOAuth: true } : {}),
                ...(cred.oAuthNote ? { oAuthNote: cred.oAuthNote } : {})
            });
        }
    }

    return { simple, special };
}

function isSpecialType(type: string): boolean {
    return type === 'httpHeaderAuth' || type === 'httpBasicAuth' || type === 'customAuth';
}

function extractKeyword(name: string): string {
    // intelligent guess: remove "API", "Key", "Production", etc.
    return name
        .replace(/\b(api|key|auth|token|production|prod|dev|development|test)\b/gi, "")
        .trim();
}

function formatDisplayName(type: string, name?: string): string {
    if (name) return `${formatType(type)}: ${name}`;
    return formatType(type);
}

function formatType(type: string): string {
    // Convert camelCase to Title Case
    const result = type.replace(/([A-Z])/g, " $1");
    const final = result.charAt(0).toUpperCase() + result.slice(1);
    return final.replace("Api", "").replace("Auth", "").trim();
}

/**
 * Credential type metadata including whether it requires OAuth flow
 */
interface CredentialTypeInfo {
    fields: CredentialField[];
    isOAuth?: boolean;
    oAuthNote?: string;
}

/**
 * Comprehensive mapping of n8n credential types to their exact required fields.
 * Field names MUST match what n8n API expects.
 *
 * Reference: n8n credential schemas
 * https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/credentials
 */
const N8N_CREDENTIAL_TYPES: Record<string, CredentialTypeInfo> = {
    // ==================== AI / LLM APIs ====================
    'openAiApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ]
    },
    'anthropicApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ]
    },
    'cohereApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ]
    },
    'googlePalmApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ]
    },
    'groqApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ]
    },
    'mistralCloudApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ]
    },
    'ollamaApi': {
        fields: [
            { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, default: 'http://localhost:11434' }
        ]
    },
    'perplexityApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ]
    },
    'replicateApi': {
        fields: [
            { name: 'apiToken', label: 'API Token', type: 'password', required: true }
        ]
    },
    'huggingFaceApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ]
    },
    'pineconeApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ]
    },
    'qdrantApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: false },
            { name: 'qdrantUrl', label: 'Qdrant URL', type: 'text', required: true }
        ]
    },
    'weaviateApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: false },
            { name: 'host', label: 'Host', type: 'text', required: true }
        ]
    },

    // ==================== Automation / Scraping ====================
    'apifyApi': {
        fields: [
            { name: 'apiToken', label: 'API Token', type: 'password', required: true }
        ]
    },
    'browserlessApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ]
    },
    'phantomBusterApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ]
    },
    'serperApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ]
    },
    'serpApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ]
    },

    // ==================== Database ====================
    'airtableTokenApi': {
        fields: [
            { name: 'accessToken', label: 'Personal Access Token', type: 'password', required: true }
        ]
    },
    'supabaseApi': {
        fields: [
            { name: 'host', label: 'Project URL', type: 'text', required: true },
            { name: 'serviceRoleSecret', label: 'Service Role Secret', type: 'password', required: true }
        ]
    },
    'mongoDbApi': {
        fields: [
            { name: 'connectionString', label: 'Connection String', type: 'password', required: true }
        ]
    },
    'mySqlApi': {
        fields: [
            { name: 'host', label: 'Host', type: 'text', required: true },
            { name: 'database', label: 'Database', type: 'text', required: true },
            { name: 'user', label: 'User', type: 'text', required: true },
            { name: 'password', label: 'Password', type: 'password', required: true },
            { name: 'port', label: 'Port', type: 'text', required: false, default: '3306' }
        ]
    },
    'postgresApi': {
        fields: [
            { name: 'host', label: 'Host', type: 'text', required: true },
            { name: 'database', label: 'Database', type: 'text', required: true },
            { name: 'user', label: 'User', type: 'text', required: true },
            { name: 'password', label: 'Password', type: 'password', required: true },
            { name: 'port', label: 'Port', type: 'text', required: false, default: '5432' }
        ]
    },
    'redisApi': {
        fields: [
            { name: 'host', label: 'Host', type: 'text', required: true },
            { name: 'port', label: 'Port', type: 'text', required: false, default: '6379' },
            { name: 'password', label: 'Password', type: 'password', required: false }
        ]
    },
    'notionApi': {
        fields: [
            { name: 'apiKey', label: 'Internal Integration Token', type: 'password', required: true }
        ]
    },

    // ==================== Communication ====================
    'telegramApi': {
        fields: [
            { name: 'accessToken', label: 'Bot Token', type: 'password', required: true }
        ]
    },
    'discordWebhookApi': {
        fields: [
            { name: 'webhookUri', label: 'Webhook URL', type: 'password', required: true }
        ]
    },
    'twilioApi': {
        fields: [
            { name: 'accountSid', label: 'Account SID', type: 'text', required: true },
            { name: 'authToken', label: 'Auth Token', type: 'password', required: true }
        ]
    },
    'sendGridApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ]
    },
    'mailchimpApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ]
    },
    'postmarkApi': {
        fields: [
            { name: 'serverApiToken', label: 'Server API Token', type: 'password', required: true }
        ]
    },

    // ==================== Project Management ====================
    'asanaApi': {
        fields: [
            { name: 'accessToken', label: 'Personal Access Token', type: 'password', required: true }
        ]
    },
    'jiraCloudApi': {
        fields: [
            { name: 'email', label: 'Email', type: 'text', required: true },
            { name: 'apiToken', label: 'API Token', type: 'password', required: true },
            { name: 'domain', label: 'Domain', type: 'text', required: true }
        ]
    },
    'linearApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ]
    },
    'clickUpApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ]
    },
    'mondayComApi': {
        fields: [
            { name: 'apiToken', label: 'API Token', type: 'password', required: true }
        ]
    },
    'trelloApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true },
            { name: 'apiToken', label: 'API Token', type: 'password', required: true }
        ]
    },

    // ==================== CRM / Marketing ====================
    'hubspotApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ]
    },
    'activeCampaignApi': {
        fields: [
            { name: 'apiUrl', label: 'API URL', type: 'text', required: true },
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ]
    },
    'mailerliteApi': {
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ]
    },
    'convertKitApi': {
        fields: [
            { name: 'apiSecret', label: 'API Secret', type: 'password', required: true }
        ]
    },
    'stripeApi': {
        fields: [
            { name: 'apiKey', label: 'Secret Key', type: 'password', required: true }
        ]
    },
    'shopifyApi': {
        fields: [
            { name: 'shopSubdomain', label: 'Shop Subdomain', type: 'text', required: true },
            { name: 'accessToken', label: 'Access Token', type: 'password', required: true }
        ]
    },

    // ==================== Dev Tools ====================
    'gitHubApi': {
        fields: [
            { name: 'accessToken', label: 'Personal Access Token', type: 'password', required: true }
        ]
    },
    'gitlabApi': {
        fields: [
            { name: 'accessToken', label: 'Personal Access Token', type: 'password', required: true }
        ]
    },
    'bitbucketApi': {
        fields: [
            { name: 'username', label: 'Username', type: 'text', required: true },
            { name: 'appPassword', label: 'App Password', type: 'password', required: true }
        ]
    },

    // ==================== Cloud Storage ====================
    'awsApi': {
        fields: [
            { name: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
            { name: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
            { name: 'region', label: 'Region', type: 'text', required: false, default: 'us-east-1' }
        ]
    },
    'dropboxApi': {
        fields: [
            { name: 'accessToken', label: 'Access Token', type: 'password', required: true }
        ]
    },

    // ==================== HTTP / Generic Auth ====================
    'httpHeaderAuth': {
        fields: [
            { name: 'name', label: 'Header Name', type: 'text', required: true },
            { name: 'value', label: 'Header Value', type: 'password', required: true }
        ]
    },
    'httpBasicAuth': {
        fields: [
            { name: 'user', label: 'Username', type: 'text', required: true },
            { name: 'password', label: 'Password', type: 'password', required: true }
        ]
    },
    'httpDigestAuth': {
        fields: [
            { name: 'user', label: 'Username', type: 'text', required: true },
            { name: 'password', label: 'Password', type: 'password', required: true }
        ]
    },
    'oAuth2Api': {
        fields: [
            { name: 'clientId', label: 'Client ID', type: 'text', required: true },
            { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true }
        ],
        isOAuth: true,
        oAuthNote: 'Requires OAuth flow - configure in n8n after deployment'
    },

    // ==================== OAuth Credentials (Special Handling) ====================
    // These require OAuth authorization flow and cannot be fully automated
    'googleSheetsOAuth2Api': {
        fields: [
            { name: 'clientId', label: 'Client ID', type: 'text', required: true },
            { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true }
        ],
        isOAuth: true,
        oAuthNote: 'Requires Google OAuth flow. Configure in n8n after deployment.'
    },
    'googleDriveOAuth2Api': {
        fields: [
            { name: 'clientId', label: 'Client ID', type: 'text', required: true },
            { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true }
        ],
        isOAuth: true,
        oAuthNote: 'Requires Google OAuth flow. Configure in n8n after deployment.'
    },
    'googleCalendarOAuth2Api': {
        fields: [
            { name: 'clientId', label: 'Client ID', type: 'text', required: true },
            { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true }
        ],
        isOAuth: true,
        oAuthNote: 'Requires Google OAuth flow. Configure in n8n after deployment.'
    },
    'gmailOAuth2Api': {
        fields: [
            { name: 'clientId', label: 'Client ID', type: 'text', required: true },
            { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true }
        ],
        isOAuth: true,
        oAuthNote: 'Requires Google OAuth flow. Configure in n8n after deployment.'
    },
    'slackOAuth2Api': {
        fields: [
            { name: 'clientId', label: 'Client ID', type: 'text', required: true },
            { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true }
        ],
        isOAuth: true,
        oAuthNote: 'Requires Slack OAuth flow. Configure in n8n after deployment.'
    },
    'microsoftOAuth2Api': {
        fields: [
            { name: 'clientId', label: 'Client ID', type: 'text', required: true },
            { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true }
        ],
        isOAuth: true,
        oAuthNote: 'Requires Microsoft OAuth flow. Configure in n8n after deployment.'
    },
    'microsoftTeamsOAuth2Api': {
        fields: [
            { name: 'clientId', label: 'Client ID', type: 'text', required: true },
            { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true }
        ],
        isOAuth: true,
        oAuthNote: 'Requires Microsoft OAuth flow. Configure in n8n after deployment.'
    },
    'facebookGraphApi': {
        fields: [
            { name: 'accessToken', label: 'Access Token', type: 'password', required: true }
        ],
        isOAuth: true,
        oAuthNote: 'Requires Facebook OAuth flow. Configure in n8n after deployment.'
    },
    'linkedInOAuth2Api': {
        fields: [
            { name: 'clientId', label: 'Client ID', type: 'text', required: true },
            { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true }
        ],
        isOAuth: true,
        oAuthNote: 'Requires LinkedIn OAuth flow. Configure in n8n after deployment.'
    },
    'twitterOAuth1Api': {
        fields: [
            { name: 'consumerKey', label: 'Consumer Key', type: 'text', required: true },
            { name: 'consumerSecret', label: 'Consumer Secret', type: 'password', required: true },
            { name: 'accessToken', label: 'Access Token', type: 'password', required: true },
            { name: 'accessTokenSecret', label: 'Access Token Secret', type: 'password', required: true }
        ],
        isOAuth: true,
        oAuthNote: 'Requires Twitter OAuth. Configure in n8n after deployment.'
    },
    'zoomOAuth2Api': {
        fields: [
            { name: 'clientId', label: 'Client ID', type: 'text', required: true },
            { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true }
        ],
        isOAuth: true,
        oAuthNote: 'Requires Zoom OAuth flow. Configure in n8n after deployment.'
    },

    // ==================== Service Account Alternatives ====================
    // These are service account versions that don't require OAuth
    'googleServiceAccount': {
        fields: [
            { name: 'serviceAccountEmail', label: 'Service Account Email', type: 'text', required: true },
            { name: 'privateKey', label: 'Private Key (JSON)', type: 'password', required: true }
        ]
    },
    'googleServiceAccountApi': {
        fields: [
            { name: 'serviceAccountEmail', label: 'Service Account Email', type: 'text', required: true },
            { name: 'privateKey', label: 'Private Key (JSON)', type: 'password', required: true }
        ]
    },
};

/**
 * Get the field definitions for a given credential type
 */
function getFieldsForType(type: string): CredentialField[] {
    const typeInfo = N8N_CREDENTIAL_TYPES[type];

    if (typeInfo) {
        return typeInfo.fields;
    }

    // Fallback: Try to make an intelligent guess based on common patterns
    const typeLower = type.toLowerCase();

    if (typeLower.includes('oauth')) {
        // OAuth credentials - provide basic client ID/secret fields with a note
        console.warn(`[credentialExtractor] Unknown OAuth type "${type}" - using default OAuth fields`);
        return [
            { name: 'clientId', label: 'Client ID', type: 'text', required: true },
            { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true }
        ];
    }

    if (typeLower.includes('api') || typeLower.includes('token')) {
        // API key based - most common pattern
        console.warn(`[credentialExtractor] Unknown API type "${type}" - using default apiKey field`);
        return [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ];
    }

    // Last resort fallback
    console.warn(`[credentialExtractor] Completely unknown credential type "${type}" - using generic apiKey field`);
    return [
        { name: 'apiKey', label: 'API Key', type: 'password', required: true }
    ];
}

/**
 * Check if a credential type requires OAuth flow
 */
export function isOAuthCredential(type: string): boolean {
    const typeInfo = N8N_CREDENTIAL_TYPES[type];
    return typeInfo?.isOAuth === true || type.toLowerCase().includes('oauth');
}

/**
 * Get OAuth note for a credential type (if applicable)
 */
export function getOAuthNote(type: string): string | undefined {
    const typeInfo = N8N_CREDENTIAL_TYPES[type];
    return typeInfo?.oAuthNote;
}
