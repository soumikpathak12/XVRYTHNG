export function getAppBaseFromPathname(pathname = '') {
  if (pathname.startsWith('/admin')) return '/admin';
  if (pathname.startsWith('/employee')) return '/employee';
  if (pathname.startsWith('/dashboard')) return '/dashboard';
  return '/dashboard';
}

