# Photo storage

Maintenance, comment and meter photos are stored in the D1 database, in `photo_data`. pOS does not require an R2 bucket.

The app compresses images before upload. The Worker validates image content and accepts JPEG, PNG or WebP up to 1,200,000 bytes. It stores the image as base64 text because that is more efficient to read in the Workers runtime than a D1 BLOB for this use case. Upload metadata is associated with its workspace and uploader.

The browser does not read D1 directly. The API returns a short-lived HMAC-signed `/api/photos/:key` link and checks the signature when serving the image. Access to the related record is still governed by the application's role and workspace rules.

Photos count toward D1 storage, and D1 exports include them. Monitor database size and protect backups as personal data. Deleting a referenced photo makes it unavailable in the app; do not remove rows directly without understanding which records use them.

For upload limits or format errors, check the selected file and the request logs. The client normally compresses photos before upload.
