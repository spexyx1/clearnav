'use client';

import { PublicWebsite } from '@/components/public/PublicWebsite';

interface Props {
  tenantId: string;
  tenantSlug: string;
}

export function PublicWebsiteServer({ tenantId, tenantSlug }: Props) {
  return <PublicWebsite tenantId={tenantId} tenantSlug={tenantSlug} />;
}
