<!-- markdownlint-disable MD041 MD033 -->
<p align="center">
  <img alt="ZenCrepesLogo" src="docs/zencrepes-logo.png" height="140" />
  <h2 align="center">Docker Shorthand tags</h2>
  <p align="center">A GitHub Action to generate shorthand tags
  for Docker images following semver</p>
</p>

---

<div align="center">

[![GitHub Super-Linter](https://github.com/fgerthoffert/actions-docker-shorthand-tags/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/fgerthoffert/actions-docker-shorthand-tags/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/fgerthoffert/actions-docker-shorthand-tags/actions/workflows/check-dist.yml/badge.svg)](https://github.com/fgerthoffert/actions-docker-shorthand-tags/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/fgerthoffert/actions-docker-shorthand-tags/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/fgerthoffert/actions-docker-shorthand-tags/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

</div>

---

# About

**Docker Shorthand tags** is a GitHub Action that generates shorthand tags for
Docker images following [Semantic Versioning](https://semver.org/). It
automatically creates shorthand aliases for your Docker image tags, making it
easier to reference major, minor, and patch versions, as well as snapshot
releases.

## How It Works

You need to provide two registries as part of the parameters:

- a Source registry used to collect the list of existing Docker tags. This
  currently only supports Docker Hub or GitHub and will use their respective API
  to fetch all tags published there.
- a Destination registry to which the shorthand tags will be pushed.

Note that the shorthand tags are created using `docker buildx imagetools`,
Docker containers will not need to be downloaded into the local runner.

The action support both releases and "snapshot/development" versions and will
try to stricly match these based on a provided digits count and snapshot suffix.
This strict matching is there to avoid mistakenly processing an existing
shorthand as an actual version in need of a shorthand.

## Sample

Using the following parameters

```yaml
version_digits_count: 3
snapshot_suffix: -SNAPSHOT
create_latest: true
```

And assuming the source repository has the following images:

```bash
1.0.0
1.1.0
1.2.0-SNAPSHOT
2.0.1
2.1.0
2.2.0
2.3.0
```

The following shorthand tags will be created:

```bash
1.0.0 => 1.0
1.1.0 => 1.0, 1
1.2.0-SNAPSHOT => 1.2-SNAPSHOT, 1-SNAPSHOT
2.0.1 => 2.0
2.1.0 => No Shorthands created
2.1.1 => 2.1
2.2.0 => 2.2
2.3.0 => 2.3, 2, latest
3.0.0-SNAPSHOT => 3.0-SNAPSHOT, 3-SNAPSHOT
```

## Usage Example

Add the following to your workflow YAML:

```yaml
jobs:
  generate-shorthand-tags:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate Docker shorthand tags
        uses: fgerthoffert/actions-docker-shorthand-tags@main
        with:
          src_registry: github
          src_repository: myorg/myrepo
          src_username: username
          src_secret: token
          dst_registry: github
          dst_repository: myorg/myrepo
          dst_username: username
          dst_secret: token
          create_latest: true
          dry_run: true
```

## Inputs

| Input                  | Description                                                                                                                                                                | Required | Default     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------- |
| `src_registry`         | Source Docker registry (e.g. DockerHub, GitHub)                                                                                                                            | Yes      | -           |
| `src_repository`       | Source Docker repository (e.g. user/repository)                                                                                                                            | Yes      | -           |
| `src_username`         | Username to connect to the source registry                                                                                                                                 | Yes      | -           |
| `src_secret`           | Secret to connect to the source registry (password or token)                                                                                                               | Yes      | -           |
| `dst_registry`         | Destination Docker registry (e.g. DockerHub, GitHub)                                                                                                                       | Yes      | -           |
| `dst_repository`       | Destination Docker repository (e.g. user/repository)                                                                                                                       | Yes      | -           |
| `dst_username`         | Username to connect to the destination registry                                                                                                                            | Yes      | -           |
| `dst_secret`           | Secret to connect to the destination registry (password or token)                                                                                                          | Yes      | -           |
| `dev_cache`            | Enable development cache, this prevents the action from fetching data from the source registry too frequently during development                                           | No       | `false`     |
| `version_digits_count` | Number of version digits to include in the shorthand tags (for example 3 for 1.2.3 or 4 for 1.2.3.4)                                                                       | No       | `3`         |
| `snapshot_suffix`      | Suffix for which shorthands should be created (for example 1-SNAPSHOT and 1.2-SNAPSHOT for 1.2.3-SNAPSHOT)                                                                 | No       | `-SNAPSHOT` |
| `dry_run`              | Enable dry run mode, this prevents the action from making any changes to the target registry during development. Will output the Docker commands instead of executing them | No       | `true`      |
| `create_latest`        | Enable creation of latest tags (e.g. latest) for most recent (highest digit) release pushed                                                                                | No       | `false`     |

Note that if you are using GitHub Packages as a source repository, the secret
input should be a personal API token generated from the GitHub UI, this token
should have the scopes: "read:packages", "read:org". If you are using the same
token to push shorthand tags, the token also needs the "write:packages" scope.

# How to Contribute

- Fork the repository
- Run `npm install`
- Rename `.env.example` to `.env`
- Update the `INPUT_` variables
- Make your changes
- Run `npx local-action . src/main.ts .env`
- Run `npm run bundle`
- Run `npm test`
- Submit a PR to this repository, detailing your changes

More details about GitHub TypeScript actions are
[available here](https://github.com/actions/typescript-action)
