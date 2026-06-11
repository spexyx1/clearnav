import { DollarSign } from 'lucide-react';

export default function FeeManager() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <DollarSign className="w-12 h-12 text-gray-500 mb-4" />
      <h2 className="text-xl font-semibold text-gray-200 mb-2">Fee Manager</h2>
      <p className="text-gray-500 text-sm max-w-xs">Fee management tools are coming soon.</p>
    </div>
  );
}
