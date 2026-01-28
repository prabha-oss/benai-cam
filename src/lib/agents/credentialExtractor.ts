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
                credentialMap.set(key, {
                    type: credType,
                    displayName: formatDisplayName(credType, isSpecial ? name : undefined),
                    instances: 0,
                    fields: getFieldsForType(credType),
                    ...(isSpecial ? { keyword: extractKeyword(name) } : {})
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

function getFieldsForType(type: string): CredentialField[] {
    const fieldMap: Record<string, CredentialField[]> = {
        'airtableTokenApi': [
            { name: 'token', label: 'Personal Access Token', type: 'password', required: true }
        ],
        'openAiApi': [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ],
        'googlePalmApi': [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ],
        'perplexityApi': [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ],
        'httpHeaderAuth': [
            { name: 'headerName', label: 'Header Name', type: 'text', required: true },
            { name: 'headerValue', label: 'Header Value', type: 'password', required: true }
        ],
        'httpBasicAuth': [
            { name: 'user', label: 'Username', type: 'text', required: true },
            { name: 'password', label: 'Password', type: 'password', required: true }
        ]
    };

    return fieldMap[type] || [
        { name: 'credential', label: 'Credential Value', type: 'password', required: true }
    ];
}
