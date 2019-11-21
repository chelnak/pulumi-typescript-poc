# pulumi-typescript-poc

A proof of concept that replicates [das-shared-infrastructure](https://github.com/SkillsFundingAgency/das-shared-infrastructure/) using pulumi and the typescript Azure provider.

## Setup

1. Install pulumi: https://www.pulumi.com/docs/get-started/install/

2. Install nodejs LTS

3. run `npm install`

4. Install the `eslint` vscode extension
```bash
code --install-extension dbaeumer.vscode-eslint
```
5. Build a stack
```bash
pulumi stack select dev
pulumi up
```
