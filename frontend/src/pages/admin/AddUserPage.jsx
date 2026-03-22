import { useEffect, useState } from 'react';

import AddUserForm from '../../components/form/AddUserForm.jsx';

import { createUser, listCompanies } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AddUserPage() {
  const { token } = useAuth(); 
  const [companies, setCompanies] = useState([]);
  const [roles] = useState([
    { id: 1, name: 'super_admin' },
    { id: 2, name: 'company_admin' },
    { id: 3, name: 'manager' },
    { id: 4, name: 'field_agent' },
  ]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);

 
  
useEffect(() => {
  listCompanies({ token })
    .then((res) => setCompanies(Array.isArray(res?.data) ? res.data : []))
    .catch(() => setCompanies([]));
}, [token]);


const handleSubmit = async (formPayload) => {
  setLoading(true);
  setErr(null);
  setOk(null);

  try {
    const roleName = roles.find(r => Number(r.id) === Number(formPayload.roleId))?.name;

    if (!roleName) {
      throw Object.assign(new Error('Please select a valid role.'), {
        status: 422,
        body: { errors: { role: 'Invalid role selection' } }
      });
    }

    let companyId = formPayload.companyId ?? null;
    if (roleName !== 'super_admin') {
      if (!companyId || Number.isNaN(Number(companyId))) {
        throw Object.assign(new Error('Please select a company for this role.'), {
          status: 422,
          body: { errors: { companyId: 'Company is required for this role' } }
        });
      }
      companyId = Number(companyId);
    } else {
      companyId = null;
    }

    const payload = {
      name: formPayload.name,
      email: formPayload.email,
      password: formPayload.password,
      role: roleName,          
      companyId,               
      status: formPayload.status || 'active',
    };

    const res = await createUser({ token, payload });
    setOk('User created successfully.');
  } catch (e) {
  if (e?.status === 422 && e?.body?.errors) {
    setErr(
      Object.entries(e.body.errors)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' • ')
    );
  } else {
    setErr(e?.message || 'Failed to create user.');
  }
  } finally {
    setLoading(false);
  }
};


  return (
    <div style={{ padding: 20 }}>
      <AddUserForm
        onSubmit={handleSubmit}
        loading={loading}
        error={err}
        success={ok}
        roles={roles}
        companies={companies}
        showCompany={true}
      />
    </div>
  );
}