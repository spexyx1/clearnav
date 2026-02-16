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
    console.log('Starting tenant provisioning for:', data.companyName);
    const slug = data.requestedSlug || generateSlug(data.companyName);

    const validation = await validateSlug(slug);
    if (!validation.available) {
      console.error('Slug validation failed:', validation.error);
      return { success: false, error: validation.error };
    }

    console.log('Creating signup request for slug:', slug);
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: signupRequest, error: signupError } = await supabase
      .from('signup_requests')
      .insert({
        requested_slug: slug,
        company_name: data.companyName,
        contact_name: data.contactName,
        contact_email: data.contactEmail,
        phone: data.phone,
        status: 'processing',
      })
      .select()
      .single();

    if (signupError) {
      console.error('Signup request insert error:', signupError);
      return { success: false, error: `Failed to create signup request: ${signupError.message || signupError.code || 'Unknown error'}` };
    }

    console.log('Signup request created successfully:', signupRequest.id);

    console.log('Creating auth user for email:', data.contactEmail);
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
      await supabase
        .from('signup_requests')
        .update({ status: 'failed' })
        .eq('id', signupRequest.id);

      return {
        success: false,
        error: `Failed to create user account: ${authError?.message || 'Unknown error'}`
      };
    }

    console.log('Auth user created successfully:', authUser.user.id);

    console.log('Creating tenant for company:', data.companyName);
    const { data: tenant, error: tenantError } = await supabase
      .from('platform_tenants')
      .insert({
        name: data.companyName,
        slug: slug,
        database_type: 'managed',
        status: 'trial',
        trial_ends_at: trialEndsAt,
        is_self_service: true,
        contact_email: data.contactEmail,
        contact_name: data.contactName,
        signup_completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Tenant creation error:', tenantError);
      await supabase
        .from('signup_requests')
        .update({ status: 'failed' })
        .eq('id', signupRequest.id);

      return { success: false, error: `Failed to create tenant: ${tenantError.message || tenantError.code || 'Unknown error'}` };
    }

    console.log('Tenant created successfully:', tenant.id);

    console.log('Creating user role record (unified role system)');
    const { error: userRoleError } = await supabase.from('user_roles').insert({
      user_id: authUser.user.id,
      email: data.contactEmail,
      role_category: 'tenant_admin',
      role_detail: null,
      tenant_id: tenant.id,
      status: 'active',
      metadata: {
        created_via: 'self_service_signup',
        full_name: data.contactName,
        company_name: data.companyName,
      },
    });

    if (userRoleError) {
      console.error('User role creation error:', userRoleError);
      return { success: false, error: `Failed to create user role: ${userRoleError.message}` };
    }

    console.log('Creating tenant user (must be created before settings/subscriptions)');
    const { error: tenantUserError } = await supabase.from('tenant_users').insert({
      tenant_id: tenant.id,
      user_id: authUser.user.id,
      role: 'admin',
      onboarding_status: 'in_progress',
    });

    if (tenantUserError) {
      console.error('Tenant user creation error:', tenantUserError);
      return { success: false, error: `Failed to create tenant user: ${tenantUserError.message}` };
    }

    console.log('Creating tenant settings');
    const { error: settingsError } = await supabase.from('tenant_settings').insert({
      tenant_id: tenant.id,
      branding: {
        company_name: data.companyName,
      },
      features: {},
      notifications: {},
      integrations: {},
    });

    if (settingsError) {
      console.error('Tenant settings creation error:', settingsError);
    }

    const { data: defaultPlan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .eq('database_type', 'managed')
      .order('price_monthly', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (defaultPlan) {
      console.log('Creating tenant subscription with plan:', defaultPlan.id);
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      const { error: subscriptionError } = await supabase.from('tenant_subscriptions').insert({
        tenant_id: tenant.id,
        plan_id: defaultPlan.id,
        status: 'trialing',
        current_period_end: currentPeriodEnd.toISOString(),
      });

      if (subscriptionError) {
        console.error('Subscription creation error:', subscriptionError);
      }
    }

    await supabase
      .from('signup_requests')
      .update({
        status: 'completed',
        tenant_id: tenant.id,
        completed_at: new Date().toISOString(),
      })
      .eq('id', signupRequest.id);

    const baseDomain = 'clearnav.cv';
    const subdomainUrl = `https://${slug}.${baseDomain}`;

    return {
      success: true,
      tenantId: tenant.id,
      slug: slug,
      subdomainUrl: subdomainUrl,
    };
  } catch (error: any) {
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
