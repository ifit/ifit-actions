import * as core from '@actions/core';
import axios, { AxiosRequestConfig } from 'axios';

function getInput(name: string) {
  return core.getInput(name) || process.env[name];
}
const GITHUB_API_TOKEN = getInput('github-api-token');
const repositoryName = getInput('repository-name');
const prReviewers = getInput('pr-reviewers');
const prTeamReviewers = getInput('pr-team-reviewers');
const fromBranch = getInput('from-branch') || 'test';
const toBranch = getInput('to-branch') || 'master';

console.log({ GITHUB_API_TOKEN: Boolean(GITHUB_API_TOKEN), repositoryName, prReviewers, prTeamReviewers, fromBranch, toBranch })

// API Docs: https://developer.github.com/v3
const REPO = `https://api.github.com/repos/${repositoryName}`;
const axiosBaseConfig: AxiosRequestConfig = {
  headers: {
    'User-Agent': 'bender-ifit',
    Authorization: `Bearer ${GITHUB_API_TOKEN}`
  }
};

const GET = (url: string, config?: AxiosRequestConfig): Promise<any> =>
  axios.get(url, Object.assign({ }, config, axiosBaseConfig)).then(res => res.data);

const POST = (url: string, body, config?: AxiosRequestConfig): Promise<any> =>
  axios.post(url, body, Object.assign({ }, config, axiosBaseConfig)).then(res => res.data);

// declare `getBranchHead` in main scope but define it in lower scope so `refs` is private to it
let getBranchHead;
{
  let refs; // memoize branch heads
  getBranchHead = async (branch) => {
    if (!refs) {
      refs = await GET(`${REPO}/git/refs/heads`);
    }
    console.log({refs})
    return refs.find(ref => ref.ref === `refs/heads/${branch}`).object.sha;
  }
}

async function createBranch(name, fromBranch) {
  const body = {
    ref: `refs/heads/${name}`,
    sha: await getBranchHead(fromBranch)
  };
  const result = await POST(`${REPO}/git/refs`, body);
  return result;
}

async function createPR(title, body, head, base) {
  return POST(`${REPO}/pulls`, {
      title,
      body,
      head,
      base
    });
}

async function requestReview(pullNumber) {
  return POST(
    `${REPO}/pulls/${pullNumber}/requested_reviewers`,
    {
      team_reviewers: prTeamReviewers ? prTeamReviewers.split(',') : [],
      reviewers: prReviewers ? prReviewers.split(',') : []
    }
  );
}

async function noDiff(fromBranch, toBranch) {
  const from = await getBranchHead(fromBranch);
  const to = await getBranchHead(toBranch);
  return from === to;
}

async function createAutoPR() {
  if (await noDiff(fromBranch, toBranch)) {
    console.log(`${fromBranch} and ${toBranch} are identical so no PR will be created`);
    return;
  }
  const d = new Date();
  const branchName = `${fromBranch}2${toBranch}-${ d.toISOString().substr(0, 10) }`;
  await createBranch(branchName, fromBranch);
  console.log(`branch created: ${branchName}`)
  const prTitle = 'Auto PR ' + branchName.replace('-', ' ');
  const prBody = `
    Make sure all these commits are ready to be merged into ${toBranch}.
    Feel free to request one or more reviews if you aren't sure.
    If you _are_ sure then approve and merge.
  `;
  const pr = await createPR(prTitle, prBody, branchName, toBranch);
  console.log(`PR created: ${prTitle}`)
  await requestReview(pr.number);
  console.log(`review requested`)
  return 'success';
}

createAutoPR()
  .then(console.log)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });