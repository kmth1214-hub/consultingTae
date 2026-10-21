import React, { useState } from 'react';

export default function AssetImage({ src, alt = '', className = '', ...props }) {
  const [failedSource, setFailedSource] = useState(null);
  if (!src || failedSource === src) return <span className={`image-fallback ${className}`}
    role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>◇</span>;
  return <img {...props} className={className} src={src} alt={alt} aria-hidden={alt ? undefined : true}
    onError={() => setFailedSource(src)} />;
}
