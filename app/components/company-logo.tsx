import React, { useState } from 'react';

interface CompanyLogoProps {
  symbol: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CompanyLogo({ 
  symbol, 
  logoUrl, 
  size = 'md', 
  className = '' 
}: CompanyLogoProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8',
  };

  const fallbackClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-6 h-6 text-sm',
    lg: 'w-8 h-8 text-base',
  };

  // Show loading state while image is loading
  if (logoUrl && !imageError && !imageLoaded) {
    return (
      <div className={`${sizeClasses[size]} ${className} bg-gray-100 rounded-full animate-pulse flex items-center justify-center`}>
        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
      </div>
    );
  }

  // Show logo if available and loaded successfully
  if (logoUrl && !imageError && imageLoaded) {
    return (
      <img
        src={logoUrl}
        alt={`${symbol} logo`}
        className={`${sizeClasses[size]} ${className} rounded-full object-cover bg-white border border-gray-200`}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
      />
    );
  }

  // Fallback to initials if no logo or image failed to load
  const initials = symbol.length >= 2 ? symbol.substring(0, 2) : symbol;
  
  return (
    <div 
      className={`${fallbackClasses[size]} ${className} bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-sm`}
      title={`${symbol} logo`}
    >
      {initials}
    </div>
  );
}

// Async wrapper that handles logo loading
interface AsyncCompanyLogoProps extends Omit<CompanyLogoProps, 'logoUrl'> {
  logoUrl?: Promise<string | null> | string | null;
}

export function AsyncCompanyLogo({ logoUrl, ...props }: AsyncCompanyLogoProps) {
  const [resolvedLogoUrl, setResolvedLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    if (!logoUrl) {
      setIsLoading(false);
      return;
    }

    if (typeof logoUrl === 'string') {
      setResolvedLogoUrl(logoUrl);
      setIsLoading(false);
      return;
    }

    // Handle Promise
    logoUrl.then((url) => {
      setResolvedLogoUrl(url);
      setIsLoading(false);
    }).catch(() => {
      setResolvedLogoUrl(null);
      setIsLoading(false);
    });
  }, [logoUrl]);

  if (isLoading) {
    return <CompanyLogo {...props} logoUrl={null} />;
  }

  return <CompanyLogo {...props} logoUrl={resolvedLogoUrl} />;
}