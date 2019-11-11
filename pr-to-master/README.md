# PR to master javascript action

This action creates a pull request to master from test.

## Inputs

### `github-api-token`

**Required** Get this from 1password and add it as a secret in your repository.
Pass it from your workflow like this `${{ secrets.GITHUB_API_TOKEN }}`

### `repository-name`

**Required** The name of the repository that you want the PR to be created for.  
To keep things simple, just pass `${{ github.repository }}` from your workflow.

### `pr-reviewers`

**Optional** Comma separated list of github user names that will be tagged as reviewers

### `pr-team-reviewers`

**Optional** Comma separated list of github team names that will be tagged as reviewers

## Example usage

uses: ifit/ifit-actions/pr-to-master@master
with:
  github-api-token: ${{ secrets.GITHUB_API_TOKEN }}
  repository-name: ${{ github.repository }}
  pr-team-reviewers: 'data-migration-pull-assigner-2'