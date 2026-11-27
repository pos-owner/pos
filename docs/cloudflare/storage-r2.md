# R2 photo storage

Photos (maintenance requests, comments, meter readings) are stored in a **private** R2 bucket, binding `PHOTOS`, default name `pos-photos`.

## How photos flow

```
phone → POST /api/photos (max 6 MB; type checked from the file's bytes, not its name)
      → R2 key p_<random>.jpg|png|webp, with owner and uploader in custom metadata
      → D1 photo_uploads row (who may attach it)

later → API returns /api/photos/<key>?exp=…&sig=…  (HMAC-signed, short-lived)
      → Worker checks the signature → reads R2 → "private, max-age=3600"
```

The bucket itself is never exposed. People only see photos through links the API signs for them, and only for records they may read. Someone can only attach photos they uploaded themselves in that workspace.

The signing key is `SIGNING_SECRET` if set, otherwise a random key generated once and stored in D1.

## Keep the bucket private

In the dashboard (**R2 → pos-photos → Settings**), leave **Public access** disabled: no `r2.dev` subdomain and no custom domain. There is no need for CORS rules either, because browsers never talk to R2 directly.

## Creating it

`npm run cf:setup` creates the bucket. By hand:

```bash
npx wrangler r2 bucket create pos-photos
```

R2 has to be enabled once per account in the dashboard (R2 Object Storage → accept the terms).

## Location

By default R2 picks a location near where the bucket is first used. For data-residency needs, create it with a jurisdiction or location hint **before** first deploy, for example:

```bash
npx wrangler r2 bucket create pos-photos --location apac
```

and then make sure `bucket_name` matches. You cannot move an existing bucket; create a new one and copy objects over.

## Browsing and cleaning up

```bash
npx wrangler r2 object get pos-photos/p_abc123.jpg --remote --file ./photo.jpg
npx wrangler r2 object delete pos-photos/p_abc123.jpg --remote
```

The dashboard (R2 → pos-photos → Objects) lists and previews objects.

Photos are kept as long as the records that reference them. If you want to expire, say, meter photos after two years, add an **Object lifecycle rule** in the bucket settings. Because keys share one prefix (`p_`), a lifecycle rule applies to every photo, so only do this if all of them may go.

## Backing up photos

R2 is durable on its own, but if you want an off-Cloudflare copy, R2 speaks the S3 API: create an **R2 API token** (R2 → Manage API tokens, read-only on this bucket) and use any S3-compatible tool, for example:

```bash
rclone sync r2:pos-photos ./photos-backup
```

## Local development

`wrangler dev` and the tests use a local emulation of R2 in `.wrangler/state`; nothing touches the real bucket unless you pass `--remote`.
