# Push Nacre to GitHub

The ready-to-push archive contains a Git repository with its initial commit already created on the `main` branch. After extracting it, authenticate GitHub CLI and create/push the public repository in one command.

## 1. Extract the archive

```bash
unzip Nacre-GitHub-Repository-Ready-to-Push.zip
cd Nacre
```

## 2. Authenticate GitHub CLI (once per machine)

```bash
gh auth login
```

Choose GitHub.com, HTTPS, and complete the browser authentication flow.

## 3. Create the repository and push the commit

```bash
gh repo create Nacre --public --source=. --remote=origin --push
```

This creates `https://github.com/icrmahin/Nacre`, configures `origin`, and pushes the existing `main` branch and its initial commit. The repository URL is also recorded in `package.json`.

## Verify

```bash
git remote -v
git status --short
gh repo view --web
```

The working tree should be clean. The GitHub repository should contain the full source tree, `releases/` with the VSIX and ZIP archives, and the documentation under `docs/`.
