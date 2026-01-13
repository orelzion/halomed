# PowerSync Development Token Setup

## What You're Seeing

PowerSync is asking for:
1. **Instance URL**: `https://6966707c30605f245f01f498.powersync.journeyapps.com` ✅ (you have this)
2. **Development Token**: A temporary token for testing
3. **Token Subject**: The user identifier that matches your sync rules

## Step 1: Get Your Instance ID

From the URL: `https://6966707c30605f245f01f498.powersync.journeyapps.com`

Your **Instance ID** is: `6966707c30605f245f01f498`

Save this to your `.env` file:
```bash
POWERSYNC_DEV_INSTANCE_ID=6966707c30605f245f01f498
```

## Step 2: Create Development Token

### Option A: Use a Test User ID from Supabase

1. Go to your **development Supabase Dashboard**
2. Go to **Authentication** → **Users**
3. Create a test user or use an existing user
4. Copy the **User ID** (UUID format like `123e4567-e89b-12d3-a456-426614174000`)

### Option B: Use a Simple Test Value

For development, you can use a simple test value like:
- `test-user-123`
- `dev-user-1`
- Or any string identifier

## Step 3: Enter Token Subject

In PowerSync Dashboard, where it says **"Enter token subject"**:

**Enter the User ID** you want to test with. This should match what your sync rules expect.

Since your sync rules use:
```yaml
parameters: SELECT request.user_id() as user_id
```

The token subject should be the **user_id** value that will be used for testing.

**Examples:**
- If you have a test user in Supabase: Use that user's UUID
- For quick testing: Use `test-user-1` or similar
- You can create multiple tokens with different subjects for different test users

## Step 4: Generate the Token

1. Enter the token subject (user ID)
2. Click **Generate Token** or **Create Token**
3. **Copy the token immediately** - you won't be able to see it again!
4. Save it to your `.env` file (for reference, but you'll use it in your client app)

## Step 5: Update .env File

Add to your `.env`:
```bash
# PowerSync Development Instance
POWERSYNC_DEV_INSTANCE_ID=6966707c30605f245f01f498
POWERSYNC_DEV_API_KEY=your-api-key-here
POWERSYNC_DEV_TOKEN=your-development-token-here

# Test User ID (the token subject you used)
POWERSYNC_DEV_TEST_USER_ID=your-test-user-id-here
```

## Understanding Token Subject

The **token subject** is the user identifier that:
- Gets passed to your sync rules via `request.user_id()`
- Determines which data syncs (based on `WHERE user_id = bucket.user_id`)
- Should match an actual user_id in your `user_study_log` table for testing

## Testing

Once you have the token:
1. You can use it in your client app to test PowerSync connection
2. The sync will only return data for the user_id specified in the token subject
3. For production, tokens will come from Supabase Auth (not development tokens)

## Next Steps

After setting up the development token:
1. ✅ Instance URL saved
2. ✅ Development token created
3. ✅ Token subject configured
4. You can now test PowerSync connection from your client app

## Production Tokens

**Note:** Development tokens are temporary and for testing only. In production:
- Tokens will come from Supabase Auth
- PowerSync will extract `user_id` from the Supabase JWT token
- No need to manually create tokens
