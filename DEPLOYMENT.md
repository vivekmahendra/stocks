# Stocks Dashboard - Google Cloud Run Deployment

This guide will help you deploy the Stocks Dashboard to Google Cloud Run using Google Cloud Secret Manager for secure credential management.

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **Docker** (optional - Cloud Build will handle this)
4. **Alpaca Markets API** credentials
5. **Supabase** project with database set up

## Quick Deployment

### Step 1: Set up your Google Cloud Project

```bash
# Set your project ID
export PROJECT_ID="your-project-id-here"

# Authenticate with Google Cloud
gcloud auth login

# Set the project
gcloud config set project $PROJECT_ID
```

### Step 2: Set up secrets in Secret Manager

```bash
# Run the setup script to store your secrets securely
./setup-secrets.sh $PROJECT_ID
```

When prompted, enter your:
- **Alpaca API Key**: Your Alpaca Markets API key
- **Alpaca Secret Key**: Your Alpaca Markets secret key  
- **Supabase URL**: Your Supabase project URL (https://xxx.supabase.co)
- **Supabase Anon Key**: Your Supabase anonymous/public key

### Step 3: Deploy to Cloud Run

```bash
# Deploy the application
./deploy.sh $PROJECT_ID us-central1
```

The deployment script will:
1. Enable required Google Cloud APIs
2. Build your Docker image using Cloud Build
3. Deploy to Cloud Run with secret integration
4. Provide you with the service URL

## Manual Deployment Steps

If you prefer manual deployment:

### 1. Enable APIs
```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com  
gcloud services enable secretmanager.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 2. Create Secrets
```bash
# Create each secret individually
echo "YOUR_ALPACA_API_KEY" | gcloud secrets create alpaca-api-key --data-file=-
echo "YOUR_ALPACA_SECRET_KEY" | gcloud secrets create alpaca-secret-key --data-file=-
echo "YOUR_SUPABASE_URL" | gcloud secrets create supabase-url --data-file=-
echo "YOUR_SUPABASE_ANON_KEY" | gcloud secrets create supabase-anon-key --data-file=-
```

### 3. Build and Deploy
```bash
# Build the image
gcloud builds submit --tag gcr.io/$PROJECT_ID/stocks-dashboard

# Deploy to Cloud Run
gcloud run deploy stocks-dashboard \
  --image gcr.io/$PROJECT_ID/stocks-dashboard \
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
  --timeout 300
```

## Configuration Details

### Environment Variables
The application uses these environment variables in production:
- `NODE_ENV=production`
- `PORT=3000` (automatically set by Cloud Run)
- `ALPACA_API_KEY` (from Secret Manager)
- `ALPACA_SECRET_KEY` (from Secret Manager)
- `SUPABASE_URL` (from Secret Manager)
- `SUPABASE_ANON_KEY` (from Secret Manager)

### Resource Allocation
- **CPU**: 2 vCPU (can be adjusted based on load)
- **Memory**: 2 GB (recommended for chart processing)
- **Concurrency**: 1000 concurrent requests per instance
- **Timeout**: 300 seconds

### Security
- Secrets are stored in Google Cloud Secret Manager
- Cloud Run service account automatically gets access to secrets
- All communication is over HTTPS
- No sensitive data in environment variables or code

## Monitoring and Maintenance

### View Logs
```bash
gcloud run services logs read stocks-dashboard --region us-central1
```

### Update Secrets
```bash
# Update a secret with new value
echo "NEW_SECRET_VALUE" | gcloud secrets versions add alpaca-api-key --data-file=-
```

### Scale Configuration
```bash
# Update resource allocation
gcloud run services update stocks-dashboard \
  --region us-central1 \
  --memory 4Gi \
  --cpu 4
```

### Custom Domain (Optional)
```bash
# Map custom domain
gcloud run domain-mappings create \
  --service stocks-dashboard \
  --domain your-domain.com \
  --region us-central1
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure gcloud is authenticated: `gcloud auth list`
   - Check project permissions: `gcloud projects get-iam-policy $PROJECT_ID`

2. **Secret Access Errors**
   - Verify secrets exist: `gcloud secrets list`
   - Check service account permissions

3. **Build Failures**
   - Check Dockerfile syntax
   - Verify all dependencies in package.json
   - Review Cloud Build logs

4. **Runtime Errors**
   - Check Cloud Run logs: `gcloud run services logs read stocks-dashboard`
   - Verify secret values are correct
   - Test Alpaca/Supabase connectivity

### Support Commands
```bash
# Check service status
gcloud run services describe stocks-dashboard --region us-central1

# View secret versions
gcloud secrets versions list alpaca-api-key

# Test secret access
gcloud secrets versions access latest --secret=alpaca-api-key
```

## Cost Optimization

- Cloud Run charges per request and compute time
- Consider setting max instances to control costs
- Use Cloud Run's automatic scaling efficiently
- Monitor usage in Google Cloud Console

```bash
# Set max instances to control costs
gcloud run services update stocks-dashboard \
  --region us-central1 \
  --max-instances 10
```

## Next Steps

After successful deployment:
1. Test all functionality (watchlist, charts, account data)
2. Set up monitoring and alerting
3. Configure custom domain if needed
4. Set up CI/CD pipeline for future deployments
5. Review and optimize resource allocation based on usage

Your stocks dashboard should now be live and accessible via the Cloud Run URL!