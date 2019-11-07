// import * as request from 'request-promise-native';
import * as core from '@actions/core';

// API Docs: https://developer.github.com/v3
const { GITHUB_API_TOKEN } = process.env;

const repositoryName = core.getInput('repository-name');
const prReviewers = core.getInput('pr-reviewers');
const prTeamReviewers = core.getInput('pr-team-reviewers');

console.log({ GITHUB_API_TOKEN: Boolean(GITHUB_API_TOKEN), repositoryName, prReviewers, prTeamReviewers})

// const REPO = `https://api.github.com/repos/ifit/${repositoryName}`;
// const defaults = {
//   headers: {
//     'User-Agent': 'bender-ifit',
//     Authorization: `Bearer ${GITHUB_API_TOKEN}`
//   },
//   json: true,
// };
// const GET = (uri, opts?) => request(Object.assign({ method: 'GET', uri }, opts, defaults));
// const POST = (uri, body, opts?) => request(Object.assign({ method: 'POST', uri, body }, opts, defaults));

// let getBranchHead;
// {
//   let refs;
//   getBranchHead = async (branch) => {
//     if (!refs) {
//       refs = await GET(`${REPO}/git/refs/heads`);    
//     }
//     return refs.find(ref => ref.ref === `refs/heads/${branch}`).object.sha;
//   }
// }

// async function createBranch(name) {
//   const body = {
//     ref: `refs/heads/${name}`,
//     sha: await getBranchHead('test')
//   };
//   const result = await POST(`${REPO}/git/refs`, body);
//   return result;
// }

// async function createPR(title, body, head, base) {
//   return POST(`${REPO}/pulls`, {
//       title,
//       body,
//       head,
//       base
//     });
// }

// async function requestReview(pullNumber) {
//   return POST(
//     `${REPO}/pulls/${pullNumber}/requested_reviewers`, 
//     { 
//       team_reviewers: (prTeamReviewers || "").split(','),
//       reviewers: (prReviewers || "").split(','),
//     }
//   );
// }

// async function noDiff() {
//   const test = await getBranchHead("test");
//   const master = await getBranchHead("master");
//   return test === master;
// }

// async function createAutoPR() {
//   if (await noDiff()) {
//     console.log("test and master are identical so no PR will be created");
//     return;
//   }
//   const d = new Date();
//   const branchName = "test2master-" + d.toISOString().substr(0,10);
//   await createBranch(branchName);
//   console.log(`branch created: ${branchName}`)
//   const prTitle = 'Auto PR ' + branchName.replace('-', ' ');
//   const prBody = `
//     Make sure all these commits are ready to be merged into master.  
//     Feel free to request one or more reviews if you aren't sure.  
//     If you _are_ sure then approve and merge.
//   `;
//   const pr = await createPR(prTitle, prBody, branchName, 'master');
//   console.log(`PR created: ${prTitle}`)
//   await requestReview(pr.number);
//   console.log(`review requested`)
//   return 'success';
// }

// createAutoPR()
//   .then(console.log)
//   .catch((err) => {
//     console.error(err);
//     process.exit(1);
//   });