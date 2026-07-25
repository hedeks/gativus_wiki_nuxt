import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WIKI_URL = process.env.WIKI_URL;
const WIKI_LOGIN = process.env.WIKI_LOGIN;
const WIKI_PASSWORD = process.env.WIKI_PASSWORD;
const MCP_ROLE = process.env.MCP_ROLE || 'editor';

if (!WIKI_URL || !WIKI_LOGIN || !WIKI_PASSWORD) {
    console.error("Missing required environment variables: WIKI_URL, WIKI_LOGIN, WIKI_PASSWORD");
    process.exit(1);
}

let apiToken: string | null = null;

async function authenticate() {
    try {
        const response = await fetch(`${WIKI_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: WIKI_LOGIN, password: WIKI_PASSWORD })
        });
        if (!response.ok) {
            throw new Error(`Auth failed: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.res && data.res.access_token) {
            apiToken = data.res.access_token;
        } else {
            throw new Error("Invalid auth response format");
        }
    } catch (error: any) {
        throw new Error(`Authentication error: ${error.message}`);
    }
}

async function fetchApi(apiPath: string, method: string = 'GET', body?: any) {
    if (!apiToken) {
        await authenticate();
    }
    
    let res = await performFetch(apiPath, method, body);
    
    if (res.status === 401 || res.status === 403) {
        await authenticate();
        res = await performFetch(apiPath, method, body);
    }
    
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API Error (${res.status}): ${errText}`);
    }
    
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return await res.json();
    } else {
        return await res.text();
    }
}

async function performFetch(apiPath: string, method: string, body?: any) {
    const url = `${WIKI_URL}${apiPath}`;
    const options: RequestInit = {
        method,
        headers: {
            'Authorization': `Bearer ${apiToken}`,
            ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    };
    return await fetch(url, options);
}

async function fetchMultipart(apiPath: string, method: string, formData: FormData) {
    if (!apiToken) await authenticate();
    
    let url = `${WIKI_URL}${apiPath}`;
    let options: RequestInit = {
        method,
        headers: { 'Authorization': `Bearer ${apiToken}` },
        body: formData
    };
    
    let res = await fetch(url, options);
    if (res.status === 401 || res.status === 403) {
        await authenticate();
        options.headers = { 'Authorization': `Bearer ${apiToken}` };
        res = await fetch(url, options);
    }
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API Error (${res.status}): ${errText}`);
    }
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) return await res.json();
    return await res.text();
}

const server = new McpServer({
    name: "gativus-wiki-mcp",
    version: "1.1.0"
});

// ==========================================
// 1. RESOURCES & PROMPTS (Philosophical Context)
// ==========================================
server.resource(
    "gativus-context",
    new ResourceTemplate("wiki://context", { list: undefined }),
    async (uri) => {
        try {
            const contextPath = path.join(__dirname, 'gativus-editor.md');
            const content = fs.readFileSync(contextPath, 'utf-8');
            return {
                contents: [{
                    uri: uri.href,
                    text: content,
                    mimeType: "text/markdown"
                }]
            };
        } catch (e) {
            return {
                contents: [{
                    uri: uri.href,
                    text: "Error: gativus-editor.md not found or unreadable.",
                    mimeType: "text/markdown"
                }]
            };
        }
    }
);

// MCP Prompts allow the user to instantly load this context in Claude Desktop
server.prompt(
    "gativus_editor",
    "Load the full philosophical context and become a Gativus Wiki Editor",
    undefined as any,
    () => {
        try {
            const contextPath = path.join(__dirname, 'gativus-editor.md');
            const content = fs.readFileSync(contextPath, 'utf-8');
            return {
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `You are an expert editor and architect for the Gativus Wiki. Please internalize the following philosophy, rules, and constraints:\n\n${content}\n\nCRITICAL INSTRUCTION: Your VERY FIRST action right now must be to call the "get_dashboard_stats" tool. This will give you the dashboard overview of the wiki (number of articles, terms, missing translations, etc.).\nAfter you receive the stats, output a nice, formatted summary of the wiki's current state to the user, and THEN ask how you can help them today.`
                    }
                }]
            };
        } catch (e) {
            return {
                messages: [{
                    role: "user",
                    content: { type: "text", text: "Error loading editor context file." }
                }]
            };
        }
    }
);

server.prompt(
    "gativus_expert",
    "Load the read-only RAG context and become a Gativus Wiki Expert",
    undefined as any,
    () => {
        try {
            const contextPath = path.join(__dirname, 'gativus-expert.md');
            const content = fs.readFileSync(contextPath, 'utf-8');
            return {
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `You are a read-only Gativus Wiki Expert. Please internalize the following philosophy, rules, and constraints:\n\n${content}\n\nCRITICAL INSTRUCTION: You are strictly in Read-Only mode. Do NOT use any editing, creating, or deleting tools. Start by greeting the user and offering help with information retrieval or RAG consultations.`
                    }
                }]
            };
        } catch (e) {
            return {
                messages: [{
                    role: "user",
                    content: { type: "text", text: "Error loading expert context file." }
                }]
            };
        }
    }
);

// ==========================================
// 2. CRUD TOOLS WITH RICH ZOD SCHEMAS
// ==========================================

function registerCrudTools(resourceName: string, basePath: string, idParamName: string, idIsSlug: boolean, createSchema: z.ZodTypeAny, updateSchema: z.ZodTypeAny) {
    const idDesc = idIsSlug ? `The slug of the ${resourceName}` : `The ID of the ${resourceName}`;
    
    server.tool(`get_all_${resourceName}s`,
        `Get all ${resourceName}s. WARNING: This might return a huge list. Prefer global_search for finding specific items.`,
        {
            query: z.record(z.string(), z.string()).optional().describe(`Optional key-value query parameters (e.g. {"search": "term", "limit": "10", "translation_filter": "missing_ru"})`)
        },
        async (args) => {
            let url = `${basePath}`;
            if (args.query) {
                const params = new URLSearchParams();
                for (const key in args.query) {
                    params.append(key, String(args.query[key]));
                }
                url += `?${params.toString()}`;
            }
            const result = await fetchApi(url);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
    );

    server.tool(`get_${resourceName}`,
        `Get details of a specific ${resourceName}`,
        { [idParamName]: z.string().describe(idDesc) },
        async (args) => {
            const result = await fetchApi(`${basePath}/${args[idParamName]}`);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
    );

        server.tool(`create_${resourceName}`,
            `Create a new ${resourceName}.`,
            { payload: createSchema.describe(`Data for the new ${resourceName}`) },
            async (args) => {
                const result = await fetchApi(`${basePath}`, 'POST', args.payload);
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }
        );

        const updateAction = async (args: any) => {
            const method = basePath.includes('users') ? 'PATCH' : 'PUT'; 
            const result = await fetchApi(`${basePath}/${args[idParamName]}`, method, args.payload);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        };

        server.tool(`update_${resourceName}`,
            `Update an existing ${resourceName}. This performs a PARTIAL update. Only provide the fields you want to change. Missing fields will NOT be modified or wiped.`,
            {
                [idParamName]: z.string().describe(idDesc),
                payload: updateSchema.describe(`Data to update in the ${resourceName}. Omit fields you do not want to change.`)
            },
            updateAction
        );

        server.tool(`patch_${resourceName}`,
            `Alias for update_${resourceName}. Safely update only specific fields of a SINGLE ${resourceName}. For multiple items, use bulk_patch_${resourceName}s.`,
            {
                [idParamName]: z.string().describe(idDesc),
                payload: updateSchema.describe(`Data to update in the ${resourceName}. Omit fields you do not want to change.`)
            },
            updateAction
        );

        server.tool(`delete_${resourceName}`,
            `WARNING: IRREVERSIBLE. Delete a single ${resourceName}. For multiple items, use bulk_delete_${resourceName}s. Always ask user confirmation.`,
            { [idParamName]: z.string().describe(idDesc) },
            async (args) => {
                const result = await fetchApi(`${basePath}/${args[idParamName]}`, 'DELETE');
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }
        );
}

// Schemas based on database structure
const articleSchema = z.object({
    title: z.string().optional(),
    title_ru: z.string().optional(),
    title_zh: z.string().optional(),
    slug: z.string().optional(),
    slug_ru: z.string().optional(),
    slug_zh: z.string().optional(),
    html_content: z.string().optional(),
    html_content_ru: z.string().optional(),
    html_content_zh: z.string().optional(),
    category_id: z.number().optional(),
    book_id: z.number().optional(),
    is_published: z.number().optional().describe("Status (0 = Draft, 1 = Published). MUST be sent as a number, not boolean."),
    is_term_article: z.number().optional(),
    translation_valid_en: z.number().optional().describe("MUST be set to 1 when providing EN translation, otherwise the UI indicator will be grey."),
    translation_valid_ru: z.number().optional().describe("MUST be set to 1 when providing RU translation, otherwise the UI indicator will be grey."),
    translation_valid_zh: z.number().optional().describe("MUST be set to 1 when providing ZH translation, otherwise the UI indicator will be grey.")
});

const termSchema = z.object({
    title: z.string().optional(),
    title_ru: z.string().optional(),
    title_zh: z.string().optional(),
    slug: z.string().optional(),
    slug_ru: z.string().optional(),
    slug_zh: z.string().optional(),
    definition: z.string().optional(),
    definition_ru: z.string().optional(),
    definition_zh: z.string().optional(),
    aliases: z.string().optional(),
    aliases_ru: z.string().optional(),
    aliases_zh: z.string().optional(),
    term_article_id: z.number().optional(),
    translation_valid_en: z.number().optional().describe("MUST be set to 1 when providing EN translation."),
    translation_valid_ru: z.number().optional().describe("MUST be set to 1 when providing RU translation."),
    translation_valid_zh: z.number().optional().describe("MUST be set to 1 when providing ZH translation.")
});

const categorySchema = z.object({
    title: z.string().optional(),
    title_ru: z.string().optional(),
    title_zh: z.string().optional(),
    slug: z.string().optional(),
    slug_ru: z.string().optional(),
    slug_zh: z.string().optional(),
    parent_id: z.number().optional(),
    description: z.string().optional(),
    sort_order: z.number().optional()
});

const bookSchema = z.object({
    title: z.string().optional(),
    title_ru: z.string().optional(),
    title_zh: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    sort_order: z.number().optional()
});

const userSchema = z.object({
    login: z.string().optional(),
    email: z.string().optional(),
    role: z.string().optional(),
    password: z.string().optional()
});

const genericSchema = z.record(z.string(), z.any());

registerCrudTools('article', '/api/articles', 'slug', true, articleSchema, articleSchema);
registerCrudTools('term', '/api/terms', 'slug', true, termSchema, termSchema);
registerCrudTools('category', '/api/categories', 'id', false, categorySchema, categorySchema);
registerCrudTools('book', '/api/books', 'slug', true, bookSchema, bookSchema);
registerCrudTools('user', '/api/admin/users', 'id', false, userSchema, userSchema);
registerCrudTools('landing', '/api/admin/landing', 'id', false, genericSchema, genericSchema);
registerCrudTools('storytelling', '/api/admin/storytelling', 'id', false, genericSchema, genericSchema);

// ==========================================
// 3. SPECIFIC ADMIN TOOLS
// ==========================================

server.tool(`get_dashboard_stats`,
    `Fetch the dashboard overview and statistics of the wiki (number of articles, terms, missing translations).`,
    {},
    async () => {
        const result = await fetchApi('/api/admin/stats');
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(`update_book_skeleton`,
    `Reorder or add chapters to a book. This rebuilds the book's skeleton in the database.`,
    {
        book_id: z.string().describe(`The ID or slug of the book`),
        article_ids: z.array(z.number()).describe(`The ordered array of article IDs that make up the chapters of the book.`)
    },
    async (args) => {
        const result = await fetchApi(`/api/admin/books/${args.book_id}/chapters`, 'PATCH', { article_ids: args.article_ids });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(`global_relink_terms`,
    `WARNING: VERY HEAVY OPERATION. Trigger the global auto-linking process for all terms and all articles. DO NOT use this if you just added or updated a few terms; use 'relink_single_term' instead.`,
    {},
    async () => {
        const result = await fetchApi('/api/admin/relink', 'POST');
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(`repair_html_linker`,
    `Repair broken term links in HTML content across the wiki.`,
    {},
    async () => {
        const result = await fetchApi('/api/admin/repair-linker-html', 'POST');
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(`clear_server_cache`,
    `Clear the Nuxt/Nitro server cache (e.g. after updating translations or structure).`,
    {},
    async () => {
        const result = await fetchApi('/api/admin/cache/clear', 'POST');
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(`get_uploaded_files`,
    `Get a list of all uploaded files (images, documents) currently on the server.`,
    {},
    async () => {
        const result = await fetchApi('/api/admin/files');
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(`delete_uploaded_file`,
    `Delete a specific uploaded file from the server.`,
    {
        filepath: z.string().describe(`The path to the file on the server (e.g. "public/uploads/cover.jpg")`)
    },
    async (args) => {
        const result = await fetchApi('/api/admin/files', 'DELETE', { filepath: args.filepath });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(`cleanup_orphaned_files`,
    `Find and delete any uploaded files that are no longer referenced in the database.`,
    {},
    async () => {
        const result = await fetchApi('/api/admin/files/cleanup', 'POST');
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
);


server.tool(`upload_file`,
    `Upload a file (e.g., .odt, image) to an API endpoint using multipart/form-data.`,
    {
        path: z.string().describe(`The API path, e.g. /api/admin/articles/parse-odt`),
        file_field: z.string().optional().describe(`The name of the form field for the file (defaults to "file")`),
        file_path: z.string().describe(`Absolute path on your local disk to the file to upload`),
        extra_fields: z.record(z.string(), z.string()).optional().describe(`Optional key-value object for extra form fields`)
    },
    async (args) => {
        const formData = new FormData();
        const fieldName = args.file_field || "file";
        
        if (!fs.existsSync(args.file_path)) {
            throw new Error(`File not found: ${args.file_path}`);
        }
        
        const fileBuffer = fs.readFileSync(args.file_path);
        const blob = new Blob([fileBuffer]);
        const fileName = path.basename(args.file_path);
        formData.append(fieldName, blob, fileName);
        
        if (args.extra_fields) {
            for (const key in args.extra_fields) {
                formData.append(key, args.extra_fields[key]);
            }
        }
        
        const result = await fetchMultipart(args.path, 'POST', formData);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(`upload_media`,
    `Upload an image or media file to the server. Returns the public URL of the uploaded file.`,
    {
        file_path: z.string().describe(`Absolute path on your local disk to the media file (e.g. image.jpg)`)
    },
    async (args) => {
        const formData = new FormData();
        if (!fs.existsSync(args.file_path)) {
            throw new Error(`File not found: ${args.file_path}`);
        }
        const fileBuffer = fs.readFileSync(args.file_path);
        const blob = new Blob([fileBuffer]);
        formData.append("file", blob, path.basename(args.file_path));
        
        const result = await fetchMultipart('/api/admin/uploads/article-image', 'POST', formData);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(`relink_single_article`,
    `Re-run term auto-linking on a SPECIFIC article without overloading the server.`,
    {
        article_id: z.number().describe(`The ID (not slug) of the article to relink`)
    },
    async (args) => {
        const result = await fetchApi(`/api/admin/relink-article/${args.article_id}`, 'POST');
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(`export_wiki_backup`,
    `Download a full backup of the wiki (JSON dump + assets) as a ZIP archive.`,
    {
        output_path: z.string().describe(`Absolute path where the ZIP file should be saved (e.g. C:/backup.zip)`)
    },
    async (args) => {
        if (!apiToken) await authenticate();
        let res = await fetch(`${WIKI_URL}/api/admin/sync/export`, {
            headers: { 'Authorization': `Bearer ${apiToken}` }
        });
        if (res.status === 401 || res.status === 403) {
            await authenticate();
            res = await fetch(`${WIKI_URL}/api/admin/sync/export`, {
                headers: { 'Authorization': `Bearer ${apiToken}` }
            });
        }
        if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
        const buffer = await res.arrayBuffer();
        fs.writeFileSync(args.output_path, Buffer.from(buffer));
        return { content: [{ type: "text", text: `Wiki backup successfully saved to ${args.output_path}` }] };
    }
);

server.tool(`import_wiki_backup`,
    `Upload and restore a full wiki backup from a ZIP archive.`,
    {
        file_path: z.string().describe(`Absolute path to the backup ZIP file`)
    },
    async (args) => {
        const formData = new FormData();
        if (!fs.existsSync(args.file_path)) throw new Error(`File not found: ${args.file_path}`);
        const fileBuffer = fs.readFileSync(args.file_path);
        const blob = new Blob([fileBuffer]);
        formData.append("file", blob, path.basename(args.file_path));
        
        const result = await fetchMultipart('/api/admin/sync/import', 'POST', formData);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(`import_odt_as_book_chapter`,
    `Macro tool: Uploads an ODT file, parses it into an article, and safely appends it to the specified book.`,
    {
        file_path: z.string().describe(`Absolute path to the ODT file`),
        book_slug: z.string().describe(`The slug of the target book`),
        title: z.string().describe(`The title for the new article`),
        lang: z.enum(['en', 'ru', 'zh']).describe(`The language of the imported content`),
        is_published: z.number().optional().describe(`0 for draft, 1 for published (default 0)`)
    },
    async (args) => {
        // 1. Fetch book to get current chapters
        const bookData: any = await fetchApi(`/api/books/${args.book_slug}`);
        const book = typeof bookData === 'string' ? JSON.parse(bookData) : bookData;
        if (!book || !book.id) throw new Error(`Book not found: ${args.book_slug}`);
        
        const currentArticleIds = book.articles ? book.articles.map((a: any) => a.id) : [];

        // 2. Upload and parse ODT
        const formData = new FormData();
        if (!fs.existsSync(args.file_path)) throw new Error(`File not found: ${args.file_path}`);
        const fileBuffer = fs.readFileSync(args.file_path);
        const blob = new Blob([fileBuffer]);
        formData.append("file", blob, path.basename(args.file_path));
        
        const parseResult: any = await fetchMultipart('/api/admin/articles/parse-odt', 'POST', formData);
        const parsed = typeof parseResult === 'string' ? JSON.parse(parseResult) : parseResult;
        const html = parsed.html || parsed.html_content || '';

        // 3. Create Article
        const articlePayload: any = {
            title: args.title,
            book_id: book.id,
            is_published: args.is_published ?? 0,
            html_content: args.lang === 'en' ? html : '<p><i>Waiting for English translation...</i></p>',
            translation_valid_en: args.lang === 'en' ? 1 : 0
        };
        if (args.lang === 'ru') { articlePayload.html_content_ru = html; articlePayload.translation_valid_ru = 1; }
        else if (args.lang === 'zh') { articlePayload.html_content_zh = html; articlePayload.translation_valid_zh = 1; }

        const createResult: any = await fetchApi('/api/articles', 'POST', articlePayload);
        const newArticle = typeof createResult === 'string' ? JSON.parse(createResult) : createResult;
        const newArticleId = newArticle.id;
        
        if (!newArticleId) throw new Error(`Failed to extract new article ID from creation response`);

        // 4. Update Book Skeleton
        const newArticleIds = [...currentArticleIds, newArticleId];
        await fetchApi(`/api/admin/books/${book.id}/chapters`, 'PATCH', { article_ids: newArticleIds });

        return { content: [{ type: "text", text: `Successfully imported ODT as article ID ${newArticleId} and appended to book ${args.book_slug}` }] };
    }
);

server.tool(`bulk_patch_articles`,
    `Bulk update multiple articles (e.g. change category_id or is_published for many articles at once).`,
    {
        ids: z.array(z.number()).describe(`Array of article IDs to update`),
        data: z.object({
            is_published: z.number().optional(),
            category_id: z.number().nullable().optional(),
            book_id: z.number().nullable().optional()
        }).describe(`Fields to update. Only provided fields will be changed.`)
    },
    async (args) => {
        const result = await fetchApi(`/api/admin/articles/bulk`, 'PATCH', args);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(`bulk_delete_articles`,
    `WARNING: IRREVERSIBLE. Bulk delete multiple articles. Always ask for user confirmation or make a backup first.`,
    {
        ids: z.array(z.number()).describe(`Array of article IDs to delete`)
    },
    async (args) => {
        const result = await fetchApi(`/api/admin/articles/bulk`, 'DELETE', { ids: args.ids });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(`bulk_patch_terms`,
    `Bulk update multiple terms (e.g. mark multiple translations as valid).`,
    {
        ids: z.array(z.number()).describe(`Array of term IDs to update`),
        data: z.object({
            translation_valid_en: z.number().optional(),
            translation_valid_ru: z.number().optional(),
            translation_valid_zh: z.number().optional()
        }).describe(`Fields to update.`)
    },
    async (args) => {
        const result = await fetchApi(`/api/admin/terms/bulk`, 'PATCH', args);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(`bulk_delete_terms`,
    `WARNING: IRREVERSIBLE. Bulk delete multiple terms. Always ask for user confirmation first.`,
    {
        ids: z.array(z.number()).describe(`Array of term IDs to delete`)
    },
    async (args) => {
        const result = await fetchApi(`/api/admin/terms/bulk`, 'DELETE', { ids: args.ids });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(`bulk_delete_books`,
    `WARNING: IRREVERSIBLE. Bulk delete multiple books. Articles will be unlinked but NOT deleted. Always ask for user confirmation first.`,
    {
        ids: z.array(z.number()).describe(`Array of book IDs to delete`)
    },
    async (args) => {
        const result = await fetchApi(`/api/admin/books/bulk`, 'DELETE', { ids: args.ids });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(`relink_single_term`,
    `Re-run auto-linking for a SINGLE term across ALL articles. Much faster than global_relink_terms. Use this when a single term is added or updated.`,
    {
        term_id: z.number().describe(`The ID of the term to relink`)
    },
    async (args) => {
        const result = await fetchApi(`/api/admin/relink-term/${args.term_id}`, 'POST');
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(`global_search`,
    `Perform a global full-text search across all entities (articles, terms, books, etc.) just like the main site search.`,
    {
        q: z.string().describe(`The search query / keyword`),
        locale: z.string().optional().describe(`Locale to search in (e.g. "ru", "en", "zh"). Defaults to "ru".`)
    },
    async (args) => {
        const locale = args.locale || 'ru';
        const url = `/api/search?q=${encodeURIComponent(args.q)}&locale=${encodeURIComponent(locale)}`;
        const result = await fetchApi(url);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Gativus Wiki MCP Server running on stdio");
}

main().catch(console.error);