"use client";

import { type ReactNode, useState } from "react";

type StartConversationLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  loadingLabel?: string;
};

export function StartConversationLink({
  href,
  className,
  children,
  loadingLabel = "Yonlendiriliyor..."
}: StartConversationLinkProps) {
  const [loading, setLoading] = useState(false);

  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        if (loading) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        setLoading(true);
        window.location.href = href;
      }}
      aria-busy={loading}
    >
      {loading ? loadingLabel : children}
    </a>
  );
}



