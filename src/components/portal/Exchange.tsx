import { ShoppingCart } from 'lucide-react';

interface ExchangeProps {
  profile: unknown;
}

export default function Exchange(_props: ExchangeProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <ShoppingCart className="w-12 h-12 text-gray-600 mb-4" />
      <h2 className="text-xl font-semibold text-gray-300 mb-2">Exchange</h2>
      <p className="text-gray-500 text-sm max-w-xs">
        The exchange feature is not available for your account. Contact your fund manager for access.
      </p>
    </div>
  );
}
