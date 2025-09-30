const normalizeRole = role => {
  if (!role) return null;

  if (typeof role === 'string') {
    return role.toLowerCase();
  }

  if (typeof role === 'object') {
    if (role.name) {
      return String(role.name).toLowerCase();
    }
    if (role.role) {
      return String(role.role).toLowerCase();
    }
    if (role.type) {
      return String(role.type).toLowerCase();
    }
  }

  return null;
};

const collectUserRoles = user => {
  if (!user || typeof user !== 'object') {
    return [];
  }

  const roles = new Set();

  const candidateRoles = [
    user.role,
    user.userRole,
    user.primaryRole,
    user.defaultRole
  ];

  if (Array.isArray(user.roles)) {
    candidateRoles.push(...user.roles);
  }

  if (Array.isArray(user.permissions)) {
    for (const permission of user.permissions) {
      if (permission && permission.role) {
        candidateRoles.push(permission.role);
      }
    }
  }

  for (const role of candidateRoles) {
    const normalized = normalizeRole(role);
    if (normalized) {
      roles.add(normalized);
    }
  }

  return Array.from(roles);
};

const userHasRole = (user, requiredRoles = []) => {
  if (!requiredRoles || requiredRoles.length === 0) {
    return !!user;
  }

  const userRoles = collectUserRoles(user);
  if (userRoles.length === 0) {
    return false;
  }

  const normalizedRequired = requiredRoles.map(role => String(role).toLowerCase());

  return userRoles.some(role => {
    if (normalizedRequired.includes(role)) {
      return true;
    }
    // Grant access to superadmin-level roles when admin is required
    if (role === 'superadmin' && normalizedRequired.includes('admin')) {
      return true;
    }
    return false;
  });
};

module.exports = {
  userHasRole,
};
