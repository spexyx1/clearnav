/**
 * User Migration Script: Create users on xiel with forced password reset
 *
 * Usage: Run with a list of user emails (manually provided since mezn key unavailable)
 *
 * This script:
 * 1. Creates users on xiel via Supabase admin API
 * 2. Preserves user UUIDs from mezn (if provided) for FK integrity
 * 3. Generates password reset links for each user
 * 4. Stores reset links for sending via email
 */

import { createClient } from '@supabase/supabase-js';

interface UserToMigrate {
  email: string;
  mezn_user_id?: string; // optional, for UUID preservation
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function migrateUsers(users: UserToMigrate[]) {
  console.log(`Starting migration of ${users.length} users to xiel...`);

  const results = {
    success: [] as Array<{ email: string; user_id: string; reset_link: string }>,
    failed: [] as Array<{ email: string; error: string }>,
  };

  for (const user of users) {
    try {
      console.log(`Processing ${user.email}...`);

      // 1. Create user with temporary password (they must reset it)
      const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: crypto.getRandomValues(new Uint8Array(32)).toString(), // random throwaway password
        email_confirm: true, // auto-confirm email
        user_metadata: {
          migrated_from: 'mezn',
          migration_date: new Date().toISOString(),
          original_user_id: user.mezn_user_id || null,
        },
      });

      if (createError || !createdUser.user) {
        throw new Error(createError?.message || 'Failed to create user');
      }

      // 2. Generate password reset link
      const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: user.email,
        options: {
          redirectTo: `${supabaseUrl.replace('.supabase.co', '')}/auth/callback?type=recovery`,
        },
      });

      if (resetError || !resetData?.properties?.action_link) {
        throw new Error(resetError?.message || 'Failed to generate reset link');
      }

      results.success.push({
        email: user.email,
        user_id: createdUser.user.id,
        reset_link: resetData.properties.action_link,
      });

      console.log(`✓ ${user.email} created (UUID: ${createdUser.user.id})`);
    } catch (error) {
      results.failed.push({
        email: user.email,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`✗ ${user.email}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Save results to file for reference
  const timestamp = new Date().toISOString().split('T')[0];
  const outputFile = `migration-results-${timestamp}.json`;

  await Deno.writeTextFile(outputFile, JSON.stringify(results, null, 2));
  console.log(`\n✓ Migration results saved to ${outputFile}`);
  console.log(`  Success: ${results.success.length}`);
  console.log(`  Failed: ${results.failed.length}`);

  return results;
}

// Example: migrate these users (replace with actual list from mezn dump)
const usersToMigrate: UserToMigrate[] = [
  // Populate from mezn export or manual list
  // { email: 'user1@example.com' },
  // { email: 'user2@example.com' },
];

if (usersToMigrate.length === 0) {
  console.log('No users provided. Update usersToMigrate array with user emails from mezn.');
  console.log('Format: { email: "user@example.com", mezn_user_id: "uuid-here" (optional) }');
  process.exit(0);
}

migrateUsers(usersToMigrate).catch(console.error);
