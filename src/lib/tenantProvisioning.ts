import { supabase } from './supabase';

export interface SignupData {
  companyName: string;
  contactName: string;
  contactEmail: string;
  phone?: string;
  requestedSlug: string;
  password: string;
}

export interface ProvisioningResult {
  success: boolean;
  tenantId?: string;
  slug?: string;
  error?: string;
  subdomainUrl?: string;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function validateSlug(slug: string): Promise<{ available: boolean; error?: string }> {
  if (!slug || slug.length < 3) {
    return { available: false, error: 'Subdomain must be at least 3 characters' };
  }

  if (slug.length > 63) {
    return { available: false, error: 'Subdomain must be less than 63 characters' };
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { available: false, error: 'Only lowercase letters, numbers, and hyphens allowed' };
  }

  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { available: false, error: 'Subdomain cannot start or end with a hyphen' };
  }

  if (slug.includes('--')) {
    return { available: false, error: 'Subdomain cannot contain consecutive hyphens' };
  }

  // Use RPC function to check availability (bypasses RLS to check all tenants)
  const { data: isAvailable, error } = await supabase
    .rpc('check_slug_available', { requested_slug: slug });

  if (error) {
    console.error('Error checking slug availability:', error);
    return { available: false, error: 'Failed to check subdomain availability' };
  }

  if (!isAvailable) {
    return { available: false, error: 'This subdomain is not available' };
  }

  return { available: true };
}

export async function provisionTenant(data: SignupData): Promise<ProvisioningResult> {
  try {
    const slug = data.requestedSlug || generateSlug(data.companyName);

    const validation = await validateSlug(slug);
    if (!validation.available) {
      console.error('Slug validation failed:', validation.error);
      return { success: false, error: validation.error };
    }

    const signupRequestId = crypto.randomUUID();
    const { error: signupError } = await supabase
      .from('signup_requests')
      .insert({
        id: signupRequestId,
        requested_slug: slug,
        company_name: data.companyName,
        contact_name: data.contactName,
        contact_email: data.contactEmail,
        phone: data.phone,
        status: 'pending',
      });

    if (signupError) {
      console.error('Signup request insert error:', signupError);
      return { success: false, error: 'We could not start your signup. Please try again.' };
    }

    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email: data.contactEmail,
      password: data.password,
      options: {
        data: {
          full_name: data.contactName,
          company_name: data.companyName,
        },
      },
    });

    if (authError || !authUser.user) {
      console.error('Auth user creation error:', authError);
      return {
        success: false,
        error: `Failed to create user account: ${authError?.message || 'Unknown error'}`
      };
    }

    const { data: provisionResult, error: provisionError } = await supabase.rpc('provision_tenant', {
      p_user_id: authUser.user.id,
      p_company_name: data.companyName,
      p_subdomain: slug,
      p_contact_name: data.contactName,
      p_contact_email: data.contactEmail,
      p_contact_phone: data.phone || null,
      p_primary_use_case: '',
      p_aum_range: ''
    });

    if (provisionError || !provisionResult?.success) {
      console.error('Tenant provisioning failed:', provisionError || provisionResult?.error);
      await supabase.rpc('complete_signup_request', { p_request_id: signupRequestId, p_status: 'failed' });
      return {
        success: false,
        error: provisionResult?.error || 'Failed to provision tenant'
      };
    }

    await supabase.rpc('complete_signup_request', {
      p_request_id: signupRequestId,
      p_status: 'completed',
      p_tenant_id: provisionResult.tenant_id,
    });

    const baseDomain = 'clearnav.cv';
    const subdomainUrl = `https://${slug}.${baseDomain}`;

    return {
      success: true,
      tenantId: provisionResult.tenant_id,
      slug: slug,
      subdomainUrl: subdomainUrl,
    };
  } catch (error: any) {
    console.error('Unexpected error during provisioning:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

export async function checkSlugAvailability(slug: string): Promise<boolean> {
  const result = await validateSlug(slug);
  return result.available;
}
