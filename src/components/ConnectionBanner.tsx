"use client";

import React from 'react';
import { useConnection } from '@/contexts/ConnectionContext';

export const ConnectionBanner: React.FC = () => {
  const { isBackendUnreachable } = useConnection();

  if (!isBackendUnreachable) {
    return null;
  }

  return (
    <div className="connection-banner warning-banner" role="status">
      <span>⚠️ Connecting to backend... (The server may be waking up from a cold start).</span>
    </div>
  );
};