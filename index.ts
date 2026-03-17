import { XMLParser } from 'fast-xml-parser';

type Env = {
  DB: D1Database;
  FILES: R2Bucket;
};

type BoardType = 'sales' | 'in_house' | 'retailer' | 'operations';

const JSON_HEADERS = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
};

const BOARD_TYPES: ReadonlyArray<BoardType> = ['sales', 'in_house', 'retailer', 'operations'];

// ----------------------------
// Resource/Auth helpers
// ----------------------------
async function ensureResourceTable(db: D1Database) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        role TEXT,
        department TEXT,
        module_scope TEXT,
        status TEXT,
        password_hash TEXT,
        phone TEXT,
        location TEXT,
        skills TEXT,
        joined TEXT,
        current_project TEXT,
        pay_type TEXT,
        pay_rate TEXT,
        weekend_rate TEXT,
        training_days TEXT,
        weekly_hours TEXT,
        sick_leave_days TEXT,
        annual_leave_days TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )`,
    )
    .run();

  // Add missing columns for existing tables (best-effort, ignore if exists)
  const maybeAddColumn = async (col: string, type = 'TEXT') => {
    try {
      await db.prepare(`ALTER TABLE resources ADD COLUMN ${col} ${type}`).run();
    } catch (_) {
      // ignore (already exists)
    }
  };
  await maybeAddColumn('phone');
  await maybeAddColumn('location');
  await maybeAddColumn('skills');
  await maybeAddColumn('joined');
  await maybeAddColumn('current_project');
  await maybeAddColumn('pay_type');
  await maybeAddColumn('pay_rate');
  await maybeAddColumn('weekend_rate');
  await maybeAddColumn('training_days');
  await maybeAddColumn('weekly_hours');
  await maybeAddColumn('sick_leave_days');
  await maybeAddColumn('annual_leave_days');
  await maybeAddColumn('status');

  // Backfill status for existing rows
  await db.prepare(`UPDATE resources SET status = 'Active' WHERE status IS NULL OR status = ''`).run();
}

async function hashPassword(pw: string): Promise<string> {
  const enc = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function deriveModuleScope(role?: string, department?: string): string {
  const haystack = `${role || ''} ${department || ''}`.toLowerCase();
  if (haystack.includes('operation')) return 'operations';
  if (haystack.includes('sale')) return 'sales';
  if (haystack.includes('project')) return 'project_mgmt';
  if (haystack.includes('field')) return 'onfield';
  return 'operations'; // default
}

const handler: ExportedHandler<Env> = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = normalizePath(url.pathname);

    // DEBUG: Log ALL POST requests to /api/projects/*
    if (request.method === 'POST' && pathname.includes('/api/projects/')) {
      console.log('=== POST /api/projects/* REQUEST ===');
      console.log('URL:', request.url);
      console.log('Pathname:', pathname);
      console.log('Normalized:', normalizePath(pathname));
      console.log('Method:', request.method);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    if (request.method === 'GET' && pathname === '/health') {
      return respondJSON({ ok: true, timestamp: Date.now() });
    }

    // DEBUG: If no route matches, return comprehensive debug info
    if (request.method === 'POST' && pathname.includes('/api/projects/')) {
      console.log('About to check routes...');
    }

    // Debug logging for project details route
    if (pathname.includes('/projects/') && pathname.includes('/details')) {
      console.log('Checking project details route:', {
        method: request.method,
        pathname: pathname,
        url: request.url
      });
    }

    for (const route of ROUTES) {
      if (route.method !== request.method) continue;
      const match = route.pattern.exec(pathname);
      if (!match) continue;

      // Log ALL route matches for POST requests to /api/projects/*
      if (request.method === 'POST' && pathname.includes('/api/projects/')) {
        console.log('ROUTE MATCHED:', {
          pattern: route.pattern.source,
          pathname: pathname,
          match: match[0],
          routeIndex: ROUTES.indexOf(route)
        });
      }

      // Log ALL route matches for GET requests to /api/projects/next-code
      if (request.method === 'GET' && pathname.includes('next-code')) {
        console.log('ROUTE MATCHED for next-code:', {
          pattern: route.pattern.source,
          pathname: pathname,
          match: match[0],
          routeIndex: ROUTES.indexOf(route)
        });
      }

      // Debug logging when project details route matches
      if (route.pattern.source.includes('projects') && route.pattern.source.includes('details')) {
        console.log('Project details route MATCHED:', {
          method: request.method,
          pathname: pathname,
          pattern: route.pattern.source,
          match: match[0],
          projectId: match[1]
        });
      }
      const params: Record<string, string> = {};
      if (match.groups) {
        Object.assign(params, match.groups);
      }
      // Extract projectId from match array if not in groups (for patterns with numbered groups like /api/projects/(\d+)/details)
      if (!params.projectId) {
        // Use first capture group directly - most reliable
        if (match.length > 1 && typeof match[1] === 'string' && match[1].length > 0) {
          params.projectId = match[1];
        } else {
          // Fallback: extract from path
          const pathParts = pathname.split('/').filter(Boolean);
          if (pathParts.length >= 3 && pathParts[0] === 'api' && pathParts[1] === 'projects' && /^\d+$/.test(pathParts[2])) {
            params.projectId = pathParts[2];
          }
        }
      }
      try {
        return await route.handler({
          env,
          request,
          params,
        });
      } catch (error) {
        console.error('Route handler error', error);
        return respondJSON(
          {
            error: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Unexpected error',
          },
          { status: 500 },
        );
      }
    }

    // Debug: log what we received when no route matches
    console.log('No route matched:', {
      method: request.method,
      pathname: pathname,
      url: request.url,
      routesChecked: ROUTES.filter(r => r.method === request.method).map(r => ({
        pattern: r.pattern.source,
        test: r.pattern.test(pathname)
      }))
    });

    // Special debug for next-code route
    if (pathname.includes('next-code')) {
      const testPattern = /^\/api\/projects\/next-code\/?$/;
      console.log('DEBUG next-code route:', {
        pathname,
        normalized: normalizePath(pathname),
        pattern: testPattern.source,
        testResult: testPattern.test(pathname),
        execResult: testPattern.exec(pathname),
        method: request.method,
        allGetRoutes: ROUTES.filter(r => r.method === 'GET').map(r => r.pattern.source)
      });
    }
    return respondJSON({
      error: 'NOT_FOUND',
      message: 'Route not found',
      debug: {
        method: request.method,
        pathname: pathname,
        url: request.url,
      },
    }, { status: 404 });
  },

  async scheduled(event: any, env: Env, ctx: ExecutionContext) {
    console.log('[Cron] Fetching SolarQuotes leads...');
    ctx.waitUntil(syncSolarQuotesLeads(env));
  }
};

export default handler;

// ---------------------------------------------------------------------------
// Route table
// ---------------------------------------------------------------------------

function md5(string: string): string {
  function rotateLeft(lValue: number, iShiftBits: number): number {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function addUnsigned(lX: number, lY: number): number {
    const lX4 = lX & 0x40000000;
    const lY4 = lY & 0x40000000;
    const lX8 = lX & 0x80000000;
    const lY8 = lY & 0x80000000;
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      else return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    } else {
      return lResult ^ lX8 ^ lY8;
    }
  }
  function F(x: number, y: number, z: number): number { return (x & y) | (~x & z); }
  function G(x: number, y: number, z: number): number { return (x & z) | (y & ~z); }
  function H(x: number, y: number, z: number): number { return x ^ y ^ z; }
  function I(x: number, y: number, z: number): number { return y ^ (x | ~z); }
  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    return addUnsigned(rotateLeft(addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac)), s), b);
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    return addUnsigned(rotateLeft(addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac)), s), b);
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    return addUnsigned(rotateLeft(addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac)), s), b);
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    return addUnsigned(rotateLeft(addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac)), s), b);
  }
  function convertToWordArray(string: string): number[] {
    let lWordCount;
    const lMessageLength = string.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    const lWordArray = Array(lNumberOfWords - 1);
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }
  function wordToHex(lValue: number): string {
    let wordToHexValue = "",
      wordToHexValue_temp = "",
      lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      wordToHexValue_temp = "0" + lByte.toString(16);
      wordToHexValue = wordToHexValue + wordToHexValue_temp.substr(wordToHexValue_temp.length - 2, 2);
    }
    return wordToHexValue;
  }
  let x = Array();
  let k, AA, BB, CC, DD, a, b, c, d;
  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;
  string = string // string should be utf8 encoded
  x = convertToWordArray(string);
  a = 0x67452301; b = 0xefcdab89; c = 0x98badcfe; d = 0x10325476;
  for (k = 0; k < x.length; k += 16) {
    AA = a; BB = b; CC = c; DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xd76aa478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070db);
    b = FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
    a = FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787c62a);
    c = FF(c, d, a, b, x[k + 6], S13, 0xa8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xfd469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098d8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
    c = FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895cd7be);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6b901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xfd987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xa679438e);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49b40821);
    a = GG(a, b, c, d, x[k + 1], S21, 0xf61e2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xc040b340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265e5a51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa);
    a = GG(a, b, c, d, x[k + 5], S21, 0xd62f105d);
    d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xc33707d6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455a14ed);
    a = GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676f02d9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);
    a = HH(a, b, c, d, x[k + 5], S31, 0xfffa3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771f681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xfde5380c);
    a = HH(a, b, c, d, x[k + 1], S31, 0xa4beea44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
    c = HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x4881d05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665);
    a = II(a, b, c, d, x[k + 0], S41, 0xf4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432aff97);
    c = II(c, d, a, b, x[k + 14], S43, 0xab9423a7);
    b = II(b, c, d, a, x[k + 5], S44, 0xfc93a039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655b59c3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
    c = II(c, d, a, b, x[k + 10], S43, 0xffeff47d);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845dd1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f);
    d = II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
    c = II(c, d, a, b, x[k + 6], S43, 0xa3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
    a = II(a, b, c, d, x[k + 4], S41, 0xf7537e82);
    d = II(d, a, b, c, x[k + 11], S42, 0xbd3af235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb);
    b = II(b, c, d, a, x[k + 9], S44, 0xeb86d391);
    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

const ROUTES: RouteDefinition[] = [
  // SolarQuotes Fetch Route
  {
    method: 'POST',
    pattern: /^\/api\/integrations\/solarquotes\/fetch\/?$/,
    handler: async ({ env, request }) => {
      try {
        const body = await parseJSON(request).catch(() => ({}));
        const { count, results } = await syncSolarQuotesLeads(env, body.startDate, body.endDate);
        return respondJSON({ ok: true, count, results });
      } catch (error) {
        console.error('[SolarQuotes] Error:', error);
        return respondJSON({ error: 'SOLARQUOTES_FETCH_FAILED', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
      }
    }
  },
  // Simple sales listing for sanity checks
  {
    method: 'GET',
    pattern: /^\/api\/sales\/?$/,
    handler: async ({ env }) => {
      try {
        const sales = await env.DB.prepare('SELECT * FROM sales LIMIT 100').all();
        return respondJSON({ data: sales.results ?? [] });
      } catch (error) {
        console.error('Error fetching sales:', error);
        return respondJSON(
          {
            error: 'QUERY_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
            data: [],
          },
          { status: 500 },
        );
      }
    },
  },
  // File upload routes - MUST come before catch-all POST /api/projects/*
  {
    method: 'POST',
    pattern: /^\/api\/projects\/(?<projectId>\d+)\/files$/,
    handler: async ({ env, request, params }) => {
      const projectId = Number(params.projectId);
      if (Number.isNaN(projectId)) {
        return respondJSON({ error: 'INVALID_PROJECT_ID' }, { status: 400 });
      }

      // Parse multipart form data
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const fileName = (formData.get('fileName') as string | null) || file?.name || '';
      const category = (formData.get('category') as string | null) || 'other';
      const subcategory = (formData.get('subcategory') as string | null) || null;
      const referenceId = formData.get('referenceId') ? Number(formData.get('referenceId')) : null;
      const referenceType = (formData.get('referenceType') as string | null) || null;
      const uploadedBy = formData.get('uploadedBy') ? Number(formData.get('uploadedBy')) : null;

      if (!file || file.size === 0) {
        return respondJSON({ error: 'NO_FILE_PROVIDED' }, { status: 400 });
      }

      // Validate category
      const validCategories = ['sales', 'onfield', 'installation', 'compliance', 'other'];
      if (!validCategories.includes(category)) {
        return respondJSON({ error: 'INVALID_CATEGORY' }, { status: 400 });
      }

      // Get current pipeline stage for the project
      // Determine board_type from category (sales -> sales, onfield -> in_house/retailer, etc.)
      let boardType: string = 'sales';
      if (category === 'onfield' || category === 'installation') {
        // Try to get from project's current board state
        const projectState = await env.DB.prepare(
          `SELECT ps.board_type, pc.slug
           FROM project_pipeline_state ps
           JOIN pipeline_columns pc ON pc.id = ps.column_id
           WHERE ps.project_id = ?
           ORDER BY ps.updated_at DESC
           LIMIT 1`
        )
          .bind(projectId)
          .first<{ board_type: string; slug: string } | null>();

        if (projectState) {
          boardType = projectState.board_type;
        }
      } else if (category === 'sales') {
        boardType = 'sales';
      }

      // Get the current pipeline stage/column slug
      const pipelineState = await env.DB.prepare(
        `SELECT pc.slug
         FROM project_pipeline_state ps
         JOIN pipeline_columns pc ON pc.id = ps.column_id
         WHERE ps.project_id = ? AND ps.board_type = ?
         LIMIT 1`
      )
        .bind(projectId, boardType)
        .first<{ slug: string } | null>();

      const pipelineStage = pipelineState?.slug || 'general';

      // Generate unique file ID and path
      // Structure: projects/{projectId}/{stage}/{category}/{subcategory}/{fileId}/{filename}
      const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `projects/${projectId}/${pipelineStage}/${category}/${subcategory || 'general'}/${fileId}/${sanitizedFileName}`;

      // Upload file to R2
      await env.FILES.put(filePath, file, {
        httpMetadata: {
          contentType: file.type || 'application/octet-stream',
          contentDisposition: `inline; filename="${sanitizedFileName}"`,
        },
        customMetadata: {
          projectId: String(projectId),
          category,
          subcategory: subcategory || '',
          pipelineStage,
          boardType,
          originalFileName: file.name,
        },
      });

      // Insert file metadata into database
      const result = await env.DB.prepare(
        `INSERT INTO project_files (
          project_id, file_path, file_name, original_file_name, file_size, file_type, mime_type,
          category, subcategory, pipeline_stage, board_type, reference_id, reference_type, uploaded_by, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id`
      )
        .bind(
          projectId,
          filePath,
          fileName,
          file.name,
          file.size,
          file.type || 'unknown',
          file.type || null,
          category,
          subcategory,
          pipelineStage,
          boardType,
          referenceId,
          referenceType,
          uploadedBy,
          null,
        )
        .first<{ id: number }>();

      if (!result?.id) {
        // If DB insert fails, try to clean up R2 file
        await env.FILES.delete(filePath).catch(() => { });
        return respondJSON({ error: 'FAILED_TO_SAVE_FILE_METADATA' }, { status: 500 });
      }

      return respondJSON({
        fileId: result.id,
        filePath,
        fileName,
        originalFileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        message: 'File uploaded successfully',
      }, { status: 201 });
    },
  },
  // Specific POST routes for /api/projects/* - Must come before catch-all
  {
    method: 'POST',
    pattern: /^\/api\/projects\/retailer$/,
    handler: async ({ env, request }) => {
      try {
        const body = await parseJSON(request);

        // Validate required fields
        if (!body.jobType) {
          return respondJSON({ error: 'MISSING_JOB_TYPE', message: 'Job Type is required' }, { status: 400 });
        }
        if (!body.customerName) {
          return respondJSON({ error: 'MISSING_CUSTOMER_NAME', message: 'Customer Name is required' }, { status: 400 });
        }

        console.log('Creating retailer project with payload:', {
          projectName: body.projectName,
          jobType: body.jobType,
          customerName: body.customerName,
          hasSystemSnapshot: !!body.systemSnapshot,
          hasPropertySnapshot: !!body.propertySnapshot,
          hasProjectDetails: !!body.projectDetails,
        });

        const projectId = await createRetailerProject(env.DB, {
          projectName: body.projectName || 'Untitled Project',
          projectCode: body.projectCode || null,
          customerName: body.customerName || '',
          customerEmail: body.customerEmail || null,
          customerContact: body.customerContact || null,
          customerAddress: body.customerAddress || null,
          jobType: body.jobType, // 'site_inspection', 'stage_one', 'stage_two', 'full_system'
          scheduledDate: body.scheduledDate || null,
          scheduledTime: body.scheduledTime || null,
          notes: body.notes || null,
          systemSnapshot: body.systemSnapshot || null,
          propertySnapshot: body.propertySnapshot || null,
          projectDetails: body.projectDetails || null,
        });

        // If project code was not provided, generate it based on actual project ID
        if (!body.projectCode) {
          const projectCode = `PRJ-${projectId}`;
          await env.DB
            .prepare(`UPDATE projects SET project_details_json = json_set(project_details_json, '$.projectCode', ?) WHERE id = ?`)
            .bind(projectCode, projectId)
            .run();
          return respondJSON({ projectId, projectCode, ok: true });
        }

        return respondJSON({ projectId, ok: true });
      } catch (error) {
        console.error('Error in createRetailerProject handler:', error);
        return respondJSON(
          {
            error: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Unexpected error',
          },
          { status: 500 },
        );
      }
    },
  },
  // POST route for creating electrician visit - Must come before catch-all
  {
    method: 'POST',
    pattern: /^\/api\/projects\/(?<projectId>\d+)\/create-electrician-visit$/,
    handler: async ({ env, params }) => {
      const projectId = Number(params.projectId);
      if (Number.isNaN(projectId)) {
        return respondJSON({ error: 'INVALID_PROJECT_ID' }, { status: 400 });
      }

      // Check if electrician visit already exists
      const existingElectricianVisit = await env.DB
        .prepare(`SELECT id FROM site_visits WHERE project_id = ? AND visit_type = 'electrician' ORDER BY created_at DESC LIMIT 1`)
        .bind(projectId)
        .first<{ id: number }>();

      if (existingElectricianVisit) {
        return respondJSON({ error: 'ELECTRICIAN_VISIT_ALREADY_EXISTS', siteVisitId: existingElectricianVisit.id }, { status: 400 });
      }

      // Find the most recent submitted sales site visit
      const salesSiteVisit = await env.DB
        .prepare(
          `SELECT sv.id, f.property_details_json
           FROM site_visits sv
           JOIN sales_site_visit_forms f ON f.site_visit_id = sv.id
           WHERE sv.project_id = ? AND sv.visit_type = 'sales' AND f.submitted_at IS NOT NULL
           ORDER BY f.submitted_at DESC
           LIMIT 1`
        )
        .bind(projectId)
        .first<{ id: number; property_details_json: string | null }>();

      if (!salesSiteVisit) {
        return respondJSON({ error: 'NO_SALES_SITE_VISIT_FOUND' }, { status: 404 });
      }

      // Extract electrician schedule from property details
      const propertyDetails = safeParse(salesSiteVisit.property_details_json) ?? {};
      const electricianSchedule = propertyDetails.electricianSchedule ?? {};

      // Handle both field name variations
      const electricianDate = electricianSchedule.date || electricianSchedule.visitDate;
      const electricianTime = electricianSchedule.time || electricianSchedule.visitTime;

      if (!electricianDate || !electricianTime) {
        return respondJSON({ error: 'NO_ELECTRICIAN_SCHEDULE_FOUND' }, { status: 404 });
      }

      const assignedUserId = typeof electricianSchedule.assignedUserId === 'number' ? electricianSchedule.assignedUserId : null;
      const electricianScheduledStart = toUnixTimestamp(electricianDate, electricianTime);

      if (!electricianScheduledStart) {
        return respondJSON({ error: 'INVALID_DATE_TIME' }, { status: 400 });
      }

      const electricianScheduledEnd = electricianScheduledStart + 3600; // 1 hour duration

      try {
        const newVisitId = await scheduleElectricianVisit(env.DB, {
          parentSiteVisitId: salesSiteVisit.id,
          scheduledStart: electricianScheduledStart,
          scheduledEnd: electricianScheduledEnd,
          assignedUserId: assignedUserId,
          legend: 'Electrician Site Visit',
        });
        return respondJSON({ ok: true, siteVisitId: newVisitId });
      } catch (error) {
        console.error('Failed to create electrician visit:', error);
        return respondJSON({ error: 'FAILED_TO_CREATE_VISIT', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
      }
    },
  },
  // Create a draft onfield site visit when opening from calendar with projectId only (enables Save Draft)
  {
    method: 'POST',
    pattern: /^\/api\/projects\/(?<projectId>\d+)\/create-onfield-draft-visit$/,
    handler: async ({ env, params }) => {
      const projectId = Number(params.projectId);
      if (Number.isNaN(projectId)) {
        return respondJSON({ error: 'INVALID_PROJECT_ID' }, { status: 400 });
      }
      const project = await env.DB
        .prepare(`SELECT id FROM projects WHERE id = ?`)
        .bind(projectId)
        .first<{ id: number }>();
      if (!project) {
        return respondJSON({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
      }
      const existing = await env.DB
        .prepare(
          `SELECT id FROM site_visits WHERE project_id = ? AND visit_type IN ('onfield', 'electrician') ORDER BY created_at DESC LIMIT 1`
        )
        .bind(projectId)
        .first<{ id: number }>();
      if (existing) {
        return respondJSON({ ok: true, siteVisitId: existing.id });
      }
      const now = Math.floor(Date.now() / 1000);
      const row = await env.DB
        .prepare(
          `INSERT INTO site_visits (project_id, visit_type, status, created_at, updated_at) VALUES (?, 'onfield', 'scheduled', ?, ?) RETURNING id`
        )
        .bind(projectId, now, now)
        .first<{ id: number }>();
      if (!row?.id) {
        return respondJSON({ error: 'FAILED_TO_CREATE_VISIT' }, { status: 500 });
      }
      return respondJSON({ ok: true, siteVisitId: row.id });
    },
  },
  // Comments routes - MUST come before catch-all POST /api/projects/*
  {
    method: 'POST',
    pattern: /^\/api\/projects\/(?<projectId>\d+)\/comments$/,
    handler: async ({ env, params, request }) => {
      const projectId = Number(params.projectId);
      if (Number.isNaN(projectId)) {
        return respondJSON({ error: 'INVALID_PROJECT_ID' }, { status: 400 });
      }

      const body = await parseJSON(request);
      const commentText = typeof body.commentText === 'string' ? body.commentText.trim() : '';
      if (!commentText) {
        return respondJSON({ error: 'COMMENT_TEXT_REQUIRED' }, { status: 400 });
      }
      const createdByEmail = typeof body.createdByEmail === 'string' ? body.createdByEmail.trim() : null;
      const followupAt = typeof body.followupAt === 'number' ? body.followupAt : null;

      const result = await env.DB
        .prepare(
          `INSERT INTO project_comments (project_id, comment_text, created_by_email, followup_at)
           VALUES (?, ?, ?, ?)
           RETURNING id, project_id, comment_text, created_by_email, followup_at, created_at`
        )
        .bind(projectId, commentText, createdByEmail, followupAt)
        .first<{
          id: number;
          project_id: number;
          comment_text: string;
          created_by_email: string | null;
          followup_at: number | null;
          created_at: number;
        }>();

      if (!result) {
        return respondJSON({ error: 'FAILED_TO_CREATE_COMMENT' }, { status: 500 });
      }

      // If followupAt is provided, also create a task
      if (followupAt) {
        await env.DB
          .prepare(
            `INSERT INTO tasks (project_id, comment_text, comment_id, created_by_email, status, due_at)
             VALUES (?, ?, ?, ?, 'pending', ?)`
          )
          .bind(projectId, commentText, result.id, createdByEmail, followupAt)
          .run();
      }

      return respondJSON({
        id: result.id,
        projectId: result.project_id,
        commentText: result.comment_text,
        createdByEmail: result.created_by_email,
        followupAt: result.followup_at,
        createdAt: result.created_at,
      }, { status: 201 });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/projects\/(?<projectId>\d+)\/comments$/,
    handler: async ({ env, params }) => {
      const projectId = Number(params.projectId);
      if (Number.isNaN(projectId)) {
        return respondJSON({ error: 'INVALID_PROJECT_ID' }, { status: 400 });
      }

      const comments = await env.DB
        .prepare(
          `SELECT id, project_id, comment_text, created_by_email, followup_at, created_at
           FROM project_comments
           WHERE project_id = ?
           ORDER BY created_at DESC`
        )
        .bind(projectId)
        .all<{
          id: number;
          project_id: number;
          comment_text: string;
          created_by_email: string | null;
          followup_at: number | null;
          created_at: number;
        }>();

      return respondJSON(comments.results.map(comment => ({
        id: comment.id,
        projectId: comment.project_id,
        commentText: comment.comment_text,
        createdByEmail: comment.created_by_email,
        followupAt: comment.followup_at,
        createdAt: comment.created_at,
      })));
    },
  },
  // CATCH-ALL for POST /api/projects/* - Must come after specific routes
  {
    method: 'POST',
    pattern: /^\/api\/projects\/.*$/,
    handler: async ({ env, request }) => {
      const url = new URL(request.url);
      const pathname = url.pathname;
      const normalized = normalizePath(pathname);

      // Check if it's the details route
      const detailsMatch = normalized.match(/^\/api\/projects\/(\d+)\/details\/?$/);
      if (detailsMatch && detailsMatch[1]) {
        const projectId = Number(detailsMatch[1]);
        if (!Number.isNaN(projectId) && projectId > 0) {
          // Process the details route
          let body;
          try {
            const text = await request.text();
            if (!text) {
              return respondJSON({ error: 'EMPTY_BODY' }, { status: 400 });
            }
            body = JSON.parse(text);
          } catch (error) {
            return respondJSON({ error: 'INVALID_JSON', message: error instanceof Error ? error.message : 'Invalid JSON' }, { status: 400 });
          }

          const projectDetailsJson = stringifyOrNull(body.projectDetails ?? {});
          const customerSnapshotJson = stringifyOrNull(body.customerSnapshot ?? {});
          const systemSnapshotJson = stringifyOrNull(body.systemSnapshot ?? {});
          const propertySnapshotJson = stringifyOrNull(body.propertySnapshot ?? {});
          const utilitySnapshotJson = stringifyOrNull(body.utilitySnapshot ?? {});

          const result = await env.DB.prepare(
            `UPDATE projects
             SET project_details_json = COALESCE(?, project_details_json),
                 customer_snapshot_json = COALESCE(?, customer_snapshot_json),
                 system_snapshot_json = COALESCE(?, system_snapshot_json),
                 property_snapshot_json = COALESCE(?, property_snapshot_json),
                 utility_snapshot_json = COALESCE(?, utility_snapshot_json),
                 updated_at = (strftime('%s','now'))
             WHERE id = ?`,
          )
            .bind(
              projectDetailsJson,
              customerSnapshotJson,
              systemSnapshotJson,
              propertySnapshotJson,
              utilitySnapshotJson,
              projectId,
            )
            .run();

          if (result.meta.changes === 0) {
            return respondJSON({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
          }

          return respondJSON({ ok: true });
        }
      }

      // Not a details route or invalid projectId - return debug info
      return respondJSON({
        error: 'UNKNOWN_PROJECTS_ROUTE',
        message: 'POST request to /api/projects/* but not matching details pattern',
        debug: {
          pathname: pathname,
          normalized: normalized,
          url: request.url,
          method: request.method,
          detailsMatch: detailsMatch ? detailsMatch[1] : null
        }
      }, { status: 400 });
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/projects\/retailer\/(?<projectId>\d+)$/,
    handler: async ({ env, params, request }) => {
      let body: any = {};
      try {
        const projectId = Number(params.projectId);
        if (Number.isNaN(projectId)) {
          return respondJSON({ error: 'INVALID_PROJECT_ID' }, { status: 400 });
        }

        body = await parseJSON(request);

        // Validate required fields if provided
        if (body.jobType && !['site_inspection', 'stage_one', 'stage_two', 'full_system'].includes(body.jobType)) {
          return respondJSON({ error: 'INVALID_JOB_TYPE', message: 'Invalid job type' }, { status: 400 });
        }

        console.log('Updating retailer project:', { projectId, body });

        // Update project
        const updates: string[] = [];
        const bindings: any[] = [];

        if (body.projectName !== undefined) {
          updates.push('name = ?');
          bindings.push(body.projectName);
        }

        if (body.customerName !== undefined || body.customerEmail !== undefined || body.customerContact !== undefined || body.customerAddress !== undefined) {
          const existingCustomer = await env.DB
            .prepare('SELECT customer_snapshot_json FROM projects WHERE id = ?')
            .bind(projectId)
            .first<{ customer_snapshot_json: string | null }>();

          let customerSnapshot: Record<string, any> = {};
          if (existingCustomer?.customer_snapshot_json) {
            try {
              if (typeof existingCustomer.customer_snapshot_json === 'string') {
                customerSnapshot = JSON.parse(existingCustomer.customer_snapshot_json);
              } else {
                customerSnapshot = existingCustomer.customer_snapshot_json as Record<string, any>;
              }
            } catch (e) {
              console.warn('Failed to parse customer_snapshot_json:', e);
              customerSnapshot = {};
            }
          }

          if (body.customerName !== undefined) customerSnapshot.customerName = body.customerName;
          if (body.customerEmail !== undefined) customerSnapshot.email = body.customerEmail;
          if (body.customerContact !== undefined) customerSnapshot.phone = body.customerContact;
          if (body.customerAddress !== undefined) customerSnapshot.address = body.customerAddress;

          updates.push('customer_snapshot_json = ?');
          bindings.push(JSON.stringify(customerSnapshot));
        }

        if (body.systemSnapshot !== undefined) {
          updates.push('system_snapshot_json = ?');
          bindings.push(JSON.stringify(body.systemSnapshot));
        }

        if (body.propertySnapshot !== undefined) {
          updates.push('property_snapshot_json = ?');
          bindings.push(JSON.stringify(body.propertySnapshot));
        }

        if (body.projectDetails !== undefined) {
          const existingDetails = await env.DB
            .prepare('SELECT project_details_json FROM projects WHERE id = ?')
            .bind(projectId)
            .first<{ project_details_json: string }>();

          let projectDetails = {};
          if (existingDetails?.project_details_json) {
            try {
              if (typeof existingDetails.project_details_json === 'string') {
                projectDetails = JSON.parse(existingDetails.project_details_json);
              } else {
                projectDetails = existingDetails.project_details_json;
              }
            } catch (e) {
              console.warn('Failed to parse project_details_json for update:', e);
              projectDetails = {};
            }
          }
          Object.assign(projectDetails, body.projectDetails);

          updates.push('project_details_json = ?');
          bindings.push(JSON.stringify(projectDetails));
        }

        if (updates.length > 0) {
          bindings.push(projectId);
          try {
            await env.DB
              .prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`)
              .bind(...bindings)
              .run();
            console.log('Project updated successfully');
          } catch (dbError) {
            console.error('Database error updating project:', dbError);
            throw new Error(`Failed to update project in database: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
          }
        }

        // Update card metadata if jobType or notes changed
        // Also move card to correct column if jobType changed
        if (
          body.jobType !== undefined ||
          body.notes !== undefined ||
          body.scheduledDate !== undefined ||
          body.scheduledTime !== undefined ||
          body.projectDetails?.clientType !== undefined ||
          body.projectDetails?.clientName !== undefined ||
          body.projectDetails?.price !== undefined
        ) {
          try {
            // Ensure we only have a single retailer card for this project before updating
            await cleanupProjectBoardCards(env.DB, 'retailer', projectId);

            const card = await env.DB
              .prepare(`SELECT pbc.id, pbc.metadata_json, pbc.board_column_id FROM project_board_cards pbc
                        JOIN project_board_columns pbc_col ON pbc.board_column_id = pbc_col.id
                        WHERE pbc.project_id = ? AND pbc_col.board_type = 'retailer'`)
              .bind(projectId)
              .first<{ id: number; metadata_json: string | null; board_column_id: number }>();

            if (card && card.id) {
              let metadata: Record<string, any> = {};
              try {
                if (card.metadata_json) {
                  if (typeof card.metadata_json === 'string') {
                    metadata = JSON.parse(card.metadata_json);
                  } else {
                    metadata = card.metadata_json as Record<string, any>;
                  }
                }
              } catch (e) {
                console.warn('Failed to parse card metadata_json:', e);
                metadata = {};
              }

              const oldJobType = metadata.jobType || null;

              console.log('Card metadata update:', {
                projectId,
                oldJobType,
                newJobType: body.jobType,
                jobTypeChanged: body.jobType !== undefined && body.jobType !== oldJobType,
                currentMetadata: metadata,
              });

              if (body.jobType !== undefined) metadata.jobType = body.jobType;
              if (body.notes !== undefined) metadata.notes = body.notes;
              if (body.scheduledDate !== undefined) metadata.scheduledDate = body.scheduledDate;
              if (body.scheduledTime !== undefined) metadata.scheduledTime = body.scheduledTime;
              if (body.projectDetails?.clientType !== undefined) metadata.clientType = body.projectDetails.clientType;
              if (body.projectDetails?.clientName !== undefined) metadata.clientName = body.projectDetails.clientName;
              if (body.projectDetails?.price !== undefined) metadata.price = body.projectDetails.price;

              // If jobType changed, move card to the correct column
              if (body.jobType !== undefined && body.jobType !== oldJobType) {
                // Determine target column based on new job type
                let targetColumnSlug = 'new';
                if (body.jobType === 'site_inspection') {
                  targetColumnSlug = 'site_inspection';
                } else if (body.jobType === 'stage_one') {
                  targetColumnSlug = 'stage_one';
                } else if (body.jobType === 'stage_two') {
                  targetColumnSlug = 'stage_two';
                } else if (body.jobType === 'full_system') {
                  targetColumnSlug = 'full_system';
                }

                console.log(`=== MOVING CARD ===`);
                console.log(`Project ID: ${projectId}`);
                console.log(`Job type changed from "${oldJobType}" to "${body.jobType}"`);
                console.log(`Target column slug: ${targetColumnSlug}`);
                console.log(`Current card ID: ${card.id}`);
                console.log(`Current board_column_id: ${card.board_column_id}`);

                // Get the target column ID
                const targetColumn = await env.DB
                  .prepare(`SELECT id, slug, label FROM project_board_columns WHERE board_type = 'retailer' AND slug = ?`)
                  .bind(targetColumnSlug)
                  .first<{ id: number; slug: string; label: string }>();

                if (targetColumn) {
                  console.log(`Found target column: ${targetColumn.label} (ID: ${targetColumn.id}, slug: ${targetColumn.slug})`);

                  // Move the card to the new column
                  const updateResult = await env.DB
                    .prepare('UPDATE project_board_cards SET board_column_id = ?, position = 0 WHERE id = ?')
                    .bind(targetColumn.id, card.id)
                    .run();

                  console.log(`Card update result:`, {
                    success: updateResult.success,
                    meta: updateResult.meta,
                  });

                  // Also update project_pipeline_state
                  const pipelineResult = await env.DB
                    .prepare(
                      `INSERT INTO project_pipeline_state (project_id, board_type, column_id)
                       VALUES (?, 'retailer', ?)
                       ON CONFLICT(project_id, board_type)
                       DO UPDATE SET column_id = excluded.column_id, updated_at = (strftime('%s','now'))`
                    )
                    .bind(projectId, targetColumn.id)
                    .run();

                  console.log(`Pipeline state update result:`, {
                    success: pipelineResult.success,
                    meta: pipelineResult.meta,
                  });

                  console.log(`✅ Card successfully moved to column: ${targetColumnSlug} (ID: ${targetColumn.id})`);
                } else {
                  console.error(`❌ Target column not found for slug: ${targetColumnSlug}`);

                  // List available columns for debugging
                  const availableColumns = await env.DB
                    .prepare(`SELECT slug, label FROM project_board_columns WHERE board_type = 'retailer' ORDER BY position`)
                    .all<{ slug: string; label: string }>();

                  console.error(`Available retailer columns:`, availableColumns.results);
                }
              } else {
                console.log('Job type not changed or not provided:', {
                  jobTypeProvided: body.jobType !== undefined,
                  oldJobType,
                  newJobType: body.jobType,
                  areEqual: body.jobType === oldJobType,
                });
              }

              await env.DB
                .prepare('UPDATE project_board_cards SET metadata_json = ? WHERE id = ?')
                .bind(JSON.stringify(metadata), card.id)
                .run();
              console.log('Card metadata updated successfully');
            } else {
              console.warn('Card not found for project:', projectId, '- this is okay, project will still be updated');
            }
          } catch (cardError) {
            console.error('Error updating card metadata (non-blocking):', cardError);
            // Don't throw - project update should succeed even if card metadata update fails
          }
        }

        // Create or update calendar event if jobType is site_inspection and scheduledDate is provided
        // Get current project and card data
        const currentProject = await env.DB
          .prepare('SELECT project_details_json FROM projects WHERE id = ?')
          .bind(projectId)
          .first<{ project_details_json: string | null }>();

        const currentCard = await env.DB
          .prepare(`SELECT metadata_json FROM project_board_cards pbc 
                    JOIN project_board_columns pbc_col ON pbc.board_column_id = pbc_col.id 
                    WHERE pbc.project_id = ? AND pbc_col.board_type = 'retailer'`)
          .bind(projectId)
          .first<{ metadata_json: string | null }>();

        // Safely parse JSON - handle null, empty strings, and already-parsed objects
        let cardMetadata: Record<string, any> = {};
        if (currentCard?.metadata_json) {
          try {
            if (typeof currentCard.metadata_json === 'string') {
              cardMetadata = JSON.parse(currentCard.metadata_json);
            } else {
              cardMetadata = currentCard.metadata_json as Record<string, any>;
            }
          } catch (e) {
            console.warn('Failed to parse card metadata_json:', e);
            cardMetadata = {};
          }
        }

        let projectDetailsParsed: Record<string, any> = {};
        if (currentProject?.project_details_json) {
          try {
            if (typeof currentProject.project_details_json === 'string') {
              projectDetailsParsed = JSON.parse(currentProject.project_details_json);
            } else {
              projectDetailsParsed = currentProject.project_details_json as Record<string, any>;
            }
          } catch (e) {
            console.warn('Failed to parse project_details_json:', e);
            projectDetailsParsed = {};
          }
        }

        // Determine final values (use body values first, then existing values)
        const finalJobType = body.jobType !== undefined ? body.jobType : cardMetadata.jobType;
        const finalScheduledDate = body.scheduledDate !== undefined ? body.scheduledDate : (body.projectDetails?.scheduledDate || cardMetadata.scheduledDate || projectDetailsParsed.scheduledDate);
        const finalScheduledTime = body.scheduledTime !== undefined ? body.scheduledTime : (body.projectDetails?.scheduledTime || cardMetadata.scheduledTime || projectDetailsParsed.scheduledTime || '09:00');

        console.log('Calendar event update check:', {
          projectId,
          finalJobType,
          finalScheduledDate,
          finalScheduledTime,
          bodyJobType: body.jobType,
          bodyScheduledDate: body.scheduledDate,
        });

        if (finalJobType === 'site_inspection' && finalScheduledDate) {
          // Calendar event creation - completely non-blocking
          // If this fails, project update will still succeed
          (async () => {
            try {
              console.log('Creating/updating calendar event for updated site inspection project:', {
                projectId,
                scheduledDate: finalScheduledDate,
                scheduledTime: finalScheduledTime,
              });

              // Convert date to YYYY-MM-DD format if needed
              let normalizedDate = finalScheduledDate;
              if (typeof finalScheduledDate === 'string') {
                // If already in YYYY-MM-DD format, use it
                if (/^\d{4}-\d{2}-\d{2}$/.test(finalScheduledDate)) {
                  normalizedDate = finalScheduledDate;
                } else {
                  // Try to parse other formats (DD/MM/YYYY, MM/DD/YYYY, etc.)
                  try {
                    // Handle DD/MM/YYYY format explicitly
                    const ddmmyyyyMatch = finalScheduledDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                    if (ddmmyyyyMatch) {
                      const [, day, month, year] = ddmmyyyyMatch;
                      normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                      console.log('Converted DD/MM/YYYY format:', { from: finalScheduledDate, to: normalizedDate });
                    } else {
                      // Try standard Date parsing for other formats
                      const parsed = new Date(finalScheduledDate);
                      if (!isNaN(parsed.getTime())) {
                        const year = parsed.getFullYear();
                        const month = String(parsed.getMonth() + 1).padStart(2, '0');
                        const day = String(parsed.getDate()).padStart(2, '0');
                        normalizedDate = `${year}-${month}-${day}`;
                        console.log('Converted date format:', { from: finalScheduledDate, to: normalizedDate });
                      } else {
                        console.error('Could not parse date:', finalScheduledDate);
                        return; // Exit early if date can't be parsed
                      }
                    }
                  } catch (parseError) {
                    console.error('Date parsing error:', parseError);
                    return; // Exit early if date parsing fails
                  }
                }
              } else {
                console.error('scheduledDate is not a string:', typeof finalScheduledDate, finalScheduledDate);
                return; // Exit early if date is not a string
              }

              const scheduledStart = toUnixTimestamp(normalizedDate, finalScheduledTime || '09:00');
              const scheduledEnd = scheduledStart ? scheduledStart + 3600 : null;

              console.log('Calculated timestamps:', {
                scheduledStart,
                scheduledEnd,
                scheduledStartDate: scheduledStart ? new Date(scheduledStart * 1000).toISOString() : null,
              });

              if (!scheduledStart) {
                console.error('Invalid scheduledStart timestamp', {
                  normalizedDate,
                  scheduledTime: finalScheduledTime,
                });
                return; // Exit early if timestamp is invalid
              }

              // Check if calendar event already exists
              const existingEvent = await env.DB
                .prepare(`SELECT id, site_visit_id FROM calendar_events WHERE project_id = ? AND source_module = 'onfield'`)
                .bind(projectId)
                .first<{ id: number; site_visit_id: number | null }>();

              if (existingEvent) {
                // Update or create site visit first
                let siteVisitId = existingEvent.site_visit_id;

                if (!siteVisitId) {
                  // Create site visit if it doesn't exist
                  const siteVisitResult = await env.DB
                    .prepare(
                      `INSERT INTO site_visits (
                project_id, visit_type, status, scheduled_start, scheduled_end
              ) VALUES (?, 'retailer', 'scheduled', ?, ?)
              RETURNING id`
                    )
                    .bind(projectId, scheduledStart, scheduledEnd)
                    .first<{ id: number }>();

                  if (siteVisitResult) {
                    siteVisitId = siteVisitResult.id;
                    console.log('Created site visit:', siteVisitId);
                  }
                } else {
                  // Update existing site visit
                  await env.DB
                    .prepare(`UPDATE site_visits SET scheduled_start = ?, scheduled_end = ? WHERE id = ?`)
                    .bind(scheduledStart, scheduledEnd, siteVisitId)
                    .run();
                  console.log('Updated site visit:', siteVisitId);
                }

                // Update existing calendar event
                if (siteVisitId) {
                  await env.DB
                    .prepare(`UPDATE calendar_events 
                            SET site_visit_id = ?, 
                                legend = 'Site Inspection (Retailer)', 
                                starts_at = ?, 
                                ends_at = ?, 
                                published = 1
                            WHERE id = ?`)
                    .bind(siteVisitId, scheduledStart, scheduledEnd, existingEvent.id)
                    .run();
                } else {
                  // Update without site visit ID if creation failed
                  await env.DB
                    .prepare(`UPDATE calendar_events 
                            SET legend = 'Site Inspection (Retailer)', 
                                starts_at = ?, 
                                ends_at = ?, 
                                published = 1
                            WHERE id = ?`)
                    .bind(scheduledStart, scheduledEnd, existingEvent.id)
                    .run();
                }

                console.log('Updated existing calendar event:', existingEvent.id);
              } else {
                // Create new site visit and calendar event
                const siteVisitResult = await env.DB
                  .prepare(
                    `INSERT INTO site_visits (
                project_id, visit_type, status, scheduled_start, scheduled_end
              ) VALUES (?, 'retailer', 'scheduled', ?, ?)
              RETURNING id`
                  )
                  .bind(projectId, scheduledStart, scheduledEnd)
                  .first<{ id: number }>();

                if (siteVisitResult) {
                  const calendarEventResult = await env.DB
                    .prepare(
                      `INSERT INTO calendar_events (
                      project_id, site_visit_id, source_module, legend, starts_at, ends_at, published
                    ) VALUES (?, ?, 'onfield', 'Site Inspection (Retailer)', ?, ?, 1)
                    RETURNING id`
                    )
                    .bind(projectId, siteVisitResult.id, scheduledStart, scheduledEnd)
                    .first<{ id: number }>();

                  console.log('Created new calendar event:', calendarEventResult?.id);
                } else {
                  console.error('Failed to create site visit for calendar event');
                }
              }
            } catch (error) {
              console.error('Error creating/updating calendar event:', error);
              console.error('Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                projectId,
                finalJobType,
                finalScheduledDate,
                finalScheduledTime,
              });
              // Don't fail the entire update - log error but continue
              // The backfill endpoint can be used later to fix calendar events
            }
          })(); // Close async IIFE - fire and forget
        } else {
          console.log('Skipping calendar event update:', {
            finalJobType,
            hasScheduledDate: !!finalScheduledDate,
          });
        }

        console.log('Retailer project update completed successfully');
        return respondJSON({ ok: true });
      } catch (error) {
        console.error('=== ERROR UPDATING RETAILER PROJECT ===');
        console.error('Error:', error);
        console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
        console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
        console.error('Error stack:', error instanceof Error ? error.stack : undefined);
        console.error('Project ID:', params.projectId);

        // Log request body if we have it
        if (body && Object.keys(body).length > 0) {
          console.error('Request body:', JSON.stringify(body, null, 2));
        }

        // Return detailed error message
        const errorMessage = error instanceof Error ? error.message : 'Unexpected error';

        return respondJSON(
          {
            error: 'INTERNAL_ERROR',
            message: errorMessage,
          },
          { status: 500 },
        );
      }
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/projects\/(?<projectId>\d+)\/assignees$/,
    handler: async ({ env, params, request }) => {
      const projectId = Number(params.projectId);
      if (Number.isNaN(projectId)) {
        return respondJSON({ error: 'INVALID_PROJECT_ID' }, { status: 400 });
      }

      let body: any;
      try {
        body = await parseJSON(request);
      } catch (error) {
        return respondJSON(
          { error: 'INVALID_JSON', message: error instanceof Error ? error.message : 'Invalid JSON' },
          { status: 400 },
        );
      }

      const rawAssignees = body?.assigneeIds ?? body?.assignees ?? [];
      const assigneeIds: string[] = Array.isArray(rawAssignees)
        ? rawAssignees.map((v) => String(v)).filter((v) => v.trim().length > 0)
        : typeof rawAssignees === 'string' && rawAssignees.trim()
          ? rawAssignees
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
          : [];

      // Load existing project_details_json
      const row = await env.DB
        .prepare(`SELECT project_details_json FROM projects WHERE id = ?`)
        .bind(projectId)
        .first<{ project_details_json: string | null }>();

      if (!row) {
        return respondJSON({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
      }

      let projectDetails: Record<string, unknown> = {};
      if (row.project_details_json) {
        try {
          projectDetails =
            typeof row.project_details_json === 'string'
              ? JSON.parse(row.project_details_json)
              : (row.project_details_json as any) ?? {};
        } catch {
          projectDetails = {};
        }
      }

      // Persist both assigneeId (array) and assignees (string for convenience)
      if (assigneeIds.length > 0) {
        (projectDetails as any).assigneeId = assigneeIds;
        (projectDetails as any).assignees = assigneeIds;
      } else {
        delete (projectDetails as any).assigneeId;
        delete (projectDetails as any).assignees;
      }

      await env.DB
        .prepare(`UPDATE projects SET project_details_json = ? WHERE id = ?`)
        .bind(JSON.stringify(projectDetails), projectId)
        .run();

      return respondJSON({ ok: true, assigneeIds });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/projects\/next-code$/,
    handler: async ({ env, request }) => {
      const url = new URL(request.url);
      console.log('GET /api/projects/next-code handler called', {
        url: request.url,
        pathname: url.pathname,
        method: request.method
      });
      try {
        // Get the count of retailer projects and generate next project code
        // This ensures retailer projects start from PRJ-1
        const countResult = await env.DB
          .prepare(`SELECT COUNT(*) as count FROM projects WHERE category = 'retailer'`)
          .first<{ count: number }>();

        const nextId = (countResult?.count || 0) + 1;
        const projectCode = `PRJ-${nextId}`;

        console.log('Next project code generated:', projectCode, 'retailerCount:', countResult?.count);
        return respondJSON({ projectCode });
      } catch (error) {
        console.error('Error fetching next project code:', error);
        return respondJSON({
          error: 'Failed to fetch next project code',
          message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/debug\/project-by-code\/(?<code>.+)$/,
    handler: async ({ env, params }) => {
      const code = params.code;
      const project = await env.DB.prepare(`
        SELECT * FROM projects WHERE name = ? 
        OR json_extract(project_details_json, '$.projectCode') = ?
        OR json_extract(project_details_json, '$.code') = ?
      `).bind(code, code, code).first();
      return respondJSON(project || { error: 'Not found' });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/debug\/test-assignee-filter$/,
    handler: async ({ env, request }) => {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId') ? Number(searchParams.get('userId')) : 14;
      const projectId = searchParams.get('projectId') ? Number(searchParams.get('projectId')) : 227;

      // Get project details
      const project = await env.DB
        .prepare(`SELECT id, name, project_details_json FROM projects WHERE id = ?`)
        .bind(projectId)
        .first<{ id: number; name: string; project_details_json: string | null }>();

      if (!project) {
        return respondJSON({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
      }

      const projectDetailsJson = project.project_details_json || '{}';

      // Test different query approaches
      const tests: Record<string, any> = {};

      // Test 1: Direct json_extract
      const test1 = await env.DB
        .prepare(`SELECT json_extract(?, '$.assigneeId') as extracted`)
        .bind(projectDetailsJson)
        .first<{ extracted: any }>();
      tests.test1_jsonExtract = test1?.extracted;

      // Test 2: json_array_length
      const test2 = await env.DB
        .prepare(`SELECT json_array_length(json_extract(?, '$.assigneeId')) as length`)
        .bind(projectDetailsJson)
        .first<{ length: number | null }>();
      tests.test2_arrayLength = test2?.length;

      // Test 3: json_each with extracted array
      const test3 = await env.DB
        .prepare(`SELECT value FROM json_each(json_extract(?, '$.assigneeId')) LIMIT 5`)
        .bind(projectDetailsJson)
        .all<{ value: any }>();
      tests.test3_jsonEachValues = test3.results.map(r => r.value);

      // Test 4: EXISTS with json_each
      const test4 = await env.DB
        .prepare(`SELECT EXISTS (SELECT 1 FROM json_each(json_extract(?, '$.assigneeId')) WHERE CAST(value AS TEXT) = CAST(? AS TEXT)) as exists_result`)
        .bind(projectDetailsJson, userId)
        .first<{ exists_result: number }>();
      tests.test4_existsWithUserId = test4?.exists_result;

      // Test 5: EXISTS with string userId
      const test5 = await env.DB
        .prepare(`SELECT EXISTS (SELECT 1 FROM json_each(json_extract(?, '$.assigneeId')) WHERE CAST(value AS TEXT) = ?) as exists_result`)
        .bind(projectDetailsJson, String(userId))
        .first<{ exists_result: number }>();
      tests.test5_existsWithStringUserId = test5?.exists_result;

      // Test 6: Full query simulation
      const test6 = await env.DB
        .prepare(`
          SELECT c.project_id, p.name
          FROM project_board_cards c
          JOIN projects p ON p.id = c.project_id
          JOIN project_board_columns col ON col.id = c.board_column_id
          WHERE col.board_type = 'retailer'
          AND c.project_id = ?
          AND (
            json_extract(COALESCE(p.project_details_json, '{}'), '$.assigneeId') IS NOT NULL
            AND json_type(json_extract(COALESCE(p.project_details_json, '{}'), '$.assigneeId')) = 'array'
            AND COALESCE(json_array_length(json_extract(COALESCE(p.project_details_json, '{}'), '$.assigneeId')), 0) > 0
            AND EXISTS (
              SELECT 1 FROM json_each(json_extract(COALESCE(p.project_details_json, '{}'), '$.assigneeId'))
              WHERE CAST(value AS TEXT) = CAST(? AS TEXT)
            )
          )
        `)
        .bind(projectId, userId)
        .all<{ project_id: number; name: string }>();
      tests.test6_fullQuery = test6.results;

      return respondJSON({
        projectId,
        projectName: project.name,
        userId,
        userIdAsString: String(userId),
        projectDetailsJson,
        tests,
      });
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/debug\/backfill-calendar-events-for-scheduled$/,
    handler: async ({ env }) => {
      // Find all projects in scheduled/to_be_rescheduled columns that don't have calendar events
      const projectsNeedingEvents = await env.DB
        .prepare(`
          SELECT DISTINCT
            p.id as project_id,
            p.name,
            p.category,
            p.project_details_json,
            col.board_type,
            col.slug as column_slug
          FROM projects p
          JOIN project_board_cards c ON c.project_id = p.id
          JOIN project_board_columns col ON col.id = c.board_column_id
          LEFT JOIN calendar_events ce ON ce.project_id = p.id AND ce.source_module = 'onfield'
          WHERE col.slug IN ('scheduled', 'to_be_rescheduled')
          AND col.board_type IN ('retailer', 'in_house')
          AND ce.id IS NULL
          AND p.project_details_json IS NOT NULL
        `)
        .all<{ project_id: number; name: string; category: string; project_details_json: string; board_type: string; column_slug: string }>();

      const results = [];
      for (const proj of projectsNeedingEvents.results) {
        try {
          const projectDetails = safeParse(proj.project_details_json);
          const scheduledDate = projectDetails.scheduledDate as string | undefined;
          const scheduledTime = (projectDetails.scheduledTime as string | undefined) || '09:00';

          if (!scheduledDate) {
            results.push({ projectId: proj.project_id, name: proj.name, status: 'skipped', reason: 'no scheduledDate' });
            continue;
          }

          const startsAt = toUnixTimestamp(scheduledDate, scheduledTime);
          if (!startsAt) {
            results.push({ projectId: proj.project_id, name: proj.name, status: 'skipped', reason: 'invalid date/time' });
            continue;
          }

          const endsAt = startsAt + 3600;
          const legend =
            proj.category === 'retailer'
              ? proj.column_slug === 'to_be_rescheduled'
                ? 'Retailer - To Be Rescheduled'
                : 'Retailer - Scheduled'
              : proj.column_slug === 'to_be_rescheduled'
                ? 'In-House - To Be Rescheduled'
                : 'In-House - Scheduled';

          await env.DB
            .prepare(
              `INSERT INTO calendar_events (project_id, source_module, legend, starts_at, ends_at, published)
               VALUES (?, 'onfield', ?, ?, ?, 1)`,
            )
            .bind(proj.project_id, legend, startsAt, endsAt)
            .run();

          results.push({ projectId: proj.project_id, name: proj.name, status: 'created', scheduledDate, scheduledTime });
        } catch (error: any) {
          results.push({ projectId: proj.project_id, name: proj.name, status: 'error', error: error.message });
        }
      }

      return respondJSON({ total: projectsNeedingEvents.results.length, results });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/debug\/project\/(?<projectId>\d+)\/assignees$/,
    handler: async ({ env, params }) => {
      const projectId = Number(params.projectId);
      if (Number.isNaN(projectId)) {
        return respondJSON({ error: 'INVALID_PROJECT_ID' }, { status: 400 });
      }
      const project = await env.DB
        .prepare(`SELECT id, name, category, project_details_json FROM projects WHERE id = ?`)
        .bind(projectId)
        .first<{ id: number; name: string; category: string; project_details_json: string | null }>();

      if (!project) {
        return respondJSON({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
      }

      // Check board cards
      const boardCards = await env.DB
        .prepare(`
          SELECT c.board_column_id, c.project_id, col.board_type, col.slug as column_slug
          FROM project_board_cards c
          JOIN project_board_columns col ON col.id = c.board_column_id
          WHERE c.project_id = ?
        `)
        .bind(projectId)
        .all<{ board_column_id: number; project_id: number; board_type: string; column_slug: string }>();

      let projectDetails: any = {};
      if (project.project_details_json) {
        try {
          projectDetails = JSON.parse(project.project_details_json);
        } catch {
          projectDetails = {};
        }
      }

      const assigneeId = projectDetails.assigneeId;
      const assigneeIdRaw = projectDetails.assigneeId;
      const assigneeIdType = typeof assigneeId;
      const assigneeIdIsArray = Array.isArray(assigneeId);
      const assigneeIdLength = Array.isArray(assigneeId) ? assigneeId.length : null;

      // Test SQL functions
      const jsonExtractTest = await env.DB
        .prepare(`SELECT json_extract(COALESCE(?, '{}'), '$.assigneeId') as extracted`)
        .bind(project.project_details_json || '{}')
        .first<{ extracted: any }>();

      const jsonArrayLengthTest = await env.DB
        .prepare(`SELECT json_array_length(json_extract(COALESCE(?, '{}'), '$.assigneeId')) as arr_length`)
        .bind(project.project_details_json || '{}')
        .first<{ arr_length: number | null }>();

      return respondJSON({
        projectId: project.id,
        projectName: project.name,
        projectCategory: project.category,
        projectDetailsJson: project.project_details_json,
        boardCards: boardCards.results,
        hasRetailerBoardCard: boardCards.results.some(c => c.board_type === 'retailer'),
        hasInHouseBoardCard: boardCards.results.some(c => c.board_type === 'in_house'),
        assigneeId,
        assigneeIdRaw,
        assigneeIdType,
        assigneeIdIsArray,
        assigneeIdLength,
        jsonExtractResult: jsonExtractTest?.extracted,
        jsonArrayLengthResult: jsonArrayLengthTest?.arr_length,
        fullProjectDetails: projectDetails,
      });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/boards\/(?<boardType>[\w_]+)$/,
    handler: async ({ env, params, request }) => {
      const boardType = validateBoardType(params.boardType);
      const url = new URL(request.url);
      const userId = url.searchParams.get('userId') ? Number(url.searchParams.get('userId')) : undefined;
      const board = await fetchBoard(env.DB, boardType, userId);
      return respondJSON(board);
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/projects\/(?<projectId>\d+)\/pipeline$/,
    handler: async ({ env, request, params }) => {
      const projectId = Number(params.projectId);
      if (Number.isNaN(projectId)) {
        return respondJSON({ error: 'INVALID_PROJECT_ID' }, { status: 400 });
      }
      const body = await parseJSON(request);
      const boardType = validateBoardType(body.boardType);
      const { targetColumnSlug, actorId } = body;
      if (typeof targetColumnSlug !== 'string') {
        return respondJSON({ error: 'INVALID_COLUMN' }, { status: 400 });
      }
      try {
        await moveProjectToColumn(env.DB, {
          projectId,
          boardType,
          targetColumnSlug,
          actorId: typeof actorId === 'number' ? actorId : null,
        });
        return respondJSON({ ok: true });
      } catch (error) {
        console.error('Error moving project to column', {
          projectId,
          boardType,
          targetColumnSlug,
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
        });
        return respondJSON(
          {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
            detail: { projectId, boardType, targetColumnSlug, stack: error instanceof Error ? error.stack : undefined },
          },
          { status: 500 },
        );
      }
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/projects\/(?<projectId>\d+)\/schedule$/,
    handler: async ({ env, params, request }) => {
      const projectId = Number(params.projectId);
      if (Number.isNaN(projectId)) {
        return respondJSON({ error: 'INVALID_PROJECT_ID' }, { status: 400 });
      }
      const body = await parseJSON(request);
      const { scheduledDate, scheduledTime } = body || {};
      if (typeof scheduledDate !== 'string' || !scheduledDate.trim()) {
        return respondJSON({ error: 'INVALID_SCHEDULED_DATE' }, { status: 400 });
      }
      const finalScheduledTime = typeof scheduledTime === 'string' && scheduledTime.trim() ? scheduledTime : '09:00';
      const projectRow = await env.DB
        .prepare('SELECT project_details_json FROM projects WHERE id = ?')
        .bind(projectId)
        .first<{ project_details_json: string | null }>();
      if (!projectRow) {
        return respondJSON({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
      }
      const projectDetails = (safeParse(projectRow.project_details_json) as Record<string, any>) || {};
      projectDetails.scheduledDate = scheduledDate;
      projectDetails.scheduledTime = finalScheduledTime;
      await env.DB
        .prepare('UPDATE projects SET project_details_json = ? WHERE id = ?')
        .bind(JSON.stringify(projectDetails), projectId)
        .run();
      // Upsert calendar event immediately based on saved schedule
      const projectMeta = await env.DB
        .prepare('SELECT category FROM projects WHERE id = ?')
        .bind(projectId)
        .first<{ category: string }>();
      await upsertOnfieldCalendarEvent(env.DB, {
        projectId,
        category: projectMeta?.category || 'in_house',
        scheduledDate,
        scheduledTime: finalScheduledTime,
        columnSlug: 'scheduled',
      });
      return respondJSON({ ok: true, scheduledDate, scheduledTime: finalScheduledTime });
    },
  },

  {
    method: 'GET',
    pattern: /^\/api\/site-visits\/(?<siteVisitId>\d+)\/prefill$/,
    handler: async ({ env, params }) => {






      const siteVisitId = Number(params.siteVisitId);
      if (Number.isNaN(siteVisitId)) {
        return respondJSON({ error: 'INVALID_SITE_VISIT_ID' }, { status: 400 });
      }
      const payload = await getSiteVisitPrefill(env.DB, siteVisitId);
      if (!payload) {
        return respondJSON({ error: 'NOT_FOUND' }, { status: 404 });
      }
      return respondJSON(payload);
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/projects\/(?<projectId>\d+)\/details$/,
    handler: async ({ env, params }) => {
      const projectId = Number(params.projectId);
      if (Number.isNaN(projectId)) {
        return respondJSON({ error: 'INVALID_PROJECT_ID' }, { status: 400 });
      }
      const project = await env.DB
        .prepare(
          `SELECT id, name, lead_id, customer_snapshot_json, system_snapshot_json, property_snapshot_json, energy_snapshot_json, utility_snapshot_json, project_details_json
           FROM projects WHERE id = ?`
        )
        .bind(projectId)
        .first<Record<string, unknown> & { lead_id: number | null }>();

      if (!project) {
        return respondJSON({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
      }

      let externalData: Record<string, unknown> | null = null;
      if (project.lead_id) {
        const leadRow = await env.DB
          .prepare(`SELECT marketing_payload_json FROM leads WHERE id = ?`)
          .bind(project.lead_id)
          .first<{ marketing_payload_json: string | null }>();
        if (leadRow?.marketing_payload_json) {
          try {
            const parsed = JSON.parse(leadRow.marketing_payload_json) as Record<string, unknown>;
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              externalData = parsed;
            }
          } catch {
            // ignore invalid JSON
          }
        }
      }

      // Fetch latest retailer site visit (if any)
      const retailerSiteVisit = await env.DB
        .prepare(
          `SELECT id, status 
           FROM site_visits 
           WHERE project_id = ? AND visit_type = 'retailer'
           ORDER BY created_at DESC
           LIMIT 1`,
        )
        .bind(projectId)
        .first<{ id: number; status: string }>();

      let retailerSiteVisitForm: Record<string, unknown> | null = null;
      if (retailerSiteVisit?.id) {
        const formRow = await env.DB
          .prepare(
            `SELECT customer_info_json, system_info_json, property_info_json, roof_assessment_json, additional_fields_json
             FROM retailer_site_visit_forms
             WHERE site_visit_id = ?`,
          )
          .bind(retailerSiteVisit.id)
          .first<{
            customer_info_json: string | null;
            system_info_json: string | null;
            property_info_json: string | null;
            roof_assessment_json: string | null;
            additional_fields_json: string | null;
          }>();

        if (formRow) {
          retailerSiteVisitForm = {
            customerInfo: safeParse(formRow.customer_info_json),
            systemInfo: safeParse(formRow.system_info_json),
            propertyInfo: safeParse(formRow.property_info_json),
            roofAssessment: safeParse(formRow.roof_assessment_json),
            additionalFields: safeParse(formRow.additional_fields_json),
          };
        }
      }

      // Fetch latest sales site visit (if any)
      const salesSiteVisit = await env.DB
        .prepare(
          `SELECT id, status 
           FROM site_visits 
           WHERE project_id = ? AND visit_type = 'sales'
           ORDER BY created_at DESC
           LIMIT 1`,
        )
        .bind(projectId)
        .first<{ id: number; status: string }>();

      let salesSiteVisitForm: Record<string, unknown> | null = null;
      if (salesSiteVisit?.id) {
        const salesFormRow = await env.DB
          .prepare(
            `SELECT basic_info_json, system_info_json, energy_info_json, property_details_json, checklist_json
             FROM sales_site_visit_forms
             WHERE site_visit_id = ?`,
          )
          .bind(salesSiteVisit.id)
          .first<{
            basic_info_json: string | null;
            system_info_json: string | null;
            energy_info_json: string | null;
            property_details_json: string | null;
            checklist_json: string | null;
          }>();

        if (salesFormRow) {
          salesSiteVisitForm = {
            basicInfo: safeParse(salesFormRow.basic_info_json),
            systemInfo: safeParse(salesFormRow.system_info_json),
            energyInfo: safeParse(salesFormRow.energy_info_json),
            propertyDetails: safeParse(salesFormRow.property_details_json),
            checklist: safeParse(salesFormRow.checklist_json),
          };
        }
      }

      // Fetch latest on-field site inspection (if any)
      const onfieldSiteVisit = await env.DB
        .prepare(
          `SELECT id, status 
           FROM site_visits 
           WHERE project_id = ? AND visit_type = 'onfield'
           ORDER BY created_at DESC
           LIMIT 1`,
        )
        .bind(projectId)
        .first<{ id: number; status: string }>();

      let onfieldSiteInspectionForm: Record<string, unknown> | null = null;
      if (onfieldSiteVisit?.id) {
        const onfieldFormRow = await env.DB
          .prepare(
            `SELECT customer_info_json, system_info_json, property_info_json, roof_assessment_json, electrical_json, photos_json
             FROM onfield_site_inspection_forms
             WHERE site_visit_id = ?`,
          )
          .bind(onfieldSiteVisit.id)
          .first<{
            customer_info_json: string | null;
            system_info_json: string | null;
            property_info_json: string | null;
            roof_assessment_json: string | null;
            electrical_json: string | null;
            photos_json: string | null;
          }>();

        if (onfieldFormRow) {
          // Parse the full payload from customer_info_json (all JSON columns contain the same full payload)
          const fullPayload = safeParse(onfieldFormRow.customer_info_json) as Record<string, unknown>;

          // Use the full payload structure if available, otherwise fall back to individual columns
          onfieldSiteInspectionForm = {
            siteInfo: (fullPayload.siteInfo || {}) as Record<string, unknown>,
            customerInfo: (fullPayload.customerInfo || safeParse(onfieldFormRow.customer_info_json)) as Record<string, unknown>,
            systemInfo: (fullPayload.systemInfo || safeParse(onfieldFormRow.system_info_json)) as Record<string, unknown>,
            propertyInfo: (fullPayload.propertyInfo || safeParse(onfieldFormRow.property_info_json)) as Record<string, unknown>,
            energyInfo: (fullPayload.energyInfo || {}) as Record<string, unknown>,
            safetyAssessment: (fullPayload.safetyAssessment || {}) as Record<string, unknown>,
            electrical: (fullPayload.electrical || safeParse(onfieldFormRow.electrical_json)) as Record<string, unknown>,
            roofAssessment: (fullPayload.roofAssessment || safeParse(onfieldFormRow.roof_assessment_json)) as Record<string, unknown>,
            installationRequirements: (fullPayload.installationRequirements || {}) as Record<string, unknown>,
            notesAndRecommendations: (fullPayload.notesAndRecommendations || {}) as Record<string, unknown>,
            safetyReminders: (Array.isArray(fullPayload.safetyReminders) ? fullPayload.safetyReminders : []) as string[],
            installationChecklist: (Array.isArray(fullPayload.installationChecklist) ? fullPayload.installationChecklist : []) as string[],
            photos: (Array.isArray(fullPayload.photos) ? fullPayload.photos : safeParse(onfieldFormRow.photos_json)) as Array<Record<string, unknown>>,
          };
        }
      }

      const projectDetailsParsed = safeParse(project.project_details_json) ?? {};
      const salesSiteVisitFormData = (salesSiteVisit as any)?.form || null;
      const energyFromSales = salesSiteVisitFormData?.energyInfo;
      const systemFromSales = salesSiteVisitFormData?.systemInfo;
      const propertyFromSales = salesSiteVisitFormData?.propertyDetails;
      // If a retailer site visit form exists, consider it completed unless explicitly marked otherwise
      const derivedStatusFromForm = retailerSiteVisitForm ? 'completed' : null;
      const siteInspectionStatus =
        (projectDetailsParsed as any)?.siteInspectionStatus ||
        derivedStatusFromForm ||
        retailerSiteVisit?.status ||
        'pending';

      // Get current column slug for in_house and retailer boards
      let columnSlug: string | null = null;
      const inHouseState = await env.DB
        .prepare(
          `SELECT pc.slug
           FROM project_pipeline_state pps
           JOIN project_board_columns pc ON pc.id = pps.column_id
           WHERE pps.project_id = ? AND pps.board_type = 'in_house'
           LIMIT 1`
        )
        .bind(projectId)
        .first<{ slug: string } | null>();

      if (inHouseState) {
        columnSlug = inHouseState.slug;
      } else {
        const retailerState = await env.DB
          .prepare(
            `SELECT pc.slug
             FROM project_pipeline_state pps
             JOIN project_board_columns pc ON pc.id = pps.column_id
             WHERE pps.project_id = ? AND pps.board_type = 'retailer'
             LIMIT 1`
          )
          .bind(projectId)
          .first<{ slug: string } | null>();
        if (retailerState) {
          columnSlug = retailerState.slug;
        }
      }

      let assignees: any[] = [];
      const projectDetailsObj = safeParse(project.project_details_json) || {};
      const assigneeVal = (projectDetailsObj as any).assigneeId;

      if (assigneeVal) {
        let assigneeIds: any[] = [];
        if (Array.isArray(assigneeVal)) {
          assigneeIds = assigneeVal;
        } else {
          assigneeIds = [assigneeVal];
        }

        // Filter valid IDs and query resources
        if (assigneeIds.length > 0) {
          const placeholders = assigneeIds.map(() => '?').join(',');
          try {
            const query = `SELECT id, full_name, email, role FROM resources WHERE id IN (${placeholders})`;
            const results = await env.DB.prepare(query).bind(...assigneeIds).all();
            assignees = results.results || [];
          } catch (err) {
            console.error('Error fetching assignees:', err);
          }
        }
      }

      return respondJSON({
        id: project.id,
        name: project.name,
        project: projectDetailsParsed,
        customer: safeParse(project.customer_snapshot_json),
        system: safeParse(project.system_snapshot_json) || systemFromSales || {},
        property: safeParse(project.property_snapshot_json) || propertyFromSales || {},
        energy: safeParse(project.energy_snapshot_json) || energyFromSales || {},
        utility: safeParse((project as any).utility_snapshot_json) || {},
        siteInspectionStatus,
        columnSlug,
        assignees,
        externalData: externalData ?? undefined,
        retailerSiteVisit: retailerSiteVisit
          ? {
            id: retailerSiteVisit.id,
            status: retailerSiteVisit.status,
            form: retailerSiteVisitForm,
          }
          : null,
        salesSiteVisit: salesSiteVisit
          ? {
            id: salesSiteVisit.id,
            status: salesSiteVisit.status,
            form: salesSiteVisitForm,
          }
          : null,
        onfieldSiteInspection: onfieldSiteVisit
          ? {
            id: onfieldSiteVisit.id,
            status: onfieldSiteVisit.status,
            form: onfieldSiteInspectionForm,
          }
          : null,
      });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/projects\/(?<projectId>\d+)\/electrician-site-visit$/,
    handler: async ({ env, params }) => {
      const projectId = Number(params.projectId);
      if (Number.isNaN(projectId)) {
        return respondJSON({ error: 'INVALID_PROJECT_ID' }, { status: 400 });
      }
      // Find the electrician site visit for this project
      const siteVisit = await env.DB
        .prepare(`SELECT id FROM site_visits WHERE project_id = ? AND visit_type = 'electrician' ORDER BY created_at DESC LIMIT 1`)
        .bind(projectId)
        .first<{ id: number }>();

      if (!siteVisit) {
        return respondJSON({ error: 'NO_ELECTRICIAN_VISIT_FOUND' }, { status: 404 });
      }

      const payload = await getSiteVisitPrefill(env.DB, siteVisit.id);
      if (!payload) {
        return respondJSON({ error: 'NOT_FOUND' }, { status: 404 });
      }
      return respondJSON(payload);
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/site-visits\/(?<siteVisitId>\d+)\/complete$/,
    handler: async ({ env, request, params }) => {



      const siteVisitId = Number(params.siteVisitId);
      if (Number.isNaN(siteVisitId)) {
        return respondJSON({ error: 'INVALID_SITE_VISIT_ID' }, { status: 400 });
      }
      const body = await parseJSON(request);
      const formType = validateFormType(body.formType);
      if (typeof body.payload !== 'object' || body.payload == null) {
        return respondJSON({ error: 'INVALID_PAYLOAD' }, { status: 400 });
      }
      const isDraft = body.isDraft === true || body.isDraft === 'true';

      await completeSiteVisitNewForm(env.DB, {
        siteVisitId,
        formType,
        payload: body.payload,
        projectTargetColumnSlug: typeof body.projectTargetColumnSlug === 'string' ? body.projectTargetColumnSlug : null,
        isDraft,
      });
      return respondJSON({ ok: true });
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/site-visits\/(?<siteVisitId>\d+)\/schedule-electrician$/,
    handler: async ({ env, request, params }) => {
      const parentSiteVisitId = Number(params.siteVisitId);
      if (Number.isNaN(parentSiteVisitId)) {
        return respondJSON({ error: 'INVALID_SITE_VISIT_ID' }, { status: 400 });
      }
      const body = await parseJSON(request);
      const scheduledStart = typeof body.scheduledStart === 'number' ? body.scheduledStart : null;
      if (!scheduledStart) {
        return respondJSON({ error: 'INVALID_START' }, { status: 400 });
      }
      const scheduledEnd = typeof body.scheduledEnd === 'number' ? body.scheduledEnd : null;
      const assignedUserId = typeof body.assignedUserId === 'number' ? body.assignedUserId : null;
      const newVisitId = await scheduleElectricianVisit(env.DB, {
        parentSiteVisitId,
        scheduledStart,
        scheduledEnd,
        assignedUserId,
        legend: typeof body.legend === 'string' ? body.legend : 'Electrician Visit',
      });
      return respondJSON({ ok: true, siteVisitId: newVisitId });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/calendars$/,
    handler: async ({ env, request }) => {
      const { searchParams } = new URL(request.url);
      const fromTs = Number(searchParams.get('from'));
      const toTs = Number(searchParams.get('to'));
      const userId = searchParams.get('userId') ? Number(searchParams.get('userId')) : null;
      const sourceModule = (searchParams.get('source') ?? 'onfield').toLowerCase();
      const events = await fetchCalendarEvents(env.DB, {
        sourceModule,
        fromTs: Number.isNaN(fromTs) ? null : fromTs,
        toTs: Number.isNaN(toTs) ? null : toTs,
        userId: Number.isNaN(userId) ? null : userId,
      });
      return respondJSON(events);
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/calendars$/,
    handler: async ({ env, request }) => {
      const payload = await request.json<{
        projectId: number;
        sourceModule: 'sales' | 'onfield' | 'project_mgmt' | 'operations';
        startsAt: number;
        endsAt?: number;
        category?: string;
        siteVisitId?: number;
        visitType?: string;
        legend?: string;
      }>();

      // Validate required fields
      if (!payload.projectId || !payload.sourceModule || !payload.startsAt) {
        return respondJSON({ error: 'Missing required fields: projectId, sourceModule, startsAt' }, { status: 400 });
      }

      // Check if event already exists
      const existingEvent = await env.DB
        .prepare(
          `SELECT id FROM calendar_events 
           WHERE project_id = ? AND source_module = ? 
           ${payload.siteVisitId ? 'AND site_visit_id = ?' : 'AND site_visit_id IS NULL'}`
        )
        .bind(
          payload.projectId,
          payload.sourceModule,
          ...(payload.siteVisitId ? [payload.siteVisitId] : [])
        )
        .first<{ id: number }>();

      let calendarEventId: number;

      if (existingEvent) {
        // Update existing event
        await env.DB
          .prepare(
            `UPDATE calendar_events 
             SET legend = ?, starts_at = ?, ends_at = ?, published = 1
             WHERE id = ?`
          )
          .bind(
            payload.legend || 'Calendar Event',
            payload.startsAt,
            payload.endsAt || payload.startsAt + 3600,
            existingEvent.id
          )
          .run();
        calendarEventId = existingEvent.id;
      } else {
        // Create new event
        const result = await env.DB
          .prepare(
            `INSERT INTO calendar_events (
              project_id, site_visit_id, source_module, legend, starts_at, ends_at, published
            ) VALUES (?, ?, ?, ?, ?, ?, 1)
            RETURNING id`
          )
          .bind(
            payload.projectId,
            payload.siteVisitId || null,
            payload.sourceModule,
            payload.legend || 'Calendar Event',
            payload.startsAt,
            payload.endsAt || payload.startsAt + 3600
          )
          .first<{ id: number }>();

        if (!result) {
          return respondJSON({ error: 'Failed to create calendar event' }, { status: 500 });
        }
        calendarEventId = result.id;
      }

      // Fetch and return the created/updated event
      const event = await env.DB
        .prepare(
          `SELECT ce.*, p.name AS project_name, p.category, sv.visit_type
           FROM calendar_events ce
           JOIN projects p ON p.id = ce.project_id
           LEFT JOIN site_visits sv ON sv.id = ce.site_visit_id
           WHERE ce.id = ?`
        )
        .bind(calendarEventId)
        .first<Record<string, unknown>>();

      return respondJSON(event);
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/attendance$/,
    handler: async ({ env, request }) => {
      await ensureResourceTable(env.DB);
      const { searchParams } = new URL(request.url);
      const resourceId = Number(searchParams.get('userId'));
      if (Number.isNaN(resourceId)) {
        return respondJSON({ error: 'INVALID_USER_ID', message: 'userId is required' }, { status: 400 });
      }

      // Get resource to find corresponding user
      const resource = await env.DB.prepare('SELECT id, email FROM resources WHERE id = ?')
        .bind(resourceId)
        .first();

      if (!resource) {
        return respondJSON({ error: 'USER_NOT_FOUND', message: `Resource with id ${resourceId} not found` }, { status: 404 });
      }

      // Get or create corresponding user record
      let user = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
        .bind(resource.email)
        .first();

      let userId: number;
      if (!user) {
        // Create user record if it doesn't exist
        const insertResult = await env.DB.prepare(
          `INSERT INTO users (email, full_name, status, created_at)
           VALUES (?, ?, 'active', ?)`
        )
          .bind(resource.email, '', Math.floor(Date.now() / 1000))
          .run();
        userId = Number(insertResult.meta.last_row_id);
      } else {
        userId = Number(user.id);
      }

      const moduleScopeParam = searchParams.get('moduleScope');
      const moduleScope = moduleScopeParam ? ensureModuleScope(moduleScopeParam) : null;
      const records = await listAttendanceRecords(env.DB, { userId, moduleScope });
      return respondJSON(records);
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/attendance\/all\/?$/,
    handler: async ({ env, request }) => {
      await ensureResourceTable(env.DB);
      const { searchParams } = new URL(request.url);
      const fromTs = searchParams.get('from') ? Number(searchParams.get('from')) : null;
      const toTs = searchParams.get('to') ? Number(searchParams.get('to')) : null;

      let where = '1=1';
      const bindings: (number | string)[] = [];
      if (fromTs != null && !Number.isNaN(fromTs)) {
        where += ' AND ar.check_in >= ?';
        bindings.push(fromTs);
      }
      if (toTs != null && !Number.isNaN(toTs)) {
        where += ' AND ar.check_in <= ?';
        bindings.push(toTs);
      }

      const rows = await env.DB.prepare(
        `SELECT ar.id, ar.user_id, ar.module_scope, ar.check_in, ar.check_out, ar.notes,
                u.email, u.full_name AS user_full_name,
                r.id AS resource_id, r.full_name AS resource_full_name
         FROM attendance_records ar
         JOIN users u ON u.id = ar.user_id
         LEFT JOIN resources r ON r.email = u.email
         WHERE ${where}
         ORDER BY ar.check_in DESC
         LIMIT 2000`
      )
        .bind(...bindings)
        .all();

      const results = (rows.results ?? []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        resourceId: row.resource_id,
        resourceName: row.resource_full_name || row.user_full_name || row.email || 'Unknown',
        email: row.email,
        moduleScope: row.module_scope,
        checkIn: row.check_in,
        checkOut: row.check_out,
        notes: row.notes,
      }));
      return respondJSON(results);
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/calendars\/onfield$/,
    handler: async ({ env, request }) => {
      const { searchParams } = new URL(request.url);
      const fromTs = Number(searchParams.get('from'));
      const toTs = Number(searchParams.get('to'));
      const userId = searchParams.get('userId') ? Number(searchParams.get('userId')) : null;

      console.log('Fetching On-Field calendar events:', {
        fromTs,
        toTs,
        userId,
        fromDate: fromTs ? new Date(fromTs * 1000).toISOString() : null,
        toDate: toTs ? new Date(toTs * 1000).toISOString() : null,
      });

      // First, check all calendar events with source_module = 'onfield' regardless of date
      const allOnFieldEvents = await env.DB
        .prepare(`SELECT ce.*, p.name AS project_name, p.category, sv.visit_type
         FROM calendar_events ce
         JOIN projects p ON p.id = ce.project_id
         LEFT JOIN site_visits sv ON sv.id = ce.site_visit_id
         WHERE ce.source_module = 'onfield' AND ce.published = 1
         AND (? IS NULL OR (
           json_extract(COALESCE(p.project_details_json, '{}'), '$.assigneeId') IS NOT NULL
           AND COALESCE(json_array_length(json_extract(COALESCE(p.project_details_json, '{}'), '$.assigneeId')), 0) > 0
           AND EXISTS (
             SELECT 1 FROM json_each(json_extract(COALESCE(p.project_details_json, '{}'), '$.assigneeId'))
             WHERE CAST(value AS TEXT) = CAST(? AS TEXT)
           )
         ))
         ORDER BY ce.starts_at ASC`)
        .bind(userId || null, userId ? String(userId) : null)
        .all<Record<string, unknown>>();

      console.log(`Total On-Field calendar events (all time) for user ${userId || 'all'}: ${allOnFieldEvents.results.length}`);

      const events = await fetchCalendarEvents(env.DB, {
        sourceModule: 'onfield',
        fromTs: Number.isNaN(fromTs) ? null : fromTs,
        toTs: Number.isNaN(toTs) ? null : toTs,
        userId: Number.isNaN(userId as any) ? null : userId,
      });

      console.log(`Found ${events.length} calendar events for On-Field module (filtered by date range)`);
      if (events.length > 0) {
        console.log('Filtered events:', events.slice(0, 5).map(e => ({
          id: e.id,
          legend: e.legend,
          project_name: e.project_name,
          category: e.category,
          starts_at: e.starts_at,
          starts_at_date: e.starts_at ? new Date(Number(e.starts_at) * 1000).toISOString() : null,
        })));
      }

      return respondJSON(events);
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/debug\/retailer-site-inspections$/,
    handler: async ({ env }) => {
      // Find all retailer projects with site_inspection job type
      const projects = await env.DB
        .prepare(`
          SELECT 
            p.id,
            p.name,
            p.category,
            p.project_details_json,
            pbc.metadata_json as card_metadata,
            sv.id as site_visit_id,
            sv.visit_type,
            sv.scheduled_start,
            sv.scheduled_end,
            ce.id as calendar_event_id,
            ce.source_module,
            ce.legend,
            ce.starts_at,
            ce.published
          FROM projects p
          LEFT JOIN project_board_cards pbc ON pbc.project_id = p.id
          LEFT JOIN site_visits sv ON sv.project_id = p.id AND sv.visit_type = 'retailer'
          LEFT JOIN calendar_events ce ON ce.project_id = p.id AND ce.source_module = 'onfield'
          WHERE p.category = 'retailer'
          ORDER BY p.id DESC
          LIMIT 50
        `)
        .all<Record<string, unknown>>();

      return respondJSON({
        total: projects.results.length,
        projects: projects.results.map(p => ({
          projectId: p.id,
          projectName: p.name,
          category: p.category,
          jobType: p.card_metadata ? JSON.parse(String(p.card_metadata)).jobType : null,
          scheduledDate: p.card_metadata ? JSON.parse(String(p.card_metadata)).scheduledDate : null,
          scheduledTime: p.card_metadata ? JSON.parse(String(p.card_metadata)).scheduledTime : null,
          hasSiteVisit: !!p.site_visit_id,
          siteVisitId: p.site_visit_id,
          siteVisitScheduledStart: p.scheduled_start,
          siteVisitScheduledStartDate: p.scheduled_start ? new Date(Number(p.scheduled_start) * 1000).toISOString() : null,
          hasCalendarEvent: !!p.calendar_event_id,
          calendarEventId: p.calendar_event_id,
          calendarEventSourceModule: p.source_module,
          calendarEventLegend: p.legend,
          calendarEventStartsAt: p.starts_at,
          calendarEventStartsAtDate: p.starts_at ? new Date(Number(p.starts_at) * 1000).toISOString() : null,
          calendarEventPublished: p.published,
        })),
      });
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/debug\/backfill-calendar-events$/,
    handler: async ({ env, request }) => {
      const body = await parseJSON(request);
      const projectId = body?.projectId ? Number(body.projectId) : null;
      const projectName = body?.projectName;

      console.log('Backfill calendar event request:', { projectId, projectName });

      // If projectName is provided, find the project by name
      let project;
      if (projectName && !projectId) {
        const projects = await env.DB
          .prepare(`
            SELECT 
              p.id,
              p.name,
              p.category,
              pbc.metadata_json as card_metadata,
              sv.id as site_visit_id,
              sv.scheduled_start,
              sv.scheduled_end,
              ce.id as calendar_event_id
            FROM projects p
            LEFT JOIN project_board_cards pbc ON pbc.project_id = p.id
            LEFT JOIN site_visits sv ON sv.project_id = p.id AND sv.visit_type = 'retailer'
            LEFT JOIN calendar_events ce ON ce.project_id = p.id AND ce.source_module = 'onfield'
            WHERE p.category = 'retailer' AND p.name LIKE ?
            ORDER BY p.id DESC
            LIMIT 1
          `)
          .bind(`%${projectName}%`)
          .all<Record<string, unknown>>();

        if (projects.results.length > 0) {
          project = projects.results[0];
        }
      } else if (projectId) {
        project = await env.DB
          .prepare(`
            SELECT 
              p.id,
              p.name,
              p.category,
              pbc.metadata_json as card_metadata,
              sv.id as site_visit_id,
              sv.scheduled_start,
              sv.scheduled_end,
              ce.id as calendar_event_id
            FROM projects p
            LEFT JOIN project_board_cards pbc ON pbc.project_id = p.id
            LEFT JOIN site_visits sv ON sv.project_id = p.id AND sv.visit_type = 'retailer'
            LEFT JOIN calendar_events ce ON ce.project_id = p.id AND ce.source_module = 'onfield'
            WHERE p.id = ? AND p.category = 'retailer'
          `)
          .bind(projectId)
          .first<Record<string, unknown>>();
      }

      if (!project) {
        return respondJSON({
          error: 'PROJECT_NOT_FOUND',
          message: projectName ? `No retailer project found with name containing "${projectName}"` : `No retailer project found with ID ${projectId}`,
        }, { status: 404 });
      }

      const projectIdNum = Number(project.id);
      const cardMetadata = project.card_metadata ? safeParse(project.card_metadata) : {};
      const projectDetails = project.project_details_json ? safeParse(project.project_details_json) : {};
      const jobType = cardMetadata.jobType;
      const scheduledDate = cardMetadata.scheduledDate || projectDetails.scheduledDate;

      console.log('Project found:', {
        projectId: projectIdNum,
        projectName: project.name,
        jobType,
        scheduledDate,
        hasSiteVisit: !!project.site_visit_id,
        hasCalendarEvent: !!project.calendar_event_id,
      });

      if (jobType !== 'site_inspection' || !scheduledDate) {
        return respondJSON({
          error: 'INVALID_PROJECT_TYPE',
          message: 'Project must be a site_inspection type with a scheduledDate',
          jobType,
          hasScheduledDate: !!scheduledDate,
          cardMetadata,
        }, { status: 400 });
      }

      const scheduledTime = cardMetadata.scheduledTime || (project.project_details_json ? safeParse(project.project_details_json)?.scheduledTime : null) || '09:00';

      // Convert date to YYYY-MM-DD format if needed (handle DD/MM/YYYY, MM/DD/YYYY, etc.)
      let normalizedDate = scheduledDate;
      if (typeof scheduledDate === 'string') {
        // If already in YYYY-MM-DD format, use it
        if (/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
          normalizedDate = scheduledDate;
        } else {
          // Try to parse other formats (DD/MM/YYYY, MM/DD/YYYY, etc.)
          try {
            // Handle DD/MM/YYYY format explicitly
            const ddmmyyyyMatch = scheduledDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (ddmmyyyyMatch) {
              const [, day, month, year] = ddmmyyyyMatch;
              normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              console.log('Backfill: Converted DD/MM/YYYY format:', { from: scheduledDate, to: normalizedDate });
            } else {
              // Try standard Date parsing for other formats
              const parsed = new Date(scheduledDate);
              if (!isNaN(parsed.getTime())) {
                const year = parsed.getFullYear();
                const month = String(parsed.getMonth() + 1).padStart(2, '0');
                const day = String(parsed.getDate()).padStart(2, '0');
                normalizedDate = `${year}-${month}-${day}`;
                console.log('Backfill: Converted date format:', { from: scheduledDate, to: normalizedDate });
              } else {
                console.error('Backfill: Could not parse date:', scheduledDate);
                return respondJSON({
                  error: 'INVALID_DATE',
                  message: `Could not parse scheduledDate: ${scheduledDate}`,
                  scheduledDate,
                }, { status: 400 });
              }
            }
          } catch (parseError) {
            console.error('Backfill: Date parsing error:', parseError);
            return respondJSON({
              error: 'INVALID_DATE',
              message: `Invalid date format: ${scheduledDate}. Expected YYYY-MM-DD or parseable date string`,
              scheduledDate,
            }, { status: 400 });
          }
        }
      } else {
        return respondJSON({
          error: 'INVALID_DATE',
          message: `scheduledDate is not a string: ${typeof scheduledDate}`,
          scheduledDate,
        }, { status: 400 });
      }

      const scheduledStart = toUnixTimestamp(normalizedDate, scheduledTime);
      const scheduledEnd = scheduledStart ? scheduledStart + 3600 : null;

      console.log('Backfill: Date conversion:', {
        originalDate: scheduledDate,
        normalizedDate,
        scheduledTime,
        scheduledStart,
        scheduledStartDate: scheduledStart ? new Date(scheduledStart * 1000).toISOString() : null,
      });

      if (!scheduledStart) {
        return respondJSON({
          error: 'INVALID_DATE',
          message: 'Could not parse scheduledDate and scheduledTime',
          originalDate: scheduledDate,
          normalizedDate,
          scheduledTime,
        }, { status: 400 });
      }

      // Create or update site visit
      let siteVisitId = project.site_visit_id ? Number(project.site_visit_id) : null;

      if (!siteVisitId) {
        try {
          const siteVisitResult = await env.DB
            .prepare(
              `INSERT INTO site_visits (
                project_id, visit_type, status, scheduled_start, scheduled_end
              ) VALUES (?, 'retailer', 'scheduled', ?, ?)
              RETURNING id`
            )
            .bind(projectIdNum, scheduledStart, scheduledEnd)
            .first<{ id: number }>();

          if (siteVisitResult) {
            siteVisitId = siteVisitResult.id;
            console.log('Created site visit:', siteVisitId);
          }
        } catch (error) {
          console.error('Error creating site visit:', error);
          return respondJSON({
            error: 'FAILED_TO_CREATE_SITE_VISIT',
            message: error instanceof Error ? error.message : 'Unknown error',
          }, { status: 500 });
        }
      } else {
        // Update existing site visit
        try {
          await env.DB
            .prepare(`UPDATE site_visits SET scheduled_start = ?, scheduled_end = ? WHERE id = ?`)
            .bind(scheduledStart, scheduledEnd, siteVisitId)
            .run();
          console.log('Updated site visit:', siteVisitId);
        } catch (error) {
          console.error('Error updating site visit:', error);
        }
      }

      if (!siteVisitId) {
        return respondJSON({ error: 'FAILED_TO_CREATE_SITE_VISIT' }, { status: 500 });
      }

      // Create or update calendar event
      const existingEventId = project.calendar_event_id ? Number(project.calendar_event_id) : null;

      if (existingEventId) {
        // Update existing calendar event
        try {
          await env.DB
            .prepare(
              `UPDATE calendar_events 
               SET site_visit_id = ?, legend = 'Site Inspection (Retailer)', starts_at = ?, ends_at = ?, published = 1
               WHERE id = ?`
            )
            .bind(siteVisitId, scheduledStart, scheduledEnd, existingEventId)
            .run();

          console.log('Updated calendar event:', existingEventId);
          return respondJSON({
            success: true,
            message: 'Calendar event updated',
            calendarEventId: existingEventId,
            projectId: projectIdNum,
            projectName: project.name,
            siteVisitId,
            startsAt: scheduledStart,
            startsAtDate: new Date(scheduledStart * 1000).toISOString(),
          });
        } catch (error) {
          console.error('Error updating calendar event:', error);
          return respondJSON({
            error: 'FAILED_TO_UPDATE_CALENDAR_EVENT',
            message: error instanceof Error ? error.message : 'Unknown error',
          }, { status: 500 });
        }
      } else {
        // Create new calendar event
        try {
          const calendarEventResult = await env.DB
            .prepare(
              `INSERT INTO calendar_events (
                project_id, site_visit_id, source_module, legend, starts_at, ends_at, published
              ) VALUES (?, ?, 'onfield', 'Site Inspection (Retailer)', ?, ?, 1)
              RETURNING id`
            )
            .bind(projectIdNum, siteVisitId, scheduledStart, scheduledEnd)
            .first<{ id: number }>();

          if (calendarEventResult) {
            console.log('Created calendar event:', calendarEventResult.id);
            return respondJSON({
              success: true,
              message: 'Calendar event created',
              calendarEventId: calendarEventResult.id,
              projectId: projectIdNum,
              projectName: project.name,
              siteVisitId,
              startsAt: scheduledStart,
              startsAtDate: new Date(scheduledStart * 1000).toISOString(),
            });
          } else {
            return respondJSON({ error: 'FAILED_TO_CREATE_CALENDAR_EVENT', message: 'No ID returned from insert' }, { status: 500 });
          }
        } catch (error) {
          console.error('Error creating calendar event:', error);
          return respondJSON({
            error: 'FAILED_TO_CREATE_CALENDAR_EVENT',
            message: error instanceof Error ? error.message : 'Unknown error',
          }, { status: 500 });
        }
      }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/debug\/backfill-retailer-site-inspections$/,
    handler: async ({ env }) => {
      try {
        // Find site visits that have retailer forms
        const visitRows = await env.DB
          .prepare(`SELECT site_visit_id FROM retailer_site_visit_forms`)
          .all<{ site_visit_id: number }>();

        for (const row of visitRows.results) {
          await env.DB
            .prepare(`UPDATE site_visits SET status = 'completed' WHERE id = ?`)
            .bind(row.site_visit_id)
            .run();
        }

        // Update project_details and card metadata to siteInspectionStatus=completed
        const retailerProjects = await env.DB
          .prepare(`SELECT id, project_details_json FROM projects WHERE category = 'retailer'`)
          .all<{ id: number; project_details_json: string | null }>();

        for (const p of retailerProjects.results) {
          let projectDetails = safeParse(p.project_details_json) ?? {};
          if ((projectDetails as any).siteInspectionStatus !== 'completed') {
            projectDetails = { ...projectDetails, siteInspectionStatus: 'completed' };
            await env.DB
              .prepare(`UPDATE projects SET project_details_json = ? WHERE id = ?`)
              .bind(JSON.stringify(projectDetails), p.id)
              .run();
          }

          const card = await env.DB
            .prepare(
              `SELECT id as card_id, metadata_json
               FROM project_board_cards
               WHERE project_id = ?
               AND board_column_id IN (SELECT id FROM project_board_columns WHERE board_type = 'retailer')
               ORDER BY id DESC
               LIMIT 1`,
            )
            .bind(p.id)
            .first<{ card_id: number; metadata_json: string | null }>();

          if (card?.card_id) {
            let metadata = safeParse(card.metadata_json) ?? {};
            if ((metadata as any).siteInspectionStatus !== 'completed') {
              metadata = { ...metadata, siteInspectionStatus: 'completed' };
              await env.DB
                .prepare(`UPDATE project_board_cards SET metadata_json = ? WHERE id = ?`)
                .bind(JSON.stringify(metadata), card.card_id)
                .run();
            }
          }
        }

        return respondJSON({ ok: true, updatedProjects: retailerProjects.results.length });
      } catch (error) {
        console.error('Error in backfill-retailer-site-inspections:', error);
        return respondJSON({ error: 'BACKFILL_FAILED', message: String(error) }, { status: 500 });
      }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/debug\/retailer-mark-completed$/,
    handler: async ({ env }) => {
      try {
        // Mark all retailer site visits as completed
        await env.DB.prepare(`UPDATE site_visits SET status = 'completed' WHERE visit_type = 'retailer'`).run();

        // Set project_details_json.siteInspectionStatus = completed for retailer projects
        const projects = await env.DB
          .prepare(`SELECT id, project_details_json FROM projects WHERE category = 'retailer'`)
          .all<{ id: number; project_details_json: string | null }>();

        for (const p of projects.results) {
          let details = safeParse(p.project_details_json) ?? {};
          (details as any).siteInspectionStatus = 'completed';
          await env.DB
            .prepare(`UPDATE projects SET project_details_json = ? WHERE id = ?`)
            .bind(JSON.stringify(details), p.id)
            .run();
        }

        // Update card metadata for retailer board cards
        await env.DB
          .prepare(
            `UPDATE project_board_cards
             SET metadata_json = COALESCE(
               json_set(
                 CASE WHEN json_valid(COALESCE(metadata_json, '{}')) THEN metadata_json ELSE '{}' END,
                 '$.siteInspectionStatus', 'completed'
               ), '{}'
             )
             WHERE board_column_id IN (SELECT id FROM project_board_columns WHERE board_type = 'retailer')`,
          )
          .run();

        return respondJSON({ ok: true, updatedProjects: projects.results.length });
      } catch (error) {
        console.error('Error in retailer-mark-completed:', error);
        return respondJSON({ error: 'RETAILER_MARK_FAILED', message: String(error) }, { status: 500 });
      }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/debug\/cleanup-retailer-board$/,
    handler: async ({ env, request }) => {
      const body = await parseJSON(request);
      const projectId = body?.projectId ? Number(body.projectId) : null;

      if (projectId) {
        const keptId = await cleanupProjectBoardCards(env.DB, 'retailer', projectId);
        return respondJSON({ ok: true, board: 'retailer', projectId, keptCardId: keptId });
      }

      await cleanupDuplicateBoardCards(env.DB, 'retailer');
      return respondJSON({ ok: true, board: 'retailer', cleaned: true });
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/debug\/reset-retailer-projects$/,
    handler: async ({ env }) => {
      const summary = await resetRetailerProjects(env.DB);
      // After purge, the next-code endpoint will return PRJ-1 again
      return respondJSON({ ok: true, ...summary });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/projects\/(?<projectId>\d+)\/onfield-inspection$/,
    handler: async ({ env, params }) => {
      const projectId = Number(params.projectId);
      if (Number.isNaN(projectId)) {
        return respondJSON({ error: 'INVALID_PROJECT_ID' }, { status: 400 });
      }
      // Find on-field site visit for this project (either 'electrician' or 'onfield' visit type)
      // Prioritize visits with submitted forms, then by most recent
      const siteVisit = await env.DB
        .prepare(
          `SELECT sv.id, sv.visit_type
           FROM site_visits sv
           LEFT JOIN onfield_site_inspection_forms osif ON osif.site_visit_id = sv.id
           LEFT JOIN retailer_site_visit_forms rsvf ON rsvf.site_visit_id = sv.id
           WHERE sv.project_id = ? 
             AND sv.visit_type IN ('electrician', 'onfield', 'retailer')
           ORDER BY 
             CASE WHEN (osif.submitted_at IS NOT NULL OR rsvf.submitted_at IS NOT NULL) THEN 0 ELSE 1 END,
             sv.created_at DESC
           LIMIT 1`
        )
        .bind(projectId)
        .first<{ id: number; visit_type: string }>();

      if (!siteVisit) {
        return respondJSON({ error: 'NO_ONFIELD_INSPECTION_FOUND' }, { status: 404 });
      }

      // Get the on-field inspection form based on visit type
      let payload: Record<string, any> = {};
      let form: any = null;

      if (siteVisit.visit_type === 'retailer') {
        form = await env.DB
          .prepare(
            `SELECT 
              customer_info_json,
              system_info_json,
              property_info_json,
              roof_assessment_json,
              additional_fields_json,
              submitted_at,
              sv.project_id,
              sv.status as visit_status,
              sv.scheduled_start,
              sv.scheduled_end
             FROM retailer_site_visit_forms rsvf
             JOIN site_visits sv ON sv.id = rsvf.site_visit_id
             WHERE rsvf.site_visit_id = ?`
          )
          .bind(siteVisit.id)
          .first();

        if (form) {
          const rawPayload = safeParse(form.customer_info_json) || {};
          payload = {
            ...rawPayload,
            notesAndRecommendations: rawPayload.notesAndRecommendations || rawPayload.notes || {},
            // support nested structures from retailer form
            ...(safeParse(form.additional_fields_json) || {})
          };
          // Ensure notes are mapped correctly if they were in additionalFields
          if (payload.notes && !payload.notesAndRecommendations) {
            payload.notesAndRecommendations = payload.notes;
          }
        }
      } else {
        form = await env.DB
          .prepare(
            `SELECT 
              osif.*,
              sv.project_id,
              sv.status as visit_status,
              sv.scheduled_start,
              sv.scheduled_end
             FROM onfield_site_inspection_forms osif
             JOIN site_visits sv ON sv.id = osif.site_visit_id
             WHERE osif.site_visit_id = ?`
          )
          .bind(siteVisit.id)
          .first<Record<string, unknown>>();

        if (form) {
          payload = safeParse(form.customer_info_json) as Record<string, unknown>;
        }
      }

      if (!form) {
        return respondJSON({ error: 'NO_ONFIELD_FORM_FOUND' }, { status: 404 });
      }

      return respondJSON({
        siteVisitId: siteVisit.id,
        projectId: form.project_id,
        visitStatus: form.visit_status,
        scheduledStart: form.scheduled_start,
        scheduledEnd: form.scheduled_end,
        submittedAt: form.submitted_at,
        siteInfo: (payload.siteInfo || {}) as Record<string, unknown>,
        customerInfo: (payload.customerInfo || {}) as Record<string, unknown>,
        systemInfo: (payload.systemInfo || {}) as Record<string, unknown>,
        propertyInfo: (payload.propertyInfo || {}) as Record<string, unknown>,
        energyInfo: (payload.energyInfo || {}) as Record<string, unknown>,
        safetyAssessment: (payload.safetyAssessment || {}) as Record<string, unknown>,
        electrical: (payload.electrical || {}),
        roofAssessment: (payload.roofAssessment || {}) as Record<string, unknown>,
        installationRequirements: (payload.installationRequirements || {}) as Record<string, unknown>,
        notesAndRecommendations: (payload.notesAndRecommendations || {}) as Record<string, unknown>,
        safetyReminders: (Array.isArray(payload.safetyReminders) ? payload.safetyReminders : []) as string[],
        installationChecklist: (Array.isArray(payload.installationChecklist) ? payload.installationChecklist : []) as string[],
        photos: (Array.isArray(payload.photos) ? payload.photos : []) as Array<Record<string, unknown>>,
      });
    },
  },

  {
    method: 'GET',
    pattern: /^\/api\/onfield\/site-visits\/(?<siteVisitId>\d+)$/,
    handler: async ({ env, params }) => {
      const siteVisitId = Number(params.siteVisitId);
      if (Number.isNaN(siteVisitId)) {
        return respondJSON({ error: 'INVALID_SITE_VISIT_ID' }, { status: 400 });
      }

      // Determine visit type
      const siteVisit = await env.DB
        .prepare(
          `SELECT id, project_id, status as visit_status, scheduled_start, scheduled_end, visit_type
           FROM site_visits
           WHERE id = ?`,
        )
        .bind(siteVisitId)
        .first<{ id: number; project_id: number; visit_status: string; scheduled_start: number | null; scheduled_end: number | null; visit_type: string }>();

      if (!siteVisit) {
        return respondJSON({ error: 'NO_ONFIELD_FORM_FOUND' }, { status: 404 });
      }

      const visitType = (siteVisit.visit_type || '').toLowerCase();

      if (visitType === 'retailer') {
        const form = await env.DB
          .prepare(
            `SELECT 
              customer_info_json,
              system_info_json,
              property_info_json,
              roof_assessment_json,
              additional_fields_json,
              submitted_at
             FROM retailer_site_visit_forms
             WHERE site_visit_id = ?`
          )
          .bind(siteVisitId)
          .first<{
            customer_info_json: string | null;
            system_info_json: string | null;
            property_info_json: string | null;
            roof_assessment_json: string | null;
            additional_fields_json: string | null;
            submitted_at: number | null;
          }>();

        if (!form) {
          return respondJSON({ error: 'NO_ONFIELD_FORM_FOUND' }, { status: 404 });
        }

        const payload =
          safeParse(form.customer_info_json) ||
          safeParse(form.system_info_json) ||
          safeParse(form.property_info_json) ||
          safeParse(form.roof_assessment_json) ||
          safeParse(form.additional_fields_json) ||
          {};

        return respondJSON({
          siteVisitId,
          projectId: siteVisit.project_id,
          visitStatus: siteVisit.visit_status,
          scheduledStart: siteVisit.scheduled_start,
          scheduledEnd: siteVisit.scheduled_end,
          submittedAt: form.submitted_at,
          siteInfo: payload.siteInfo || {},
          customerInfo: payload.customerInfo || {},
          systemInfo: payload.systemInfo || {},
          propertyInfo: payload.propertyInfo || {},
          energyInfo: payload.energyInfo || {},
          safetyAssessment: payload.safetyAssessment || {},
          electrical: payload.electrical || {},
          roofAssessment: payload.roofAssessment || {},
          installationRequirements: payload.installationRequirements || {},
          notesAndRecommendations: payload.notesAndRecommendations || payload.notes || {},
          safetyReminders: Array.isArray(payload.safetyReminders) ? payload.safetyReminders : [],
          installationChecklist: Array.isArray(payload.installationChecklist) ? payload.installationChecklist : [],
          photos: Array.isArray(payload.photos) ? payload.photos : [],
          salesNotes: payload.salesNotes || {},
        });
      }

      // Default: on-field inspection form
      const form = await env.DB
        .prepare(
          `SELECT 
            osif.*,
            sv.project_id,
            sv.status as visit_status,
            sv.scheduled_start,
            sv.scheduled_end
           FROM onfield_site_inspection_forms osif
           JOIN site_visits sv ON sv.id = osif.site_visit_id
           WHERE osif.site_visit_id = ?`
        )
        .bind(siteVisitId)
        .first<Record<string, unknown>>();

      if (!form) {
        return respondJSON({ error: 'NO_ONFIELD_FORM_FOUND' }, { status: 404 });
      }

      const payload = safeParse(form.customer_info_json) as Record<string, unknown>;

      return respondJSON({
        siteVisitId: siteVisitId,
        projectId: form.project_id,
        visitStatus: form.visit_status,
        scheduledStart: form.scheduled_start,
        scheduledEnd: form.scheduled_end,
        submittedAt: form.submitted_at,
        siteInfo: (payload.siteInfo || {}) as Record<string, unknown>,
        customerInfo: (payload.customerInfo || {}) as Record<string, unknown>,
        systemInfo: (payload.systemInfo || {}) as Record<string, unknown>,
        propertyInfo: (payload.propertyInfo || {}) as Record<string, unknown>,
        energyInfo: (payload.energyInfo || {}) as Record<string, unknown>,
        safetyAssessment: (payload.safetyAssessment || {}) as Record<string, unknown>,
        electrical: (payload.electrical || {}) as Record<string, unknown>,
        roofAssessment: (payload.roofAssessment || {}) as Record<string, unknown>,
        installationRequirements: (payload.installationRequirements || {}) as Record<string, unknown>,
        notesAndRecommendations: (payload.notesAndRecommendations || {}) as Record<string, unknown>,
        safetyReminders: (Array.isArray(payload.safetyReminders) ? payload.safetyReminders : []) as string[],
        installationChecklist: (Array.isArray(payload.installationChecklist) ? payload.installationChecklist : []) as string[],
        photos: (Array.isArray(payload.photos) ? payload.photos : []) as Array<Record<string, unknown>>,
      });
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/onfield\/site-visits\/(?<siteVisitId>\d+)$/,
    handler: async ({ env, request, params }) => {
      const siteVisitId = Number(params.siteVisitId);
      if (Number.isNaN(siteVisitId)) {
        return respondJSON({ error: 'INVALID_SITE_VISIT_ID' }, { status: 400 });
      }

      // Verify the site visit exists and get project_id
      const siteVisit = await env.DB
        .prepare(`SELECT project_id, visit_type FROM site_visits WHERE id = ?`)
        .bind(siteVisitId)
        .first<{ project_id: number; visit_type: string }>();

      if (!siteVisit) {
        return respondJSON({ error: 'SITE_VISIT_NOT_FOUND' }, { status: 404 });
      }

      // Parse the form data from request body
      const body = await parseJSON(request);
      const form = body?.form || body; // Support both { form: {...} } and direct form object

      if (!form || typeof form !== 'object') {
        return respondJSON({ error: 'INVALID_FORM_DATA' }, { status: 400 });
      }

      // Prepare the full payload - all JSON columns will contain the same full payload
      const fullPayload = {
        siteInfo: form.siteInfo || {},
        safetyAssessment: form.safetyAssessment || {},
        electrical: form.electrical || {},
        roofAssessment: form.roofAssessment || {},
        installationRequirements: form.installationRequirements || {},
        notesAndRecommendations: form.notesAndRecommendations || {},
        installationChecklist: Array.isArray(form.installationChecklist) ? form.installationChecklist : [],
        safetyReminders: Array.isArray(form.safetyReminders) ? form.safetyReminders : [],
        photos: Array.isArray(form.photos) ? form.photos : [],
        customerInfo: form.customerInfo || {},
        systemInfo: form.systemInfo || {},
        propertyInfo: form.propertyInfo || {},
        energyInfo: form.energyInfo || {},
        salesNotes: form.salesNotes || {},
      };

      const payloadJson = JSON.stringify(fullPayload);
      const now = Math.floor(Date.now() / 1000);

      if ((siteVisit.visit_type || '').toLowerCase() === 'retailer') {
        // Save retailer visits in retailer_site_visit_forms (store full payload in each column for compatibility)
        await env.DB
          .prepare(
            `INSERT INTO retailer_site_visit_forms (
              site_visit_id, customer_info_json, system_info_json, property_info_json,
              roof_assessment_json, additional_fields_json, submitted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(site_visit_id) DO UPDATE SET
              customer_info_json = excluded.customer_info_json,
              system_info_json = excluded.system_info_json,
              property_info_json = excluded.property_info_json,
              roof_assessment_json = excluded.roof_assessment_json,
              additional_fields_json = excluded.additional_fields_json,
              submitted_at = excluded.submitted_at`
          )
          .bind(
            siteVisitId,
            payloadJson,
            payloadJson,
            payloadJson,
            payloadJson,
            payloadJson,
            now,
          )
          .run();

        await env.DB
          .prepare(`UPDATE site_visits SET status = 'completed', updated_at = ? WHERE id = ?`)
          .bind(now, siteVisitId)
          .run();
      } else {
        // On-field visit
        await env.DB
          .prepare(
            `INSERT INTO onfield_site_inspection_forms (
              site_visit_id, customer_info_json, system_info_json, property_info_json,
              roof_assessment_json, electrical_json, photos_json, submitted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(site_visit_id) DO UPDATE SET
              customer_info_json = excluded.customer_info_json,
              system_info_json = excluded.system_info_json,
              property_info_json = excluded.property_info_json,
              roof_assessment_json = excluded.roof_assessment_json,
              electrical_json = excluded.electrical_json,
              photos_json = excluded.photos_json,
              submitted_at = excluded.submitted_at`
          )
          .bind(
            siteVisitId,
            payloadJson,
            payloadJson,
            payloadJson,
            payloadJson,
            payloadJson,
            payloadJson,
            now, // Set submitted_at when form is saved from mobile app
          )
          .run();

        // Update the project's onfield_site_inspection_status to 'completed'
        await env.DB
          .prepare(`UPDATE projects SET onfield_site_inspection_status = 'completed' WHERE id = ?`)
          .bind(siteVisit.project_id)
          .run();
      }

      return respondJSON({ ok: true });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/sales\/site-visits$/,
    handler: async ({ env, request }) => {
      const { searchParams } = new URL(request.url);
      const statusParam = searchParams.get('status');
      const status = statusParam === 'draft' || statusParam === 'submitted' ? statusParam : undefined;
      const visits = await listSalesSiteVisits(env.DB, { status });
      return respondJSON(visits);
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/resources$/,
    handler: async ({ env }) => {
      await ensureResourceTable(env.DB);
      const rows = await env.DB.prepare(
        `SELECT id, email, full_name, role, department, module_scope, status, phone, location, skills, joined, current_project,
                pay_type, pay_rate, weekend_rate, training_days, weekly_hours, sick_leave_days, annual_leave_days,
                created_at, updated_at
         FROM resources ORDER BY created_at DESC`,
      ).all();
      const results = (rows.results || []).map((r: any) => ({
        id: r.id,
        email: r.email ?? '',
        full_name: r.full_name ?? '',
        role: r.role ?? '',
        department: r.department ?? '',
        module_scope: r.module_scope ?? '',
        status: r.status ?? 'Active',
        phone: r.phone ?? '',
        location: r.location ?? '',
        skills: r.skills ?? '',
        joined: r.joined ?? '',
        current_project: r.current_project ?? '',
        pay_type: r.pay_type ?? '',
        pay_rate: r.pay_rate ?? '',
        weekend_rate: r.weekend_rate ?? '',
        training_days: r.training_days ?? '',
        weekly_hours: r.weekly_hours ?? '',
        sick_leave_days: r.sick_leave_days ?? '',
        annual_leave_days: r.annual_leave_days ?? '',
        created_at: r.created_at,
        updated_at: r.updated_at,
        employee_id: r.employee_id ?? (r.id != null ? `XTR-${r.id}` : ''),
      }));
      return respondJSON(results);
    },
  },
  // -------- Resources/Auth ----------
  {
    method: 'POST',
    pattern: /^\/api\/resources$/,
    handler: async ({ env, request }) => {
      await ensureResourceTable(env.DB);
      const body = await parseJSON(request);
      const email = String(body.email || '').trim().toLowerCase();
      const fullName = String(body.fullName || body.name || '').trim();
      const role = String(body.role || '').trim();
      const department = String(body.department || '').trim();
      const moduleScope = String(body.moduleScope || deriveModuleScope(role, department)).trim();
      const status = String(body.status || 'Active').trim() || 'Active';
      const password = String(body.password || '').trim();
      const phone = String(body.phone || '').trim();
      const location = String(body.location || '').trim();
      const skills = String(body.skills || '').trim();
      const joined = String(body.joined || '').trim();
      const currentProject = String(body.currentProject || '').trim();
      const payType = String(body.payType || '').trim();
      const payRate = String(body.payRate || '').trim();
      const weekendRate = String(body.weekendRate || '').trim();
      const trainingDays = String(body.trainingDays || '').trim();
      const weeklyHours = String(body.weeklyHours || '').trim();
      const sickLeaveDays = String(body.sickLeaveDays || '').trim();
      const annualLeaveDays = String(body.annualLeaveDays || '').trim();
      if (!email || !password) {
        return respondJSON({ error: 'EMAIL_AND_PASSWORD_REQUIRED' }, { status: 400 });
      }
      const now = Math.floor(Date.now() / 1000);
      const passwordHash = await hashPassword(password);
      try {
        await env.DB
          .prepare(
            `INSERT INTO resources (email, full_name, role, department, module_scope, status, password_hash,
              phone, location, skills, joined, current_project, pay_type, pay_rate, weekend_rate,
              training_days, weekly_hours, sick_leave_days, annual_leave_days, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            email,
            fullName,
            role,
            department,
            moduleScope,
            status,
            passwordHash,
            phone,
            location,
            skills,
            joined,
            currentProject,
            payType,
            payRate,
            weekendRate,
            trainingDays,
            weeklyHours,
            sickLeaveDays,
            annualLeaveDays,
            now,
            now,
          )
          .run();
        const res = await env.DB.prepare('SELECT * FROM resources WHERE email = ?').bind(email).first();
        return respondJSON({ ok: true, resource: res });
      } catch (err: any) {
        return respondJSON({ error: 'CREATE_FAILED', message: err?.message || 'Failed to create resource' }, { status: 500 });
      }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/resources\/set-password$/,
    handler: async ({ env, request }) => {
      await ensureResourceTable(env.DB);
      const body = await parseJSON(request);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '').trim();
      if (!email || !password) {
        return respondJSON({ error: 'EMAIL_AND_PASSWORD_REQUIRED' }, { status: 400 });
      }
      const res = await env.DB.prepare('SELECT * FROM resources WHERE email = ?').bind(email).first();
      if (!res) return respondJSON({ error: 'NOT_FOUND' }, { status: 404 });
      const hash = await hashPassword(password);
      const now = Math.floor(Date.now() / 1000);
      await env.DB
        .prepare('UPDATE resources SET password_hash = ?, updated_at = ? WHERE email = ?')
        .bind(hash, now, email)
        .run();
      return respondJSON({ ok: true });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/resources\/(?<resourceId>\d+)$/,
    handler: async ({ env, params }) => {
      await ensureResourceTable(env.DB);
      const id = Number(params.resourceId);
      if (!id) return respondJSON({ error: 'INVALID_ID' }, { status: 400 });
      const res = await env.DB.prepare('SELECT id, email, full_name, role, department, module_scope, status, created_at, updated_at FROM resources WHERE id = ?')
        .bind(id)
        .first();
      if (!res) return respondJSON({ error: 'NOT_FOUND' }, { status: 404 });
      return respondJSON(res);
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/resources\/(?<resourceId>\d+)$/,
    handler: async ({ env, request, params }) => {
      await ensureResourceTable(env.DB);
      const id = Number(params.resourceId);
      if (!id) return respondJSON({ error: 'INVALID_ID' }, { status: 400 });
      const body = await parseJSON(request);
      const res = await env.DB.prepare('SELECT * FROM resources WHERE id = ?').bind(id).first();
      if (!res) return respondJSON({ error: 'NOT_FOUND' }, { status: 404 });
      const email = body.email !== undefined ? String(body.email || '').trim().toLowerCase() : res.email;
      const fullName = body.fullName !== undefined ? String(body.fullName || '').trim() : res.full_name;
      const role = body.role !== undefined ? String(body.role || '').trim() : (res.role as string | undefined);
      const department = body.department !== undefined ? String(body.department || '').trim() : (res.department as string | undefined);
      const moduleScope = body.moduleScope ? String(body.moduleScope).trim() : deriveModuleScope(role, department);
      const status = body.status !== undefined ? (String(body.status || '').trim() || 'Active') : (res.status as string | undefined) || 'Active';
      const phone = body.phone !== undefined ? String(body.phone || '').trim() : res.phone;
      const location = body.location !== undefined ? String(body.location || '').trim() : res.location;
      const skills = body.skills !== undefined ? String(body.skills || '').trim() : res.skills;
      const joined = body.joined !== undefined ? String(body.joined || '').trim() : res.joined;
      const currentProject = body.currentProject !== undefined ? String(body.currentProject || '').trim() : res.current_project;
      const payType = body.payType !== undefined ? String(body.payType || '').trim() : res.pay_type;
      const payRate = body.payRate !== undefined ? String(body.payRate || '').trim() : res.pay_rate;
      const weekendRate = body.weekendRate !== undefined ? String(body.weekendRate || '').trim() : res.weekend_rate;
      const trainingDays = body.trainingDays !== undefined ? String(body.trainingDays || '').trim() : res.training_days;
      const weeklyHours = body.weeklyHours !== undefined ? String(body.weeklyHours || '').trim() : res.weekly_hours;
      const sickLeaveDays = body.sickLeaveDays !== undefined ? String(body.sickLeaveDays || '').trim() : res.sick_leave_days;
      const annualLeaveDays = body.annualLeaveDays !== undefined ? String(body.annualLeaveDays || '').trim() : res.annual_leave_days;
      let passwordHash = res.password_hash;
      if (body.password) {
        passwordHash = await hashPassword(String(body.password));
      }
      const now = Math.floor(Date.now() / 1000);
      await env.DB
        .prepare(
          `UPDATE resources
           SET email = ?, full_name = ?, role = ?, department = ?, module_scope = ?, status = ?, password_hash = ?,
               phone = ?, location = ?, skills = ?, joined = ?, current_project = ?,
               pay_type = ?, pay_rate = ?, weekend_rate = ?, training_days = ?, weekly_hours = ?,
               sick_leave_days = ?, annual_leave_days = ?, updated_at = ?
           WHERE id = ?`,
        )
        .bind(
          email,
          fullName,
          role,
          department,
          moduleScope,
          status,
          passwordHash,
          phone,
          location,
          skills,
          joined,
          currentProject,
          payType,
          payRate,
          weekendRate,
          trainingDays,
          weeklyHours,
          sickLeaveDays,
          annualLeaveDays,
          now,
          id,
        )
        .run();
      const updated = await env.DB.prepare(
        `SELECT id, email, full_name, role, department, module_scope, status, phone, location, skills, joined, current_project,
                pay_type, pay_rate, weekend_rate, training_days, weekly_hours, sick_leave_days, annual_leave_days,
                created_at, updated_at
         FROM resources WHERE id = ?`,
      )
        .bind(id)
        .first();
      return respondJSON({ ok: true, resource: updated });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/reimbursements$/,
    handler: async ({ env }) => {
      await ensureReimbursementsTable(env.DB);
      const rows = await env.DB.prepare('SELECT * FROM reimbursements ORDER BY created_at DESC').all();
      return respondJSON(rows.results || []);
    }
  }
  ,
  {
    method: 'POST',
    pattern: /^\/api\/reimbursements$/,
    handler: async ({ env, request }) => {
      await ensureReimbursementsTable(env.DB);

      const body = await parseJSON(request);
      const now = Math.floor(Date.now() / 1000);

      // Normalize inputs (no undefined)
      const name = String(body?.name ?? '').trim();
      const description = String(body?.description ?? '').trim();
      const amount = String(body?.amount ?? '').trim();
      const projectName = String(body?.projectName ?? '').trim();
      const status = String(body?.status ?? 'Pending').trim();
      const comments = body?.comments !== undefined ? String(body.comments ?? '').trim() : '';
      const senderName = body?.senderName !== undefined && body.senderName !== null
        ? String(body.senderName).trim()
        : null;

      // Debug (keep while testing, then remove)
      console.log('reimburse INSERT args', {
        name, description, amount, projectName, status, comments, senderName, now1: now, now2: now
      });

      // Args array — guarantee no `undefined`
      const args: (string | number | null)[] = [
        name ?? '',
        description ?? '',
        amount ?? '',
        projectName ?? '',
        status ?? 'Pending',
        comments ?? '',
        senderName ?? null, // must be null, not undefined
        now ?? 0,
        now ?? 0,
      ];

      // Early guard (dev)
      const bad = args.findIndex(v => v === undefined);
      if (bad !== -1) {
        return respondJSON(
          { ok: false, error: 'BIND_HAS_UNDEFINED', detail: { index: bad } },
          { status: 400 }
        );
      }

      try {
        // INSERT (columns/placeholders count match = 9)
        const res = await env.DB.prepare(
          `INSERT INTO reimbursements (
           name, description, amount, project_name, status, comments, sender_name, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(...args).run();

        // -------- robust inserted id extraction --------
        const meta: any = (res as any).meta ?? {};
        let insertedId: number | null =
          (res as any).lastRowId
          ?? meta.last_row_id
          ?? meta.last_insert_rowid
          ?? meta.last_rowid
          ?? null;

        // Fallback to SQLite function if meta doesn’t expose the id
        if (insertedId == null) {
          const row = await env.DB
            .prepare('SELECT last_insert_rowid() AS id')
            .first<{ id: number }>();
          insertedId = row?.id ?? null;
        }

        if (insertedId == null) {
          // Surface instead of passing undefined to .bind()
          return respondJSON(
            { ok: false, error: 'INSERT_OK_BUT_NO_ID', detail: res },
            { status: 500 }
          );
        }
        // -----------------------------------------------

        const inserted = await env.DB
          .prepare('SELECT * FROM reimbursements WHERE id = ?')
          .bind(insertedId) // guaranteed non-undefined
          .first();

        return respondJSON({ ok: true, reimbursement: inserted });
      } catch (err) {
        return respondJSON(
          { ok: false, error: 'DB_INSERT_FAILED', detail: String(err) },
          { status: 500 }
        );
      }
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/reimbursements\/(?<reimId>\d+)$/,
    handler: async ({ env, request, params }) => {
      await ensureReimbursementsTable(env.DB);
      const id = Number(params.reimId);
      if (!id) return respondJSON({ error: 'INVALID_ID' }, { status: 400 });
      const existing = await env.DB.prepare('SELECT * FROM reimbursements WHERE id = ?').bind(id).first();
      if (!existing) return respondJSON({ error: 'NOT_FOUND' }, { status: 404 });
      const body = await parseJSON(request);
      const status = body.status ? String(body.status).trim() : existing.status;
      const comments = body.comments !== undefined ? String(body.comments || '').trim() : existing.comments;
      const now = Math.floor(Date.now() / 1000);
      await env.DB
        .prepare('UPDATE reimbursements SET status = ?, comments = ?, updated_at = ? WHERE id = ?')
        .bind(status, comments, now, id)
        .run();
      const updated = await env.DB.prepare('SELECT * FROM reimbursements WHERE id = ?').bind(id).first();
      return respondJSON({ ok: true, reimbursement: updated });
    },
  },

  {
    method: 'POST',
    pattern: /^\/api\/auth\/login$/,
    handler: async ({ env, request }) => {
      await ensureResourceTable(env.DB);
      const body = await parseJSON(request);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '').trim();
      if (!email || !password) return respondJSON({ error: 'EMAIL_AND_PASSWORD_REQUIRED' }, { status: 400 });
      const res = await env.DB.prepare('SELECT * FROM resources WHERE email = ?').bind(email).first();
      if (!res) return respondJSON({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
      if (res.status && String(res.status).toLowerCase() === 'inactive') {
        return respondJSON({ error: 'ACCOUNT_INACTIVE' }, { status: 403 });
      }
      const hash = await hashPassword(password);
      if (hash !== res.password_hash) return respondJSON({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
      return respondJSON({
        ok: true,
        user: {
          id: res.id,
          email: res.email,
          fullName: res.full_name,
          teamId: res.id,
          teamName: res.department || 'Resource',
          moduleScope: res.module_scope || deriveModuleScope(res.role as string | undefined, res.department as string | undefined),
        },
      });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/onfield\/site-visits$/,
    handler: async ({ env, request }) => {
      const { searchParams } = new URL(request.url);
      const statusParam = searchParams.get('status');
      const status = statusParam === 'draft' || statusParam === 'submitted' ? statusParam : undefined;
      const visits = await listOnFieldSiteVisits(env.DB, { status });
      return respondJSON(visits);
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/retailer\/site-visits$/,
    handler: async ({ env, request }) => {
      const { searchParams } = new URL(request.url);
      const statusParam = searchParams.get('status');
      const status = statusParam === 'draft' || statusParam === 'submitted' ? statusParam : undefined;
      const visits = await listRetailerSiteVisits(env.DB, { status });
      return respondJSON(visits);
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/projects\/retailer$/,
    handler: async ({ env, request }) => {
      const body = await parseJSON(request);
      const projectId = await createRetailerProject(env.DB, {
        projectName: body.projectName || 'Untitled Project',
        projectCode: body.projectCode || null,
        customerName: body.customerName || '',
        customerEmail: body.customerEmail || null,
        customerContact: body.customerContact || null,
        customerAddress: body.customerAddress || null,
        jobType: body.jobType, // 'site_inspection', 'stage_one', 'stage_two', 'full_system'
        scheduledDate: body.scheduledDate || null,
        scheduledTime: body.scheduledTime || null,
        notes: body.notes || null,
        systemSnapshot: body.systemSnapshot || null,
        propertySnapshot: body.propertySnapshot || null,
        projectDetails: body.projectDetails || null,
      });

      // If project code was not provided, generate it based on actual project ID
      if (!body.projectCode) {
        const projectCode = `PRJ-${projectId}`;
        await env.DB
          .prepare(`UPDATE projects SET project_details_json = json_set(project_details_json, '$.projectCode', ?) WHERE id = ?`)
          .bind(projectCode, projectId)
          .run();
        return respondJSON({ projectId, projectCode, ok: true });
      }

      return respondJSON({ projectId, ok: true });
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/sales\/site-visits$/,
    handler: async ({ env, request }) => {
      const body = await parseJSON(request);
      const form = body?.form;
      if (typeof body?.projectId !== 'number' || Number.isNaN(body.projectId)) {
        return respondJSON({ error: 'INVALID_PROJECT_ID' }, { status: 400 });
      }
      if (body.status !== 'draft' && body.status !== 'submitted') {
        return respondJSON({ error: 'INVALID_STATUS' }, { status: 400 });
      }
      if (!form || typeof form !== 'object') {
        return respondJSON({ error: 'INVALID_FORM' }, { status: 400 });
      }
      const result = await saveSalesSiteVisit(env.DB, {
        projectId: body.projectId,
        siteVisitId: typeof body.siteVisitId === 'number' ? body.siteVisitId : null,
        status: body.status,
        form,
      });
      return respondJSON(result);
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/leads$/,
    handler: async ({ env, request }) => {
      const body = await parseJSON(request);
      const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
      if (!customerName) {
        return respondJSON({ error: 'CUSTOMER_NAME_REQUIRED' }, { status: 400 });
      }
      const lead = await createLeadWithProject(env.DB, {
        customerName,
        customerEmail: typeof body.customerEmail === 'string' ? body.customerEmail.trim() : null,
        customerContact: typeof body.customerContact === 'string' ? body.customerContact.trim() : null,
        projectName: typeof body.projectName === 'string' ? body.projectName.trim() : customerName,
        systemSize: typeof body.systemSize === 'string' ? body.systemSize.trim() : null,
        systemType: typeof body.systemType === 'string' ? body.systemType.trim() : null,
        notes: typeof body.notes === 'string' ? body.notes.trim() : null,
        source: typeof body.source === 'string' && body.source.trim() ? body.source.trim() : (body.source || 'manual'),
        houseStorey: typeof body.houseStorey === 'string' ? body.houseStorey.trim() : null,
        roofType: typeof body.roofType === 'string' ? body.roofType.trim() : null,
        address: typeof body.address === 'string' ? body.address.trim() : null,
      });
      return respondJSON(lead, { status: 201 });
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/tasks$/,
    handler: async ({ env, request }) => {
      const body = await parseJSON(request);
      const projectId = typeof body.projectId === 'number' ? body.projectId : (typeof body.projectId === 'string' ? parseInt(body.projectId, 10) : null);
      if (!projectId || Number.isNaN(projectId)) {
        return respondJSON({ error: 'INVALID_PROJECT_ID' }, { status: 400 });
      }
      const commentText = typeof body.commentText === 'string' ? body.commentText.trim() : '';
      if (!commentText) {
        return respondJSON({ error: 'COMMENT_TEXT_REQUIRED' }, { status: 400 });
      }
      const commentId = typeof body.commentId === 'number' ? body.commentId : null;
      const createdByEmail = typeof body.createdByEmail === 'string' ? body.createdByEmail.trim() : null;
      const dueAt = typeof body.dueAt === 'number' ? body.dueAt : null;

      const result = await env.DB
        .prepare(
          `INSERT INTO tasks (project_id, comment_text, comment_id, created_by_email, status, due_at)
           VALUES (?, ?, ?, ?, 'pending', ?)
           RETURNING id, project_id, comment_text, comment_id, created_by_email, status, due_at, created_at, updated_at`
        )
        .bind(projectId, commentText, commentId, createdByEmail, dueAt)
        .first<{
          id: number;
          project_id: number;
          comment_text: string;
          comment_id: number | null;
          created_by_email: string | null;
          status: string;
          due_at: number | null;
          created_at: number;
          updated_at: number;
        }>();

      if (!result) {
        return respondJSON({ error: 'FAILED_TO_CREATE_TASK' }, { status: 500 });
      }

      return respondJSON({
        id: result.id,
        projectId: result.project_id,
        commentText: result.comment_text,
        commentId: result.comment_id,
        createdByEmail: result.created_by_email,
        status: result.status,
        dueAt: result.due_at,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      }, { status: 201 });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/tasks$/,
    handler: async ({ env, request }) => {
      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      const query = status && status !== 'all'
        ? `SELECT t.id, t.project_id, t.comment_text, t.comment_id, t.created_by_email, t.status, t.due_at, t.created_at, t.updated_at, p.name as project_name
           FROM tasks t
           LEFT JOIN projects p ON p.id = t.project_id
           WHERE t.status = ?
           ORDER BY t.created_at DESC`
        : `SELECT t.id, t.project_id, t.comment_text, t.comment_id, t.created_by_email, t.status, t.due_at, t.created_at, t.updated_at, p.name as project_name
           FROM tasks t
           LEFT JOIN projects p ON p.id = t.project_id
           ORDER BY t.created_at DESC`;

      const tasks = await (status && status !== 'all'
        ? env.DB.prepare(query).bind(status)
        : env.DB.prepare(query)
      ).all<{
        id: number;
        project_id: number;
        comment_text: string;
        comment_id: number | null;
        created_by_email: string | null;
        status: string;
        due_at: number | null;
        created_at: number;
        updated_at: number;
        project_name?: string;
      }>();

      return respondJSON(tasks.results.map(task => ({
        id: task.id,
        projectId: task.project_id,
        commentText: task.comment_text,
        commentId: task.comment_id,
        createdByEmail: task.created_by_email,
        status: task.status,
        dueAt: task.due_at,
        projectName: task.project_name || `Project #${task.project_id}`,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
      })));
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/tasks\/(?<taskId>\d+)$/,
    handler: async ({ env, params, request }) => {
      const taskId = Number(params.taskId);
      if (Number.isNaN(taskId)) {
        return respondJSON({ error: 'INVALID_TASK_ID' }, { status: 400 });
      }

      const body = await parseJSON(request);
      const status = typeof body.status === 'string' ? body.status.trim() : null;

      if (!status || !['pending', 'completed', 'cancelled'].includes(status)) {
        return respondJSON({ error: 'INVALID_STATUS', message: 'Status must be one of: pending, completed, cancelled' }, { status: 400 });
      }

      const result = await env.DB
        .prepare(
          `UPDATE tasks SET status = ?, updated_at = (strftime('%s', 'now'))
           WHERE id = ?
           RETURNING id, project_id, comment_text, comment_id, created_by_email, status, created_at, updated_at`
        )
        .bind(status, taskId)
        .first<{
          id: number;
          project_id: number;
          comment_text: string;
          comment_id: number | null;
          created_by_email: string | null;
          status: string;
          created_at: number;
          updated_at: number;
        }>();

      if (!result) {
        return respondJSON({ error: 'TASK_NOT_FOUND' }, { status: 404 });
      }

      return respondJSON({
        id: result.id,
        projectId: result.project_id,
        commentText: result.comment_text,
        commentId: result.comment_id,
        createdByEmail: result.created_by_email,
        status: result.status,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      });
    },
  },
  // Removed duplicate catch-all route - it's now at the top of the routes array
  {
    method: 'POST',
    pattern: /^\/api\/projects\/(\d+)\/details\/?$/,
    handler: async ({ env, request, params }) => {
      // This route should never be hit (catch-all at top handles it)
      return respondJSON({ error: 'SHOULD_NOT_HIT_THIS' }, { status: 500 });

      // PERMANENT FIX: Extract projectId using multiple methods for reliability
      // Note: This code is unreachable but kept for reference
      const url = new URL(request.url);
      const pathname = url.pathname;

      // Method 1: Use params from route matcher (most reliable)
      let projectIdStr: string | null = params.projectId || null;

      // Method 2: Extract from URL path directly (fallback)
      if (!projectIdStr) {
        const pathParts = pathname.split('/').filter(Boolean);
        const projectsIndex = pathParts.indexOf('projects');
        if (projectsIndex >= 0 && projectsIndex + 1 < pathParts.length) {
          const candidate = pathParts[projectsIndex + 1];
          if (/^\d+$/.test(candidate)) {
            projectIdStr = candidate;
          }
        }
      }

      // Method 3: Extract from regex match in pathname (last resort)
      if (!projectIdStr) {
        const match = pathname.match(/\/projects\/(\d+)\/details/);
        const matchedId = match?.[1];
        if (matchedId !== undefined) {
          projectIdStr = matchedId || null;
        }
      }

      // Validate projectId
      if (!projectIdStr || !/^\d+$/.test(projectIdStr as string)) {
        return respondJSON({
          error: 'INVALID_PROJECT_ID',
          message: 'Could not extract valid projectId from URL',
          debug: {
            pathname: pathname,
            url: request.url,
            method: request.method,
            params: params,
            extractedProjectId: projectIdStr
          }
        }, { status: 400 });
      }

      const projectId = Number(projectIdStr);
      if (Number.isNaN(projectId) || projectId <= 0) {
        return respondJSON({
          error: 'INVALID_PROJECT_ID',
          message: `ProjectId must be a positive number, got: ${projectIdStr}`,
          debug: {
            projectId: projectId,
            projectIdStr: projectIdStr,
            pathname: pathname,
            params: params
          }
        }, { status: 400 });
      }

      // Log successful extraction for debugging
      console.log('Project details route - extracted projectId:', {
        projectId,
        projectIdStr,
        params: params,
        pathname: pathname,
        method: request.method
      });

      let body;
      try {
        const text = await request.text();
        if (!text) {
          return respondJSON({ error: 'EMPTY_BODY' }, { status: 400 });
        }
        body = JSON.parse(text);
      } catch (err: unknown) {
        let errorMessage = 'Invalid JSON';
        if (err instanceof Error) {
          errorMessage = (err as Error).message;
        } else {
          const errStr = String(err);
          if (errStr !== '[object Object]' && errStr !== 'null' && errStr !== 'undefined') {
            errorMessage = errStr;
          }
        }
        return respondJSON({ error: 'INVALID_JSON', message: errorMessage }, { status: 400 });
      }

      const projectDetailsJson = stringifyOrNull(body.projectDetails ?? {});
      const customerSnapshotJson = stringifyOrNull(body.customerSnapshot ?? {});
      const systemSnapshotJson = stringifyOrNull(body.systemSnapshot ?? {});
      const propertySnapshotJson = stringifyOrNull(body.propertySnapshot ?? {});
      const utilitySnapshotJson = stringifyOrNull(body.utilitySnapshot ?? {});

      const result = await env.DB.prepare(
        `UPDATE projects
         SET project_details_json = COALESCE(?, project_details_json),
             customer_snapshot_json = COALESCE(?, customer_snapshot_json),
             system_snapshot_json = COALESCE(?, system_snapshot_json),
             property_snapshot_json = COALESCE(?, property_snapshot_json),
             utility_snapshot_json = COALESCE(?, utility_snapshot_json),
             updated_at = (strftime('%s','now'))
         WHERE id = ?`,
      )
        .bind(
          projectDetailsJson,
          customerSnapshotJson,
          systemSnapshotJson,
          propertySnapshotJson,
          utilitySnapshotJson,
          projectId,
        )
        .run();

      if (result.meta.changes === 0) {
        return respondJSON({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
      }

      return respondJSON({ ok: true });
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/attendance\/check-in$/,
    handler: async ({ env, request }) => {
      try {
        await ensureResourceTable(env.DB);

        // Ensure users table exists (required for foreign key constraint)
        await env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            full_name TEXT NOT NULL,
            team_id INTEGER,
            status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invited')),
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
          )`
        ).run();

        // ============================================
        // PERMANENT FIX: Remove foreign key constraint
        // ============================================
        // This MUST run before any attendance operations
        // SQLite doesn't support ALTER TABLE DROP CONSTRAINT, so we recreate the table
        try {
          const tableInfo = await env.DB.prepare(
            `SELECT sql FROM sqlite_master WHERE type='table' AND name='attendance_records'`
          ).first();

          const tableSql = tableInfo ? (tableInfo.sql as string) : null;
          const hasForeignKey = tableSql && tableSql.includes('REFERENCES users');

          console.log('Checking attendance_records table structure:', {
            tableExists: !!tableInfo,
            hasForeignKey,
            tableSql: tableSql?.substring(0, 200)
          });

          // ALWAYS fix if foreign key exists, or if table doesn't exist
          if (hasForeignKey || !tableInfo) {
            console.log('Fixing attendance_records table - removing foreign key constraint...');

            // Step 1: Get all existing data
            let existingData: any[] = [];
            if (tableInfo) {
              try {
                const dataResult = await env.DB.prepare(`SELECT * FROM attendance_records`).all();
                existingData = (dataResult.results || []) as any[];
                console.log(`Found ${existingData.length} existing attendance records to preserve`);
              } catch (e) {
                console.log('Could not read existing data (table may be empty):', e);
              }
            }

            // Step 2: Drop old table
            try {
              await env.DB.prepare(`DROP TABLE IF EXISTS attendance_records`).run();
              console.log('Dropped old attendance_records table');
            } catch (dropError: any) {
              console.log('Drop table error (may not exist):', dropError.message);
            }

            // Step 3: Create new table WITHOUT foreign key constraint
            await env.DB.prepare(
              `CREATE TABLE attendance_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                module_scope TEXT NOT NULL CHECK (module_scope IN ('sales', 'onfield', 'project_mgmt', 'operations', 'global')),
                check_in INTEGER NOT NULL,
                check_out INTEGER,
                location_json TEXT,
                notes TEXT
              )`
            ).run();
            console.log('Created new attendance_records table without foreign key constraint');

            // Step 4: Restore existing data
            if (existingData.length > 0) {
              for (const record of existingData) {
                try {
                  await env.DB.prepare(
                    `INSERT INTO attendance_records (id, user_id, module_scope, check_in, check_out, location_json, notes)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`
                  ).bind(
                    record.id,
                    record.user_id,
                    record.module_scope,
                    record.check_in,
                    record.check_out || null,
                    record.location_json || null,
                    record.notes || null
                  ).run();
                } catch (insertError: any) {
                  console.warn('Could not restore record:', insertError.message, record.id);
                }
              }
              console.log(`Restored ${existingData.length} attendance records`);
            }

            // Verify the fix worked
            const verifyTable = await env.DB.prepare(
              `SELECT sql FROM sqlite_master WHERE type='table' AND name='attendance_records'`
            ).first();
            const verifySql = verifyTable ? (verifyTable.sql as string) : '';
            const stillHasForeignKey = verifySql.includes('REFERENCES users');

            if (stillHasForeignKey) {
              console.error('❌ Table still has foreign key after fix attempt!', verifySql);
              throw new Error('Failed to remove foreign key constraint from attendance_records table');
            } else {
              console.log('✅ Successfully fixed attendance_records table - foreign key constraint permanently removed');
            }
          } else {
            console.log('✅ attendance_records table structure is correct (no foreign key constraint)');
          }
        } catch (fixError: any) {
          console.error('❌ CRITICAL: Error fixing attendance_records table:', fixError.message, fixError.stack);
          // Log the error but continue - we'll handle it in the insert with better error messages
          console.warn('⚠️ Table fix failed - foreign key constraint may still exist');
        }

        const body = await parseJSON(request);
        console.log('Check-in request body:', JSON.stringify(body, null, 2));

        if (!body.userId) {
          return respondJSON({ error: 'MISSING_USER_ID', message: 'userId is required' }, { status: 400 });
        }
        if (!body.moduleScope) {
          return respondJSON({ error: 'MISSING_MODULE_SCOPE', message: 'moduleScope is required' }, { status: 400 });
        }

        const resourceId = ensureNumber(body.userId, 'userId');
        const moduleScope = ensureModuleScope(body.moduleScope);
        const checkInTs = typeof body.timestamp === 'number' ? body.timestamp : Math.floor(Date.now() / 1000);

        // Verify the resource exists
        const resource = await env.DB.prepare('SELECT id, email, full_name FROM resources WHERE id = ?')
          .bind(resourceId)
          .first() as { id: number; email: string; full_name: string | null } | null;

        if (!resource) {
          return respondJSON({ error: 'USER_NOT_FOUND', message: `Resource with id ${resourceId} not found` }, { status: 404 });
        }

        // Get or create corresponding user record
        let user = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
          .bind(resource.email)
          .first() as { id: number } | null;

        let userId: number;
        if (!user) {
          // Create user record if it doesn't exist
          try {
            const fullName = resource.full_name || resource.email.split('@')[0] || 'User';
            console.log('Creating user record:', { email: resource.email, fullName });

            const insertResult = await env.DB.prepare(
              `INSERT INTO users (email, full_name, status, created_at)
               VALUES (?, ?, 'active', ?)`
            )
              .bind(resource.email, fullName, Math.floor(Date.now() / 1000))
              .run();

            userId = Number(insertResult.meta.last_row_id);

            if (!userId || Number.isNaN(userId)) {
              console.error('Failed to get user ID after insert:', insertResult);
              return respondJSON(
                { error: 'USER_CREATION_FAILED', message: 'Failed to create user record - no ID returned' },
                { status: 500 },
              );
            }

            // Verify the user was actually created - try multiple times if needed
            let verifyUser = await env.DB.prepare('SELECT id FROM users WHERE id = ?')
              .bind(userId)
              .first();

            // If verification fails, try again after a brief moment (in case of replication delay)
            if (!verifyUser) {
              console.warn('User verification failed, retrying...', { userId, email: resource.email });
              await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
              verifyUser = await env.DB.prepare('SELECT id FROM users WHERE id = ?')
                .bind(userId)
                .first() as { id: number } | null;
            }

            if (!verifyUser) {
              console.error('User verification failed after retry:', { userId, email: resource.email });
              return respondJSON(
                { error: 'USER_VERIFICATION_FAILED', message: 'User record was not created successfully' },
                { status: 500 },
              );
            }

            console.log('Created and verified user record:', { userId, email: resource.email, fullName, verified: !!verifyUser });
          } catch (userCreationError: any) {
            console.error('Error creating user record:', userCreationError);
            // If it's a unique constraint error, try to get the existing user
            if (userCreationError.message && userCreationError.message.includes('UNIQUE')) {
              console.log('User already exists (unique constraint), fetching...');
              const existingUser = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
                .bind(resource.email)
                .first() as { id: number } | null;
              if (existingUser) {
                userId = Number(existingUser.id);
                console.log('Using existing user after unique constraint error:', { userId, email: resource.email });
              } else {
                return respondJSON(
                  { error: 'USER_CREATION_FAILED', message: `Failed to create user: ${userCreationError.message}` },
                  { status: 500 },
                );
              }
            } else {
              return respondJSON(
                { error: 'USER_CREATION_FAILED', message: `Failed to create user: ${userCreationError.message}` },
                { status: 500 },
              );
            }
          }
        } else {
          userId = Number(user.id);
          if (!userId || Number.isNaN(userId)) {
            console.error('Invalid user ID from database:', user);
            return respondJSON(
              { error: 'INVALID_USER_ID', message: 'Invalid user ID retrieved from database' },
              { status: 500 },
            );
          }
          console.log('Using existing user record:', { userId, email: resource.email });
        }

        // Verify userId is valid before inserting
        if (!userId || Number.isNaN(userId)) {
          return respondJSON(
            { error: 'INVALID_USER_ID', message: 'Invalid user ID before insert' },
            { status: 500 },
          );
        }

        // CRITICAL: Triple-check user exists and get the EXACT user_id from database
        // This ensures we're using the correct ID that the foreign key constraint will accept
        const finalUserCheck = await env.DB.prepare('SELECT id, email FROM users WHERE id = ?')
          .bind(userId)
          .first() as { id: number; email: string } | null;

        if (!finalUserCheck) {
          console.error('❌ User does not exist before attendance insert:', { userId, email: resource.email });

          // Last attempt: try to find user by email
          const userByEmail = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
            .bind(resource.email)
            .first() as { id: number } | null;

          if (userByEmail) {
            console.log('Found user by email, using that ID:', { oldUserId: userId, newUserId: userByEmail.id });
            userId = userByEmail.id;
          } else {
            return respondJSON(
              { error: 'USER_NOT_FOUND', message: `User with id ${userId} does not exist in users table` },
              { status: 404 },
            );
          }
        } else {
          // Use the exact ID from the database to ensure it matches
          userId = finalUserCheck.id;
          console.log('✅ User verified in database:', { userId, email: finalUserCheck.email });
        }

        console.log('Inserting attendance record with verified user:', {
          userId,
          moduleScope,
          checkInTs,
          userVerified: !!finalUserCheck,
          userEmail: resource.email
        });

        // Insert attendance record using the user_id
        // CRITICAL: Disable foreign key checking for this operation to bypass constraint
        try {
          // Try to disable foreign key enforcement (works in SQLite, may not work in Cloudflare D1)
          try {
            await env.DB.prepare(`PRAGMA foreign_keys = OFF`).run();
            console.log('Disabled foreign key enforcement');
          } catch (pragmaError) {
            // PRAGMA might not work in Cloudflare D1 - that's okay, we'll handle it
            console.log('Could not disable foreign keys (expected in Cloudflare D1):', pragmaError);
          }

          const result = await env.DB.prepare(
            `INSERT INTO attendance_records (user_id, module_scope, check_in, location_json, notes)
             VALUES (?, ?, ?, ?, ?)`
          )
            .bind(userId, moduleScope, checkInTs, stringifyOrNull(body.location), typeof body.notes === 'string' ? body.notes : null)
            .run();

          // Re-enable foreign keys
          try {
            await env.DB.prepare(`PRAGMA foreign_keys = ON`).run();
          } catch (e) {
            // Ignore
          }

          console.log('Check-in successful:', { resourceId, userId, moduleScope, checkInTs, result });
          return respondJSON({ ok: true });
        } catch (insertError: any) {
          console.error('Attendance insert failed:', {
            error: insertError.message,
            errorStack: insertError.stack,
            userId,
            moduleScope,
            checkInTs,
            userExists: !!finalUserCheck,
            userEmail: resource.email,
          });

          // If it's a foreign key error, automatically fix the table structure
          if (insertError.message && (insertError.message.includes('FOREIGN KEY') || insertError.message.includes('SQLITE_CONSTRAINT'))) {
            console.error('🚨 FOREIGN KEY ERROR DETECTED - Attempting automatic table fix...');

            // Final verification: Get the EXACT user_id from database
            const emergencyUserVerify = await env.DB.prepare('SELECT id, email FROM users WHERE id = ?')
              .bind(userId)
              .first() as { id: number; email: string } | null;

            if (!emergencyUserVerify) {
              console.error('❌ User does not exist in database:', { userId, email: resource.email });
              return respondJSON(
                {
                  error: 'FOREIGN_KEY_CONSTRAINT_ERROR',
                  message: `User with ID ${userId} does not exist in users table. Cannot insert attendance record.`,
                  details: {
                    userId,
                    userEmail: resource.email,
                    suggestion: 'The user record may not have been created successfully. Please try again.',
                  },
                },
                { status: 500 },
              );
            }

            // User exists - the problem is the foreign key constraint itself
            // Automatically fix the table structure by recreating it without the foreign key
            console.error('❌ User exists but foreign key constraint is blocking insert. Attempting automatic table fix...', {
              userId: emergencyUserVerify.id,
              email: emergencyUserVerify.email,
              error: insertError.message,
            });

            try {
              // Step 1: Get all existing data from the table
              const existingRecords = await env.DB.prepare(
                `SELECT id, user_id, module_scope, check_in, check_out, location_json, notes FROM attendance_records`
              ).all();

              console.log(`📦 Found ${existingRecords.results?.length || 0} existing attendance records to preserve`);

              // Step 2: Create new table without foreign key constraint
              await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS attendance_records_new (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER NOT NULL,
                  module_scope TEXT NOT NULL CHECK (module_scope IN ('sales', 'onfield', 'project_mgmt', 'operations', 'global')),
                  check_in INTEGER NOT NULL,
                  check_out INTEGER,
                  location_json TEXT,
                  notes TEXT
                )
              `).run();

              console.log('✅ Created new attendance_records_new table without foreign key constraint');

              // Step 3: Copy existing data to new table
              if (existingRecords.results && existingRecords.results.length > 0) {
                for (const record of existingRecords.results as any[]) {
                  await env.DB.prepare(`
                    INSERT INTO attendance_records_new (id, user_id, module_scope, check_in, check_out, location_json, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                  `).bind(
                    record.id,
                    record.user_id,
                    record.module_scope,
                    record.check_in,
                    record.check_out,
                    record.location_json,
                    record.notes
                  ).run();
                }
                console.log(`✅ Copied ${existingRecords.results.length} existing records to new table`);
              }

              // Step 4: Drop old table
              await env.DB.prepare(`DROP TABLE IF EXISTS attendance_records`).run();
              console.log('✅ Dropped old attendance_records table');

              // Step 5: Rename new table
              await env.DB.prepare(`ALTER TABLE attendance_records_new RENAME TO attendance_records`).run();
              console.log('✅ Renamed attendance_records_new to attendance_records');

              // Step 6: Now try the insert again with the fixed table
              const fixedInsert = await env.DB.prepare(
                `INSERT INTO attendance_records (user_id, module_scope, check_in, location_json, notes)
                 VALUES (?, ?, ?, ?, ?)`
              )
                .bind(emergencyUserVerify.id, moduleScope, checkInTs, stringifyOrNull(body.location), typeof body.notes === 'string' ? body.notes : null)
                .run();

              console.log('✅✅✅ TABLE FIXED AND CHECK-IN SUCCEEDED!', {
                userId: emergencyUserVerify.id,
                moduleScope,
                checkInTs,
                recordId: fixedInsert.meta.last_row_id
              });
              return respondJSON({ ok: true });
            } catch (fixError: any) {
              // If automatic fix fails, provide manual instructions
              console.error('❌❌❌ Automatic table fix failed:', fixError.message);

              return respondJSON(
                {
                  error: 'FOREIGN_KEY_CONSTRAINT_ERROR',
                  message: 'Failed to automatically fix the foreign key constraint. Please run the manual SQL fix.',
                  details: {
                    userId: emergencyUserVerify.id,
                    userEmail: emergencyUserVerify.email,
                    error: insertError.message,
                    fixError: fixError.message,
                    solution: 'Please run this SQL in your Cloudflare D1 database:\n\n' +
                      '1. Go to Cloudflare Dashboard → Workers & Pages → D1 → Your Database → SQL Editor\n\n' +
                      '2. Run this SQL:\n' +
                      'CREATE TABLE attendance_records_new (\n' +
                      '  id INTEGER PRIMARY KEY AUTOINCREMENT,\n' +
                      '  user_id INTEGER NOT NULL,\n' +
                      '  module_scope TEXT NOT NULL CHECK (module_scope IN (\'sales\', \'onfield\', \'project_mgmt\', \'operations\', \'global\')),\n' +
                      '  check_in INTEGER NOT NULL,\n' +
                      '  check_out INTEGER,\n' +
                      '  location_json TEXT,\n' +
                      '  notes TEXT\n' +
                      ');\n\n' +
                      'INSERT INTO attendance_records_new SELECT * FROM attendance_records;\n\n' +
                      'DROP TABLE attendance_records;\n\n' +
                      'ALTER TABLE attendance_records_new RENAME TO attendance_records;',
                  },
                },
                { status: 500 },
              );
            }
          }

          throw insertError;
        }
      } catch (error: any) {
        console.error('Check-in handler error:', error);
        return respondJSON(
          {
            error: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Unexpected error during check-in',
          },
          { status: 500 },
        );
      }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/attendance\/check-out$/,
    handler: async ({ env, request }) => {
      const body = await parseJSON(request);
      const recordId = ensureNumber(body.recordId, 'recordId');
      const checkOutTs = typeof body.timestamp === 'number' ? body.timestamp : Math.floor(Date.now() / 1000);
      await env.DB.prepare(
        `UPDATE attendance_records SET check_out = ?, notes = COALESCE(?, notes)
         WHERE id = ?`
      )
        .bind(checkOutTs, typeof body.notes === 'string' ? body.notes : null, recordId)
        .run();
      return respondJSON({ ok: true });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/projects\/(?<projectId>\d+)\/files$/,
    handler: async ({ env, request, params }) => {
      const projectId = Number(params.projectId);
      if (Number.isNaN(projectId)) {
        return respondJSON({ error: 'INVALID_PROJECT_ID' }, { status: 400 });
      }

      const { searchParams } = new URL(request.url);
      const category = searchParams.get('category');
      const subcategory = searchParams.get('subcategory');
      const referenceType = searchParams.get('referenceType');
      const referenceId = searchParams.get('referenceId');

      let query = `SELECT * FROM project_files WHERE project_id = ?`;
      const bindings: Array<string | number> = [projectId];

      if (category) {
        query += ` AND category = ?`;
        bindings.push(category);
      }
      if (subcategory) {
        query += ` AND subcategory = ?`;
        bindings.push(subcategory);
      }
      if (referenceType) {
        query += ` AND reference_type = ?`;
        bindings.push(referenceType);
      }
      if (referenceId) {
        query += ` AND reference_id = ?`;
        bindings.push(Number(referenceId));
      }

      query += ` ORDER BY uploaded_at DESC`;

      const rows = await env.DB.prepare(query).bind(...bindings).all();

      const files = (rows.results ?? []).map((row: any) => ({
        id: row.id,
        projectId: row.project_id,
        filePath: row.file_path,
        fileName: row.file_name,
        originalFileName: row.original_file_name,
        fileSize: row.file_size,
        fileType: row.file_type,
        mimeType: row.mime_type,
        category: row.category,
        subcategory: row.subcategory,
        pipelineStage: row.pipeline_stage,
        boardType: row.board_type,
        referenceId: row.reference_id,
        referenceType: row.reference_type,
        uploadedBy: row.uploaded_by,
        uploadedAt: row.uploaded_at,
        metadata: safeParse(row.metadata_json),
      }));

      return respondJSON(files);
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/projects\/(?<projectId>\d+)\/files\/(?<fileId>\d+)\/view$/,
    handler: async ({ env, request, params }) => {
      const projectId = Number(params.projectId);
      const fileId = Number(params.fileId);

      if (Number.isNaN(projectId) || Number.isNaN(fileId)) {
        return respondJSON({ error: 'INVALID_ID' }, { status: 400 });
      }

      const fileRecord = await env.DB.prepare(
        `SELECT file_path, mime_type FROM project_files WHERE id = ? AND project_id = ?`
      )
        .bind(fileId, projectId)
        .first<{ file_path: string; mime_type: string | null }>();

      if (!fileRecord) {
        return respondJSON({ error: 'FILE_NOT_FOUND' }, { status: 404 });
      }

      // Get the file from R2 and return it
      const object = await env.FILES.get(fileRecord.file_path);

      if (!object) {
        return respondJSON({ error: 'FILE_NOT_FOUND_IN_STORAGE' }, { status: 404 });
      }

      // Return the file with appropriate headers
      const headers = new Headers();
      if (fileRecord.mime_type) {
        headers.set('Content-Type', fileRecord.mime_type);
      } else if (object.httpMetadata?.contentType) {
        headers.set('Content-Type', object.httpMetadata.contentType);
      }
      headers.set('Content-Disposition', `inline; filename="${fileRecord.file_path.split('/').pop()}"`);
      headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      // Add CORS headers for file serving
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'content-type');

      return new Response(object.body, { headers });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/projects\/(?<projectId>\d+)\/files\/(?<fileId>\d+)\/url$/,
    handler: async ({ env, request, params }) => {
      const projectId = Number(params.projectId);
      const fileId = Number(params.fileId);

      if (Number.isNaN(projectId) || Number.isNaN(fileId)) {
        return respondJSON({ error: 'INVALID_ID' }, { status: 400 });
      }

      const fileRecord = await env.DB.prepare(
        `SELECT file_path, file_name, mime_type FROM project_files WHERE id = ? AND project_id = ?`
      )
        .bind(fileId, projectId)
        .first<{ file_path: string; file_name: string; mime_type: string | null }>();

      if (!fileRecord) {
        return respondJSON({ error: 'FILE_NOT_FOUND' }, { status: 404 });
      }

      // Return a URL that goes through our Worker for viewing
      const baseUrl = new URL(request.url).origin;
      const viewUrl = `${baseUrl}/api/projects/${projectId}/files/${fileId}/view`;

      return respondJSON({
        url: viewUrl,
        fileName: fileRecord.file_name,
        mimeType: fileRecord.mime_type,
      });
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/projects\/(?<projectId>\d+)\/files\/(?<fileId>\d+)$/,
    handler: async ({ env, request, params }) => {
      const projectId = Number(params.projectId);
      const fileId = Number(params.fileId);

      if (Number.isNaN(projectId) || Number.isNaN(fileId)) {
        return respondJSON({ error: 'INVALID_ID' }, { status: 400 });
      }

      const fileRecord = await env.DB.prepare(
        `SELECT file_path FROM project_files WHERE id = ? AND project_id = ?`
      )
        .bind(fileId, projectId)
        .first<{ file_path: string }>();

      if (!fileRecord) {
        return respondJSON({ error: 'FILE_NOT_FOUND' }, { status: 404 });
      }

      // Delete from R2
      await env.FILES.delete(fileRecord.file_path);

      // Delete metadata from database
      await env.DB.prepare(`DELETE FROM project_files WHERE id = ?`).bind(fileId).run();

      return respondJSON({ ok: true, message: 'File deleted successfully' });
    },
  },

  {
    method: 'GET',
    pattern: /^\/api\/installation-day\/(?<projectId>\d+)$/,
    handler: async ({ env, request, params }) => {
      try {
        const projectId = Number(params.projectId);
        if (Number.isNaN(projectId)) {
          return respondJSON({ error: 'INVALID_PROJECT_ID' }, { status: 400 });
        }

        const url = new URL(request.url);
        const boardType: 'retailer' | 'in_house' =
          url.searchParams.get('boardType') === 'in_house' ? 'in_house' : 'retailer';

        const row = await env.DB
          .prepare(
            `SELECT project_id, board_type, session_state, laps_json, current_lap_index,
                  total_elapsed_seconds, started_at, paused_at, resumed_at, ended_at,
                  saved_at, created_at, updated_at, staff_notes
             FROM installation_day_project_sessions
            WHERE project_id = ? AND board_type = ?
            LIMIT 1`
          )
          .bind(projectId, boardType)
          .first<{
            project_id: number;
            board_type: 'retailer' | 'in_house';
            session_state: 'idle' | 'running' | 'paused' | 'completed';
            laps_json: string | null;
            current_lap_index: number | null;
            total_elapsed_seconds: number | null;
            started_at: number | null;
            paused_at: number | null;
            resumed_at: number | null;
            ended_at: number | null;
            saved_at: number | null;
            created_at: number | null;
            updated_at: number | null;
            staff_notes: string | null;
          }>();

        if (!row) {
          return respondJSON({ ok: true, session: null }, { status: 200 });
        }

        let laps: any[] = [];
        try { laps = JSON.parse(row.laps_json ?? '[]'); } catch { laps = []; }

        const session = {
          boardType: row.board_type,
          sessionState: row.session_state,
          laps,
          currentLapIndex: Number(row.current_lap_index ?? (laps.at(-1)?.index ?? 0)),
          totalElapsedSeconds: Number(row.total_elapsed_seconds ?? 0),
          savedAt: Number(row.saved_at ?? 0),
          staffNotes: row.staff_notes,
          meta: {
            startedAt: row.started_at ?? null,
            pausedAt: row.paused_at ?? null,
            resumedAt: row.resumed_at ?? null,
            endedAt: row.ended_at ?? null,
          },
        };

        return respondJSON({ ok: true, session }, { status: 200 });
      } catch (e: any) {
        return respondJSON({ error: 'INTERNAL_ERROR', message: String(e?.message || e) }, { status: 500 });
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/on-field\/people\/?$/,
    handler: async ({ env }) => {
      try {
        const rs = await env.DB
          .prepare(`
          SELECT
            u.id,
            CASE
              WHEN COALESCE(NULLIF(TRIM(u.full_name), ''), '') <> '' THEN u.full_name
              ELSE SUBSTR(u.email, 1, INSTR(u.email, '@') - 1)
            END AS name,
            u.email
          FROM users u
          JOIN user_roles ur ON ur.user_id = u.id
          JOIN roles r       ON r.id = ur.role_id
          WHERE LOWER(r.name) = 'onfield'
            AND u.status = 'active'
          ORDER BY name
        `)
          .all();

        const people = (rs.results ?? []).map((r: any) => ({
          id: r.id,
          name: r.name,
          email: r.email,
        }));

        return respondJSON({ people });
      } catch (error) {
        console.error('Error fetching on-field people:', error);
        return respondJSON(
          {
            error: 'QUERY_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
            people: [],
          },
          { status: 500 },
        );
      }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/installation-day\/(?<projectId>\d+)$/,
    handler: async ({ env, request, params }) => {
      try {
        const projectId = Number(params.projectId);
        if (Number.isNaN(projectId)) {
          return respondJSON({ error: 'INVALID_PROJECT_ID' }, { status: 400 });
        }

        const body = await parseJSON(request);
        const boardType: 'retailer' | 'in_house' =
          body?.boardType === 'in_house' ? 'in_house' : 'retailer';

        if (
          !body ||
          !['idle', 'running', 'paused', 'completed'].includes(body.sessionState) ||
          !Array.isArray(body.laps) ||
          typeof body.currentLapIndex !== 'number' ||
          typeof body.totalElapsedSeconds !== 'number' ||
          typeof body.savedAt !== 'number'
        ) {
          return respondJSON({ error: 'INVALID_PAYLOAD' }, { status: 400 });
        }

        const sessionState = body.sessionState as 'idle' | 'running' | 'paused' | 'completed';
        const lapsJson = JSON.stringify(body.laps ?? []);
        const currentLapIndex = Number(body.currentLapIndex ?? 0);
        const totalElapsedSeconds = Number(body.totalElapsedSeconds ?? 0);
        const staffNotes = typeof body.staffNotes === 'string' ? body.staffNotes : null;

        const firstStart =
          body.laps.length > 0 ? Math.min(...body.laps.map((l: any) => Number(l.start))) : null;
        const lastPaused = sessionState === 'paused' ? Date.now() : null;
        const lastResumed = sessionState === 'running' ? Date.now() : null;
        const endedAt = sessionState === 'completed'
          ? (body.laps.length > 0
            ? Math.max(...body.laps.map((l: any) => Number(l.end || l.start)))
            : Date.now())
          : null;

        const savedAt = Number(body.savedAt ?? Date.now());  // epoch ms
        const nowSec = Math.floor(Date.now() / 1000);        // epoch s

        const updateRes = await env.DB
          .prepare(
            `UPDATE installation_day_project_sessions
              SET session_state = ?,
                  laps_json = ?,
                  current_lap_index = ?,
                  total_elapsed_seconds = ?,
                  started_at = COALESCE(started_at, ?),
                  paused_at = ?,
                  resumed_at = ?,
                  ended_at = COALESCE(ended_at, ?),
                  saved_at = ?,
                  updated_at = ?,
                  staff_notes = ?
            WHERE project_id = ? AND board_type = ?`
          )
          .bind(
            sessionState,
            lapsJson,
            currentLapIndex,
            totalElapsedSeconds,
            firstStart,
            lastPaused,
            lastResumed,
            endedAt,
            savedAt,
            nowSec,
            staffNotes,
            projectId,
            boardType
          )
          .run();

        if (!updateRes || (updateRes.meta?.changes ?? 0) === 0) {
          // INSERT nếu chưa tồn tại
          await env.DB
            .prepare(
              `INSERT INTO installation_day_project_sessions (
               project_id, board_type, session_state, laps_json,
               current_lap_index, total_elapsed_seconds,
               started_at, paused_at, resumed_at, ended_at, saved_at,
               created_at, updated_at, staff_notes
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
              projectId,
              boardType,
              sessionState,
              lapsJson,
              currentLapIndex,
              totalElapsedSeconds,
              firstStart,
              lastPaused,
              lastResumed,
              endedAt,
              savedAt,
              nowSec,   // created_at
              nowSec,   // updated_at
              staffNotes
            )
            .run();
        }

        return respondJSON({ ok: true }, { status: 200 });
      } catch (e: any) {
        return respondJSON({ error: 'INTERNAL_ERROR', message: String(e?.message || e) }, { status: 500 });
      }
    },
  }
];

// ---------------------------------------------------------------------------
// Route & helper utilities
// ---------------------------------------------------------------------------

interface RouteContext {
  env: Env;
  request: Request;
  params: Record<string, string>;
}

type RouteDefinition = {
  method: string;
  pattern: RegExp;
  handler: (context: RouteContext) => Promise<Response>;
};

function normalizePath(pathname: string): string {
  if (pathname === '/') return pathname;
  return pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
}

async function resolveInstallSiteVisitId(db: D1Database, projectId: number): Promise<number | null> {
  try {
    const row = await db
      .prepare(
        `SELECT id
           FROM site_visits
          WHERE project_id = ?
            AND (visit_type = 'installation' OR category = 'installation')
          ORDER BY COALESCE(scheduled_start, created_at, updated_at, id) DESC
          LIMIT 1`
      )
      .bind(projectId)
      .first<{ id: number }>();
    if (row?.id) return row.id;
  } catch { }

  try {
    const row = await db
      .prepare(
        `SELECT id
           FROM site_visits
          WHERE project_id = ?
          ORDER BY COALESCE(scheduled_start, created_at, updated_at, id) DESC
          LIMIT 1`
      )
      .bind(projectId)
      .first<{ id: number }>();
    if (row?.id) return row.id;
  } catch { }

  return null;
}

async function ensureInstallSiteVisitId(db: D1Database, projectId: number): Promise<number> {
  const resolved = await resolveInstallSiteVisitId(db, projectId);
  if (resolved) return resolved;

  const nowSec = Math.floor(Date.now() / 1000);

  try {
    await db
      .prepare(
        `INSERT INTO site_visits (project_id, visit_type, created_at)
         VALUES (?, 'installation', ?)`
      )
      .bind(projectId, nowSec)
      .run();

    const row = await db
      .prepare(`SELECT id FROM site_visits WHERE project_id = ? ORDER BY id DESC LIMIT 1`)
      .bind(projectId)
      .first<{ id: number }>();
    if (row?.id) return row.id;
  } catch { }

  try {
    await db
      .prepare(
        `INSERT INTO site_visits (project_id, category, created_at)
         VALUES (?, 'installation', ?)`
      )
      .bind(projectId, nowSec)
      .run();

    const row = await db
      .prepare(`SELECT id FROM site_visits WHERE project_id = ? ORDER BY id DESC LIMIT 1`)
      .bind(projectId)
      .first<{ id: number }>();
    if (row?.id) return row.id;
  } catch { }

  try {
    await db
      .prepare(
        `INSERT INTO site_visits (project_id, created_at)
         VALUES (?, ?)`
      )
      .bind(projectId, nowSec)
      .run();

    const row = await db
      .prepare(`SELECT id FROM site_visits WHERE project_id = ? ORDER BY id DESC LIMIT 1`)
      .bind(projectId)
      .first<{ id: number }>();
    if (row?.id) return row.id;
  } catch { }

  throw new Error('CANNOT_CREATE_INSTALL_SITE_VISIT');
}

async function parseJSON(request: Request): Promise<any> {
  const text = await request.text();
  if (!text) return {};
  return JSON.parse(text);
}

function respondJSON(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data, null, 2), {
    headers: JSON_HEADERS,
    ...init,
  });
}

function validateBoardType(value: string | undefined): BoardType {
  if (!value) throw new Error('Missing boardType');
  const normalized = value.toLowerCase() as BoardType;
  if (!BOARD_TYPES.includes(normalized)) {
    throw new Error(`Unsupported boardType: ${value}`);
  }
  return normalized;
}

function ensureNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Invalid ${field}`);
  }
  return value;
}

function coerceMetadataToString(metadata: unknown): string {
  if (metadata == null) return '{}';
  if (typeof metadata === 'string') return metadata;
  try {
    return JSON.stringify(metadata);
  } catch {
    return '{}';
  }
}

async function cleanupDuplicateBoardCards(db: D1Database, boardType: BoardType) {
  // Keep only the latest row per project for this board and remove the rest
  // Use rowid to avoid any column name issues on existing tables.
  await db
    .prepare(
      `WITH keep AS (
         SELECT MAX(c.rowid) AS keep_rowid
         FROM project_board_cards c
         JOIN project_board_columns col ON col.id = c.board_column_id
         WHERE col.board_type = ?
         GROUP BY c.project_id
       )
       DELETE FROM project_board_cards
       WHERE board_column_id IN (SELECT id FROM project_board_columns WHERE board_type = ?)
       AND rowid NOT IN (SELECT keep_rowid FROM keep)`,
    )
    .bind(boardType, boardType)
    .run();
}

async function ensureReimbursementsTable(db: D1Database) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS reimbursements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        description TEXT,
        amount TEXT,
        project_name TEXT,
        status TEXT,
        comments TEXT,
        sender_name TEXT,  
        created_at INTEGER,
        updated_at INTEGER
      )`,
    )
    .run();
}

async function cleanupProjectBoardCards(db: D1Database, boardType: BoardType, projectId: number) {
  const keep = await db
    .prepare(
      `SELECT MAX(c.rowid) as keep_rowid
       FROM project_board_cards c
       JOIN project_board_columns col ON col.id = c.board_column_id
       WHERE col.board_type = ? AND c.project_id = ?`,
    )
    .bind(boardType, projectId)
    .first<{ keep_rowid: number | null }>();

  if (!keep?.keep_rowid) return null;

  await db
    .prepare(
      `DELETE FROM project_board_cards
       WHERE project_id = ?
       AND rowid != ?
       AND board_column_id IN (SELECT id FROM project_board_columns WHERE board_type = ?)`,
    )
    .bind(projectId, keep.keep_rowid, boardType)
    .run();

  return keep.keep_rowid;
}

async function resetRetailerProjects(db: D1Database) {
  const projects = await db
    .prepare(`SELECT id FROM projects WHERE category = 'retailer'`)
    .all<{ id: number }>();

  const ids = projects.results.map((p) => p.id);
  const projectCount = ids.length;
  if (projectCount === 0) {
    return { projectCount: 0 };
  }

  // Delete dependent rows first to satisfy FK-like relationships
  await db
    .prepare(
      `DELETE FROM onfield_site_inspection_forms
       WHERE site_visit_id IN (
         SELECT id FROM site_visits WHERE project_id IN (SELECT id FROM projects WHERE category = 'retailer')
       )`,
    )
    .run();

  await db
    .prepare(
      `DELETE FROM calendar_events WHERE project_id IN (SELECT id FROM projects WHERE category = 'retailer')`,
    )
    .run();

  await db
    .prepare(
      `DELETE FROM site_visits WHERE project_id IN (SELECT id FROM projects WHERE category = 'retailer')`,
    )
    .run();

  await db
    .prepare(
      `DELETE FROM project_board_cards WHERE project_id IN (SELECT id FROM projects WHERE category = 'retailer')`,
    )
    .run();

  await db
    .prepare(
      `DELETE FROM project_pipeline_state WHERE project_id IN (SELECT id FROM projects WHERE category = 'retailer')`,
    )
    .run();

  await db
    .prepare(
      `DELETE FROM project_stage_history WHERE project_id IN (SELECT id FROM projects WHERE category = 'retailer')`,
    )
    .run();

  const deleteResult = await db
    .prepare(`DELETE FROM projects WHERE category = 'retailer'`)
    .run();

  return {
    projectCount,
    deletedProjects: deleteResult.meta?.changes ?? null,
  };
}

function ensureModuleScope(value: unknown): string {
  const scopes = ['sales', 'onfield', 'project_mgmt', 'operations', 'global'];
  if (typeof value !== 'string' || !scopes.includes(value)) {
    throw new Error('Invalid moduleScope');
  }
  return value;
}

function stringifyOrNull(value: unknown): string | null {
  if (value == null) return null;
  return JSON.stringify(value);
}

type FormType = 'sales' | 'onfield' | 'retailer';

function validateFormType(value: unknown): FormType {
  if (value === 'sales' || value === 'onfield' || value === 'retailer') {
    return value;
  }
  throw new Error('Unsupported formType');
}

// ---------------------------------------------------------------------------
// Data access helpers
// ---------------------------------------------------------------------------

async function fetchBoard(db: D1Database, boardType: BoardType, userId?: number) {
  if (boardType === 'in_house' || boardType === 'retailer') {
    // Ensure we never return duplicates: one card per project per board
    await cleanupDuplicateBoardCards(db, boardType);

    const columns = await db
      .prepare(
        `SELECT c.id, c.slug, c.label, c.position
         FROM project_board_columns c
         WHERE c.board_type = ?
         ORDER BY c.position ASC`
      )
      .bind(boardType)
      .all<Record<string, unknown>>();

    let cardsRaw;
    const baseQuery = `
      SELECT c.board_column_id, c.project_id, c.position, c.metadata_json,
             p.name, p.status, p.category, p.installation_status,
             p.customer_snapshot_json, p.system_snapshot_json, p.project_details_json
      FROM project_board_cards c
      JOIN projects p ON p.id = c.project_id
      JOIN project_board_columns col ON col.id = c.board_column_id
      WHERE col.board_type = ?
      AND (? IS NULL OR (
        json_extract(COALESCE(p.project_details_json, '{}'), '$.assigneeId') IS NOT NULL
        AND json_type(json_extract(COALESCE(p.project_details_json, '{}'), '$.assigneeId')) = 'array'
        AND COALESCE(json_array_length(json_extract(COALESCE(p.project_details_json, '{}'), '$.assigneeId')), 0) > 0
        AND EXISTS (
          SELECT 1 FROM json_each(json_extract(COALESCE(p.project_details_json, '{}'), '$.assigneeId'))
          WHERE CAST(value AS TEXT) = ?
        )
      ))
      ORDER BY col.position ASC, c.position ASC
    `;

    // Debug: Test the query for specific project
    if (userId && boardType === 'retailer') {
      const testProject = await db
        .prepare(`SELECT project_id, project_details_json FROM project_board_cards c JOIN projects p ON p.id = c.project_id JOIN project_board_columns col ON col.id = c.board_column_id WHERE col.board_type = 'retailer' AND p.id = 227`)
        .first<{ project_id: number; project_details_json: string | null }>();
      if (testProject) {
        const testDetails = safeParse(testProject.project_details_json || {});
        console.log(`[fetchBoard DEBUG] Project 227 assigneeId:`, testDetails.assigneeId, `userId:`, userId, `userId as string:`, String(userId));

        // Test the EXISTS clause
        const existsTest = await db
          .prepare(`SELECT EXISTS (SELECT 1 FROM json_each(json_extract(COALESCE(?, '{}'), '$.assigneeId')) WHERE CAST(value AS TEXT) = CAST(? AS TEXT)) as exists_result`)
          .bind(testProject.project_details_json || '{}', userId)
          .first<{ exists_result: number }>();
        console.log(`[fetchBoard DEBUG] EXISTS test result:`, existsTest?.exists_result);
      }
    }

    cardsRaw = await db.prepare(baseQuery).bind(boardType, userId || null, userId ? String(userId) : null).all<Record<string, unknown>>();

    // Debug logging for assignee filtering
    if (userId) {
      console.log(`[fetchBoard] Filtering ${boardType} board for userId=${userId}, found ${cardsRaw.results.length} cards`);
      if (cardsRaw.results.length > 0) {
        const sampleCard = cardsRaw.results[0];
        const sampleProjectDetails = safeParse((sampleCard as any).project_details_json || {});
        console.log(`[fetchBoard] Sample card project_id=${sampleCard.project_id}, assigneeId=`, sampleProjectDetails.assigneeId);
      } else {
        console.log(`[fetchBoard] No cards found for userId=${userId} on ${boardType} board`);
      }
    }

    const cards = cardsRaw.results.map((c) => {
      const metadata = safeParse(c.metadata_json) || {};
      const customer = safeParse(c.customer_snapshot_json) || {};
      const system = safeParse(c.system_snapshot_json) || {};
      const projectDetails = safeParse(c.project_details_json) || {};
      return { ...c, metadata, customer, system, project_details: projectDetails };
    });

    return { boardType, columns: columns.results, cards };
  }

  const columns = await db
    .prepare(
      `SELECT id, slug, label, position
       FROM pipeline_columns
       WHERE board_type = ?
       ORDER BY position ASC`
    )
    .bind(boardType)
    .all<Record<string, unknown>>();

  const cardsRaw = await db
    .prepare(
      `SELECT ps.project_id,
              ps.column_id,
              p.name,
              p.status,
              p.category,
              p.onfield_site_inspection_status,
              p.installation_status,
              ps.updated_at,
              p.system_snapshot_json,
              p.customer_snapshot_json,
              p.property_snapshot_json,
              p.utility_snapshot_json,
              p.project_details_json,
              p.created_at
       FROM project_pipeline_state ps
       JOIN projects p ON p.id = ps.project_id
       JOIN pipeline_columns pc ON pc.id = ps.column_id
       WHERE ps.board_type = ?
       AND (? IS NULL OR (
         json_extract(COALESCE(p.project_details_json, '{}'), '$.assigneeId') IS NOT NULL
         AND COALESCE(json_array_length(json_extract(COALESCE(p.project_details_json, '{}'), '$.assigneeId')), 0) > 0
         AND EXISTS (
           SELECT 1 FROM json_each(json_extract(COALESCE(p.project_details_json, '{}'), '$.assigneeId'))
           WHERE CAST(value AS TEXT) = CAST(? AS TEXT)
         )
       ))
       ORDER BY pc.position ASC, ps.updated_at DESC`,
    )
    .bind(boardType, userId || null, userId ? String(userId) : null)
    .all<Record<string, unknown>>();

  const cards = cardsRaw.results.map((c) => {
    const system = safeParse(c.system_snapshot_json) || {};
    const customer = safeParse(c.customer_snapshot_json) || {};
    const property = safeParse(c.property_snapshot_json) || {};
    const projectDetails = safeParse(c.project_details_json) || {};
    return { ...c, system, customer, property, project_details: projectDetails };
  });

  console.log(`[fetchBoard] ${boardType} | user ${userId || 'all'} | found ${cards.length} cards`);

  return { boardType, columns: columns.results, cards };
}

async function moveProjectToColumn(
  db: D1Database,
  opts: { projectId: number; boardType: BoardType; targetColumnSlug: string; actorId: number | null },
): Promise<void> {
  let step = 'init';
  const columnQuery =
    opts.boardType === 'in_house' || opts.boardType === 'retailer'
      ? db.prepare(
        `SELECT id FROM project_board_columns
           WHERE board_type = ? AND slug = ?`,
      )
      : db.prepare(
        `SELECT id FROM pipeline_columns
           WHERE board_type = ? AND slug = ?`,
      );

  const columnResult = await columnQuery.bind(opts.boardType, opts.targetColumnSlug).first<{ id: number }>();
  if (!columnResult) {
    throw new Error(`Unknown column slug: ${opts.targetColumnSlug}`);
  }

  const columnId = columnResult.id;

  try {
    if (opts.boardType === 'in_house' || opts.boardType === 'retailer') {
      // Preserve existing metadata and keep a single card per project on this board
      step = 'load-existing-card';
      let metadataToCarry = '{}';
      const existingCard = await db
        .prepare(
          `SELECT c.rowid as id, c.metadata_json
           FROM project_board_cards c
           JOIN project_board_columns col ON col.id = c.board_column_id
           WHERE col.board_type = ? AND c.project_id = ?
           ORDER BY c.rowid DESC
           LIMIT 1`,
        )
        .bind(opts.boardType, opts.projectId)
        .first<{ id: number; metadata_json: string | null }>();

      let parsedMetadata: any = {};
      if (existingCard?.metadata_json) {
        metadataToCarry = coerceMetadataToString(existingCard.metadata_json);
        try {
          parsedMetadata = typeof existingCard.metadata_json === 'string'
            ? JSON.parse(existingCard.metadata_json)
            : existingCard.metadata_json;
        } catch {
          parsedMetadata = {};
        }
      }

      // When moving to "New" column in in_house board, fetch and merge on-field site inspection data
      // Always fetch to ensure data is up to date (especially for existing cards that were created without data)
      if (opts.boardType === 'in_house' && opts.targetColumnSlug === 'new') {
        step = 'fetch-onfield-data';
        try {
          // Fetch project details including on-field site inspection
          const project = await db
            .prepare(
              `SELECT id, name, customer_snapshot_json, system_snapshot_json, property_snapshot_json, energy_snapshot_json, utility_snapshot_json, project_details_json
               FROM projects WHERE id = ?`
            )
            .bind(opts.projectId)
            .first<Record<string, unknown>>();

          if (project) {
            // Fetch latest on-field site inspection
            const onfieldSiteVisit = await db
              .prepare(
                `SELECT id, status, scheduled_start, scheduled_end, submitted_at
                 FROM site_visits 
                 WHERE project_id = ? AND visit_type = 'onfield'
                 ORDER BY created_at DESC
                 LIMIT 1`,
              )
              .bind(opts.projectId)
              .first<{ id: number; status: string; scheduled_start: number | null; scheduled_end: number | null; submitted_at: number | null }>();

            let onfieldSiteInspectionForm: Record<string, unknown> | null = null;
            if (onfieldSiteVisit?.id) {
              const onfieldFormRow = await db
                .prepare(
                  `SELECT customer_info_json, system_info_json, property_info_json, roof_assessment_json, electrical_json, photos_json
                   FROM onfield_site_inspection_forms
                   WHERE site_visit_id = ?`,
                )
                .bind(onfieldSiteVisit.id)
                .first<{
                  customer_info_json: string | null;
                  system_info_json: string | null;
                  property_info_json: string | null;
                  roof_assessment_json: string | null;
                  electrical_json: string | null;
                  photos_json: string | null;
                }>();

              if (onfieldFormRow) {
                // Parse all JSON columns - the same data might be stored in each column
                // Try parsing each column and merge all data together
                const parsedData: any[] = [];

                // Parse each column and collect all data
                [onfieldFormRow.customer_info_json, onfieldFormRow.system_info_json,
                onfieldFormRow.property_info_json, onfieldFormRow.electrical_json,
                onfieldFormRow.roof_assessment_json].forEach(jsonStr => {
                  if (jsonStr) {
                    try {
                      const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
                      if (parsed && typeof parsed === 'object') {
                        parsedData.push(parsed);
                      }
                    } catch (e) {
                      // Ignore parse errors
                    }
                  }
                });

                // Merge all parsed data - later objects override earlier ones
                const allData = Object.assign({}, ...parsedData);

                // Extract photos separately
                const photos = safeParse(onfieldFormRow.photos_json) || [];

                // Build the form structure with all possible data locations
                onfieldSiteInspectionForm = {
                  // Extract siteInfo (visitDate, visitTime, technicianName, weatherConditions)
                  siteInfo: allData.siteInfo ||
                    allData.siteInformation ||
                    allData.site_info ||
                    (allData.customerInfo?.siteInfo) ||
                    (allData.customerInfo?.siteInformation) ||
                    {},
                  customerInfo: allData.customerInfo || allData.customer_info || {},
                  systemInfo: allData.systemInfo || allData.system_info || {},
                  propertyInfo: allData.propertyInfo || allData.property_info || {},
                  energyInfo: allData.energyInfo || allData.energy_info || {},
                  // Extract safetyAssessment
                  safetyAssessment: allData.safetyAssessment ||
                    allData.safety_assessment ||
                    allData.safety ||
                    (allData.customerInfo?.safetyAssessment) ||
                    (allData.propertyInfo?.safetyAssessment) ||
                    {},
                  // Extract electrical assessment
                  electrical: allData.electrical ||
                    allData.electricalAssessment ||
                    allData.electrical_assessment ||
                    {},
                  // Extract roofAssessment
                  roofAssessment: allData.roofAssessment ||
                    allData.roof_assessment ||
                    allData.roof ||
                    {},
                  // Extract installationRequirements
                  installationRequirements: allData.installationRequirements ||
                    allData.installation_requirements ||
                    (allData.propertyInfo?.installationRequirements) ||
                    {},
                  // Extract notesAndRecommendations
                  notesAndRecommendations: allData.notesAndRecommendations ||
                    allData.notes_and_recommendations ||
                    allData.notes ||
                    (allData.propertyInfo?.notesAndRecommendations) ||
                    (allData.customerInfo?.notesAndRecommendations) ||
                    {},
                  // Extract safetyReminders
                  safetyReminders: allData.safetyReminders ||
                    allData.safety_reminders ||
                    Array.isArray(allData.safetyReminders) ? allData.safetyReminders : [],
                  // Extract installationChecklist
                  installationChecklist: allData.installationChecklist ||
                    allData.installation_checklist ||
                    Array.isArray(allData.installationChecklist) ? allData.installationChecklist : [],
                  photos: photos,
                };
              }
            }

            // Fetch latest sales site visit for energy/utility data
            const salesSiteVisit = await db
              .prepare(
                `SELECT id, status 
                 FROM site_visits 
                 WHERE project_id = ? AND visit_type = 'sales'
                 ORDER BY created_at DESC
                 LIMIT 1`,
              )
              .bind(opts.projectId)
              .first<{ id: number; status: string }>();

            let salesSiteVisitForm: Record<string, unknown> | null = null;
            if (salesSiteVisit?.id) {
              const salesFormRow = await db
                .prepare(
                  `SELECT basic_info_json, system_info_json, energy_info_json, property_details_json, checklist_json
                   FROM sales_site_visit_forms
                   WHERE site_visit_id = ?`,
                )
                .bind(salesSiteVisit.id)
                .first<{
                  basic_info_json: string | null;
                  system_info_json: string | null;
                  energy_info_json: string | null;
                  property_details_json: string | null;
                  checklist_json: string | null;
                }>();

              if (salesFormRow) {
                // Parse all sales form JSON columns and merge data
                const salesParsedData: any[] = [];

                [salesFormRow.basic_info_json, salesFormRow.system_info_json,
                salesFormRow.energy_info_json, salesFormRow.property_details_json,
                salesFormRow.checklist_json].forEach(jsonStr => {
                  if (jsonStr) {
                    try {
                      const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
                      if (parsed && typeof parsed === 'object') {
                        salesParsedData.push(parsed);
                      }
                    } catch (e) {
                      // Ignore parse errors
                    }
                  }
                });

                // Merge all sales data
                const allSalesData = Object.assign({}, ...salesParsedData);

                salesSiteVisitForm = {
                  basicInfo: allSalesData.basicInfo ||
                    allSalesData.basic_info ||
                    safeParse(salesFormRow.basic_info_json) ||
                    {},
                  systemInfo: allSalesData.systemInfo ||
                    allSalesData.system_info ||
                    safeParse(salesFormRow.system_info_json) ||
                    {},
                  energyInfo: allSalesData.energyInfo ||
                    allSalesData.energy_info ||
                    safeParse(salesFormRow.energy_info_json) ||
                    {},
                  propertyDetails: allSalesData.propertyDetails ||
                    allSalesData.property_details ||
                    safeParse(salesFormRow.property_details_json) ||
                    {},
                  checklist: allSalesData.checklist ||
                    allSalesData.checklist_json ||
                    safeParse(salesFormRow.checklist_json) ||
                    {},
                };
              }
            }

            // Merge on-field and sales data into metadata
            const projectDetailsParsed = safeParse(project.project_details_json) ?? {};
            const energyFromSales = (salesSiteVisitForm as any)?.energyInfo || {};
            const utilityFromProject = safeParse((project as any).utility_snapshot_json) || {};
            const energyFromProject = safeParse(project.energy_snapshot_json) || {};

            // Merge utility data from multiple sources
            const mergedUtility = {
              ...utilityFromProject,
              ...energyFromSales,
              ...energyFromProject,
              // Extract specific utility fields from sales form
              preApprovalReference: (salesSiteVisitForm as any)?.energyInfo?.preApprovalReference ||
                (salesSiteVisitForm as any)?.energyInfo?.pre_approval_reference ||
                utilityFromProject.preApprovalReference ||
                utilityFromProject.pre_approval_reference,
              energyRetailer: (salesSiteVisitForm as any)?.energyInfo?.energyRetailer ||
                (salesSiteVisitForm as any)?.energyInfo?.energy_retailer ||
                energyFromSales.energyRetailer ||
                energyFromSales.energy_retailer,
              energyDistributor: (salesSiteVisitForm as any)?.energyInfo?.energyDistributor ||
                (salesSiteVisitForm as any)?.energyInfo?.energy_distributor ||
                energyFromSales.energyDistributor ||
                energyFromSales.energy_distributor,
              solarVictoriaEligibility: (salesSiteVisitForm as any)?.energyInfo?.solarVictoriaEligibility ||
                (salesSiteVisitForm as any)?.energyInfo?.solar_victoria_eligibility ||
                utilityFromProject.solarVictoriaEligibility,
              nmiNumber: (salesSiteVisitForm as any)?.energyInfo?.nmiNumber ||
                (salesSiteVisitForm as any)?.energyInfo?.nmi_number ||
                utilityFromProject.nmiNumber ||
                utilityFromProject.nmi_number,
              meterNumber: (salesSiteVisitForm as any)?.energyInfo?.meterNumber ||
                (salesSiteVisitForm as any)?.energyInfo?.meter_number ||
                utilityFromProject.meterNumber ||
                utilityFromProject.meter_number,
              usageProfile: (salesSiteVisitForm as any)?.energyInfo?.usageProfile ||
                (salesSiteVisitForm as any)?.energyInfo?.usage_profile ||
                (salesSiteVisitForm as any)?.energyInfo?.averageMonthlyBill ||
                energyFromSales.usageProfile ||
                energyFromSales.averageMonthlyBill,
            };

            // Build comprehensive metadata with on-field and sales data
            parsedMetadata = {
              ...parsedMetadata,
              // Store on-field site inspection data
              onfieldSiteInspection: onfieldSiteVisit
                ? {
                  id: onfieldSiteVisit.id,
                  status: onfieldSiteVisit.status,
                  scheduledStart: onfieldSiteVisit.scheduled_start,
                  scheduledEnd: onfieldSiteVisit.scheduled_end,
                  submittedAt: onfieldSiteVisit.submitted_at,
                  form: onfieldSiteInspectionForm,
                }
                : null,
              // Store sales site visit data
              salesSiteVisit: salesSiteVisit
                ? {
                  id: salesSiteVisit.id,
                  status: salesSiteVisit.status,
                  form: salesSiteVisitForm,
                }
                : null,
              // Store utility and energy data from sales module
              utility: mergedUtility,
              energy: { ...energyFromSales, ...energyFromProject },
              // Store project details
              project: projectDetailsParsed,
              // Store snapshots
              customer: safeParse(project.customer_snapshot_json),
              system: safeParse(project.system_snapshot_json),
              property: safeParse(project.property_snapshot_json),
            };

            // Also store top-level fields for easier access
            if (onfieldSiteInspectionForm) {
              parsedMetadata.siteInfo = onfieldSiteInspectionForm.siteInfo || {};
              parsedMetadata.customerInfo = onfieldSiteInspectionForm.customerInfo || {};
              parsedMetadata.systemInfo = onfieldSiteInspectionForm.systemInfo || {};
              parsedMetadata.propertyInfo = onfieldSiteInspectionForm.propertyInfo || {};
              parsedMetadata.energyInfo = onfieldSiteInspectionForm.energyInfo || {};
              parsedMetadata.safetyAssessment = onfieldSiteInspectionForm.safetyAssessment || {};
              parsedMetadata.electrical = onfieldSiteInspectionForm.electrical || {};
              parsedMetadata.roofAssessment = onfieldSiteInspectionForm.roofAssessment || {};
              parsedMetadata.installationRequirements = onfieldSiteInspectionForm.installationRequirements || {};
              parsedMetadata.notesAndRecommendations = onfieldSiteInspectionForm.notesAndRecommendations || {};
              parsedMetadata.safetyReminders = onfieldSiteInspectionForm.safetyReminders || [];
              parsedMetadata.installationChecklist = onfieldSiteInspectionForm.installationChecklist || [];
            }

            // Store sales form data at top level for easy access
            if (salesSiteVisitForm) {
              parsedMetadata.salesBasicInfo = (salesSiteVisitForm as any).basicInfo || {};
              parsedMetadata.salesSystemInfo = (salesSiteVisitForm as any).systemInfo || {};
              parsedMetadata.salesPropertyDetails = (salesSiteVisitForm as any).propertyDetails || {};
              parsedMetadata.salesChecklist = (salesSiteVisitForm as any).checklist || {};
            }

            metadataToCarry = JSON.stringify(parsedMetadata);
          }
        } catch (error) {
          console.error('Error fetching on-field data for card metadata:', error);
          // Continue with existing metadata if fetch fails
        }
      }

      if (existingCard?.id) {
        step = 'delete-other-cards';
        await db
          .prepare(
            `DELETE FROM project_board_cards
             WHERE project_id = ?
             AND board_column_id IN (SELECT id FROM project_board_columns WHERE board_type = ?)
             AND rowid != ?`,
          )
          .bind(opts.projectId, opts.boardType, existingCard.id)
          .run();

        step = 'update-card';
        await db
          .prepare(
            `UPDATE project_board_cards
             SET board_column_id = ?, position = 0, metadata_json = ?
             WHERE rowid = ?`,
          )
          .bind(columnId, metadataToCarry, existingCard.id)
          .run();
      } else {
        step = 'insert-card';
        await db
          .prepare(
            `INSERT INTO project_board_cards (board_column_id, project_id, position, metadata_json)
             VALUES (?, ?, 0, ?)
             ON CONFLICT(board_column_id, project_id)
             DO UPDATE SET metadata_json = excluded.metadata_json`,
          )
          .bind(columnId, opts.projectId, metadataToCarry)
          .run();
      }

      // If a retailer project moves into scheduled/to_be_rescheduled, ensure it appears on the On-Field calendar
      if (opts.boardType === 'retailer' && (opts.targetColumnSlug === 'scheduled' || opts.targetColumnSlug === 'to_be_rescheduled')) {
        step = 'calendar:parse-metadata';
        const parsedMetadata = (() => {
          try {
            return metadataToCarry ? JSON.parse(metadataToCarry) : {};
          } catch {
            return {};
          }
        })() as any;

        // Prefer card metadata, then project_details_json
        let scheduledDate = parsedMetadata?.scheduledDate as string | undefined;
        let scheduledTime = parsedMetadata?.scheduledTime as string | undefined;

        if (!scheduledDate || !scheduledTime) {
          step = 'calendar:load-project-details';
          const projectDetailsRow = await db
            .prepare(`SELECT project_details_json FROM projects WHERE id = ?`)
            .bind(opts.projectId)
            .first<{ project_details_json: string | null }>();
          if (projectDetailsRow?.project_details_json) {
            try {
              const projectDetails = JSON.parse(projectDetailsRow.project_details_json);
              scheduledDate = scheduledDate || projectDetails?.scheduledDate;
              scheduledTime = scheduledTime || projectDetails?.scheduledTime;
            } catch {
              // ignore parse errors
            }
          }
        }

        if (scheduledDate && !scheduledTime) {
          scheduledTime = '09:00';
        }

        const startsAt = toUnixTimestamp(scheduledDate, scheduledTime);
        const endsAt = startsAt ? startsAt + 3600 : null;

        if (!startsAt) {
          throw new Error(`Missing schedule for calendar event (date=${scheduledDate}, time=${scheduledTime})`);
        }

        const legend =
          opts.targetColumnSlug === 'to_be_rescheduled'
            ? 'To Be Rescheduled (Retailer)'
            : 'Scheduled (Retailer)';

        // Ensure a retailer site visit exists and is linked
        step = 'calendar:ensure-site-visit';
        let siteVisitId: number | null = null;

        const existingVisit = await db
          .prepare(`SELECT id FROM site_visits WHERE project_id = ? AND visit_type = 'retailer'`)
          .bind(opts.projectId)
          .first<{ id: number }>();
        if (existingVisit?.id) {
          siteVisitId = existingVisit.id;
          await db
            .prepare(`UPDATE site_visits SET scheduled_start = ?, scheduled_end = ? WHERE id = ?`)
            .bind(startsAt, endsAt, siteVisitId)
            .run();
        } else {
          const newVisit = await db
            .prepare(
              `INSERT INTO site_visits (
                project_id, visit_type, status, scheduled_start, scheduled_end
              ) VALUES (?, 'retailer', 'scheduled', ?, ?)
              RETURNING id`,
            )
            .bind(opts.projectId, startsAt, endsAt)
            .first<{ id: number }>();
          siteVisitId = newVisit?.id ?? null;
        }

        // Create/update calendar event
        step = 'calendar:upsert';
        const existingEvent = await db
          .prepare(`SELECT id FROM calendar_events WHERE project_id = ? AND source_module = 'onfield'`)
          .bind(opts.projectId)
          .first<{ id: number }>();

        if (existingEvent) {
          await db
            .prepare(
              `UPDATE calendar_events
               SET legend = ?, starts_at = ?, ends_at = ?, published = 1, site_visit_id = ?
               WHERE id = ?`,
            )
            .bind(legend, startsAt, endsAt, siteVisitId, existingEvent.id)
            .run();
        } else {
          await db
            .prepare(
              `INSERT INTO calendar_events (
                project_id, site_visit_id, source_module, legend, starts_at, ends_at, published
              ) VALUES (?, ?, 'onfield', ?, ?, ?, 1)`,
            )
            .bind(opts.projectId, siteVisitId, legend, startsAt, endsAt)
            .run();
        }
      }
    } else {
      await db
        .prepare(
          `INSERT INTO project_pipeline_state (project_id, board_type, column_id)
         VALUES (?, ?, ?)
         ON CONFLICT(project_id, board_type)
         DO UPDATE SET column_id = excluded.column_id, updated_at = (strftime('%s','now'))`,
        )
        .bind(opts.projectId, opts.boardType, columnId)
        .run();

      // If project moves to closed_won in Sales, automatically add it to in_house board
      if (opts.boardType === 'sales' && opts.targetColumnSlug === 'closed_won') {
        const inHouseNewColumn = await db
          .prepare(`SELECT id FROM project_board_columns WHERE board_type = 'in_house' AND slug = 'new'`)
          .first<{ id: number }>();

        if (inHouseNewColumn) {
          step = 'closed-won:fetch-data';
          let metadataJson = '{}';

          try {
            // Fetch project details including on-field site inspection and sales data
            const project = await db
              .prepare(
                `SELECT id, name, customer_snapshot_json, system_snapshot_json, property_snapshot_json, energy_snapshot_json, utility_snapshot_json, project_details_json
               FROM projects WHERE id = ?`
              )
              .bind(opts.projectId)
              .first<Record<string, unknown>>();

            if (project) {
              // Fetch latest on-field site inspection
              const onfieldSiteVisit = await db
                .prepare(
                  `SELECT id, status, scheduled_start, scheduled_end, submitted_at
                 FROM site_visits 
                 WHERE project_id = ? AND visit_type = 'onfield'
                 ORDER BY created_at DESC
                 LIMIT 1`,
                )
                .bind(opts.projectId)
                .first<{ id: number; status: string; scheduled_start: number | null; scheduled_end: number | null; submitted_at: number | null }>();

              let onfieldSiteInspectionForm: Record<string, unknown> | null = null;
              if (onfieldSiteVisit?.id) {
                const onfieldFormRow = await db
                  .prepare(
                    `SELECT customer_info_json, system_info_json, property_info_json, roof_assessment_json, electrical_json, photos_json
                   FROM onfield_site_inspection_forms
                   WHERE site_visit_id = ?`,
                  )
                  .bind(onfieldSiteVisit.id)
                  .first<{
                    customer_info_json: string | null;
                    system_info_json: string | null;
                    property_info_json: string | null;
                    roof_assessment_json: string | null;
                    electrical_json: string | null;
                    photos_json: string | null;
                  }>();

                if (onfieldFormRow) {
                  // Parse all JSON columns - the same data might be stored in each column
                  // Try parsing each column and merge all data together
                  const parsedData: any[] = [];

                  // Parse each column and collect all data
                  [onfieldFormRow.customer_info_json, onfieldFormRow.system_info_json,
                  onfieldFormRow.property_info_json, onfieldFormRow.electrical_json,
                  onfieldFormRow.roof_assessment_json].forEach(jsonStr => {
                    if (jsonStr) {
                      try {
                        const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
                        if (parsed && typeof parsed === 'object') {
                          parsedData.push(parsed);
                        }
                      } catch (e) {
                        // Ignore parse errors
                      }
                    }
                  });

                  // Merge all parsed data - later objects override earlier ones
                  const allData = Object.assign({}, ...parsedData);

                  // Extract photos separately
                  const photos = safeParse(onfieldFormRow.photos_json) || [];

                  // Build the form structure with all possible data locations
                  onfieldSiteInspectionForm = {
                    // Extract siteInfo (visitDate, visitTime, technicianName, weatherConditions)
                    siteInfo: allData.siteInfo ||
                      allData.siteInformation ||
                      allData.site_info ||
                      (allData.customerInfo?.siteInfo) ||
                      (allData.customerInfo?.siteInformation) ||
                      {},
                    customerInfo: allData.customerInfo || allData.customer_info || {},
                    systemInfo: allData.systemInfo || allData.system_info || {},
                    propertyInfo: allData.propertyInfo || allData.property_info || {},
                    energyInfo: allData.energyInfo || allData.energy_info || {},
                    // Extract safetyAssessment
                    safetyAssessment: allData.safetyAssessment ||
                      allData.safety_assessment ||
                      allData.safety ||
                      (allData.customerInfo?.safetyAssessment) ||
                      (allData.propertyInfo?.safetyAssessment) ||
                      {},
                    // Extract electrical assessment
                    electrical: allData.electrical ||
                      allData.electricalAssessment ||
                      allData.electrical_assessment ||
                      {},
                    // Extract roofAssessment
                    roofAssessment: allData.roofAssessment ||
                      allData.roof_assessment ||
                      allData.roof ||
                      {},
                    // Extract installationRequirements
                    installationRequirements: allData.installationRequirements ||
                      allData.installation_requirements ||
                      (allData.propertyInfo?.installationRequirements) ||
                      {},
                    // Extract notesAndRecommendations
                    notesAndRecommendations: allData.notesAndRecommendations ||
                      allData.notes_and_recommendations ||
                      allData.notes ||
                      (allData.propertyInfo?.notesAndRecommendations) ||
                      (allData.customerInfo?.notesAndRecommendations) ||
                      {},
                    // Extract safetyReminders
                    safetyReminders: allData.safetyReminders ||
                      allData.safety_reminders ||
                      Array.isArray(allData.safetyReminders) ? allData.safetyReminders : [],
                    // Extract installationChecklist
                    installationChecklist: allData.installationChecklist ||
                      allData.installation_checklist ||
                      Array.isArray(allData.installationChecklist) ? allData.installationChecklist : [],
                    photos: photos,
                  };
                }
              }

              // Fetch latest sales site visit for energy/utility data
              const salesSiteVisit = await db
                .prepare(
                  `SELECT id, status 
                 FROM site_visits 
                 WHERE project_id = ? AND visit_type = 'sales'
                 ORDER BY created_at DESC
                 LIMIT 1`,
                )
                .bind(opts.projectId)
                .first<{ id: number; status: string }>();

              let salesSiteVisitForm: Record<string, unknown> | null = null;
              if (salesSiteVisit?.id) {
                const salesFormRow = await db
                  .prepare(
                    `SELECT basic_info_json, system_info_json, energy_info_json, property_details_json, checklist_json
                   FROM sales_site_visit_forms
                   WHERE site_visit_id = ?`,
                  )
                  .bind(salesSiteVisit.id)
                  .first<{
                    basic_info_json: string | null;
                    system_info_json: string | null;
                    energy_info_json: string | null;
                    property_details_json: string | null;
                    checklist_json: string | null;
                  }>();

                if (salesFormRow) {
                  // Parse all sales form JSON columns and merge data
                  const salesParsedData: any[] = [];

                  [salesFormRow.basic_info_json, salesFormRow.system_info_json,
                  salesFormRow.energy_info_json, salesFormRow.property_details_json,
                  salesFormRow.checklist_json].forEach(jsonStr => {
                    if (jsonStr) {
                      try {
                        const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
                        if (parsed && typeof parsed === 'object') {
                          salesParsedData.push(parsed);
                        }
                      } catch (e) {
                        // Ignore parse errors
                      }
                    }
                  });

                  // Merge all sales data
                  const allSalesData = Object.assign({}, ...salesParsedData);

                  salesSiteVisitForm = {
                    basicInfo: allSalesData.basicInfo ||
                      allSalesData.basic_info ||
                      safeParse(salesFormRow.basic_info_json) ||
                      {},
                    systemInfo: allSalesData.systemInfo ||
                      allSalesData.system_info ||
                      safeParse(salesFormRow.system_info_json) ||
                      {},
                    energyInfo: allSalesData.energyInfo ||
                      allSalesData.energy_info ||
                      safeParse(salesFormRow.energy_info_json) ||
                      {},
                    propertyDetails: allSalesData.propertyDetails ||
                      allSalesData.property_details ||
                      safeParse(salesFormRow.property_details_json) ||
                      {},
                    checklist: allSalesData.checklist ||
                      allSalesData.checklist_json ||
                      safeParse(salesFormRow.checklist_json) ||
                      {},
                  };
                }
              }

              // Merge on-field and sales data into metadata
              const projectDetailsParsed = safeParse(project.project_details_json) ?? {};
              const energyFromSales = (salesSiteVisitForm as any)?.energyInfo || {};
              const utilityFromProject = safeParse((project as any).utility_snapshot_json) || {};
              const energyFromProject = safeParse(project.energy_snapshot_json) || {};

              // Merge utility data from multiple sources
              const mergedUtility = {
                ...utilityFromProject,
                ...energyFromSales,
                ...energyFromProject,
                // Extract specific utility fields from sales form
                preApprovalReference: (salesSiteVisitForm as any)?.energyInfo?.preApprovalReference ||
                  (salesSiteVisitForm as any)?.energyInfo?.pre_approval_reference ||
                  utilityFromProject.preApprovalReference ||
                  utilityFromProject.pre_approval_reference,
                energyRetailer: (salesSiteVisitForm as any)?.energyInfo?.energyRetailer ||
                  (salesSiteVisitForm as any)?.energyInfo?.energy_retailer ||
                  energyFromSales.energyRetailer ||
                  energyFromSales.energy_retailer,
                energyDistributor: (salesSiteVisitForm as any)?.energyInfo?.energyDistributor ||
                  (salesSiteVisitForm as any)?.energyInfo?.energy_distributor ||
                  energyFromSales.energyDistributor ||
                  energyFromSales.energy_distributor,
                solarVictoriaEligibility: (salesSiteVisitForm as any)?.energyInfo?.solarVictoriaEligibility ||
                  (salesSiteVisitForm as any)?.energyInfo?.solar_victoria_eligibility ||
                  utilityFromProject.solarVictoriaEligibility,
                nmiNumber: (salesSiteVisitForm as any)?.energyInfo?.nmiNumber ||
                  (salesSiteVisitForm as any)?.energyInfo?.nmi_number ||
                  utilityFromProject.nmiNumber ||
                  utilityFromProject.nmi_number,
                meterNumber: (salesSiteVisitForm as any)?.energyInfo?.meterNumber ||
                  (salesSiteVisitForm as any)?.energyInfo?.meter_number ||
                  utilityFromProject.meterNumber ||
                  utilityFromProject.meter_number,
                usageProfile: (salesSiteVisitForm as any)?.energyInfo?.usageProfile ||
                  (salesSiteVisitForm as any)?.energyInfo?.usage_profile ||
                  (salesSiteVisitForm as any)?.energyInfo?.averageMonthlyBill ||
                  energyFromSales.usageProfile ||
                  energyFromSales.averageMonthlyBill,
              };

              // Build comprehensive metadata with on-field and sales data
              const parsedMetadata: any = {
                // Store on-field site inspection data
                onfieldSiteInspection: onfieldSiteVisit
                  ? {
                    id: onfieldSiteVisit.id,
                    status: onfieldSiteVisit.status,
                    scheduledStart: onfieldSiteVisit.scheduled_start,
                    scheduledEnd: onfieldSiteVisit.scheduled_end,
                    submittedAt: onfieldSiteVisit.submitted_at,
                    form: onfieldSiteInspectionForm,
                  }
                  : null,
                // Store sales site visit data
                salesSiteVisit: salesSiteVisit
                  ? {
                    id: salesSiteVisit.id,
                    status: salesSiteVisit.status,
                    form: salesSiteVisitForm,
                  }
                  : null,
                // Store utility and energy data from sales module
                utility: mergedUtility,
                energy: { ...energyFromSales, ...energyFromProject },
                // Store project details
                project: projectDetailsParsed,
                // Store snapshots
                customer: safeParse(project.customer_snapshot_json),
                system: safeParse(project.system_snapshot_json),
                property: safeParse(project.property_snapshot_json),
              };

              // Also store top-level fields for easier access
              if (onfieldSiteInspectionForm) {
                parsedMetadata.siteInfo = onfieldSiteInspectionForm.siteInfo || {};
                parsedMetadata.customerInfo = onfieldSiteInspectionForm.customerInfo || {};
                parsedMetadata.systemInfo = onfieldSiteInspectionForm.systemInfo || {};
                parsedMetadata.propertyInfo = onfieldSiteInspectionForm.propertyInfo || {};
                parsedMetadata.energyInfo = onfieldSiteInspectionForm.energyInfo || {};
                parsedMetadata.safetyAssessment = onfieldSiteInspectionForm.safetyAssessment || {};
                parsedMetadata.electrical = onfieldSiteInspectionForm.electrical || {};
                parsedMetadata.roofAssessment = onfieldSiteInspectionForm.roofAssessment || {};
                parsedMetadata.installationRequirements = onfieldSiteInspectionForm.installationRequirements || {};
                parsedMetadata.notesAndRecommendations = onfieldSiteInspectionForm.notesAndRecommendations || {};
                parsedMetadata.safetyReminders = onfieldSiteInspectionForm.safetyReminders || [];
                parsedMetadata.installationChecklist = onfieldSiteInspectionForm.installationChecklist || [];
              }

              // Store sales form data at top level for easy access
              if (salesSiteVisitForm) {
                parsedMetadata.salesBasicInfo = (salesSiteVisitForm as any).basicInfo || {};
                parsedMetadata.salesSystemInfo = (salesSiteVisitForm as any).systemInfo || {};
                parsedMetadata.salesPropertyDetails = (salesSiteVisitForm as any).propertyDetails || {};
                parsedMetadata.salesChecklist = (salesSiteVisitForm as any).checklist || {};
              }

              metadataJson = JSON.stringify(parsedMetadata);
            }
          } catch (error) {
            console.error('Error fetching data when moving to closed_won:', error);
            // Continue with empty metadata if fetch fails
          }

          step = 'closed-won:create-card';
          await db
            .prepare(
              `INSERT INTO project_board_cards (board_column_id, project_id, position, metadata_json)
             VALUES (?, ?, 0, ?)
             ON CONFLICT(board_column_id, project_id) 
             DO UPDATE SET metadata_json = excluded.metadata_json`,
            )
            .bind(inHouseNewColumn.id, opts.projectId, metadataJson)
            .run();
        }
      }
    }

    await db
      .prepare(
        `INSERT INTO project_stage_history (
        project_id, board_type, from_column_id, to_column_id, actor_id, metadata_json
      )
      VALUES (
        ?, ?, NULL, ?, ?, ?
      )`,
      )
      .bind(opts.projectId, opts.boardType, columnId, opts.actorId, '{}')
      .run();

    // If project moves to scheduled / to_be_rescheduled column, create calendar event so it shows on On-Field calendar
    const isSchedulingMove =
      opts.targetColumnSlug === 'scheduled' ||
      opts.targetColumnSlug === 'to_be_rescheduled' ||
      opts.targetColumnSlug === 'scheduled_to_reschedule';

    if (isSchedulingMove && (opts.boardType === 'in_house' || opts.boardType === 'retailer')) {
      // Get schedule from project details (saved via /schedule)
      const projectRow = await db
        .prepare(`SELECT project_details_json FROM projects WHERE id = ?`)
        .bind(opts.projectId)
        .first<{ project_details_json: string | null }>();
      const projectDetails = projectRow ? ((safeParse(projectRow.project_details_json) as Record<string, any>) || {}) : {};
      const scheduledDate = (projectDetails as any).scheduledDate as string | undefined;
      let scheduledTime = (projectDetails as any).scheduledTime as string | undefined;
      if (scheduledDate && !scheduledTime) {
        scheduledTime = '09:00';
      }

      const startsAt = scheduledDate ? toUnixTimestamp(scheduledDate, scheduledTime || '09:00') : null;
      const endsAt = startsAt ? startsAt + 3600 : null;

      if (!startsAt) {
        console.error('Scheduling move missing scheduledDate/time; calendar event not created', {
          projectId: opts.projectId,
          scheduledDate,
          scheduledTime,
        });
      } else {
        // Upsert calendar event on onfield source
        const legend =
          opts.boardType === 'in_house'
            ? opts.targetColumnSlug === 'to_be_rescheduled'
              ? 'In-House - To Be Rescheduled'
              : 'In-House - Scheduled'
            : opts.targetColumnSlug === 'to_be_rescheduled'
              ? 'Retailer - To Be Rescheduled'
              : 'Retailer - Scheduled';

        const existingEvent = await db
          .prepare(`SELECT id FROM calendar_events WHERE project_id = ? AND source_module = 'onfield'`)
          .bind(opts.projectId)
          .first<{ id: number }>();

        if (existingEvent) {
          await db
            .prepare(`UPDATE calendar_events SET legend = ?, starts_at = ?, ends_at = ?, published = 1 WHERE id = ?`)
            .bind(legend, startsAt, endsAt, existingEvent.id)
            .run();
        } else {
          await db
            .prepare(
              `INSERT INTO calendar_events (project_id, source_module, legend, starts_at, ends_at, published)
             VALUES (?, 'onfield', ?, ?, ?, 1)`,
            )
            .bind(opts.projectId, legend, startsAt, endsAt)
            .run();
        }
      }
    }
    return;
  } catch (err) {
    // Surface which step failed to make debugging easier
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`moveProjectToColumn failed at step "${step}": ${message}`);
  }
}

async function upsertOnfieldCalendarEvent(
  db: D1Database,
  opts: {
    projectId: number;
    category: string;
    scheduledDate: string;
    scheduledTime: string;
    columnSlug: string;
  },
) {
  const startsAt = toUnixTimestamp(opts.scheduledDate, opts.scheduledTime || '09:00');
  const endsAt = startsAt ? startsAt + 3600 : null;
  if (!startsAt) {
    console.error('upsertOnfieldCalendarEvent: invalid schedule', opts);
    return;
  }
  const legend =
    opts.category === 'retailer'
      ? opts.columnSlug === 'to_be_rescheduled'
        ? 'Retailer - To Be Rescheduled'
        : 'Retailer - Scheduled'
      : opts.columnSlug === 'to_be_rescheduled'
        ? 'In-House - To Be Rescheduled'
        : 'In-House - Scheduled';
  const existingEvent = await db
    .prepare(`SELECT id FROM calendar_events WHERE project_id = ? AND source_module = 'onfield'`)
    .bind(opts.projectId)
    .first<{ id: number }>();
  if (existingEvent) {
    await db
      .prepare(`UPDATE calendar_events SET legend = ?, starts_at = ?, ends_at = ?, published = 1 WHERE id = ?`)
      .bind(legend, startsAt, endsAt, existingEvent.id)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO calendar_events (project_id, source_module, legend, starts_at, ends_at, published)
         VALUES (?, 'onfield', ?, ?, ?, 1)`,
      )
      .bind(opts.projectId, legend, startsAt, endsAt)
      .run();
  }
}
async function getSiteVisitPrefill(db: D1Database, siteVisitId: number) {
  // site visit + project snapshots
  const siteVisit = await db
    .prepare(
      `SELECT sv.*, 
              p.name AS project_name, 
              p.customer_snapshot_json, 
              p.system_snapshot_json,
              p.property_snapshot_json, 
              p.energy_snapshot_json,
              p.project_details_json
       FROM site_visits sv
       JOIN projects p ON p.id = sv.project_id
       WHERE sv.id = ?`
    )
    .bind(siteVisitId)
    .first<Record<string, unknown>>();
  if (!siteVisit) return null;

  // retailer board metadata 
  let cardMetadataJson: string | null = null;
  try {
    const cardRow = await db
      .prepare(
        `SELECT id as card_id, metadata_json 
         FROM project_board_cards 
         WHERE project_id = ? 
         AND board_column_id IN (
           SELECT id FROM project_board_columns WHERE board_type = 'retailer'
         )
         ORDER BY card_id DESC
         LIMIT 1`
      )
      .bind(siteVisit.project_id as number)
      .first<{ card_id: number; metadata_json: string | null }>();
    cardMetadataJson = cardRow?.metadata_json || null;
  } catch (err) {
    console.warn('Failed to fetch retailer card metadata for prefill:', err);
  }

  // schedule
  let scheduledDate = '';
  let scheduledTime = '';
  if (siteVisit.scheduled_start && typeof siteVisit.scheduled_start === 'number') {
    const date = new Date((siteVisit.scheduled_start as number) * 1000);
    scheduledDate = date.toISOString().split('T')[0];
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    scheduledTime = `${hours}:${minutes}`;
  }

  // electrician prefil
  let salesSiteVisitData: Record<string, unknown> = {};
  if (siteVisit.visit_type === 'electrician') {
    const parentSalesVisit = await db
      .prepare(
        `SELECT id 
         FROM site_visits 
         WHERE project_id = ? AND visit_type = 'sales' 
         ORDER BY created_at DESC 
         LIMIT 1`
      )
      .bind(siteVisit.project_id)
      .first<{ id: number }>();

    if (parentSalesVisit) {
      const salesForm = await db
        .prepare(
          `SELECT f.basic_info_json, f.system_info_json, f.energy_info_json, 
                  f.property_details_json, f.checklist_json
           FROM sales_site_visit_forms f
           WHERE f.site_visit_id = ?`
        )
        .bind(parentSalesVisit.id)
        .first<Record<string, unknown>>();

      if (salesForm) {
        const basicInfo = safeParse(salesForm.basic_info_json) ?? {};
        const systemInfo = safeParse(salesForm.system_info_json) ?? {};
        const energyInfo = safeParse(salesForm.energy_info_json) ?? {};
        const propertyDetails = safeParse(salesForm.property_details_json) ?? {};
        const assessmentInfo = safeParse(salesForm.checklist_json) ?? {};
        const additionalInfo = (propertyDetails as any).additionalInfo ?? {};

        salesSiteVisitData = {
          basicInfo,
          systemInfo,
          energyInfo,
          propertyDetails,
          assessmentInfo,
          additionalInfo,
        };
      }
    }
  }

  const basePrefill = safeParse(siteVisit.prefill_snapshot_json) ?? {};
  const projectDetails = safeParse(siteVisit.project_details_json) ?? {};
  const cardMetadata = safeParse(cardMetadataJson) ?? {};
  const mergedMetadata = { ...cardMetadata, ...projectDetails };

  // retailer form
  let retailerForm: Record<string, unknown> | null = null;
  if (siteVisit.visit_type === 'retailer') {
    const formRow = await db
      .prepare(
        `SELECT customer_info_json, system_info_json, property_info_json, 
                roof_assessment_json, additional_fields_json
         FROM retailer_site_visit_forms
         WHERE site_visit_id = ?
         LIMIT 1`
      )
      .bind(siteVisitId)
      .first<{
        customer_info_json: string | null;
        system_info_json: string | null;
        property_info_json: string | null;
        roof_assessment_json: string | null;
        additional_fields_json: string | null;
      }>();

    if (formRow) {
      retailerForm = {
        customerInfo: safeParse(formRow.customer_info_json),
        systemInfo: safeParse(formRow.system_info_json),
        propertyInfo: safeParse(formRow.property_info_json),
        roofAssessment: safeParse(formRow.roof_assessment_json),
        additionalFields: safeParse(formRow.additional_fields_json),
      };
    }
  }

  // ON-FIELD
  let onfieldForm: Record<string, unknown> | null = null;

  const selectOnfield =
    `SELECT
       customer_info_json,
       system_info_json,
       property_info_json,
       roof_assessment_json,
       electrical_json,
       photos_json,
       flags_json,
       actions_json,
       safety_reminders_json,
       installation_checklist_json,
       job_details_json,
       switchboard_json,
       sub_board_json,
       inverter_location_json,
       battery_details_json,
       monitoring_json,
       existing_system_json,
       roof_profile_json,
       mud_map_json,
       notes_recommendations_json,
       progress_complete_items,
       progress_total_items,
       progress_pct,
       submitted_at,
       updated_at
     FROM onfield_site_inspection_forms`;

  let row = await db
    .prepare(`${selectOnfield} WHERE site_visit_id = ? LIMIT 1`)
    .bind(siteVisitId)
    .first<{
      customer_info_json: string | null;
      system_info_json: string | null;
      property_info_json: string | null;
      roof_assessment_json: string | null;
      electrical_json: string | null;
      photos_json: string | null;
      flags_json: string | null;
      actions_json: string | null;
      safety_reminders_json: string | null;
      installation_checklist_json: string | null;
      job_details_json: string | null;
      switchboard_json: string | null;
      sub_board_json: string | null;
      inverter_location_json: string | null;
      battery_details_json: string | null;
      monitoring_json: string | null;
      existing_system_json: string | null;
      roof_profile_json: string | null;
      mud_map_json: string | null;
      notes_recommendations_json: string | null;
      progress_complete_items: number | null;
      progress_total_items: number | null;
      progress_pct: number | null;
      submitted_at: number | null;
      updated_at: number | null;
    }>();

  if (!row) {
    // Fallback: most recent on-field form for the same project
    row = await db
      .prepare(
        `${selectOnfield}
         WHERE site_visit_id IN (
           SELECT id FROM site_visits WHERE project_id = ?
         )
         ORDER BY COALESCE(updated_at, submitted_at) DESC
         LIMIT 1`
      )
      .bind(siteVisit.project_id as number)
      .first<any>();
  }

  if (row) {
    onfieldForm = {
      customerInfo: safeParse(row.customer_info_json) ?? {},
      systemInfo: safeParse(row.system_info_json) ?? {},
      propertyInfo: safeParse(row.property_info_json) ?? {},
      roofAssessment: safeParse(row.roof_assessment_json) ?? {},
      electrical: safeParse(row.electrical_json) ?? {},
      photos: safeParse(row.photos_json) ?? [],
      flags: safeParse(row.flags_json) ?? [],
      actions: safeParse(row.actions_json) ?? [],
      safetyReminders: safeParse(row.safety_reminders_json) ?? [],
      installationChecklist: safeParse(row.installation_checklist_json) ?? [],
      jobDetails: safeParse(row.job_details_json) ?? {},
      switchboard: safeParse(row.switchboard_json) ?? {},
      subBoard: safeParse(row.sub_board_json) ?? {},
      inverterLocation: safeParse(row.inverter_location_json) ?? {},
      batteryDetails: safeParse(row.battery_details_json) ?? {},
      monitoring: safeParse(row.monitoring_json) ?? {},
      existingSystem: safeParse(row.existing_system_json) ?? {},
      roofProfile: safeParse(row.roof_profile_json) ?? {},
      mudMap: safeParse(row.mud_map_json) ?? {},
      notesAndRecommendations: safeParse(row.notes_recommendations_json) ?? {},

      // Progress snapshot (so UI can show DB-accurate progress)
      progress_complete_items: Number(row.progress_complete_items ?? 0),
      progress_total_items: Number(row.progress_total_items ?? 0),
      progress_pct: Number(row.progress_pct ?? 0),
      submitted_at: row.submitted_at ?? null,
      updated_at: row.updated_at ?? null,
    };
  }

  // Build a plain object to merge into `prefill` (exclude the progress fields)
  const onfieldPrefillData = onfieldForm
    ? {
      customerInfo: onfieldForm.customerInfo,
      systemInfo: onfieldForm.systemInfo,
      propertyInfo: onfieldForm.propertyInfo,
      roofAssessment: onfieldForm.roofAssessment,
      electrical: onfieldForm.electrical,
      photos: onfieldForm.photos,
      flags: onfieldForm.flags,
      actions: onfieldForm.actions,
      safetyReminders: onfieldForm.safetyReminders,
      installationChecklist: onfieldForm.installationChecklist,
      jobDetails: onfieldForm.jobDetails,
      switchboard: onfieldForm.switchboard,
      subBoard: onfieldForm.subBoard,
      inverterLocation: onfieldForm.inverterLocation,
      batteryDetails: onfieldForm.batteryDetails,
      monitoring: onfieldForm.monitoring,
      existingSystem: onfieldForm.existingSystem,
      roofProfile: onfieldForm.roofProfile,
      mudMap: onfieldForm.mudMap,
      notesAndRecommendations: onfieldForm.notesAndRecommendations,
    }
    : {};

  // response
  return {
    siteVisit: {
      ...siteVisit,
      scheduledDate,
      scheduledTime,
    },
    project: {
      id: siteVisit.project_id,
      name: siteVisit.project_name,
      customer: safeParse(siteVisit.customer_snapshot_json),
      system: safeParse(siteVisit.system_snapshot_json),
      property: safeParse(siteVisit.property_snapshot_json),
      energy: safeParse(siteVisit.energy_snapshot_json),
      projectDetails,
      metadata: mergedMetadata,
    },
    retailerForm,
    onfieldForm,
    prefill: {
      ...basePrefill,
      ...salesSiteVisitData,
      ...onfieldPrefillData,
      scheduledDate,
      scheduledTime,
    },
  };
}

async function getSiteVisitPrefillOld(db: D1Database, siteVisitId: number) {
  const siteVisit = await db
    .prepare(
      `SELECT sv.*, 
              p.name AS project_name, 
              p.customer_snapshot_json, 
              p.system_snapshot_json,
              p.property_snapshot_json, 
              p.energy_snapshot_json,
              p.project_details_json
       FROM site_visits sv
       JOIN projects p ON p.id = sv.project_id
       WHERE sv.id = ?`,
    )
    .bind(siteVisitId)
    .first<Record<string, unknown>>();

  if (!siteVisit) return null;

  // Fetch retailer card metadata separately to avoid ambiguous id issues
  let cardMetadataJson: string | null = null;
  try {
    const cardRow = await db
      .prepare(
        `SELECT id as card_id, metadata_json 
         FROM project_board_cards 
         WHERE project_id = ? 
         AND board_column_id IN (SELECT id FROM project_board_columns WHERE board_type = 'retailer')
         ORDER BY card_id DESC
         LIMIT 1`,
      )
      .bind(siteVisit.project_id as number)
      .first<{ card_id: number; metadata_json: string | null }>();
    cardMetadataJson = cardRow?.metadata_json || null;
  } catch (err) {
    console.warn('Failed to fetch retailer card metadata for prefill:', err);
  }

  // Format scheduled date and time from Unix timestamp
  let scheduledDate = '';
  let scheduledTime = '';
  if (siteVisit.scheduled_start && typeof siteVisit.scheduled_start === 'number') {
    const date = new Date(siteVisit.scheduled_start * 1000);
    scheduledDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    scheduledTime = `${hours}:${minutes}`;
  }

  // If this is an electrician visit, fetch the parent sales site visit form data
  let salesSiteVisitData: Record<string, unknown> = {};
  if (siteVisit.visit_type === 'electrician') {
    // Find the parent sales site visit
    const parentSalesVisit = await db
      .prepare(`SELECT id FROM site_visits WHERE project_id = ? AND visit_type = 'sales' ORDER BY created_at DESC LIMIT 1`)
      .bind(siteVisit.project_id)
      .first<{ id: number }>();

    if (parentSalesVisit) {
      // Get the sales site visit form data
      const salesForm = await db
        .prepare(
          `SELECT f.basic_info_json, f.system_info_json, f.energy_info_json, f.property_details_json, f.checklist_json
           FROM sales_site_visit_forms f
           WHERE f.site_visit_id = ?`
        )
        .bind(parentSalesVisit.id)
        .first<Record<string, unknown>>();

      if (salesForm) {
        const basicInfo = safeParse(salesForm.basic_info_json) ?? {};
        const systemInfo = safeParse(salesForm.system_info_json) ?? {};
        const energyInfo = safeParse(salesForm.energy_info_json) ?? {};
        const propertyDetails = safeParse(salesForm.property_details_json) ?? {};
        const assessmentInfo = safeParse(salesForm.checklist_json) ?? {};
        const additionalInfo = propertyDetails.additionalInfo ?? {};
        const electricianSchedule = propertyDetails.electricianSchedule ?? {};

        salesSiteVisitData = {
          basicInfo: basicInfo,
          systemInfo: systemInfo,
          energyInfo: energyInfo,
          propertyDetails: propertyDetails,
          assessmentInfo: assessmentInfo,
          additionalInfo: additionalInfo,
          // scheduledDate and scheduledTime are already set from siteVisit.scheduled_start above
          // which is the authoritative source (converted from electrician schedule)
        };
      }
    }
  }

  const basePrefill = safeParse(siteVisit.prefill_snapshot_json) ?? {};
  const projectDetails = safeParse(siteVisit.project_details_json) ?? {};
  const cardMetadata = safeParse(cardMetadataJson) ?? {};
  // Merge project details into metadata so downstream consumers (old UIs) can prefill client fields
  const mergedMetadata = { ...cardMetadata, ...projectDetails };
  let retailerForm: Record<string, unknown> | null = null;

  if (siteVisit.visit_type === 'retailer') {
    const formRow = await db
      .prepare(
        `SELECT customer_info_json, system_info_json, property_info_json, roof_assessment_json, additional_fields_json
         FROM retailer_site_visit_forms
         WHERE site_visit_id = ?
         ORDER BY site_visit_id DESC
         LIMIT 1`,
      )
      .bind(siteVisitId)
      .first<{
        customer_info_json: string | null;
        system_info_json: string | null;
        property_info_json: string | null;
        roof_assessment_json: string | null;
        additional_fields_json: string | null;
      }>();

    if (formRow) {
      retailerForm = {
        customerInfo: safeParse(formRow.customer_info_json),
        systemInfo: safeParse(formRow.system_info_json),
        propertyInfo: safeParse(formRow.property_info_json),
        roofAssessment: safeParse(formRow.roof_assessment_json),
        additionalFields: safeParse(formRow.additional_fields_json),
      };
    }
  }

  return {
    siteVisit: {
      ...siteVisit,
      scheduledDate,
      scheduledTime,
    },
    project: {
      id: siteVisit.project_id,
      name: siteVisit.project_name,
      customer: safeParse(siteVisit.customer_snapshot_json),
      system: safeParse(siteVisit.system_snapshot_json),
      property: safeParse(siteVisit.property_snapshot_json),
      energy: safeParse(siteVisit.energy_snapshot_json),
      projectDetails,
      metadata: mergedMetadata,
    },
    retailerForm,
    prefill: {
      ...basePrefill,
      ...salesSiteVisitData,
      scheduledDate,
      scheduledTime,
    },
  };
}

async function completeSiteVisit(
  db: D1Database,
  opts: { siteVisitId: number; formType: FormType; payload: Record<string, unknown>; projectTargetColumnSlug: string | null },
) {

  // Fetch owning project + visit type to route logic and later updates
  const visit = await db
    .prepare(`SELECT project_id, visit_type FROM site_visits WHERE id = ?`)
    .bind(opts.siteVisitId)
    .first<{ project_id: number; visit_type: string }>();

  if (!visit) throw new Error('Site visit not found');

  // Mark the visit completed up-front (single source of truth for status)

  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(`UPDATE site_visits SET status = 'completed', updated_at = ? WHERE id = ?`)
    .bind(now, opts.siteVisitId)
    .run();
  //store the full payload in multiple JSON columns depending on formType
  const payloadJson = JSON.stringify(opts.payload);
  switch (opts.formType) {
    case 'sales':
      await db
        .prepare(
          `INSERT INTO sales_site_visit_forms (
            site_visit_id, basic_info_json, system_info_json, energy_info_json, property_details_json, checklist_json, submitted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(site_visit_id) DO UPDATE SET
            basic_info_json = excluded.basic_info_json,
            system_info_json = excluded.system_info_json,
            energy_info_json = excluded.energy_info_json,
            property_details_json = excluded.property_details_json,
            checklist_json = excluded.checklist_json,
            submitted_at = excluded.submitted_at`,
        )
        .bind(
          opts.siteVisitId,
          payloadJson,
          payloadJson,
          payloadJson,
          payloadJson,
          payloadJson,
          now,
        )
        .run();
      break;

    // Persist on-field JSONs. We only include the columns currently used by

    case 'onfield':
      await db
        .prepare(
          `INSERT INTO onfield_site_inspection_forms (
            site_visit_id, customer_info_json, system_info_json, property_info_json,
            roof_assessment_json, electrical_json, photos_json, submitted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(site_visit_id) DO UPDATE SET
            customer_info_json = excluded.customer_info_json,
            system_info_json = excluded.system_info_json,
            property_info_json = excluded.property_info_json,
            roof_assessment_json = excluded.roof_assessment_json,
            electrical_json = excluded.electrical_json,
            photos_json = excluded.photos_json,
            submitted_at = excluded.submitted_at`,
        )
        .bind(
          opts.siteVisitId,
          payloadJson,
          payloadJson,
          payloadJson,
          payloadJson,
          payloadJson,
          payloadJson,
          now,
        )
        .run();
      await db
        .prepare(`UPDATE projects SET onfield_site_inspection_status = 'completed' WHERE id = ?`)
        .bind(visit.project_id)
        .run();
      break;

    case 'retailer':
      // Persist retailer JSON sections; same upsert pattern as above.
      await db
        .prepare(
          `INSERT INTO retailer_site_visit_forms (
            site_visit_id, customer_info_json, system_info_json, property_info_json,
            roof_assessment_json, additional_fields_json, submitted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(site_visit_id) DO UPDATE SET
            customer_info_json = excluded.customer_info_json,
            system_info_json = excluded.system_info_json,
            property_info_json = excluded.property_info_json,
            roof_assessment_json = excluded.roof_assessment_json,
            additional_fields_json = excluded.additional_fields_json,
            submitted_at = excluded.submitted_at`,
        )
        .bind(
          opts.siteVisitId,
          payloadJson,
          payloadJson,
          payloadJson,
          payloadJson,
          payloadJson,
          now,
        )
        .run();

      // Mark site inspection as completed on project_details and card metadata for visibility
      try {
        const currentProject = await db
          .prepare(`SELECT project_details_json FROM projects WHERE id = ?`)
          .bind(visit.project_id)
          .first<{ project_details_json: string | null }>();

        let projectDetails: Record<string, unknown> = {};
        if (currentProject?.project_details_json) {
          try {
            projectDetails =
              typeof currentProject.project_details_json === 'string'
                ? JSON.parse(currentProject.project_details_json)
                : (currentProject.project_details_json as any) ?? {};
          } catch {
            projectDetails = {};
          }
        }
        projectDetails.siteInspectionStatus = 'completed';

        await db
          .prepare(`UPDATE projects SET project_details_json = ? WHERE id = ?`)
          .bind(JSON.stringify(projectDetails), visit.project_id)
          .run();

        const card = await db
          .prepare(
            `SELECT pbc.id, pbc.metadata_json
             FROM project_board_cards pbc
             JOIN project_board_columns col ON col.id = pbc.board_column_id
             WHERE pbc.project_id = ? AND col.board_type = 'retailer'
             LIMIT 1`,
          )
          .bind(visit.project_id)
          .first<{ id: number; metadata_json: string | null }>();

        if (card?.id) {
          let metadata: Record<string, unknown> = {};
          if (card.metadata_json) {
            try {
              metadata =
                typeof card.metadata_json === 'string'
                  ? JSON.parse(card.metadata_json)
                  : (card.metadata_json as any) ?? {};
            } catch {
              metadata = {};
            }
          }
          metadata.siteInspectionStatus = 'completed';

          await db
            .prepare(`UPDATE project_board_cards SET metadata_json = ? WHERE id = ?`)
            .bind(JSON.stringify(metadata), card.id)
            .run();
        }
      } catch (statusUpdateError) {
        console.warn('Failed to update site inspection status metadata:', statusUpdateError);
      }
      break;
  }

  if (opts.projectTargetColumnSlug) {
    await moveProjectToColumn(db, {
      projectId: visit.project_id,
      boardType: 'sales',
      targetColumnSlug: opts.projectTargetColumnSlug,
      actorId: null,
    });
  }
}


async function completeSiteVisitNewForm(
  db: D1Database,
  opts: {
    siteVisitId: number;
    formType: FormType;
    payload: Record<string, unknown>;
    projectTargetColumnSlug: string | null;
    isDraft?: boolean;
  },
) {
  const visit = await db
    .prepare(`SELECT project_id FROM site_visits WHERE id = ?`)
    .bind(opts.siteVisitId)
    .first<{ project_id: number }>();

  if (!visit) {
    throw new Error('Site visit not found');
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = opts.payload as any;

  // Mark visit completed only when submitting (not when saving draft)
  if (!opts.isDraft) {
    await db
      .prepare(`UPDATE site_visits SET status = 'completed', updated_at = ? WHERE id = ?`)
      .bind(now, opts.siteVisitId)
      .run();
  } else {
    await db
      .prepare(`UPDATE site_visits SET updated_at = ? WHERE id = ?`)
      .bind(now, opts.siteVisitId)
      .run();
  }

  switch (opts.formType) {
    /* ───────────────────────── SALES ───────────────────────── */
    case 'sales': {
      const {
        siteInfo,
        customerInfo,
        systemInfo,
        energyInfo,
        propertyInfo,
        installationChecklist,
        progress,
      } = payload;

      await db
        .prepare(`
          INSERT INTO sales_site_visit_forms (
            site_visit_id,
            basic_info_json,
            customer_info_json,
            system_info_json,
            energy_info_json,
            property_details_json,
            checklist_json,
            progress_complete_items,
            progress_total_items,
            progress_pct,
            submitted_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(site_visit_id) DO UPDATE SET
            basic_info_json = excluded.basic_info_json,
            customer_info_json = excluded.customer_info_json,
            system_info_json = excluded.system_info_json,
            energy_info_json = excluded.energy_info_json,
            property_details_json = excluded.property_details_json,
            checklist_json = excluded.checklist_json,
            progress_complete_items = excluded.progress_complete_items,
            progress_total_items = excluded.progress_total_items,
            progress_pct = excluded.progress_pct,
            updated_at = excluded.updated_at
        `)
        .bind(
          opts.siteVisitId,
          JSON.stringify(siteInfo ?? {}),
          JSON.stringify(customerInfo ?? {}),
          JSON.stringify(systemInfo ?? {}),
          JSON.stringify(energyInfo ?? {}),
          JSON.stringify(propertyInfo ?? {}),
          JSON.stringify(installationChecklist ?? []),
          progress?.completeItems ?? 0,
          progress?.totalItems ?? 0,
          progress?.percent ?? 0,
          now,
          now,
        )
        .run();

      break;
    }


    case 'onfield': {
      const {
        customerInfo,
        systemInfo,
        propertyInfo,
        roofAssessment,
        electrical,
        photos,
        flags,
        actions,
        safetyReminders,
        installationChecklist,
        jobDetails,
        switchboard,
        subBoard,
        inverterLocation,
        batteryDetails,
        monitoring,
        existingSystem,
        roofProfile,
        mudMap,
        notesAndRecommendations,
        salesAssessment,             // ← may carry shadingAssessment fields from UI
        progress,
      } = payload;

      // Always pass strings to D1 (no undefined)
      const J = (v: any, def: any = {}) => JSON.stringify(v ?? def);

      // Merge “Shading Assessment” into the roof payload that we persist
      const roofAssessmentToSave = {
        ...(roofAssessment ?? {}),
        shadingAssessment: Array.isArray(salesAssessment?.shadingAssessment)
          ? salesAssessment.shadingAssessment
          : (roofAssessment?.shadingAssessment ?? []),
        shadingAssessmentOther:
          typeof salesAssessment?.shadingAssessmentOther === 'string'
            ? salesAssessment.shadingAssessmentOther
            : (roofAssessment?.shadingAssessmentOther ?? ''),
      };

      const submittedAt = opts.isDraft ? null : now;
      await db
        .prepare(`
      INSERT INTO onfield_site_inspection_forms (
        site_visit_id,
        customer_info_json,
        system_info_json,
        property_info_json,
        roof_assessment_json,
        electrical_json,
        photos_json,
        flags_json,
        actions_json,
        safety_reminders_json,
        installation_checklist_json,
        job_details_json,
        switchboard_json,
        sub_board_json,
        inverter_location_json,
        battery_details_json,
        monitoring_json,
        existing_system_json,
        roof_profile_json,
        mud_map_json,
        notes_recommendations_json,
        progress_complete_items,
        progress_total_items,
        progress_pct,
        submitted_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(site_visit_id) DO UPDATE SET
        customer_info_json          = excluded.customer_info_json,
        system_info_json            = excluded.system_info_json,
        property_info_json          = excluded.property_info_json,
        roof_assessment_json        = excluded.roof_assessment_json,
        electrical_json             = excluded.electrical_json,
        photos_json                 = excluded.photos_json,
        flags_json                  = excluded.flags_json,
        actions_json                = excluded.actions_json,
        safety_reminders_json       = excluded.safety_reminders_json,
        installation_checklist_json = excluded.installation_checklist_json,
        job_details_json            = excluded.job_details_json,
        switchboard_json            = excluded.switchboard_json,
        sub_board_json              = excluded.sub_board_json,
        inverter_location_json      = excluded.inverter_location_json,
        battery_details_json        = excluded.battery_details_json,
        monitoring_json             = excluded.monitoring_json,
        existing_system_json        = excluded.existing_system_json,
        roof_profile_json           = excluded.roof_profile_json,
        mud_map_json                = excluded.mud_map_json,
        notes_recommendations_json  = excluded.notes_recommendations_json,
        progress_complete_items     = excluded.progress_complete_items,
        progress_total_items        = excluded.progress_total_items,
        progress_pct                = excluded.progress_pct,
        submitted_at                = excluded.submitted_at,
        updated_at                  = excluded.updated_at
    `)
        .bind(
          opts.siteVisitId,
          J(customerInfo, {}),
          J(systemInfo, {}),
          J(propertyInfo, {}),
          J(roofAssessmentToSave, {}),           // ← includes shadingAssessment + other
          J(electrical, {}),                     // ← hazards block
          J(photos, []),
          J(flags, []),
          J(actions, []),
          J(safetyReminders, []),
          J(installationChecklist, []),
          J(jobDetails, {}),
          J(switchboard, {}),
          J(subBoard, {}),
          J(inverterLocation, {}),
          J(batteryDetails, {}),
          J(monitoring, {}),
          J(existingSystem, {}),
          J(roofProfile, {}),
          J(mudMap, {}),
          J(notesAndRecommendations, {}),
          Number(progress?.completeItems ?? 0),
          Number(progress?.totalItems ?? 0),
          Number(progress?.percent ?? 0),
          submittedAt,
          now,
        )
        .run();

      if (!opts.isDraft) {
        await db
          .prepare(`UPDATE projects SET onfield_site_inspection_status = 'completed' WHERE id = ?`)
          .bind(visit.project_id)
          .run();
      }

      break;
    }

    /* ─────────────────────── RETAILER ─────────────────────── */
    case 'retailer': {
      const {
        customerInfo,
        systemInfo,
        propertyInfo,
        roofAssessment,
        additionalFields,
        flags,
        actions,
        progress,
      } = payload;

      await db
        .prepare(`
          INSERT INTO retailer_site_visit_forms (
            site_visit_id,
            customer_info_json,
            system_info_json,
            property_info_json,
            roof_assessment_json,
            additional_fields_json,
            flags_json,
            actions_json,
            progress_complete_items,
            progress_total_items,
            progress_pct,
            submitted_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(site_visit_id) DO UPDATE SET
            customer_info_json = excluded.customer_info_json,
            system_info_json = excluded.system_info_json,
            property_info_json = excluded.property_info_json,
            roof_assessment_json = excluded.roof_assessment_json,
            additional_fields_json = excluded.additional_fields_json,
            flags_json = excluded.flags_json,
            actions_json = excluded.actions_json,
            progress_complete_items = excluded.progress_complete_items,
            progress_total_items = excluded.progress_total_items,
            progress_pct = excluded.progress_pct,
            updated_at = excluded.updated_at
        `)
        .bind(
          opts.siteVisitId,
          JSON.stringify(customerInfo ?? {}),
          JSON.stringify(systemInfo ?? {}),
          JSON.stringify(propertyInfo ?? {}),
          JSON.stringify(roofAssessment ?? {}),
          JSON.stringify(additionalFields ?? {}),
          JSON.stringify(flags ?? []),
          JSON.stringify(actions ?? []),
          progress?.completeItems ?? 0,
          progress?.totalItems ?? 0,
          progress?.percent ?? 0,
          now,
          now,
        )
        .run();

      /* Update project + board metadata */
      const project = await db
        .prepare(`SELECT project_details_json FROM projects WHERE id = ?`)
        .bind(visit.project_id)
        .first<{ project_details_json: string | null }>();

      const projectDetails = project?.project_details_json
        ? JSON.parse(project.project_details_json)
        : {};

      projectDetails.siteInspectionStatus = 'completed';

      await db
        .prepare(`UPDATE projects SET project_details_json = ? WHERE id = ?`)
        .bind(JSON.stringify(projectDetails), visit.project_id)
        .run();

      const card = await db
        .prepare(`
          SELECT pbc.id, pbc.metadata_json
          FROM project_board_cards pbc
          JOIN project_board_columns col ON col.id = pbc.board_column_id
          WHERE pbc.project_id = ? AND col.board_type = 'retailer'
          LIMIT 1
        `)
        .bind(visit.project_id)
        .first<{ id: number; metadata_json: string | null }>();

      if (card?.id) {
        const metadata = card.metadata_json ? JSON.parse(card.metadata_json) : {};
        metadata.siteInspectionStatus = 'completed';

        await db
          .prepare(`UPDATE project_board_cards SET metadata_json = ? WHERE id = ?`)
          .bind(JSON.stringify(metadata), card.id)
          .run();
      }

      break;
    }
  }

  /* Optional board move */
  if (opts.projectTargetColumnSlug) {
    await moveProjectToColumn(db, {
      projectId: visit.project_id,
      boardType: 'sales',
      targetColumnSlug: opts.projectTargetColumnSlug,
      actorId: null,
    });
  }
}

async function scheduleElectricianVisit(
  db: D1Database,
  opts: { parentSiteVisitId: number; scheduledStart: number; scheduledEnd: number | null; assignedUserId: number | null; legend: string },
) {
  const parent = await db
    .prepare(`SELECT project_id FROM site_visits WHERE id = ?`)
    .bind(opts.parentSiteVisitId)
    .first<{ project_id: number }>();
  if (!parent) throw new Error('Parent site visit not found');

  const result = await db
    .prepare(
      `INSERT INTO site_visits (
        project_id, visit_type, status, scheduled_start, scheduled_end, assigned_user_id, prefill_snapshot_json
      ) VALUES (?, 'electrician', 'scheduled', ?, ?, ?, (SELECT prefill_snapshot_json FROM site_visits WHERE id = ?))
      RETURNING id`,
    )
    .bind(parent.project_id, opts.scheduledStart, opts.scheduledEnd, opts.assignedUserId, opts.parentSiteVisitId)
    .first<{ id: number }>();

  const siteVisitId = result?.id;
  if (!siteVisitId) throw new Error('Failed to schedule electrician visit');

  await db
    .prepare(
      `INSERT INTO calendar_events (
        project_id, site_visit_id, source_module, legend, starts_at, ends_at, published
      ) VALUES (?, ?, 'onfield', ?, ?, ?, 1)`,
    )
    .bind(parent.project_id, siteVisitId, opts.legend, opts.scheduledStart, opts.scheduledEnd)
    .run();

  return siteVisitId;
}

type SalesSiteVisitFormPayload = {
  basicInfo?: Record<string, unknown>;
  systemInfo?: Record<string, unknown>;
  energyInfo?: Record<string, unknown>;
  propertyInfo?: Record<string, unknown>;
  assessmentInfo?: Record<string, unknown>;
  additionalInfo?: Record<string, unknown>;
  electricianSchedule?: {
    date?: string;
    time?: string;
    visitDate?: string; // Mobile app field name
    visitTime?: string; // Mobile app field name
    assignedUserId?: number;
    notes?: string;
  };
};

async function saveSalesSiteVisit(
  db: D1Database,
  opts: { projectId: number; siteVisitId: number | null; status: 'draft' | 'submitted'; form: SalesSiteVisitFormPayload },
) {
  const project = await db
    .prepare(`SELECT id, name FROM projects WHERE id = ?`)
    .bind(opts.projectId)
    .first<{ id: number; name: string }>();
  if (!project) {
    throw new Error('Project not found');
  }

  const siteVisitStatus = opts.status === 'submitted' ? 'completed' : 'scheduled';
  // Handle both field name variations: 'date'/'time' (web) and 'visitDate'/'visitTime' (mobile)
  const electricianDate = opts.form.electricianSchedule?.date || opts.form.electricianSchedule?.visitDate;
  const electricianTime = opts.form.electricianSchedule?.time || opts.form.electricianSchedule?.visitTime;
  const scheduledStart = toUnixTimestamp(electricianDate, electricianTime);
  const assignedUserId =
    typeof opts.form.electricianSchedule?.assignedUserId === 'number' ? opts.form.electricianSchedule?.assignedUserId : null;

  let siteVisitId = opts.siteVisitId ?? null;
  if (siteVisitId) {
    const existing = await db
      .prepare(`SELECT id FROM site_visits WHERE id = ? AND visit_type = 'sales'`)
      .bind(siteVisitId)
      .first<{ id: number }>();
    if (!existing) {
      throw new Error('Site visit not found');
    }
    await db
      .prepare(
        `UPDATE site_visits
         SET status = ?, scheduled_start = COALESCE(?, scheduled_start), scheduled_end = COALESCE(?, scheduled_end),
             assigned_user_id = COALESCE(?, assigned_user_id), updated_at = (strftime('%s','now'))
         WHERE id = ?`,
      )
      .bind(siteVisitStatus, scheduledStart, scheduledStart, assignedUserId, siteVisitId)
      .run();
  } else {
    const insertResult = await db
      .prepare(
        `INSERT INTO site_visits (
          project_id, visit_type, status, scheduled_start, scheduled_end, assigned_user_id, prefill_snapshot_json
        ) VALUES (?, 'sales', ?, ?, ?, ?, ?)
        RETURNING id`,
      )
      .bind(
        opts.projectId,
        siteVisitStatus,
        scheduledStart,
        scheduledStart,
        assignedUserId,
        stringifyOrNull(opts.form.basicInfo),
      )
      .first<{ id: number }>();
    if (!insertResult?.id) {
      throw new Error('Unable to create site visit');
    }
    siteVisitId = insertResult.id;
  }

  const propertyDetails = {
    ...(opts.form.propertyInfo ?? {}),
    additionalInfo: opts.form.additionalInfo ?? {},
    electricianSchedule: opts.form.electricianSchedule ?? {},
  };
  const submittedAt = opts.status === 'submitted' ? Math.floor(Date.now() / 1000) : null;

  await db
    .prepare(
      `INSERT INTO sales_site_visit_forms (
        site_visit_id, basic_info_json, system_info_json, energy_info_json, property_details_json, checklist_json, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(site_visit_id) DO UPDATE SET
        basic_info_json = excluded.basic_info_json,
        system_info_json = excluded.system_info_json,
        energy_info_json = excluded.energy_info_json,
        property_details_json = excluded.property_details_json,
        checklist_json = excluded.checklist_json,
        submitted_at = excluded.submitted_at`,
    )
    .bind(
      siteVisitId,
      stringifyOrNull(opts.form.basicInfo ?? {}),
      stringifyOrNull(opts.form.systemInfo ?? {}),
      stringifyOrNull(opts.form.energyInfo ?? {}),
      stringifyOrNull(propertyDetails),
      stringifyOrNull(opts.form.assessmentInfo ?? {}),
      submittedAt,
    )
    .run();

  // If electrician schedule is provided and form is submitted, create electrician site visit and calendar event
  // Handle both field name variations: 'date'/'time' (web) and 'visitDate'/'visitTime' (mobile)
  if (opts.status === 'submitted' && electricianDate && electricianTime) {
    const electricianScheduledStart = toUnixTimestamp(electricianDate, electricianTime);
    const electricianScheduledEnd = electricianScheduledStart ? electricianScheduledStart + 3600 : null; // 1 hour duration

    if (electricianScheduledStart) {
      try {
        await scheduleElectricianVisit(db, {
          parentSiteVisitId: siteVisitId,
          scheduledStart: electricianScheduledStart,
          scheduledEnd: electricianScheduledEnd,
          assignedUserId: assignedUserId,
          legend: 'Electrician Site Visit',
        });
      } catch (error) {
        // Log error but don't fail the main save operation
        console.error('Failed to schedule electrician visit:', error);
      }
    }
  }

  return {
    siteVisitId,
    status: siteVisitStatus,
    submittedAt,
  };
}

async function listSalesSiteVisits(
  db: D1Database,
  opts: { status?: 'draft' | 'submitted' },
) {
  const clauses = [`sv.visit_type = 'sales'`];
  if (opts.status === 'draft') {
    clauses.push('f.submitted_at IS NULL');
  } else if (opts.status === 'submitted') {
    clauses.push('f.submitted_at IS NOT NULL');
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await db
    .prepare(
      `SELECT
         sv.id,
         sv.project_id,
         sv.status,
         sv.updated_at,
         p.name AS project_name,
         f.basic_info_json,
         f.system_info_json,
         f.energy_info_json,
         f.property_details_json,
         f.checklist_json,
         f.submitted_at
       FROM site_visits sv
       LEFT JOIN sales_site_visit_forms f ON f.site_visit_id = sv.id
       LEFT JOIN projects p ON p.id = sv.project_id
       ${where}
       ORDER BY COALESCE(f.submitted_at, sv.updated_at, sv.created_at) DESC`,
    )
    .all();

  return (rows.results ?? []).map((row: any) => {
    const propertyDetails = safeParse(row.property_details_json) ?? {};
    const assessmentInfo = safeParse(row.checklist_json) ?? {};

    // Extract additionalInfo and electricianSchedule from propertyDetails
    const additionalInfo = propertyDetails.additionalInfo ?? {};
    const electricianSchedule = propertyDetails.electricianSchedule ?? {};

    // Remove additionalInfo and electricianSchedule from propertyDetails to avoid duplication
    const { additionalInfo: _, electricianSchedule: __, ...cleanPropertyDetails } = propertyDetails;

    return {
      siteVisitId: row.id,
      projectId: row.project_id,
      projectName: row.project_name,
      status: row.status,
      submittedAt: row.submitted_at,
      basicInfo: safeParse(row.basic_info_json) ?? {},
      systemInfo: safeParse(row.system_info_json) ?? {},
      energyInfo: safeParse(row.energy_info_json) ?? {},
      propertyDetails: cleanPropertyDetails,
      assessmentInfo: assessmentInfo,
      additionalInfo: additionalInfo,
      electricianSchedule: electricianSchedule,
      updatedAt: row.updated_at,
    };
  });
}

async function listOnFieldSiteVisits(
  db: D1Database,
  opts: { status?: 'draft' | 'submitted' },
) {
  const clauses = [`sv.visit_type IN ('electrician', 'onfield')`];
  if (opts.status === 'draft') {
    clauses.push('f.submitted_at IS NULL');
  } else if (opts.status === 'submitted') {
    clauses.push('f.submitted_at IS NOT NULL');
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await db
    .prepare(
      `SELECT
         sv.id,
         sv.project_id,
         sv.status,
         sv.updated_at,
         sv.visit_type,
         p.name AS project_name,
         p.onfield_site_inspection_status,
         f.customer_info_json,
         f.submitted_at
       FROM site_visits sv
       LEFT JOIN onfield_site_inspection_forms f ON f.site_visit_id = sv.id
       LEFT JOIN projects p ON p.id = sv.project_id
       ${where}
       ORDER BY COALESCE(f.submitted_at, sv.updated_at, sv.created_at) DESC`,
    )
    .all();

  return (rows.results ?? []).map((row: any) => {
    const payload = safeParse(row.customer_info_json) ?? {};

    return {
      siteVisitId: row.id,
      projectId: row.project_id,
      projectName: row.project_name,
      visitType: row.visit_type,
      status: row.status,
      inspectionStatus: row.onfield_site_inspection_status,
      submittedAt: row.submitted_at,
      siteInfo: (payload.siteInfo || {}) as Record<string, unknown>,
      customerInfo: (payload.customerInfo || {}) as Record<string, unknown>,
      systemInfo: (payload.systemInfo || {}) as Record<string, unknown>,
      propertyInfo: (payload.propertyInfo || {}) as Record<string, unknown>,
      energyInfo: (payload.energyInfo || {}) as Record<string, unknown>,
      safetyAssessment: (payload.safetyAssessment || {}) as Record<string, unknown>,
      electrical: (payload.electrical || {}) as Record<string, unknown>,
      roofAssessment: (payload.roofAssessment || {}) as Record<string, unknown>,
      installationRequirements: (payload.installationRequirements || {}) as Record<string, unknown>,
      notesAndRecommendations: (payload.notesAndRecommendations || {}) as Record<string, unknown>,
      safetyReminders: (Array.isArray(payload.safetyReminders) ? payload.safetyReminders : []) as string[],
      installationChecklist: (Array.isArray(payload.installationChecklist) ? payload.installationChecklist : []) as string[],
      photos: (Array.isArray(payload.photos) ? payload.photos : []) as Array<Record<string, unknown>>,
      updatedAt: row.updated_at,
    };
  });
}

async function listRetailerSiteVisits(
  db: D1Database,
  opts: { status?: 'draft' | 'submitted' },
) {
  const clauses = [`sv.visit_type = 'retailer'`];
  if (opts.status === 'draft') {
    clauses.push('f.submitted_at IS NULL');
  } else if (opts.status === 'submitted') {
    clauses.push('f.submitted_at IS NOT NULL');
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await db
    .prepare(
      `SELECT
         sv.id,
         sv.project_id,
         sv.status,
         sv.updated_at,
         sv.visit_type,
         p.name AS project_name,
         f.submitted_at
       FROM site_visits sv
       LEFT JOIN retailer_site_visit_forms f ON f.site_visit_id = sv.id
       LEFT JOIN projects p ON p.id = sv.project_id
       ${where}
       ORDER BY COALESCE(f.submitted_at, sv.updated_at, sv.created_at) DESC`,
    )
    .all();

  return (rows.results ?? []).map((row: any) => ({
    siteVisitId: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    visitType: row.visit_type,
    status: row.status,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  }));
}

function toUnixTimestamp(dateValue?: string, timeValue?: string) {
  if (!dateValue) return null;
  let yyyy = 0;
  let mm = 0;
  let dd = 0;

  // Support YYYY-MM-DD and DD/MM/YYYY inputs
  if (dateValue.includes('-')) {
    const parts = dateValue.split('-').map(Number);
    if (parts.length === 3) {
      [yyyy, mm, dd] = parts;
    }
  } else if (dateValue.includes('/')) {
    const parts = dateValue.split('/').map(Number);
    if (parts.length === 3) {
      [dd, mm, yyyy] = parts;
    }
  }

  if (!yyyy || !mm || !dd) return null;

  const [hour = 0, minute = 0] = timeValue ? timeValue.split(':').map(Number) : [0, 0];
  const localDate = new Date(yyyy, mm - 1, dd, hour, minute, 0, 0);
  const ms = localDate.getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 1000);
}

async function fetchCalendarEvents(
  db: D1Database,
  opts: { sourceModule: string; fromTs: number | null; toTs: number | null; userId?: number | null },
) {
  const clauses: string[] = ['ce.source_module = ?', 'ce.published = 1'];
  const bindings: Array<number | string> = [opts.sourceModule];

  if (opts.fromTs) {
    clauses.push('ce.starts_at >= ?');
    bindings.push(opts.fromTs);
  }
  if (opts.toTs) {
    clauses.push('ce.starts_at <= ?');
    bindings.push(opts.toTs);
  }

  if (opts.userId) {
    clauses.push(`(
      json_extract(COALESCE(p.project_details_json, '{}'), '$.assigneeId') IS NOT NULL
      AND json_type(json_extract(COALESCE(p.project_details_json, '{}'), '$.assigneeId')) = 'array'
      AND COALESCE(json_array_length(json_extract(COALESCE(p.project_details_json, '{}'), '$.assigneeId')), 0) > 0
      AND EXISTS (
        SELECT 1 FROM json_each(json_extract(COALESCE(p.project_details_json, '{}'), '$.assigneeId'))
        WHERE CAST(value AS TEXT) = ?
      )
    )`);
    bindings.push(String(opts.userId));
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const query = `SELECT ce.*, p.name AS project_name, p.category, sv.visit_type, p.property_snapshot_json, p.customer_snapshot_json
       FROM calendar_events ce
       JOIN projects p ON p.id = ce.project_id
       LEFT JOIN site_visits sv ON sv.id = ce.site_visit_id
       ${where}
       ORDER BY ce.starts_at ASC`;

  console.log('fetchCalendarEvents query:', {
    sourceModule: opts.sourceModule,
    fromTs: opts.fromTs,
    toTs: opts.toTs,
    where,
    bindings,
  });

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<Record<string, unknown>>();

  console.log(`fetchCalendarEvents returned ${result.results.length} events for sourceModule=${opts.sourceModule}`);
  if (result.results.length > 0) {
    console.log('Sample events:', result.results.slice(0, 5).map(e => ({
      id: e.id,
      project_id: e.project_id,
      project_name: e.project_name,
      category: e.category,
      legend: e.legend,
      source_module: e.source_module,
      starts_at: e.starts_at,
      starts_at_date: e.starts_at ? new Date(Number(e.starts_at) * 1000).toISOString() : null,
      visit_type: e.visit_type,
    })));
  }

  return result.results;
}

function safeParse(value: unknown) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function listAttendanceRecords(
  db: D1Database,
  opts: { userId: number; moduleScope: string | null },
) {
  const clauses = ['user_id = ?'];
  const bindings: Array<number | string> = [opts.userId];
  if (opts.moduleScope) {
    clauses.push('module_scope = ?');
    bindings.push(opts.moduleScope);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await db
    .prepare(
      `SELECT id, module_scope, check_in, check_out, location_json, notes
       FROM attendance_records
       ${where}
       ORDER BY check_in DESC
       LIMIT 100`,
    )
    .bind(...bindings)
    .all();
  return (rows.results ?? []).map((row: any) => ({
    id: row.id,
    moduleScope: row.module_scope,
    checkIn: row.check_in,
    checkOut: row.check_out,
    location: safeParse(row.location_json),
    notes: row.notes,
  }));
}

async function getPipelineColumnId(db: D1Database, boardType: BoardType, slug: string) {
  const column = await db
    .prepare(`SELECT id FROM pipeline_columns WHERE board_type = ? AND slug = ?`)
    .bind(boardType, slug)
    .first<{ id: number }>();
  if (!column) {
    throw new Error(`Missing pipeline column for ${boardType}:${slug}`);
  }
  return column.id;
}

async function syncSolarQuotesLeads(env: Env, startDateParam?: string, endDateParam?: string) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 7);

  const end = new Date(now);
  end.setDate(now.getDate() + 1);

  const startDate = startDateParam || start.toISOString().split('T')[0];
  const endDate = endDateParam || end.toISOString().split('T')[0];

  console.log(`[SolarQuotes] Fetching leads from ${startDate} to ${endDate}`);

  const login = "S730015";
  const passwordRaw = "Xtechs13245!";
  const passwordHash = md5(passwordRaw);

  const xmlPayload = `<?xml version='1.0'?>
<request>
 <login>${login}</login>
 <password>${passwordHash}</password>
 <startDate>${startDate}</startDate>
 <endDate>${endDate}</endDate>
</request>`;

  const response = await fetch('https://www.solarquotes.com.au/webservice/supplier/SupplierService.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
    },
    body: xmlPayload,
  });

  const responseText = await response.text();
  console.log(`[SolarQuotes] Response length: ${responseText.length}`);

  const parser = new XMLParser();
  const parsed = parser.parse(responseText);

  let leads: any[] = [];
  if (parsed?.response?.leads?.lead) {
    const rawLeads = parsed.response.leads.lead;
    leads = Array.isArray(rawLeads) ? rawLeads : [rawLeads];
  } else if (parsed?.leads?.lead) { // Direct leads root
    leads = Array.isArray(parsed.leads.lead) ? parsed.leads.lead : [parsed.leads.lead];
  } else if (parsed?.result?.lead) {
    const rawLeads = parsed.result.lead;
    leads = Array.isArray(rawLeads) ? rawLeads : [rawLeads];
  } else if (parsed?.response?.result?.lead) { // Potential nested result
    const rawLeads = parsed.response.result.lead;
    leads = Array.isArray(rawLeads) ? rawLeads : [rawLeads];
  }

  console.log(`[SolarQuotes] Found ${leads.length} leads to process`);
  if (leads.length > 0) {
    console.log('[SolarQuotes] Sample lead:', JSON.stringify(leads[0], null, 2));
    // Check specifically for the missing lead
    const specificLead = leads.find(l => (l.id == '1016709' || l.LeadID == '1016709' || l.ID == '1016709'));
    if (specificLead) {
      console.log('[SolarQuotes] FOUND SPECIFIC LEAD 1016709:', JSON.stringify(specificLead, null, 2));
    } else {
      console.log('[SolarQuotes] SPECIFIC LEAD 1016709 NOT FOUND in this batch');
    }
  }

  // Fuzzy helper to find value by partial key match (case-insensitive, ignoring spacing/underscores)
  function getValueFuzzy(obj: any, patterns: string[]): string {
    const keys = Object.keys(obj);
    for (const pattern of patterns) {
      const cleanPattern = pattern.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const key of keys) {
        const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanKey === cleanPattern || cleanKey.includes(cleanPattern)) {
          const val = obj[key];
          if (val && typeof val === 'string') return val.trim();
          if (val && typeof val === 'number') return String(val);
        }
      }
    }
    return '';
  }

  const results = [];
  for (const lead of leads) {
    if (leads.indexOf(lead) === 0) {
      console.log('[SolarQuotes] First lead keys:', Object.keys(lead).join(', '));
    }

    // Helper to map SolarQuotes roof type to frontend dropdown values
    function mapRoofType(raw: string): string | null {
      if (!raw) return null;
      const lower = raw.toLowerCase();
      if (lower.includes('tin') || lower.includes('colorbond') || lower.includes('colourbond')) {
        return lower.includes('klip') ? 'Tin (Kliplock)' : 'Tin (Colorbond)';
      }
      if (lower.includes('tile')) {
        return lower.includes('terracotta') ? 'Tile (Terracotta)' : 'Tile (Concrete)';
      }
      if (lower.includes('flat')) return 'Flat';
      return 'Other';
    }

    const leadId = getValueFuzzy(lead, ['id', 'leadid', 'lead_id']);
    const firstName = getValueFuzzy(lead, ['name', 'firstName', 'firstname']);
    const lastName = getValueFuzzy(lead, ['lastName', 'lastname']);
    const fullName = `${firstName} ${lastName}`.trim();
    const email = getValueFuzzy(lead, ['email']);
    const phone = getValueFuzzy(lead, ['phone']);

    const addressParts = [];
    const addr = getValueFuzzy(lead, ['address']);
    const suburb = getValueFuzzy(lead, ['suburb']);
    const state = getValueFuzzy(lead, ['state']);
    const postcode = getValueFuzzy(lead, ['postcode']);

    if (addr) addressParts.push(addr);
    if (suburb) addressParts.push(suburb);
    if (state) addressParts.push(state);
    if (postcode) addressParts.push(postcode);
    const address = addressParts.join(', ');

    const comments = getValueFuzzy(lead, ['comments', 'comment']);
    // Updated fuzzy logic based on XML
    const importantNotes = getValueFuzzy(lead, ['importantnotes', 'important_notes', 'anythingelse', 'anything_else', 'leadnotes', 'lead_notes', 'anything']);
    const systemSize = getValueFuzzy(lead, ['systemsize', 'system_size', 'size']);
    const rawRoofType = getValueFuzzy(lead, ['rooftype', 'roof_type', 'type_of_roof', 'typeofroof', 'roofmaterial', 'roof_material', 'roof']);
    const mappedRoofType = mapRoofType(rawRoofType);

    // Updated 'storeys'
    const stories = getValueFuzzy(lead, ['stories', 'storeys', 'house_storey', 'housestorey', 'storiescount', 'floors', 'how_many_storeys', 'howmanystoreys']);
    const battery = getValueFuzzy(lead, ['battery', 'have_battery', 'havebattery']);
    const features = getValueFuzzy(lead, ['features']);
    // Updated 'note'
    const staffNotes = getValueFuzzy(lead, ['note', 'staffnotes', 'staff_notes', 'notes_from_sq_staff', 'notesfromsqstaff']);

    const consolidatedNotes = [
      comments ? `Comments: ${comments}` : '',
      importantNotes ? `Important Notes: ${importantNotes}` : '',
      features ? `Features: ${features}` : '',
      battery ? `Have Battery: ${battery}` : '',
      // If roof type was 'Other' or unmapped, maybe mention it in notes?
      (rawRoofType && mappedRoofType === 'Other') ? `Original Roof Type: ${rawRoofType}` : ''
    ].filter(Boolean).join('\n\n');

    try {
      const result = (await createLeadWithProject(env.DB, {
        customerName: fullName || 'Unknown Customer',
        customerEmail: email,
        customerContact: phone,
        projectName: fullName || 'New Lead',
        systemSize: typeof systemSize === 'string' ? systemSize : String(systemSize),
        systemType: null,
        notes: consolidatedNotes,
        source: 'Solar Quotes',
        address: address,
        houseStorey: stories || null,
        roofType: mappedRoofType,
        externalId: String(leadId)
      })) as any;

      if (result.alreadyExists) {
        if (result.updated) {
          results.push({ leadId, status: 'skipped', message: 'Already imported (Updated)' });
        } else {
          results.push({ leadId, status: 'skipped', message: 'Already imported' });
        }
      } else {
        results.push({ leadId, status: 'imported', localId: result.leadId });
      }
    } catch (e) {
      console.error(`[SolarQuotes] Failed to import lead ${leadId}`, e);
      results.push({ leadId, status: 'failed', error: e instanceof Error ? e.message : String(e) });
    }
  }

  return { count: leads.length, results };
}

async function createLeadWithProject(
  db: D1Database,
  payload: {
    customerName: string;
    customerEmail: string | null;
    customerContact: string | null;
    projectName: string;
    systemSize: string | null;
    systemType: string | null;
    notes: string | null;
    source: string;
    houseStorey: string | null;
    roofType: string | null;
    address: string | null;
    externalId?: string | null;
    /** Full raw payload from external API (e.g. SolarQuotes) for display as miscellaneous data */
    externalPayload?: Record<string, unknown> | null;
  },
) {
  if (payload.externalId) {
    const existing = await db
      .prepare(`SELECT id FROM leads WHERE external_id = ?`)
      .bind(payload.externalId)
      .first<{ id: number }>();
    if (existing) {
      // Find the associated project
      const project = await db
        .prepare(`SELECT id, project_details_json, property_snapshot_json FROM projects WHERE lead_id = ?`)
        .bind(existing.id)
        .first<{ id: number; project_details_json: string | null; property_snapshot_json: string | null }>();

      if (project) {
        // Refresh project details and property snapshot
        let currentProjectDetails: any = {};
        try {
          currentProjectDetails = project.project_details_json ? JSON.parse(project.project_details_json) : {};
        } catch { /* ignore */ }

        let currentPropertySnapshot: any = {};
        try {
          currentPropertySnapshot = project.property_snapshot_json ? JSON.parse(project.property_snapshot_json) : {};
        } catch { /* ignore */ }

        // Merge updates
        const newProjectDetails = {
          ...currentProjectDetails,
          source: payload.source,
          notes: payload.notes
        };
        const newPropertySnapshot = {
          ...currentPropertySnapshot,
          houseStorey: payload.houseStorey,
          roofType: payload.roofType,
        };

        console.log(`[createLeadWithProject] Updating project ${project.id} notes to: ${payload.notes}`);

        await db
          .prepare(
            `UPDATE projects 
             SET project_details_json = ?,
                 property_snapshot_json = ?
             WHERE id = ?`,
          )
          .bind(JSON.stringify(newProjectDetails), JSON.stringify(newPropertySnapshot), project.id)
          .run();

        // Ensure project is on the sales board
        const columnId = await getPipelineColumnId(db, 'sales', 'new');
        await db
          .prepare(
            `INSERT INTO project_pipeline_state (project_id, board_type, column_id)
             VALUES (?, 'sales', ?)
             ON CONFLICT(project_id, board_type) DO NOTHING`,
          )
          .bind(project.id, columnId)
          .run();
      }
      return { alreadyExists: true, updated: !!project };
    }
  }

  const customerSnapshot = {
    customerName: payload.customerName,
    email: payload.customerEmail,
    phone: payload.customerContact,
    address: payload.address,
  };
  const systemSnapshot = {
    systemSizeKw: payload.systemSize,
    systemType: payload.systemType,
    source: payload.source,
  };
  const propertySnapshot = {
    houseStorey: payload.houseStorey,
    roofType: payload.roofType,
  };

  const marketingPayload = payload.externalPayload != null
    ? JSON.stringify({ ...payload.externalPayload, _imported_at: Date.now() })
    : JSON.stringify({ created_at: Date.now() });
  const lead = await db
    .prepare(
      `INSERT INTO leads (source, status, external_id, marketing_payload_json)
       VALUES (?, 'new', ?, ?)
       RETURNING id`,
    )
    .bind(payload.source, payload.externalId || null, marketingPayload)
    .first<{ id: number }>();
  if (!lead?.id) {
    throw new Error('Unable to create lead');
  }

  await db
    .prepare(
      `INSERT INTO lead_contacts (lead_id, full_name, email, phone)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(lead.id, payload.customerName, payload.customerEmail, payload.customerContact)
    .run();

  const project = await db
    .prepare(
      `INSERT INTO projects (
        lead_id, category, name, customer_snapshot_json, system_snapshot_json, property_snapshot_json, utility_snapshot_json, project_details_json, status
      ) VALUES (?, 'in_house', ?, ?, ?, ?, ?, ?, 'new')
      RETURNING id`,
    )
    .bind(
      lead.id,
      payload.projectName,
      JSON.stringify(customerSnapshot),
      JSON.stringify(systemSnapshot),
      JSON.stringify(propertySnapshot),
      JSON.stringify({}),
      JSON.stringify({ source: payload.source }),
    )
    .first<{ id: number }>();
  if (!project?.id) {
    throw new Error('Unable to create project');
  }

  const columnId = await getPipelineColumnId(db, 'sales', 'new');
  await db
    .prepare(
      `INSERT INTO project_pipeline_state (project_id, board_type, column_id)
       VALUES (?, 'sales', ?)
       ON CONFLICT(project_id, board_type)
       DO UPDATE SET column_id = excluded.column_id, updated_at = (strftime('%s','now'))`,
    )
    .bind(project.id, columnId)
    .run();

  return {
    leadId: lead.id,
    projectId: project.id,
  };
}

async function createRetailerProject(
  db: D1Database,
  payload: {
    projectName: string;
    projectCode?: string;
    customerName: string;
    customerEmail: string | null;
    customerContact: string | null;
    customerAddress: string | null;
    jobType: string;
    scheduledDate: string | null;
    scheduledTime: string | null;
    notes: string | null;
    systemSnapshot?: any;
    propertySnapshot?: any;
    projectDetails?: any;
  },
) {
  try {
    console.log('createRetailerProject called with payload:', {
      projectName: payload.projectName,
      jobType: payload.jobType,
      customerName: payload.customerName,
      hasSystemSnapshot: !!payload.systemSnapshot,
      hasPropertySnapshot: !!payload.propertySnapshot,
      hasProjectDetails: !!payload.projectDetails,
    });

    // Create project with retailer category
    const customerSnapshot = {
      customerName: payload.customerName,
      email: payload.customerEmail,
      phone: payload.customerContact,
      address: payload.customerAddress,
    };

    // Store project details (code, location, clientType, clientName, price, scheduledDate, scheduledTime)
    const projectDetails = payload.projectDetails || {};
    if (payload.projectCode && !projectDetails.projectCode) {
      projectDetails.projectCode = payload.projectCode;
    }
    if (payload.scheduledDate) {
      projectDetails.scheduledDate = payload.scheduledDate;
    }
    if (payload.scheduledTime) {
      projectDetails.scheduledTime = payload.scheduledTime;
    }

    // System snapshot
    const systemSnapshot = payload.systemSnapshot || {};

    // Property snapshot
    const propertySnapshot = payload.propertySnapshot || {};

    // Stringify JSON safely
    let customerSnapshotJson: string;
    let systemSnapshotJson: string;
    let propertySnapshotJson: string;
    let projectDetailsJson: string;

    try {
      customerSnapshotJson = JSON.stringify(customerSnapshot);
      systemSnapshotJson = JSON.stringify(systemSnapshot);
      propertySnapshotJson = JSON.stringify(propertySnapshot);
      projectDetailsJson = JSON.stringify(projectDetails);
    } catch (jsonError) {
      console.error('Error stringifying JSON:', jsonError);
      throw new Error(`Failed to serialize JSON: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
    }

    console.log('Attempting to insert project into database...');
    const projectResult = await db
      .prepare(
        `INSERT INTO projects (
          lead_id, category, name, customer_snapshot_json, system_snapshot_json, property_snapshot_json, project_details_json, status, installation_status
        ) VALUES (NULL, 'retailer', ?, ?, ?, ?, ?, 'active', 'not_scheduled')
        RETURNING id`,
      )
      .bind(
        payload.projectName,
        customerSnapshotJson,
        systemSnapshotJson,
        propertySnapshotJson,
        projectDetailsJson
      )
      .first<{ id: number }>();

    if (!projectResult) {
      console.error('Project insert returned no result');
      throw new Error('Failed to create retailer project - no ID returned');
    }

    const projectId = projectResult.id;
    console.log('Project created successfully with ID:', projectId);

    // Determine target column based on job type
    let targetColumnSlug = 'new';
    if (payload.jobType === 'site_inspection') {
      targetColumnSlug = 'site_inspection';
    } else if (payload.jobType === 'stage_one') {
      targetColumnSlug = 'stage_one';
    } else if (payload.jobType === 'stage_two') {
      targetColumnSlug = 'stage_two';
    } else if (payload.jobType === 'full_system') {
      targetColumnSlug = 'full_system';
    }

    console.log(`Determined target column slug: ${targetColumnSlug} for jobType: ${payload.jobType}`);

    // Add project to retailer board
    const columnResult = await db
      .prepare(`SELECT id FROM project_board_columns WHERE board_type = 'retailer' AND slug = ?`)
      .bind(targetColumnSlug)
      .first<{ id: number }>();

    if (!columnResult) {
      console.error(`Column not found for retailer board with slug: ${targetColumnSlug}`);
      // Try to list available columns for debugging
      const availableColumns = await db
        .prepare(`SELECT slug, label FROM project_board_columns WHERE board_type = 'retailer'`)
        .all<{ slug: string; label: string }>();
      console.error('Available retailer columns:', availableColumns.results);
      throw new Error(`Column not found: ${targetColumnSlug} for retailer board. Available: ${availableColumns.results.map(c => c.slug).join(', ')}`);
    }

    console.log(`Found column ID: ${columnResult.id} for slug: ${targetColumnSlug}`);

    try {
      // Ensure only one retailer card exists for this project before we insert
      await cleanupProjectBoardCards(db, 'retailer', projectId);

      const cardMetadata: any = {
        jobType: payload.jobType,
        notes: payload.notes || null,
      };
      if (payload.scheduledDate) {
        cardMetadata.scheduledDate = payload.scheduledDate;
      }
      if (payload.scheduledTime) {
        cardMetadata.scheduledTime = payload.scheduledTime;
      }
      // Carry through client context and commercial terms for downstream prefill
      if (projectDetails.clientType) cardMetadata.clientType = projectDetails.clientType;
      if (projectDetails.clientName) cardMetadata.clientName = projectDetails.clientName;
      if (projectDetails.price) cardMetadata.price = projectDetails.price;
      await db
        .prepare(
          `INSERT INTO project_board_cards (board_column_id, project_id, position, metadata_json)
           VALUES (?, ?, 0, ?)`,
        )
        .bind(columnResult.id, projectId, JSON.stringify(cardMetadata))
        .run();
      // Clean up again to guard against legacy duplicates that might exist
      await cleanupProjectBoardCards(db, 'retailer', projectId);
      console.log('Project board card created successfully');
    } catch (error) {
      console.error('Error inserting project board card:', error);
      // If it's a unique constraint error, that's okay - card already exists
      if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
        console.log('Project card already exists, continuing...');
      } else {
        throw error;
      }
    }

    // Also add to project_pipeline_state for consistency
    try {
      await db
        .prepare(
          `INSERT INTO project_pipeline_state (project_id, board_type, column_id)
           VALUES (?, 'retailer', ?)
           ON CONFLICT(project_id, board_type)
           DO UPDATE SET column_id = excluded.column_id, updated_at = (strftime('%s','now'))`,
        )
        .bind(projectId, columnResult.id)
        .run();
      console.log('Project pipeline state created/updated successfully');
    } catch (error) {
      console.error('Error inserting project pipeline state:', error);
      // Don't fail the whole operation if this fails
    }

    // If Site Inspection with date/time, create calendar event immediately
    // This makes the project visible in the On-Field Module calendar under Site Inspection column
    // Wrap in try-catch to prevent calendar event creation failures from blocking project creation
    if (payload.jobType === 'site_inspection' && payload.scheduledDate) {
      try {
        console.log('Creating calendar event for site inspection project:', {
          projectId,
          scheduledDate: payload.scheduledDate,
          scheduledTime: payload.scheduledTime,
        });

        // Convert date to YYYY-MM-DD format if needed (handle DD/MM/YYYY, MM/DD/YYYY, etc.)
        let normalizedDate: string | null = typeof payload.scheduledDate === 'string' ? payload.scheduledDate : null;
        if (typeof payload.scheduledDate === 'string') {
          // If already in YYYY-MM-DD format, use it
          if (/^\d{4}-\d{2}-\d{2}$/.test(payload.scheduledDate)) {
            normalizedDate = payload.scheduledDate;
          } else {
            // Try to parse other formats (DD/MM/YYYY, MM/DD/YYYY, etc.)
            try {
              // Handle DD/MM/YYYY format explicitly
              const ddmmyyyyMatch = payload.scheduledDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
              if (ddmmyyyyMatch) {
                const [, day, month, year] = ddmmyyyyMatch;
                normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                console.log('Converted DD/MM/YYYY format:', { from: payload.scheduledDate, to: normalizedDate });
              } else {
                // Try standard Date parsing for other formats
                const parsed = new Date(payload.scheduledDate);
                if (!isNaN(parsed.getTime())) {
                  const year = parsed.getFullYear();
                  const month = String(parsed.getMonth() + 1).padStart(2, '0');
                  const day = String(parsed.getDate()).padStart(2, '0');
                  normalizedDate = `${year}-${month}-${day}`;
                  console.log('Converted date format:', { from: payload.scheduledDate, to: normalizedDate });
                } else {
                  console.error('Could not parse date:', payload.scheduledDate);
                  throw new Error(`Invalid date format: ${payload.scheduledDate}`);
                }
              }
            } catch (parseError) {
              console.error('Date parsing error:', parseError);
              console.log('Skipping calendar event creation due to invalid date format');
              normalizedDate = null;
            }
          }
        } else {
          console.error('scheduledDate is not a string:', typeof payload.scheduledDate);
          normalizedDate = null;
        }

        if (normalizedDate && typeof normalizedDate === 'string') {
          const scheduledTime = (payload.scheduledTime as string) || '09:00';
          // Validate scheduledTime format (should be HH:MM)
          if (!/^\d{2}:\d{2}$/.test(scheduledTime)) {
            console.error('Invalid scheduledTime format:', scheduledTime);
            console.log('Using default time 09:00');
          }

          const scheduledStart = toUnixTimestamp(normalizedDate, scheduledTime);
          const scheduledEnd = scheduledStart ? scheduledStart + 3600 : null; // 1 hour default

          console.log('Calculated timestamps:', {
            scheduledStart,
            scheduledEnd,
            scheduledDate: payload.scheduledDate,
            scheduledTime: scheduledTime,
            scheduledStartDate: scheduledStart ? new Date(scheduledStart * 1000).toISOString() : null,
            scheduledEndDate: scheduledEnd ? new Date(scheduledEnd * 1000).toISOString() : null,
          });

          if (!scheduledStart) {
            console.error('Invalid scheduledStart timestamp - cannot create calendar event');
            console.error('Input values:', {
              scheduledDate: payload.scheduledDate,
              scheduledTime: scheduledTime,
            });
          } else {
            // Check if site visit already exists
            let siteVisitResult = await db
              .prepare(`SELECT id FROM site_visits WHERE project_id = ? AND visit_type = 'retailer'`)
              .bind(projectId)
              .first<{ id: number }>();

            if (!siteVisitResult) {
              // Create site visit record
              try {
                siteVisitResult = await db
                  .prepare(
                    `INSERT INTO site_visits (
                    project_id, visit_type, status, scheduled_start, scheduled_end
                  ) VALUES (?, 'retailer', 'scheduled', ?, ?)
                  RETURNING id`,
                  )
                  .bind(projectId, scheduledStart, scheduledEnd)
                  .first<{ id: number }>();

                console.log('Site visit created:', siteVisitResult);
              } catch (error) {
                console.error('Error creating site visit:', error);
                // Continue without site visit - calendar event can be created later
              }
            } else {
              console.log('Site visit already exists:', siteVisitResult.id);
              // Update the scheduled times
              try {
                await db
                  .prepare(`UPDATE site_visits SET scheduled_start = ?, scheduled_end = ? WHERE id = ?`)
                  .bind(scheduledStart, scheduledEnd, siteVisitResult.id)
                  .run();
              } catch (error) {
                console.error('Error updating site visit:', error);
              }
            }

            if (siteVisitResult) {
              // Check if calendar event already exists
              const existingEvent = await db
                .prepare(`SELECT id FROM calendar_events WHERE project_id = ? AND source_module = 'onfield'`)
                .bind(projectId)
                .first<{ id: number }>();

              if (existingEvent) {
                // Update existing calendar event
                try {
                  await db
                    .prepare(
                      `UPDATE calendar_events 
                     SET site_visit_id = ?, legend = 'Site Inspection (Retailer)', starts_at = ?, ends_at = ?, published = 1
                     WHERE id = ?`
                    )
                    .bind(siteVisitResult.id, scheduledStart, scheduledEnd, existingEvent.id)
                    .run();
                  console.log('Updated existing calendar event:', existingEvent.id);
                } catch (error) {
                  console.error('Error updating calendar event:', error);
                  // Don't throw - project creation should succeed even if calendar event update fails
                }
              } else {
                // Create calendar event for On-Field Module calendar
                // Legend "Site Inspection (Retailer)" will be displayed in purple color
                // Use 'onfield' as source_module so it appears in On-Field calendar
                try {
                  const calendarEventResult = await db
                    .prepare(
                      `INSERT INTO calendar_events (
                      project_id, site_visit_id, source_module, legend, starts_at, ends_at, published
                    ) VALUES (?, ?, 'onfield', 'Site Inspection (Retailer)', ?, ?, 1)
                    RETURNING id`,
                    )
                    .bind(projectId, siteVisitResult.id, scheduledStart, scheduledEnd)
                    .first<{ id: number }>();

                  console.log('Calendar event created successfully:', {
                    calendarEventId: calendarEventResult?.id,
                    projectId,
                    siteVisitId: siteVisitResult.id,
                    source_module: 'onfield',
                    legend: 'Site Inspection (Retailer)',
                    starts_at: scheduledStart,
                    starts_at_date: scheduledStart ? new Date(scheduledStart * 1000).toISOString() : null,
                    ends_at: scheduledEnd,
                    ends_at_date: scheduledEnd ? new Date(scheduledEnd * 1000).toISOString() : null,
                    published: 1,
                  });
                } catch (error) {
                  console.error('Error creating calendar event:', error);
                  console.error('Error details:', {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    projectId,
                    siteVisitId: siteVisitResult.id,
                    scheduledStart,
                    scheduledEnd,
                  });
                  // Don't throw - project creation should succeed even if calendar event creation fails
                  // The calendar event can be created later via a separate process or manual fix
                }
              }
            } else {
              console.warn('Site visit not available - calendar event will be created later if needed');
            }
          }
        }
      } catch (error) {
        // Log the error but don't fail the entire project creation
        console.error('Error in calendar event creation for site inspection project:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          projectId,
          jobType: payload.jobType,
          scheduledDate: payload.scheduledDate,
          scheduledTime: payload.scheduledTime,
        });
        // Continue - project creation should succeed even if calendar event creation fails
      }
    } else {
      console.log('Skipping calendar event creation:', {
        jobType: payload.jobType,
        hasScheduledDate: !!payload.scheduledDate,
      });
    }

    // Note: Stage One/Two/Full System projects will create calendar events
    // when they are moved to "scheduled_to_reschedule" column (handled in moveProjectToColumn function)

    return projectId;
  } catch (error) {
    console.error('Error in createRetailerProject:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      payload: {
        projectName: payload.projectName,
        jobType: payload.jobType,
        customerName: payload.customerName,
      },
    });
    throw error;
  }

}

