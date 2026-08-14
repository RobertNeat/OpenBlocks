# GitHub Actions CI/CD template

Reusable self-hosted GitHub Actions template for Node.js (Angular/NestJS), Spring Boot (Maven/Gradle) and Python projects, including monorepos.

The pipeline chain is:

1. `Check` — code quality, dependency/security checks, SAST, unit tests and a non-publishing application build.
2. `Build` — Docker image build, Trivy image scan and push to the local registry as the immutable commit SHA plus a convenience `latest` tag.
3. `Deploy` — deploy the exact SHA produced by Build over SSH with Docker Compose. Build publishes that SHA as a small GitHub Actions artifact, and Deploy downloads it from the exact completed Build run.

`Check` is triggered by a push to `main`. `Build` starts only after a successful `Check`. `Deploy` starts only after a successful `Build`.

## Project definition

For normal use, edit `.github/ci/projects.json`. Every enabled project must define `name`, `type`, `version` and `path`.

`version` always means the runtime version for the selected technology:

- `type: node` -> Node.js version
- `type: springboot` -> Java major version; CI uses Eclipse Temurin through `mise`
- `type: python` -> Python version

### Angular

```json
{
  "name": "frontend",
  "enabled": true,
  "type": "node",
  "framework": "angular",
  "version": "24",
  "path": "apps/frontend",
  "package_manager": "pnpm",
  "docker_context": "apps/frontend",
  "dockerfile": "Dockerfile",
  "image": "suite/frontend"
}
```

### NestJS

```json
{
  "name": "api",
  "enabled": true,
  "type": "node",
  "framework": "nestjs",
  "version": "24",
  "path": "apps/api",
  "package_manager": "pnpm",
  "docker_context": "apps/api",
  "dockerfile": "Dockerfile",
  "image": "suite/api"
}
```

### Spring Boot / Maven

```json
{
  "name": "backend",
  "enabled": true,
  "type": "springboot",
  "version": "21",
  "build_tool": "maven",
  "path": "apps/backend",
  "docker_context": "apps/backend",
  "dockerfile": "Dockerfile",
  "image": "suite/backend"
}
```

For Gradle use `"build_tool": "gradle"`.

### Python

```json
{
  "name": "worker",
  "enabled": true,
  "type": "python",
  "version": "3.13",
  "path": "apps/worker",
  "docker_context": "apps/worker",
  "dockerfile": "Dockerfile",
  "image": "suite/worker"
}
```

## Monorepo example

```json
{
  "projects": [
    {
      "name": "frontend",
      "enabled": true,
      "type": "node",
      "framework": "angular",
      "version": "24",
      "path": "apps/frontend",
      "package_manager": "pnpm",
      "docker_context": "apps/frontend",
      "dockerfile": "Dockerfile",
      "image": "suite/frontend"
    },
    {
      "name": "backend",
      "enabled": true,
      "type": "springboot",
      "version": "21",
      "build_tool": "gradle",
      "path": "apps/backend",
      "docker_context": "apps/backend",
      "dockerfile": "Dockerfile",
      "image": "suite/backend"
    },
    {
      "name": "worker",
      "enabled": true,
      "type": "python",
      "version": "3.13",
      "path": "apps/worker",
      "docker_context": "apps/worker",
      "dockerfile": "Dockerfile",
      "image": "suite/worker"
    }
  ],
  "deploy": {
    "host": "192.168.1.160",
    "user": "docker_deploy",
    "registry": "192.168.1.162:5000",
    "compose_file": "deploy/compose.yml",
    "remote_dir": "/opt/suite"
  }
}
```

GitHub Actions creates a matrix from all enabled entries, so each application gets an independent Check and Docker Build job.

## Runtime management with mise

The self-hosted runner does not need every Node/JDK/Python version installed system-wide. Install the `mise` binary globally on the runner host, for example in `/opt/ci-tools/bin/mise` with a symlink in `/usr/local/bin/mise`. The composite actions call `mise exec` with the version from `projects.json`.

Examples performed automatically by the actions:

```bash
mise exec node@24 -- node --version
mise exec java@temurin-21 -- java -version
mise exec python@3.13 -- python --version
```

If that runtime version is not present yet, `mise` downloads it on the first execution. Later jobs reuse the installed runtime cache available to the service user.

Install mise globally on the runner:

```bash
sudo mkdir -p /opt/ci-tools/bin
curl https://mise.run | sudo env MISE_INSTALL_PATH=/opt/ci-tools/bin/mise sh
sudo chmod 755 /opt/ci-tools/bin/mise
sudo ln -sf /opt/ci-tools/bin/mise /usr/local/bin/mise
mise --version
```

The workflows deliberately use `mise exec`; shell activation with `eval "$(mise activate bash)"` is not required for the GitHub Actions service. Do not rely on `~/.profile` for service dependencies.

## Python and uv

`mise` manages the Python interpreter version. `uv` remains the Python project/environment/package tool.

Install `uv` globally on the runner:

```bash
sudo mkdir -p /opt/ci-tools/bin
curl -LsSf https://astral.sh/uv/install.sh | sudo env UV_INSTALL_DIR=/opt/ci-tools/bin sh
sudo chmod 755 /opt/ci-tools/bin/uv /opt/ci-tools/bin/uvx
sudo ln -sf /opt/ci-tools/bin/uv /usr/local/bin/uv
sudo ln -sf /opt/ci-tools/bin/uvx /usr/local/bin/uvx
uv --version
```

The Python composite action resolves the exact interpreter selected by mise and passes it through `UV_PYTHON`, so `uv` uses the same Python version declared in `projects.json`.

## Node package managers

The Node action installs/uses the requested Node runtime through mise. It then enables Corepack. If the selected Node installation does not contain Corepack, the action installs Corepack into that Node installation first.

Keep the concrete pnpm/yarn version in the Node project's `package.json`, for example:

```json
{
  "packageManager": "pnpm@10.15.0"
}
```

Do not use `projects.json` to pin the package-manager version.

## Java build tools

Do not install Maven or Gradle globally on the runner. Spring projects should commit their wrapper:

- Maven: `mvnw` and `.mvn/`
- Gradle: `gradlew` and `gradle/wrapper/`

The pipeline chooses Java from `projects.json`, while the repository controls the Maven/Gradle version.

The current Spring check expects Checkstyle and Spotless to be configured in the project. Maven runs `checkstyle:check` and `spotless:check`; Gradle runs `checkstyleMain`, `checkstyleTest` and `spotlessCheck`.

## Security tools expected by the template

The template intentionally contains Trivy and Semgrep steps even if they are not installed on your runner yet.

Install these natively before enabling the pipeline in a real project:

- `trivy` — filesystem/SCA checks during Check and final Docker image scan during Build
- `semgrep` — SAST during Check; install it globally, for example with `UV_TOOL_DIR=/opt/ci-tools/uv-tools UV_TOOL_BIN_DIR=/opt/ci-tools/bin uv tool install semgrep`

Until they are installed, the `Verify security tools` step will fail explicitly instead of silently skipping security analysis.

Project-local tools should remain dependencies of each repository rather than global runner tools:

- Node: ESLint, Prettier, TypeScript, Jest/Vitest etc.
- Python: Ruff, mypy, pytest etc.
- Spring: Checkstyle/Spotless plugins, JUnit etc.

## Docker runtime-version build arguments

Build remains technology-neutral, but it forwards the project's `version` to Docker using one conventional build argument:

- Node -> `NODE_VERSION`
- Spring Boot -> `JAVA_VERSION`
- Python -> `PYTHON_VERSION`

Example Node Dockerfile:

```dockerfile
ARG NODE_VERSION=24
FROM node:${NODE_VERSION} AS build
```

Example Spring Dockerfile:

```dockerfile
ARG JAVA_VERSION=21
FROM eclipse-temurin:${JAVA_VERSION}-jdk AS build
```

Example Python Dockerfile:

```dockerfile
ARG PYTHON_VERSION=3.13
FROM python:${PYTHON_VERSION}-slim AS build
```

Dockerfiles are not forced to consume these arguments; an unused build argument does not affect the build. Using them keeps Check and Docker Build on the same runtime version.

## Docker Compose

The sample single-application compose file uses the top-level Compose project name:

```yaml
name: openblocks

services:
  app:
    image: ${REGISTRY}/${COMPOSE_PROJECT_NAME}/app:${IMAGE_TAG}
    restart: unless-stopped
    ports:
      - '80:80'
```

When copying the template for a different single-application project, changing `name:` is enough to change the registry namespace used by this compose example. For monorepos, define multiple services such as `${COMPOSE_PROJECT_NAME}/frontend`, `${COMPOSE_PROJECT_NAME}/backend`, etc.

## Runner prerequisites

Universal/native tools expected on the Debian 12 self-hosted runner:

- `git`, `jq`, `ssh`, `scp`
- Docker Engine/CLI + BuildKit + Docker Compose plugin
- `mise`
- `uv`
- `trivy`
- `semgrep`

Node.js, Java JDKs and Python interpreters are installed on demand by `mise`; they do not need to be provisioned globally in advance.

For a systemd-based GitHub Actions runner, add a service override so the non-interactive runner process sees the global CI tool directory:

```ini
[Service]
Environment="PATH=/opt/ci-tools/bin:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/bin:/sbin"
Environment="UV_TOOL_DIR=/opt/ci-tools/uv-tools"
Environment="UV_TOOL_BIN_DIR=/opt/ci-tools/bin"
```

## Important notes

- Technology-specific implementation lives under `.github/actions` because GitHub workflow YAML files themselves must remain directly under `.github/workflows`.
- `latest` is only a convenience Docker tag. Deploy always uses the immutable commit SHA. Build transfers that exact SHA to Deploy through the `deploy-metadata` workflow artifact, avoiding ambiguity across chained `workflow_run` events.
- `workflow_run` only starts the next workflow after the previous workflow completes; the YAML additionally checks that the previous conclusion was `success` and the source branch was `main`.
- The Node test command distinguishes Angular (`--watch=false`) from NestJS (`--runInBand`). If a repository uses a different test script contract, adjust only `.github/actions/check/node/action.yml` or later expose a project-specific test command.
- A single self-hosted runner process executes one job at a time. If multiple runner processes are later configured under the same Unix user, review concurrency around first-time runtime installations and shared tool caches.
