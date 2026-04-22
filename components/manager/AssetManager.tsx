import React, { useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Trash2, Copy, Check, FolderOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth';

interface Asset {
  name: string;
  url: string;
  size: number;
  createdAt: string;
  folder: string;
}

interface AssetManagerProps {
  onSelectAsset?: (url: string) => void;
  mode?: 'standalone' | 'picker';
  initialFolder?: 'images' | 'logos' | 'favicons' | 'blog';
}

export function AssetManager({ onSelectAsset, mode = 'standalone', initialFolder = 'images' }: AssetManagerProps) {
  const { currentTenant } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(initialFolder);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (currentTenant) {
      loadAssets();
    }
  }, [currentTenant, selectedFolder]);

  async function loadAssets() {
    if (!currentTenant) return;

    try {
      setLoading(true);
      const folderPath = `${currentTenant.id}/${selectedFolder}`;

      const { data, error } = await supabase.storage
        .from('tenant-assets')
        .list(folderPath, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;

      const assetsWithUrls = data.map((file) => {
        const { data: { publicUrl } } = supabase.storage
          .from('tenant-assets')
          .getPublicUrl(`${folderPath}/${file.name}`);

        return {
          name: file.name,
          url: publicUrl,
          size: file.metadata?.size || 0,
          createdAt: file.created_at || '',
          folder: selectedFolder,
        };
      });

      setAssets(assetsWithUrls);
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0 || !currentTenant) return;

    try {
      setUploading(true);

      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${currentTenant.id}/${selectedFolder}/${fileName}`;

        const { error } = await supabase.storage
          .from('tenant-assets')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) throw error;
      }

      await loadAssets();
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteAsset(asset: Asset) {
    if (!currentTenant) return;
    if (!confirm(`Delete ${asset.name}?`)) return;

    try {
      const filePath = `${currentTenant.id}/${asset.folder}/${asset.name}`;

      const { error } = await supabase.storage
        .from('tenant-assets')
        .remove([filePath]);

      if (error) throw error;

      await loadAssets();
    } catch (error) {
      console.error('Error deleting asset:', error);
      alert('Failed to delete asset. Please try again.');
    }
  }

  function copyToClipboard(url: string) {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const filteredAssets = assets.filter((asset) =>
    asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const folders = [
    { key: 'images', label: 'Images', icon: ImageIcon },
    { key: 'logos', label: 'Logos', icon: ImageIcon },
    { key: 'favicons', label: 'Favicons', icon: ImageIcon },
    { key: 'blog', label: 'Blog', icon: ImageIcon },
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Media Library</h2>
          <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors flex items-center gap-2">
            <Upload size={20} />
            {uploading ? 'Uploading...' : 'Upload'}
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            {folders.map((folder) => (
              <button
                key={folder.key}
                onClick={() => setSelectedFolder(folder.key as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedFolder === folder.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {folder.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <FolderOpen size={64} className="mb-4" />
            <p className="text-lg font-medium">No assets in {selectedFolder}</p>
            <p className="text-sm">Upload images to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredAssets.map((asset) => (
              <div
                key={asset.url}
                className="group relative bg-gray-50 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 transition-all"
              >
                <div
                  className={`aspect-square bg-gray-100 flex items-center justify-center overflow-hidden ${
                    mode === 'picker' ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => mode === 'picker' && onSelectAsset?.(asset.url)}
                >
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="p-2">
                  <p className="text-xs font-medium text-gray-700 truncate" title={asset.name}>
                    {asset.name}
                  </p>
                  <p className="text-xs text-gray-500">{formatFileSize(asset.size)}</p>
                </div>

                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => copyToClipboard(asset.url)}
                    className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-100 transition-colors"
                    title="Copy URL"
                  >
                    {copiedUrl === asset.url ? (
                      <Check size={16} className="text-green-600" />
                    ) : (
                      <Copy size={16} className="text-gray-600" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteAsset(asset)}
                    className="p-2 bg-white rounded-lg shadow-md hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </div>

                {mode === 'picker' && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => onSelectAsset?.(asset.url)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Select
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
