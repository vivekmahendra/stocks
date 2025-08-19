# Stocks Dashboard - Google Cloud Run Deployment

This guide will help you deploy the Stocks Dashboard to Google Cloud Run using Google Cloud Secret Manager for secure credential management.

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **Alpaca Markets API** credentials
4. **Supabase** project with database set up

## Deployment Steps

### Step 1: Set up Google Cloud Project

```bash
# Authenticate with Google Cloud
gcloud auth login

# Set your project
gcloud config set project vivekmahendradotcom

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com  
gcloud services enable secretmanager.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### Step 2: Create Secrets in Secret Manager

Create secrets for your API credentials:

```bash
# Create Alpaca API Key secret
echo -n "YOUR_ALPACA_API_KEY" | gcloud secrets create alpaca-api-key --data-file=-

# Create Alpaca Secret Key secret
echo -n "YOUR_ALPACA_SECRET_KEY" | gcloud secrets create alpaca-secret-key --data-file=-

# Create Supabase URL secret
echo -n "YOUR_SUPABASE_URL" | gcloud secrets create supabase-url --data-file=-

# Create Supabase Anon Key secret
echo -n "YOUR_SUPABASE_ANON_KEY" | gcloud secrets create supabase-anon-key --data-file=-
```

### Step 3: Build and Push Docker Image

```bash
gcloud builds submit --tag gcr.io/vivekmahendradotcom/stocks
```

### Step 4: Deploy to Cloud Run

```bash
gcloud run deploy stocks \
  --image gcr.io/vivekmahendradotcom/stocks \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets ALPACA_API_KEY=alpaca-api-key:latest \
  --set-secrets ALPACA_SECRET_KEY=alpaca-secret-key:latest \
  --set-secrets SUPABASE_URL=supabase-url:latest \
  --set-secrets SUPABASE_ANON_KEY=supabase-anon-key:latest \
  --memory 2Gi \
  --cpu 2 \
  --concurrency 1000 \
  --timeout 300 \
  --port 3000
```

### Step 5: Grant Secret Access Permissions

Grant the Cloud Run service account access to the secrets:

```bash
for secret in alpaca-api-key alpaca-secret-key supabase-url supabase-anon-key; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:385178775375-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

## Updating the Deployment

When you make changes to your application:

```bash
# Rebuild and push the image
gcloud builds submit --tag gcr.io/vivekmahendradotcom/stocks

# Update the Cloud Run service
gcloud run deploy stocks \
  --image gcr.io/vivekmahendradotcom/stocks \
  --region us-central1
```

## Managing Secrets

### View all secrets
```bash
gcloud secrets list
```

### Update a secret value
```bash
echo -n "NEW_SECRET_VALUE" | gcloud secrets versions add alpaca-api-key --data-file=-
```

### View secret value (for verification)
```bash
gcloud secrets versions access latest --secret=alpaca-api-key
```

## Monitoring and Logs

### View service details
```bash
gcloud run services describe stocks --region us-central1
```

### View logs
```bash
gcloud run services logs read stocks --region us-central1
```

### Stream logs in real-time
```bash
gcloud run services logs tail stocks --region us-central1
```

## Configuration Details

### Environment Variables
- `NODE_ENV=production`
- `PORT` (automatically set by Cloud Run)
- `ALPACA_API_KEY` (from Secret Manager)
- `ALPACA_SECRET_KEY` (from Secret Manager)
- `SUPABASE_URL` (from Secret Manager)
- `SUPABASE_ANON_KEY` (from Secret Manager)

### Resource Allocation
- **CPU**: 2 vCPU
- **Memory**: 2 GB
- **Concurrency**: 1000 concurrent requests per instance
- **Timeout**: 300 seconds

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Dockerfile syntax
   - Ensure `--legacy-peer-deps` flag is used in npm commands
   - Review Cloud Build logs

2. **Secret Access Errors**
   - Verify secrets exist: `gcloud secrets list`
   - Check IAM permissions are granted (Step 5)
   - Ensure service account has secretAccessor role

3. **Runtime Errors**
   - Check logs: `gcloud run services logs read stocks --region us-central1`
   - Verify secret values are correct
   - Test Alpaca/Supabase connectivity

## Cost Optimization

### Set maximum instances to control costs
```bash
gcloud run services update stocks \
  --region us-central1 \
  --max-instances 10
```

### Update resource allocation
```bash
gcloud run services update stocks \
  --region us-central1 \
  --memory 1Gi \
  --cpu 1
```

## Service URL

After deployment, your service will be available at:
```
https://stocks-[HASH]-uc.a.run.app
```

You can find the exact URL by running:
```bash
gcloud run services describe stocks --region us-central1 --format="value(status.url)"
```