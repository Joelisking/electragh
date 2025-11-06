# Image Storage for Candidate Photos

This project supports three image storage options for candidate photos:

## 1. MinIO Storage (Default for Development)

**Pros:**

- S3-compatible API - same code as production
- Local development without AWS costs
- Easy to switch to AWS S3 in production
- Includes web console for file management

**Cons:**

- Requires Docker setup
- Not suitable for production deployment

**Setup:**

```bash
# Just run docker-compose up
docker-compose up
```

MinIO will be available at:

- API: http://localhost:9000
- Web Console: http://localhost:9001 (login: minio/minio123)
- Bucket: `voting-candidate-images` (created automatically)

## 2. AWS S3 Storage (Recommended for Production)

**Pros:**

- Scalable and reliable
- CDN support via CloudFront
- Automatic backups
- Professional grade

**Cons:**

- Requires AWS account
- Additional costs
- More complex setup

**Setup:**

1. Create an S3 bucket named `voting-candidate-images`
2. Set up CloudFront distribution (optional but recommended)
3. Create IAM user with S3 permissions
4. Update `.docker.env`:

```env
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=voting-candidate-images
AWS_S3_BUCKET_REGION=us-east-1
CDN_BASE_URL=https://your-cloudfront-domain.cloudfront.net
```

## 3. Local File Storage (Fallback)

**Pros:**

- Simple setup, no external dependencies
- Fast development and testing
- No additional costs

**Cons:**

- Not suitable for production
- Images lost when container restarts
- No CDN benefits

**Setup:**

```env
STORAGE_PROVIDER=local
```

Images are stored in `./uploads/candidates/` and served via `/uploads/candidates/` endpoint.

## Environment Variables

| Variable                | Description                                     | Default                   |
| ----------------------- | ----------------------------------------------- | ------------------------- |
| `STORAGE_PROVIDER`      | Storage type: `minio`, `s3`, or `local`         | `minio`                   |
| `AWS_ACCESS_KEY_ID`     | Access key (minio: `minio`, s3: your key)       | `minio`                   |
| `AWS_SECRET_ACCESS_KEY` | Secret key (minio: `minio123`, s3: your secret) | `minio123`                |
| `AWS_REGION`            | Region                                          | `us-east-1`               |
| `AWS_S3_BUCKET`         | Bucket name                                     | `voting-candidate-images` |
| `S3_ENDPOINT`           | MinIO endpoint (for minio only)                 | `http://minio:9000`       |
| `CDN_BASE_URL`          | CDN URL (optional)                              | `http://localhost:9000`   |

## Switching Between Storage Providers

The system automatically detects the storage provider based on environment variables:

- If `STORAGE_PROVIDER=minio` and MinIO variables are set → Uses MinIO
- If `STORAGE_PROVIDER=s3` and AWS variables are set → Uses AWS S3
- Otherwise → Falls back to local storage

## Migration from Development to Production

To switch from MinIO to AWS S3:

1. **Update environment variables:**

   ```env
   STORAGE_PROVIDER=s3
   AWS_ACCESS_KEY_ID=your_aws_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret
   CDN_BASE_URL=https://your-cloudfront-domain.cloudfront.net
   ```

2. **Migrate existing images:**

   - Use MinIO console to download images
   - Upload to AWS S3 bucket
   - Update database URLs if needed

3. **No code changes required!** The same API calls work with both providers.

## Image Processing

All candidate photos are:

- Resized to 400x400 pixels
- Converted to WebP format
- Compressed with 85% quality
- Stored with unique filenames

## Security

- File size limit: 5MB
- Allowed formats: JPEG, PNG, WebP
- Images are publicly accessible (required for voting interface)
- MinIO console accessible at http://localhost:9001
- Consider using CloudFront with signed URLs for production

## MinIO Console Access

Access the MinIO web console at http://localhost:9001:

- **Username:** minio
- **Password:** minio123

You can:

- Browse uploaded images
- Download/upload files manually
- Manage bucket policies
- Monitor storage usage
