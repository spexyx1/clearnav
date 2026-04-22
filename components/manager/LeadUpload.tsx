import React, { useState, useRef } from 'react';
import { Upload, X, Check, AlertCircle, FileText, Download } from 'lucide-react';
import { createClient as _mkClient } from '@/lib/supabase/client';
const supabase = _mkClient();;
import { useTenantInfo } from '@/lib/hooks';

interface FieldMapping {
  csvColumn: string;
  systemField: string;
}

interface ValidationError {
  row: number;
  column: string;
  value: string;
  error: string;
}

interface ImportStats {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  newContacts: number;
}

const SYSTEM_FIELDS = [
  { value: 'email', label: 'Email (Required)', required: true },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'full_name', label: 'Full Name' },
  { value: 'company', label: 'Company' },
  { value: 'job_title', label: 'Job Title' },
  { value: 'phone', label: 'Phone' },
  { value: 'website', label: 'Website' },
  { value: 'industry', label: 'Industry' },
  { value: 'company_size', label: 'Company Size' },
  { value: 'linkedin', label: 'LinkedIn URL' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'country', label: 'Country' },
  { value: 'tags', label: 'Tags (comma-separated)' },
  { value: 'notes', label: 'Notes' },
  { value: 'skip', label: '-- Skip This Column --' },
];

export default function LeadUpload() {
  const { tenantInfo } = useTenantInfo();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'validation' | 'processing' | 'complete'>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [processing, setProcessing] = useState(false);
  const [campaignId, setCampaignId] = useState<string>('');
  const [autoEnroll, setAutoEnroll] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setFile(file);
    parseCSV(file);
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        alert('CSV file must contain at least a header row and one data row');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      setCsvHeaders(headers);

      const data = lines.slice(1, Math.min(11, lines.length)).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });
      setCsvData(data);

      const autoMapping = headers.map(header => {
        const lowerHeader = header.toLowerCase();
        let systemField = 'skip';

        if (lowerHeader.includes('email')) systemField = 'email';
        else if (lowerHeader.includes('first') && lowerHeader.includes('name')) systemField = 'first_name';
        else if (lowerHeader.includes('last') && lowerHeader.includes('name')) systemField = 'last_name';
        else if (lowerHeader.includes('company')) systemField = 'company';
        else if (lowerHeader.includes('title') || lowerHeader.includes('job')) systemField = 'job_title';
        else if (lowerHeader.includes('phone')) systemField = 'phone';
        else if (lowerHeader.includes('website')) systemField = 'website';
        else if (lowerHeader.includes('industry')) systemField = 'industry';
        else if (lowerHeader.includes('linkedin')) systemField = 'linkedin';

        return { csvColumn: header, systemField };
      });

      setFieldMapping(autoMapping);
      setStep('mapping');
    };
    reader.readAsText(file);
  };

  const updateMapping = (csvColumn: string, systemField: string) => {
    setFieldMapping(prev =>
      prev.map(m => m.csvColumn === csvColumn ? { ...m, systemField } : m)
    );
  };

  const validateMapping = () => {
    const emailMapped = fieldMapping.some(m => m.systemField === 'email');
    if (!emailMapped) {
      alert('Email field is required. Please map at least one column to Email.');
      return false;
    }
    return true;
  };

  const handleValidation = () => {
    if (!validateMapping()) return;

    const errors: ValidationError[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    csvData.forEach((row, index) => {
      fieldMapping.forEach(mapping => {
        const value = row[mapping.csvColumn];

        if (mapping.systemField === 'email') {
          if (!value || value.trim() === '') {
            errors.push({
              row: index + 2,
              column: mapping.csvColumn,
              value: value,
              error: 'Email is required'
            });
          } else if (!emailRegex.test(value)) {
            errors.push({
              row: index + 2,
              column: mapping.csvColumn,
              value: value,
              error: 'Invalid email format'
            });
          }
        }
      });
    });

    setValidationErrors(errors);
    setStep('validation');
  };

  const processImport = async () => {
    if (!tenantInfo?.id) return;

    setProcessing(true);
    setStep('processing');

    try {
      const importRecord = {
        tenant_id: tenantInfo.id,
        import_name: `${file?.name} - ${new Date().toLocaleString()}`,
        file_name: file?.name,
        file_size_bytes: file?.size,
        status: 'processing',
        field_mapping: Object.fromEntries(fieldMapping.map(m => [m.csvColumn, m.systemField])),
        total_rows: csvData.length,
        assign_to_campaign_id: campaignId || null,
        auto_enroll_in_sequence: autoEnroll,
      };

      const { data: importData, error: importError } = await supabase
        .from('ai_lead_imports')
        .insert(importRecord)
        .select()
        .single();

      if (importError) throw importError;

      let newContacts = 0;
      let duplicates = 0;
      let valid = 0;

      for (const row of csvData) {
        const leadData: any = { tenant_id: tenantInfo.id };

        fieldMapping.forEach(mapping => {
          if (mapping.systemField !== 'skip') {
            leadData[mapping.systemField] = row[mapping.csvColumn];
          }
        });

        if (!leadData.email) continue;

        const { data: existingLead } = await supabase
          .from('ai_lead_queue')
          .select('id')
          .eq('tenant_id', tenantInfo.id)
          .eq('contact_email', leadData.email)
          .maybeSingle();

        if (existingLead) {
          duplicates++;
          continue;
        }

        const queueData = {
          tenant_id: tenantInfo.id,
          contact_email: leadData.email,
          contact_name: leadData.full_name || `${leadData.first_name || ''} ${leadData.last_name || ''}`.trim(),
          contact_phone: leadData.phone,
          contact_company: leadData.company,
          import_batch_id: importData.id,
          lead_source: 'import',
          queue_status: 'new',
          assigned_campaign_id: campaignId || null,
          custom_fields: leadData,
        };

        const { error: queueError } = await supabase
          .from('ai_lead_queue')
          .insert(queueData);

        if (!queueError) {
          newContacts++;
          valid++;
        }
      }

      await supabase
        .from('ai_lead_imports')
        .update({
          status: 'completed',
          valid_rows: valid,
          invalid_rows: csvData.length - valid - duplicates,
          duplicate_rows: duplicates,
          new_contacts: newContacts,
          completed_at: new Date().toISOString(),
        })
        .eq('id', importData.id);

      setImportStats({
        totalRows: csvData.length,
        validRows: valid,
        invalidRows: csvData.length - valid - duplicates,
        duplicateRows: duplicates,
        newContacts,
      });

      setStep('complete');
    } catch (error) {
      console.error('Import error:', error);
      alert('An error occurred during import. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['email', 'first_name', 'last_name', 'company', 'job_title', 'phone', 'linkedin', 'website'];
    const csv = headers.join(',') + '\n' +
                'john@example.com,John,Doe,Acme Corp,CEO,555-1234,https://linkedin.com/in/johndoe,https://acme.com';

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lead_import_template.csv';
    a.click();
  };

  const resetImport = () => {
    setFile(null);
    setStep('upload');
    setCsvHeaders([]);
    setCsvData([]);
    setFieldMapping([]);
    setValidationErrors([]);
    setImportStats(null);
    setProcessing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Lead Upload</h2>
          <p className="text-slate-600">Import leads from CSV file to start AI outreach</p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
        >
          <Download className="w-4 h-4" />
          Download Template
        </button>
      </div>

      {step === 'upload' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Drop your CSV file here
            </h3>
            <p className="text-slate-600 mb-4">or click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,application/vnd.ms-excel"
              onChange={handleFileInput}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Select File
            </button>
            <p className="text-sm text-slate-500 mt-4">
              Supported format: CSV
            </p>
          </div>
        </div>
      )}

      {step === 'mapping' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Map Fields</h3>
                <p className="text-sm text-slate-600">Match CSV columns to system fields</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <FileText className="w-4 h-4" />
                {file?.name}
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-3 gap-4 font-semibold text-sm text-slate-700 pb-2 border-b">
              <div>CSV Column</div>
              <div>System Field</div>
              <div>Sample Data</div>
            </div>

            {csvHeaders.map((header, index) => (
              <div key={index} className="grid grid-cols-3 gap-4 items-center">
                <div className="font-medium text-slate-900">{header}</div>
                <select
                  value={fieldMapping[index]?.systemField || 'skip'}
                  onChange={(e) => updateMapping(header, e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {SYSTEM_FIELDS.map(field => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </select>
                <div className="text-sm text-slate-600 truncate">
                  {csvData[0]?.[header] || '-'}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={resetImport}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleValidation}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Continue to Validation
            </button>
          </div>
        </div>
      )}

      {step === 'validation' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Validation Results</h3>

          {validationErrors.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-green-800">
                <Check className="w-5 h-5" />
                <span className="font-semibold">All data validated successfully!</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                {csvData.length} rows ready to import
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-yellow-800 mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">{validationErrors.length} validation errors found</span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {validationErrors.map((error, index) => (
                  <div key={index} className="text-sm text-yellow-700">
                    Row {error.row}, Column "{error.column}": {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Assign to Campaign (Optional)
              </label>
              <input
                type="text"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                placeholder="Enter campaign ID"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoEnroll}
                onChange={(e) => setAutoEnroll(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">
                Auto-enroll leads in assigned sequence
              </span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('mapping')}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Back to Mapping
            </button>
            <button
              onClick={processImport}
              disabled={validationErrors.length > 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import Leads
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Processing Import</h3>
          <p className="text-slate-600">Please wait while we import your leads...</p>
        </div>
      )}

      {step === 'complete' && importStats && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Import Complete!</h3>
            <p className="text-slate-600">Your leads have been imported successfully</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-slate-900">{importStats.totalRows}</div>
              <div className="text-sm text-slate-600">Total Rows</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{importStats.newContacts}</div>
              <div className="text-sm text-green-700">New Leads</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{importStats.validRows}</div>
              <div className="text-sm text-blue-700">Valid</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{importStats.duplicateRows}</div>
              <div className="text-sm text-yellow-700">Duplicates</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{importStats.invalidRows}</div>
              <div className="text-sm text-red-700">Invalid</div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={resetImport}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Import More Leads
            </button>
          </div>
        </div>
      )}
    </div>
  );
}