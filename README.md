# ifit-actions
iFit's central repository for Github actions

# Usage

1. Copy `example.yml` to `${your-project}/.github/workflows`
2. Rename and edit as desired (or use it exactly as is).
3. Add any necessary secrets to your repository (if using `pr-to-master` you need to add the `GITHUB_API_TOKEN` which you can find in 1password).

# Contributing

To add a new action, use the `pr-to-master` folder as an example.  Just creating a copy of this is probably the easiest way to get started.

1. Create a new folder in the root of the project. The name of your folder will be the name of your action.
2. In the new director Create an `action.yml` file.  This is your action definition and will include things like description and inputs.
3. Create your `${action-name}.ts` file.  
4. Add a build command to `package.json`.  Javascript that is executed as an action needs to be bundled with all its dependencies.