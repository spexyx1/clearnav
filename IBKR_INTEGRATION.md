# Interactive Brokers Integration Guide

## Overview

This application integrates with Interactive Brokers (IBKR) to provide real-time portfolio data for Grey Alpha's pooled trust structure. Clients view their proportional share of the master IBKR account based on their unit ownership in the trust.

## Architecture

### Trust Structure
- Single IBKR account holds all trust assets
- Clients own **units** in the trust, not direct securities
- Each client's portfolio value = Units Owned × Current NAV per Unit
- NAV (Net Asset Value) is calculated as: Total Trust AUM ÷ Total Units Outstanding

### Data Flow
1. **IBKR API** → Fetches account positions, balances, and prices
2. **Edge Function** → Processes IBKR data and calculates NAV
3. **Supabase Database** → Stores positions, NAV history, and client units
4. **Client Portal** → Displays proportional holdings to each client

### Sync Schedule
- Syncs every 15 minutes during market hours (9:30 AM - 4:00 PM ET, Mon-Fri)
- Manual refresh available via Dashboard button
- Outside market hours, sync is automatically skipped

## Database Schema

### Key Tables

#### `trust_account`
Stores the master trust information and current state.
- `total_aum`: Total assets under management
- `total_units_outstanding`: Total units issued to all clients
- `current_nav_per_unit`: Current NAV per unit
- `last_sync_at`: Last successful IBKR sync timestamp

#### `client_units`
Links clients to their unit holdings.
- `client_id`: References the client
- `units_owned`: Number of units owned by client
- `cost_basis`: Total amount invested
- `cost_basis_per_unit`: Average cost per unit

#### `trust_positions`
Stores current positions from IBKR account.
- `symbol`: Stock ticker
- `quantity`: Number of shares held by trust
- `current_price`: Current market price
- `market_value`: Total position value
- `unrealized_pnl`: Unrealized profit/loss

#### `trust_nav_history`
Historical record of NAV calculations.
- `nav_per_unit`: NAV at this timestamp
- `total_aum`: Trust AUM at this timestamp
- `total_units`: Units outstanding at this timestamp

#### `unit_transactions`
Record of all unit subscriptions and redemptions.
- `transaction_type`: 'subscription' or 'redemption'
- `units`: Number of units (+ for subscription, - for redemption)
- `amount`: Dollar amount
- `nav_per_unit`: NAV at transaction time

## Edge Functions

### `ibkr-sync-portfolio`
Main synchronization function that:
1. Connects to IBKR Client Portal Gateway API
2. Fetches account summary and all positions
3. Updates `trust_positions` table with current holdings
4. Calculates new NAV per unit
5. Updates all client portfolio values
6. Records NAV in history table

**Endpoint**: `POST /functions/v1/ibkr-sync-portfolio`

**Note**: Currently uses mock data if IBKR API is unavailable. Configure `IBKR_GATEWAY_URL` and `IBKR_ACCOUNT_ID` environment variables for live data.

### `ibkr-scheduled-sync`
Cron job function that:
1. Checks if current time is during market hours
2. Calls `ibkr-sync-portfolio` if yes
3. Skips sync if outside market hours

**Endpoint**: `POST /functions/v1/ibkr-scheduled-sync`

## Setup Instructions

### 1. IBKR Client Portal Gateway

You need to run the IBKR Client Portal Gateway to access the API:

1. Download from: https://www.interactivebrokers.com/en/trading/ib-api.php
2. Start the gateway:
   ```bash
   ./bin/run.sh root/conf.yaml
   ```
3. The gateway runs on `https://localhost:5000` by default
4. Important: Keep the gateway running during market hours

### 2. Environment Variables

Configure these in your Supabase project:

```bash
IBKR_GATEWAY_URL=https://localhost:5000  # Your gateway URL
IBKR_ACCOUNT_ID=U1234567                  # Your IBKR account ID
CRON_SECRET=your-secure-secret            # For scheduled sync security
```

### 3. Set Up Scheduled Sync

To enable automatic 15-minute syncs, configure a cron job in Supabase:

1. Go to Supabase Dashboard → Database → Cron Jobs
2. Create new job:
   - Name: "IBKR Portfolio Sync"
   - Schedule: `*/15 * * * *` (every 15 minutes)
   - Command:
     ```sql
     SELECT
       net.http_post(
         url:='https://YOUR_PROJECT.supabase.co/functions/v1/ibkr-scheduled-sync',
         headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb
       );
     ```

### 4. Initialize Trust Account

The trust account is automatically created with the migration. To update IBKR details:

```sql
UPDATE trust_account
SET
  ibkr_account_id = 'U1234567',
  name = 'Grey Alpha Master Trust'
WHERE id = (SELECT id FROM trust_account LIMIT 1);
```

## Issuing Client Units

### Via Admin Interface

1. Log in to the client portal
2. Navigate to Admin Units section (admin only)
3. Click "Issue Units"
4. Select client and enter investment amount
5. Units will be calculated automatically based on current NAV

### Manual SQL

```sql
-- Get current NAV
SELECT current_nav_per_unit FROM trust_account LIMIT 1;

-- Issue units (example: $500,000 investment at NAV of $1.0234)
INSERT INTO client_units (
  client_id,
  trust_account_id,
  units_owned,
  cost_basis,
  cost_basis_per_unit
) VALUES (
  'client-uuid-here',
  (SELECT id FROM trust_account LIMIT 1),
  488563.79,  -- $500,000 / $1.0234
  500000,
  1.0234
);

-- Update trust total units
UPDATE trust_account
SET total_units_outstanding = total_units_outstanding + 488563.79;

-- Record transaction
INSERT INTO unit_transactions (
  client_id,
  trust_account_id,
  transaction_type,
  units,
  amount,
  nav_per_unit,
  status
) VALUES (
  'client-uuid-here',
  (SELECT id FROM trust_account LIMIT 1),
  'subscription',
  488563.79,
  500000,
  1.0234,
  'completed'
);
```

## Client Portal Features

### Dashboard
- **Current Value**: Client's units × current NAV
- **Units Owned**: Number of trust units owned
- **Cost Basis**: Total amount invested
- **Trust Ownership**: Percentage of total trust
- **Proportional Holdings**: Client's share of each position
- **Trust Summary**: Overall trust metrics
- **Manual Refresh**: Button to trigger immediate sync

### Returns
- Calculated from NAV history
- Shows performance over time
- Compares to initial cost basis

### Redemptions
- Clients can request redemptions
- Amount validated against current value
- Redeemed at current NAV

## Testing

### Mock Data Mode
The sync function includes mock IBKR data for testing:
- 4 stock positions (AAPL, MSFT, GOOGL, NVDA)
- $1.5M total portfolio value
- $50K cash balance

### Test Client Setup
```sql
-- Create test client profile
INSERT INTO client_profiles (
  id,
  full_name,
  email,
  account_number,
  total_invested,
  current_value
) VALUES (
  'test-client-uuid',
  'Test Client',
  'test@example.com',
  'GA001',
  500000,
  500000
);

-- Issue test units
INSERT INTO client_units (
  client_id,
  trust_account_id,
  units_owned,
  cost_basis,
  cost_basis_per_unit
) VALUES (
  'test-client-uuid',
  (SELECT id FROM trust_account LIMIT 1),
  500000,
  500000,
  1.00
);

-- Update trust units
UPDATE trust_account
SET total_units_outstanding = 500000;
```

### Manual Sync Test
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/ibkr-sync-portfolio \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Troubleshooting

### Sync Failures
1. Check IBKR Gateway is running: `curl https://localhost:5000/v1/api/iserver/auth/status`
2. Verify environment variables are set correctly
3. Check `ibkr_sync_log` table for error messages
4. Ensure IBKR account is logged in and authenticated

### NAV Calculation Issues
1. Verify `total_units_outstanding` matches sum of all `client_units.units_owned`
2. Check `trust_positions` table is being populated
3. Ensure `total_aum` is calculating correctly (positions + cash)

### Missing Positions
1. Verify IBKR account has positions
2. Check if positions are in supported asset classes
3. Review sync log for partial sync status

## Security Considerations

1. **RLS Policies**: Clients can only view their own units and allocations
2. **Admin Access**: Unit management requires service role or admin privileges
3. **API Keys**: IBKR credentials stored in environment variables, never in code
4. **Cron Secret**: Scheduled sync endpoint protected by secret token
5. **HTTPS**: All IBKR communication over HTTPS

## Performance

- Sync typically completes in 2-5 seconds
- Dashboard loads in <1 second with cached data
- Database indexes optimize unit lookup and NAV history queries
- Single IBKR connection serves all clients efficiently

## Future Enhancements

- Real-time WebSocket updates from IBKR
- Automated capital calls and distributions
- Performance attribution by position
- Tax lot tracking for realized gains
- Automated monthly statements
- Integration with accounting systems
