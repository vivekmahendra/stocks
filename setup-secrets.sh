#!/bin/bash

# Exit on any error
set -e

# Configuration
PROJECT_ID=${1:-"your-project-id"}

echo "🔐 Setting up secrets in Google Cloud Secret Manager"
echo "Project ID: $PROJECT_ID"
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

# Enable Secret Manager API
echo "🔧 Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com

# Function to create or update a secret
create_or_update_secret() {
    local secret_name=$1
    local secret_description=$2
    
    echo ""
    echo "📝 Setting up secret: $secret_name"
    echo "Description: $secret_description"
    
    # Check if secret already exists
    if gcloud secrets describe $secret_name --quiet 2>/dev/null; then
        echo "⚠️  Secret $secret_name already exists. Do you want to add a new version? (y/N)"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            echo "Enter the new value for $secret_name:"
            read -s secret_value
            echo "$secret_value" | gcloud secrets versions add $secret_name --data-file=-
            echo "✅ Added new version to secret: $secret_name"
        else
            echo "⏭️  Skipping $secret_name"
        fi
    else
        # Create new secret
        echo "Enter the value for $secret_name:"
        read -s secret_value
        echo "$secret_value" | gcloud secrets create $secret_name --data-file=- --labels=app=stocks-dashboard
        echo "✅ Created secret: $secret_name"
    fi
}

# Create secrets
echo ""
echo "🔐 We'll now create secrets for your application."
echo "You'll be prompted to enter each secret value."
echo ""

create_or_update_secret "alpaca-api-key" "Alpaca Markets API Key"
create_or_update_secret "alpaca-secret-key" "Alpaca Markets Secret Key"
create_or_update_secret "supabase-url" "Supabase Project URL"
create_or_update_secret "supabase-anon-key" "Supabase Anonymous Key"

echo ""
echo "✅ All secrets have been set up successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Deploy your application using: ./deploy.sh $PROJECT_ID"
echo "2. Make sure the Cloud Run service account has access to secrets"
echo ""
echo "🔍 To verify your secrets:"
echo "gcloud secrets list --filter='labels.app=stocks-dashboard'"
echo ""
echo "🔐 To view a secret value (for verification):"
echo "gcloud secrets versions access latest --secret=alpaca-api-key"