# User Management Guide

## Overview

Tenant owners and authorized staff can now fully manage clients and staff members directly from the Manager Portal. This includes adding, editing, and removing users, as well as configuring granular permissions for staff members.

## Features Added

### 1. Client Management (Users Tab)

#### For Tenant Owners and General Managers:
- **Add New Clients**: Create client accounts directly without sending invitations
- **Edit Clients**: Update client information including account details and investment amounts
- **Delete Clients**: Remove client accounts from the system
- **View All Clients**: See complete list of all clients in the tenant

#### What You Can Do:

**Add a New Client:**
1. Go to the **Users** tab in the Manager Portal
2. Click the **"Add Client"** button (blue button in top right)
3. Fill in the client details:
   - Full Name
   - Email Address (will be used for login)
   - Account Number
   - Total Invested
   - Current Value
   - Inception Date
4. Click **"Create Client"**
5. A temporary password will be generated automatically
6. The client can log in with their email and reset their password

**Edit an Existing Client:**
1. Go to the **Users** tab
2. Find the client in the "Active Users" table
3. Click the **Edit** icon (pencil) next to the client
4. Update the information you need to change
5. Click **"Update Client"**

**Delete a Client:**
1. Go to the **Users** tab
2. Find the client in the "Active Users" table
3. Click the **Delete** icon (trash) next to the client
4. Confirm the deletion

### 2. Staff Permission Management (Staff Tab)

#### For Tenant Owners and General Managers:
- **Manage Permissions**: Set granular permissions for each staff member
- **Permission Types Available**:
  - **Manage Users**: Can add, edit, and remove clients and staff
  - **Invite Clients**: Can send client invitations
  - **Create Newsletters**: Can create and send newsletters
  - **Approve Redemptions**: Can approve or reject redemption requests
  - **View Performance**: Can view fund performance metrics

#### How to Assign Permissions:

1. Go to the **Staff** tab in the Manager Portal
2. Find the staff member you want to configure
3. Click the **Settings** icon (gear) in the Actions column
4. A modal will open showing all available permissions
5. Check/uncheck the permissions you want to grant
6. Click **"Save Permissions"**

**Permission Details:**

- **Manage Users**: Full control over client and staff management
  - Can create new clients
  - Can edit client information
  - Can delete clients
  - Can remove staff members (except themselves)

- **Invite Clients**: Limited user management
  - Can send email invitations to new clients
  - Cannot create clients directly
  - Cannot delete users

- **Create Newsletters**: Communications access
  - Can create and send newsletters
  - Can manage newsletter content

- **Approve Redemptions**: Financial operations
  - Can review redemption requests
  - Can approve or reject redemptions

- **View Performance**: Read-only financial access
  - Can view fund performance data
  - Can see returns and metrics

### 3. Database Changes

**New Permission Column:**
- Added `can_manage_users` to the `staff_permissions` table
- This controls full user management access for staff

**New RLS Policies:**
- Tenant owners can create clients in their tenant
- Tenant owners can delete clients in their tenant
- Staff with `can_manage_users` or `can_invite_clients` permission can create clients
- Staff with `can_manage_users` permission can delete clients
- Tenant owners can create and delete staff members
- Staff with `can_manage_users` permission can delete other staff (not themselves)

## Access Control

### Who Can Manage Clients?

1. **Tenant Owners** (role: 'owner' in tenant_users)
   - Full access to all client management features
   - Can add, edit, and delete any client

2. **Tenant Admins** (role: 'admin' in tenant_users)
   - Full access to all client management features
   - Can add, edit, and delete any client

3. **General Managers** (role: 'general_manager' in staff_accounts)
   - Full access to all client management features by default
   - Can add, edit, and delete any client

4. **Staff with Permissions**
   - With `can_manage_users`: Full client management access
   - With `can_invite_clients`: Can only invite clients, not directly create or delete

### Who Can Manage Staff Permissions?

1. **Tenant Owners**
   - Can set permissions for all staff members

2. **General Managers**
   - Can set permissions for all staff members

## User Interface Updates

### Users Tab:
- New **"Add Client"** button for direct client creation
- **Edit** and **Delete** buttons for each client in the table
- Permission-based visibility of action buttons
- Enhanced client profile modal with all required fields

### Staff Tab:
- New **"Manage Permissions"** button (gear icon) for each staff member
- Visual permission checkboxes in modal
- Permission descriptions for clarity
- Automatic permission loading when editing

## Security & Data Isolation

- All operations respect tenant boundaries
- Users can only manage clients/staff within their own tenant
- RLS policies enforce data isolation at the database level
- Staff cannot delete their own account
- Permission checks happen both in UI and database

## Testing the Features

### As Tenant Owner (test@greyalpha.co):

**Test Client Management:**
1. Login at https://clearnav.cv
2. Go to **Users** tab
3. Click **"Add Client"**
4. Create a test client:
   - Name: Jane Investor
   - Email: jane@example.com
   - Account: TEST002
   - Invested: $50,000
   - Current Value: $55,000
5. Verify client appears in the Active Users table
6. Click **Edit** icon to modify client details
7. Click **Delete** icon to remove the client

**Test Staff Permissions:**
1. Go to **Staff** tab
2. Click **Settings** icon next to any staff member
3. Grant "Manage Users" permission
4. Save permissions
5. Have that staff member log in and verify they can manage users

## Important Notes

1. **Password Security**: When creating clients directly, a secure random password is generated. Clients should reset their password on first login.

2. **Email Notifications**: Currently, clients don't automatically receive password reset emails when created directly. You should manually communicate the login details or use the password reset flow.

3. **Tenant Isolation**: All user management is isolated by tenant. You cannot see or manage users from other tenants.

4. **Permission Hierarchy**: General Managers and Tenant Owners always have full access regardless of permission settings.

5. **Self-Deletion Prevention**: Staff members cannot delete their own account, preventing accidental lockouts.

## Common Workflows

### Onboarding a New Client:

**Option 1: Direct Creation (Faster)**
1. Users Tab → Add Client
2. Fill in all details
3. Create account
4. Manually send login credentials to client
5. Client logs in and resets password

**Option 2: Email Invitation (More Formal)**
1. Users Tab → Invite User
2. Select "Investor Client"
3. Send invitation
4. Client receives email and completes signup

### Setting Up a New Staff Member:

1. Users Tab → Invite User
2. Select "Staff Member"
3. Choose their role
4. Send invitation
5. Once they accept:
   - Go to Staff Tab
   - Click Settings icon
   - Configure their permissions
   - Save

### Managing Team Permissions:

**Quarterly Review:**
1. Go to Staff Tab
2. Review each staff member's permissions
3. Adjust based on role changes
4. Document permission changes in internal records

## Troubleshooting

**Issue: "Add Client" button doesn't appear**
- Check that you're logged in as a tenant owner or general manager
- Verify you have the proper role in the system
- Check that permissions were loaded correctly

**Issue: Cannot delete a client**
- Verify you have `can_manage_users` permission or are a tenant owner
- Check that the client exists in your tenant
- Ensure RLS policies are correctly configured

**Issue: Permission changes not taking effect**
- Refresh the page after changing permissions
- Check that the permission was saved in the database
- Verify the staff member logs out and back in

**Issue: Error creating client**
- Ensure email is unique (not already in use)
- Verify all required fields are filled
- Check account number doesn't duplicate existing accounts
- Confirm you're within your tenant's user limits (if applicable)

## Database Schema Reference

### client_profiles Table:
- `id`: UUID (matches auth.users.id)
- `full_name`: Text
- `email`: Text
- `account_number`: Text
- `total_invested`: Numeric
- `current_value`: Numeric
- `inception_date`: Date
- `tenant_id`: UUID (foreign key to platform_tenants)

### staff_permissions Table:
- `id`: UUID
- `staff_id`: UUID (foreign key to staff_accounts)
- `tenant_id`: UUID
- `can_manage_users`: Boolean
- `can_invite_clients`: Boolean
- `can_create_newsletters`: Boolean
- `can_approve_redemptions`: Boolean
- `can_view_performance`: Boolean

## Future Enhancements

Potential features to add:
- Bulk client import from CSV
- Client group management
- Role templates for quick staff setup
- Audit log for user management actions
- Client self-service profile updates
- Two-factor authentication requirements
- Password complexity enforcement
- Session management and timeout controls

---

For more information, see:
- **CURRENT_ACCOUNTS.md** - Test account details
- **PLATFORM_GUIDE.md** - Platform architecture
- **Database migrations** - Complete schema documentation
