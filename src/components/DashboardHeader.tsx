import React from 'react';

interface DashboardHeaderProps {
  slug?: string | null;
  getTipUrl?: (slug: string) => string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ slug, getTipUrl }) => {
  // Fallback slug url generator if not provided
  const tipUrl = slug ? (getTipUrl ? getTipUrl(slug) : `/${slug}`) : '';

  return (
    <div className="dashboard-header">
      <h2>Creator Dashboard</h2>
      
      {/* Preview link: hidden or disabled until slug is known */}
      {slug ? (
        <a
          href={tipUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="preview-tip-page-link"
          aria-label="Preview public tip page (opens in a new tab)"
        >
          👁️ Preview Public Tip Page ↗
        </a>
      ) : (
        <span className="preview-tip-page-link disabled" aria-disabled="true" title="Loading slug…">
          👁️ Preview Public Tip Page
        </span>
      )}
    </div>
  );
};