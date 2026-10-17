# Publishing to the Chrome Web Store

Merging to `main` releases automatically:

1. **Version bump.** `release-it` bumps the version from the [conventional commits](https://www.conventionalcommits.org/) since the last tag (`fix:` → patch, `feat:` → minor), updates `CHANGELOG.md` and `manifest.json`, then commits and tags `vX.Y.Z`. If there are only `docs:`/`chore:` commits, nothing is released.
2. **GitHub release.** The extension is built and the zip is attached to a GitHub release.
3. **Chrome Web Store.** The zip is uploaded and submitted for review. This step only runs once the setup below is done; until then it is skipped, not failed.

Pull requests run lint, tests and a build (`ci.yml`) before anything reaches `main`.

GitHub never stores a Google secret. Each run exchanges GitHub's short-lived OIDC token for a 15-minute Google access token, through Workload Identity Federation.

## One-time setup

Groupify reuses the publishing identity already set up for [translate me](https://github.com/amsyeung/translate-me/blob/main/docs/PUBLISHING.md): the same Google Cloud project, the same `cws-publisher` service account and the same Chrome Web Store publisher. A publisher has a single service account, and it can publish every item of that publisher, so no new account, key or token is needed.

The only new piece is letting **this** repository use that identity.

### 1. Google Cloud (Cloud Shell, once)

Run this in [Cloud Shell](https://shell.cloud.google.com). It adds a `groupify` provider to the existing `github` pool, limited to this repository, and lets it act as the existing service account:

```bash
PROJECT_ID=gen-lang-client-0828784551
SA=cws-publisher@$PROJECT_ID.iam.gserviceaccount.com
REPO=amsyeung/groupify
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# Only this repository may use the provider.
gcloud iam workload-identity-pools providers create-oidc groupify \
  --project=$PROJECT_ID --location=global --workload-identity-pool=github \
  --display-name="groupify" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --attribute-condition="assertion.repository == '$REPO'"

gcloud iam service-accounts add-iam-policy-binding $SA --project=$PROJECT_ID \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$REPO"
```

### 2. GitHub repository variables

_Settings → Secrets and variables → Actions → **Variables** tab._ These are not secrets; none of them grants access by itself.

| Variable                         | Value                                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/github/providers/groupify` |
| `GCP_SERVICE_ACCOUNT`            | same as translate me                                                                         |
| `CWS_PUBLISHER_ID`               | same as translate me                                                                         |
| `CWS_EXTENSION_ID`               | `kkajifdljgkcniokopfhllcocblblmeh`                                                           |

The store step is skipped while `CWS_EXTENSION_ID` is empty, so set it last.

**Recommended:** in _Settings → Environments_, open **`chrome-web-store`** and add yourself as a **required reviewer**. Every store submission then waits for you to click _Approve_ in the Actions run.

### 3. Check it works

_Actions → Chrome Web Store → Run workflow_, with mode **`status`**. This changes nothing. It prints the published version and review state, which proves the credentials work.

## Running by hand

The same workflow (_Actions → Chrome Web Store → Run workflow_) can:

- **`status`**: show the current store state.
- **`upload`**: upload a build as a draft without submitting it. Useful to check the store accepts the package.
- **`publish`**: upload and submit for review.

The store rejects an upload whose `manifest.json` version isn't higher than the current one, so re-running an old tag fails.

## What still needs a person

- **Google's review.** It usually takes hours to a few days, and you'll get an email.
- **Store listing changes.** Description, screenshots and privacy answers can't be changed through the API. Update them in the dashboard, especially when permissions change.
- **Visibility.** If you change visibility in the dashboard, publish once by hand before the API can publish again.
