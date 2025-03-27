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
const JIRA_BASE_URL = 'https://ifitdev.atlassian.net/browse/';
const axiosBaseConfig: AxiosRequestConfig = {
  headers: {
    'User-Agent': 'bender-ifit',
    Authorization: `Bearer ${GITHUB_API_TOKEN}`,
    Accept: 'application/vnd.github.v3+json'
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

function extractJiraTickets(commitMessages: string[]): string[] {
  const jiraTicketRegex = /([A-Z]+-\d+)/g;
  const tickets = new Set<string>();
  
  commitMessages.forEach(message => {
    const matches = message.match(jiraTicketRegex);
    if (matches) {
      matches.forEach(ticket => tickets.add(ticket));
    }
  });
  
  return Array.from(tickets);
}

function formatJiraLinks(tickets: string[]): string {
  if (tickets.length === 0) return '';
  
  const links = tickets.map(ticket => 
    `[${ticket}](${JIRA_BASE_URL}${ticket})`
  );
  
  return `
## Related Jira Tickets
- ${links.join('\n - ')}
`;
}

async function getCommitsForPR(fromBranch: string, toBranch: string): Promise<string[]> {
  try {
    // GitHub's compare API gives us commits that are in fromBranch but not in toBranch
    // The format is BASE...HEAD where BASE is the target branch and HEAD is the source branch
    console.log(`Comparing ${toBranch}...${fromBranch}`);
    const comparison = await GET(`${REPO}/compare/${toBranch}...${fromBranch}`);
    
    if (!comparison.commits || comparison.commits.length === 0) {
      console.log('No unique commits found in the comparison');
      return [];
    }
    
    console.log(`Found ${comparison.commits.length} unique commits`);
    return comparison.commits.map(commit => commit.commit.message);
  } catch (error) {
    console.error(`Error getting PR commits:`, error);
    return [];
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
  
  // Get commit messages and extract Jira tickets
  const commitMessages = await getCommitsForPR(fromBranch, toBranch);
  console.log(`commit messages:\n - ${commitMessages.join('\n - ')}`)
  const jiraTickets = extractJiraTickets(commitMessages);
  const jiraLinksSection = formatJiraLinks(jiraTickets);
  
  const prTitle = 'Auto PR ' + branchName.replace('-', ' ');
  const prBody = `
Make sure all these commits are ready to be merged into ${toBranch}.
Feel free to request one or more reviews if you aren't sure.
If you are sure then approve and merge.

${jiraLinksSection}
  `;
  
  const pr = await createPR(prTitle, prBody, branchName, toBranch);
  console.log(`PR created: ${prTitle}`)
  if (jiraTickets.length > 0) {
    console.log(`Added ${jiraTickets.length} Jira ticket links to PR description`);
  }
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