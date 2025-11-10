# AWS S3 Setup Guide for Production

This guide walks you through setting up AWS S3 for storing candidate images in production.

## Step 1: Create S3 Bucket

### Via AWS Console:

1. Navigate to [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Click "Create bucket"
3. Configure:
   - **Bucket name**: `voting-candidate-images` (must be globally unique)
   - **Region**: `us-east-1` (or your preferred region)
   - **Block Public Access**: Uncheck "Block all public access" (we need public read access)
   - **Bucket Versioning**: Enable (recommended)
   - **Encryption**: Enable (recommended)
4. Click "Create bucket"

### Via AWS CLI:

```bash
# Create bucket
aws s3 mb s3://voting-candidate-images --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket voting-candidate-images \
  --versioning-configuration Status=Enabled

# Set bucket policy for public read access
aws s3api put-bucket-policy --bucket voting-candidate-images --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::voting-candidate-images/*"
    }
  ]
}'
```

## Step 2: Create IAM User for API Access

### Via AWS Console:

1. Navigate to [IAM Console](https://console.aws.amazon.com/iam/)
2. Click "Users" → "Add users"
3. Username: `voting-api-s3-user`
4. Select "Access key - Programmatic access"
5. Click "Next: Permissions"
6. Click "Attach policies directly"
7. Click "Create policy" → "JSON" tab
8. Paste the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3CandidateImageAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::voting-candidate-images",
        "arn:aws:s3:::voting-candidate-images/*"
      ]
    }
  ]
}
```

9. Name the policy: `VotingAPIS3Access`
10. Complete user creation
11. **Important**: Save the Access Key ID and Secret Access Key

### Via AWS CLI:

```bash
# Create IAM policy
aws iam create-policy \
  --policy-name VotingAPIS3Access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "S3CandidateImageAccess",
        "Effect": "Allow",
        "Action": [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ],
        "Resource": [
          "arn:aws:s3:::voting-candidate-images",
          "arn:aws:s3:::voting-candidate-images/*"
        ]
      }
    ]
  }'

# Create IAM user
aws iam create-user --user-name voting-api-s3-user

# Attach policy to user
aws iam attach-user-policy \
  --user-name voting-api-s3-user \
  --policy-arn arn:aws:iam::<account-id>:policy/VotingAPIS3Access

# Create access key
aws iam create-access-key --user-name voting-api-s3-user
# Save the AccessKeyId and SecretAccessKey from output
```

## Step 3: Configure CloudFront (Optional but Recommended)

CloudFront provides:
- Faster image delivery via CDN
- HTTPS for images
- DDoS protection
- Cost reduction for high traffic

### Via AWS Console:

1. Navigate to [CloudFront Console](https://console.aws.amazon.com/cloudfront/)
2. Click "Create distribution"
3. Configure:
   - **Origin domain**: Select your S3 bucket
   - **Origin access**: Public
   - **Viewer protocol policy**: Redirect HTTP to HTTPS
   - **Cache policy**: CachingOptimized
   - **Price class**: Use only North America and Europe (or your preference)
4. Click "Create distribution"
5. Wait for distribution to deploy (10-15 minutes)
6. Copy the **Distribution domain name** (e.g., `d111111abcdef8.cloudfront.net`)

### Via AWS CLI:

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --distribution-config '{
    "CallerReference": "voting-images-'$(date +%s)'",
    "Comment": "Voting Platform Candidate Images CDN",
    "Enabled": true,
    "Origins": {
      "Quantity": 1,
      "Items": [{
        "Id": "S3-voting-candidate-images",
        "DomainName": "voting-candidate-images.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "S3-voting-candidate-images",
      "ViewerProtocolPolicy": "redirect-to-https",
      "AllowedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      },
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      },
      "ForwardedValues": {
        "QueryString": false,
        "Cookies": {"Forward": "none"}
      },
      "MinTTL": 0,
      "DefaultTTL": 86400,
      "MaxTTL": 31536000
    }
  }'
```

## Step 4: Update Environment Variables

Add these to your `.env.production` file:

```bash
# AWS S3 Configuration
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=voting-candidate-images

# Optional: CloudFront CDN URL
CDN_BASE_URL=https://d111111abcdef8.cloudfront.net
```

## Step 5: Test Configuration

### Test S3 Access:

```bash
# Test AWS credentials
aws sts get-caller-identity

# List bucket contents
aws s3 ls s3://voting-candidate-images/

# Test upload
echo "test" > test.txt
aws s3 cp test.txt s3://voting-candidate-images/test/test.txt
aws s3 rm s3://voting-candidate-images/test/test.txt
rm test.txt
```

### Test from Application:

```bash
# Start the application
docker-compose -f docker-compose.production.yml up -d

# Check logs for S3 connection
docker-compose -f docker-compose.production.yml logs -f api

# Upload a candidate image via API and verify it appears in S3
```

## Security Best Practices

1. **Never commit AWS credentials to git**
   - Use environment variables only
   - Add `.env.production` to `.gitignore`

2. **Use IAM user with minimal permissions**
   - Only grant access to specific S3 bucket
   - Don't use root account credentials

3. **Enable S3 bucket versioning**
   - Allows recovery from accidental deletions
   - Keeps history of image changes

4. **Enable S3 server-side encryption**
   - Encrypts data at rest
   - No performance impact

5. **Use CloudFront for production**
   - Faster delivery
   - HTTPS by default
   - DDoS protection

6. **Set up CloudWatch alarms**
   - Monitor S3 API errors
   - Track storage costs
   - Alert on unusual activity

7. **Regular backups**
   - Enable S3 cross-region replication
   - Or use AWS Backup service

## Cost Estimation

### S3 Storage Costs (us-east-1):

- **Storage**: $0.023 per GB/month
- **PUT requests**: $0.005 per 1,000 requests
- **GET requests**: $0.0004 per 1,000 requests
- **Data transfer out**: $0.09 per GB (first 10TB/month)

### Example for 1,000 candidates:

- Average image size: 200 KB
- Total storage: 200 MB = **$0.005/month**
- Uploads: 1,000 = **$0.005**
- Views: 10,000/month = **$0.004/month**
- Data transfer: 2 GB = **$0.18/month**

**Total estimated cost: ~$0.20/month**

### CloudFront Costs:

- **Data transfer**: $0.085 per GB (first 10TB/month)
- **HTTP requests**: $0.0075 per 10,000 requests

With CloudFront, monthly cost for same usage: **~$0.10/month** (cheaper + faster)

## Troubleshooting

### "Access Denied" errors:

1. Verify IAM user has correct permissions
2. Check bucket policy allows public read
3. Ensure AWS credentials are correct
4. Verify bucket name and region match

### Images not loading:

1. Check bucket policy allows public GetObject
2. Verify CDN_BASE_URL is correct
3. Check CORS configuration if accessing from browser
4. Ensure S3 bucket is in correct region

### Upload failures:

1. Check IAM user has PutObject permission
2. Verify bucket exists and name is correct
3. Check AWS credentials are valid
4. Ensure region matches bucket region

## Support Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS S3 Pricing](https://aws.amazon.com/s3/pricing/)
