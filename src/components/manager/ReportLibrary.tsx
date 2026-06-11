import { Library } from 'lucide-react';

export default function ReportLibrary() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Library className="w-12 h-12 text-gray-500 mb-4" />
      <h2 className="text-xl font-semibold text-gray-200 mb-2">Report Library</h2>
      <p className="text-gray-500 text-sm max-w-xs">The report library is coming soon.</p>
    </div>
  );
}
