# Update Restrictions Configuration

## Overview
This document describes the update restrictions implemented for the subscription manager.

## Features Added

### 1. Template Size Limit
- **Maximum allowed size**: 10 MB (10,485,760 bytes)
- **Enforcement**: Applied to both HTTP header `content-length` and actual downloaded content
- **Error code**: 413 Payload Too Large

### 2. URL Whitelist Control
- **Configuration variable**: `ALLOW_URL`
- **Format**: JSON array of URL patterns
- **Wildcard support**:
  - `*` matches any characters except `/`
  - `**` matches any characters including `/`
- **Enforcement**: Returns 403 Forbidden if URL not in whitelist
- **Default**: If `ALLOW_URL` is empty or not set, all URLs are allowed
- **Redirect Support**: Automatic redirect following is enabled for all whitelisted URLs

## Configuration

### Setting Environment Variables in Cloudflare Console

Navigate to Workers & Pages > subscription > Settings > Environment Variables

#### Template Size Limit
No configuration needed - hardcoded to 10 MB

#### ALLOW_URL Variable
```json
["https://example.com/**", "https://trusted-domain.com/*", "https://cdn.*.com/**"]
```

### Examples

#### Allow only specific domain:
```json
["https://config.example.com/**"]
```

#### Allow multiple domains with CDN:
```json
["https://example.com/**", "https://cdn.example.com/**", "https://backup.example.com/**"]
```

#### Allow any HTTPS URL (pattern matching):
```json
["https://**"]
```

#### Allow specific paths:
```json
["https://example.com/config/**", "https://example.com/templates/*"]
```

## HTTP Status Codes

| Code | Reason |
|------|--------|
| 200 | Template updated successfully |
| 400 | Template link not provided |
| 403 | URL not in whitelist (ALLOW_URL restriction) |
| 413 | Template size exceeds 10 MB limit |
| 500 | Server error (parsing, etc.) |

## Usage Examples

### Without ALLOW_URL restriction
```bash
# Updates from any URL
curl "https://api.example.com/sub?gte=update&url=https://cdn.any-domain.com/config.yaml"
```

### With ALLOW_URL restriction
If `ALLOW_URL` = `["https://trusted.com/**", "https://cdn.*.com/**"]`

```bash
# ✅ Allowed - matches pattern
curl "https://api.example.com/sub?gte=update&url=https://trusted.com/templates/config.yaml"

# ✅ Allowed - matches wildcard pattern
curl "https://api.example.com/sub?gte=update&url=https://cdn.example.com/config.yaml"

# ❌ Forbidden - not in whitelist
curl "https://api.example.com/sub?gte=update&url=https://untrusted.com/config.yaml"
# Response: 403 URL not allowed: https://untrusted.com/config.yaml...
```

## Implementation Details

### URL Validation Flow
1. Parse `ALLOW_URL` as JSON array (if configured)
2. Validate initial URL against whitelist patterns
3. If URL matches whitelist (or whitelist is empty), proceed with fetch
4. Fetch automatically follows HTTP redirects (3xx responses)
5. Apply size limits to the final downloaded content

### URL Pattern Matching
- Convert wildcards: `**` → `.*`, `*` → `[^/]*`
- Escape special regex characters
- Match against the requested URL
- Allow if any pattern matches
- Return 403 if no patterns match (when whitelist is configured)

### Size Check Process
1. Check HTTP response header `content-length`
2. Compare against 10 MB limit
3. Download the template
4. Verify actual downloaded size
5. Return 413 if limit exceeded at any point

## Notes
- Size limits are applied to the raw YAML content
- URL patterns are case-sensitive
- At least one ALLOW_URL pattern must match for the update to proceed
- If ALLOW_URL is not set or empty array, all URLs are permitted
- **Redirects are automatically followed**: Once a URL passes the whitelist check, any redirects from that source are allowed
