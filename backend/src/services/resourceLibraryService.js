import db from '../config/db.js';

function normalizeResourceType(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  return raw === 'link' ? 'link' : 'photo';
}

function normalizeCategory(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw == 'installation') return 'installation';
  if (raw == 'general') return 'general';
  return 'sticker';
}

function normalizeSection(value) {
  return String(value ?? '').trim();
}

export async function listResources({ companyId }) {
  const [rows] = await db.execute(
    `SELECT
       r.id,
       r.company_id,
       r.created_by,
       r.title,
       r.category,
       r.section_name,
       r.resource_type,
       r.image_url,
       r.link_url,
       r.notes,
       r.created_at,
       r.updated_at,
       u.name AS created_by_name
     FROM resource_library_items r
     LEFT JOIN users u ON u.id = r.created_by
     WHERE (? IS NULL OR r.company_id = ?)
     ORDER BY r.created_at DESC`,
    [companyId ?? null, companyId ?? null],
  );
  return rows;
}

export async function createResource({
  companyId,
  createdBy,
  title,
  category,
  sectionName,
  resourceType,
  imageUrl,
  linkUrl,
  notes,
}) {
  const t = String(title ?? '').trim();
  if (!t) throw new Error('Title is required');

  const normalizedType = normalizeResourceType(resourceType);
  const normalizedCategory = normalizeCategory(category);
  const normalizedSection = normalizeSection(sectionName);
  const image = String(imageUrl ?? '').trim();
  const link = String(linkUrl ?? '').trim();
  const memo = String(notes ?? '').trim();

  if (normalizedType === 'photo' && !image) {
    throw new Error('Image URL is required for photo resources');
  }
  if (normalizedType === 'link' && !link) {
    throw new Error('Link URL is required for link resources');
  }
  if (!normalizedSection) {
    throw new Error('Section is required');
  }

  const [result] = await db.execute(
    `INSERT INTO resource_library_items (
       company_id, created_by, title, category, section_name, resource_type, image_url, link_url, notes
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      companyId ?? null,
      Number(createdBy),
      t,
      normalizedCategory,
      normalizedSection,
      normalizedType,
      image || null,
      link || null,
      memo || null,
    ],
  );

  const [rows] = await db.execute(
    `SELECT
       r.id,
       r.company_id,
       r.created_by,
       r.title,
       r.category,
       r.section_name,
       r.resource_type,
       r.image_url,
       r.link_url,
       r.notes,
       r.created_at,
       r.updated_at
     FROM resource_library_items r
     WHERE r.id = ?
     LIMIT 1`,
    [result.insertId],
  );
  return rows[0] || null;
}

export async function deleteResource({ id, companyId }) {
  const [result] = await db.execute(
    `DELETE FROM resource_library_items
     WHERE id = ? AND (? IS NULL OR company_id = ?)`,
    [Number(id), companyId ?? null, companyId ?? null],
  );
  return result.affectedRows > 0;
}
