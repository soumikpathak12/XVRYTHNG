/**
 * Company (tenant) controller: registration, types, list.
 * Super_admin only for create/list; tenant context used for filtering elsewhere.
 */
import * as companyService from '../services/companyService.js';

/**
 * GET /api/admin/company-types
 * Returns company types with their enabled modules (for onboarding wizard).
 */
export async function getCompanyTypes(req, res) {
  try {
    const types = await companyService.getCompanyTypesWithModules();
    return res.json({ success: true, data: types });
  } catch (err) {
    console.error('getCompanyTypes error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * POST /api/admin/companies
 * Body: { company: { name, abn?, contact_email?, contact_phone?, company_type_id?, address... }, admin: { email, password, name } }
 * Creates company (tenant) and company admin user.
 */
export async function registerCompany(req, res) {
  try {
    const { company, admin } = req.body || {};
    const errors = {};

    if (!company?.name?.trim()) errors.companyName = 'Company name is required';
    if (!admin?.email?.trim()) errors.adminEmail = 'Admin email is required';
    else if (!/^\S+@\S+\.\S+$/.test(admin.email)) errors.adminEmail = 'Invalid admin email';
    if (!admin?.password) errors.adminPassword = 'Admin password is required';
    else if (String(admin.password).length < 8) errors.adminPassword = 'Password must be at least 8 characters';
    if (!admin?.name?.trim()) errors.adminName = 'Admin name is required';

    if (Object.keys(errors).length) {
      return res.status(422).json({ success: false, errors });
    }

    const result = await companyService.createCompanyWithAdmin(company, admin);
    return res.status(201).json({
      success: true,
      message: 'Company and company admin created',
      data: {
        company: result.company,
        adminUser: {
          id: result.adminUser.id,
          email: result.adminUser.email,
          name: result.adminUser.name,
          company_id: result.adminUser.company_id,
        },
      },
    });
  } catch (err) {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('email')) {
      return res.status(409).json({ success: false, message: 'A company or user with that email already exists.' });
    }
    console.error('registerCompany error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * GET /api/admin/companies
 * List companies (super_admin). Query: ?status=active|suspended|trial
 */
export async function listCompanies(req, res) {
  try {
    const status = req.query.status || null;
    const companies = await companyService.listCompanies({ status });
    return res.json({ success: true, data: companies });
  } catch (err) {
    console.error('listCompanies error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
