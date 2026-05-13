/**
 * Visual Template Designer - Authorization Guard
 *
 * Wraps protected UI sections and renders children only when the user
 * has admin or owner access. Renders a fallback (or default "Access Denied"
 * message) otherwise.
 */

import React from 'react';
import { AuthorizationService, AuthorizationError } from '../../application/services/AuthorizationService';

interface AuthorizationGuardProps {
  userRole: string | null | undefined;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Default "access denied" message shown when no fallback is provided.
 */
function DefaultAccessDenied(): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        fontFamily: 'Arial, sans-serif',
        color: '#6b7280',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 48,
          marginBottom: 16,
          color: '#d1d5db',
        }}
      >
        [lock]
      </div>
      <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#374151' }}>
        Access Denied
      </h2>
      <p style={{ margin: 0, fontSize: 14 }}>
        You do not have permission to access the Template Designer.
        <br />
        Please contact your administrator.
      </p>
    </div>
  );
}

export function AuthorizationGuard({
  userRole,
  children,
  fallback,
}: AuthorizationGuardProps): React.ReactElement {
  let authorized = false;

  try {
    AuthorizationService.checkAdminAccess(userRole);
    authorized = true;
  } catch (err) {
    if (!(err instanceof AuthorizationError)) {
      throw err;
    }
    authorized = false;
  }

  if (authorized) {
    return <>{children}</>;
  }

  return <>{fallback ?? <DefaultAccessDenied />}</>;
}

export default AuthorizationGuard;
