#!/bin/bash

# Exit on any error
set -e

# Configuration
PROJECT_ID=${1:-"vivekmahendradotcom"}
REGION=${2:-"us-central1"}
SERVICE_NAME="stocks-dashboard"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Deploying Stocks Dashboard to Cloud Run"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Service Name: $SERVICE_NAME"
echo ""

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with gcloud. Please run 'gcloud auth login'"
    exit 1
fi

# Set the project
echo "🔧 Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and push the Docker image
echo "🔨 Building Docker image..."
gcloud builds submit --tag $IMAGE_NAME

# Update the service YAML with the correct project ID
echo "🔧 Updating service configuration..."
sed "s/PROJECT_ID/$PROJECT_ID/g" cloudrun-service.yaml > cloudrun-service-temp.yaml

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run services replace cloudrun-service-temp.yaml --region=$REGION

# Clean up temporary file
rm cloudrun-service-temp.yaml

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo ""
echo "✅ Deployment completed successfully!"
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "📝 Next steps:"
echo "1. Make sure your secrets are created in Secret Manager:"
echo "   - alpaca-api-key"
echo "   - alpaca-secret-key" 
echo "   - supabase-url"
echo "   - supabase-anon-key"
echo ""
echo "2. Ensure the Cloud Run service account has access to the secrets:"
echo "   gcloud projects add-iam-policy-binding $PROJECT_ID \\"
echo "     --member=\"serviceAccount:$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(spec.template.spec.serviceAccountName)')\" \\"
echo "     --role=\"roles/secretmanager.secretAccessor\""
echo ""
echo "3. Test your deployment: curl $SERVICE_URL"