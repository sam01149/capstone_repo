import React from 'react';
import { Shield, Package, ShoppingCart } from 'lucide-react';
import { ROLES, ROLE_DETAILS } from '../../data/mockAuth';

export default function RoleBadge({ role, size = 'md', showDescription = false }) {
  const roleConfig = ROLE_DETAILS[role];

  if (!roleConfig) {
    return <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">Tamu</span>;
  }

  const getIcon = () => {
    switch (role) {
      case ROLES.SUPER_ADMIN:
        return <Shield size={size === 'sm' ? 12 : 15} />;
      case ROLES.STOCK_MANAGER:
        return <Package size={size === 'sm' ? 12 : 15} />;
      case ROLES.SALES_ADMIN:
        return <ShoppingCart size={size === 'sm' ? 12 : 15} />;
      default:
        return null;
    }
  };

  const isSmall = size === 'sm';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? '4px' : '6px',
        padding: isSmall ? '3px 8px' : '5px 12px',
        backgroundColor: roleConfig.bg,
        color: roleConfig.color,
        border: `1px solid ${roleConfig.border}`,
        borderRadius: '8px',
        fontSize: isSmall ? '0.75rem' : '0.825rem',
        fontWeight: 600,
        letterSpacing: '0.01em',
      }}
      title={roleConfig.description}
    >
      {getIcon()}
      <span>{roleConfig.name}</span>
    </div>
  );
}
