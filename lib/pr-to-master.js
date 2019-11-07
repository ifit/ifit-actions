"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const request = __importStar(require("request-promise-native"));
const core = __importStar(require("@actions/core"));
// API Docs: https://developer.github.com/v3
const { GITHUB_API_TOKEN } = process.env;
const repositoryName = core.getInput('repository-name');
const prReviewers = core.getInput('pr-reviewers');
const prTeamReviewers = core.getInput('pr-team-reviewers');
const REPO = `https://api.github.com/repos/ifit/${repositoryName}`;
const defaults = {
    headers: {
        'User-Agent': 'bender-ifit',
        Authorization: `Bearer ${GITHUB_API_TOKEN}`
    },
    json: true,
};
const GET = (uri, opts) => request(Object.assign({ method: 'GET', uri }, opts, defaults));
const POST = (uri, body, opts) => request(Object.assign({ method: 'POST', uri, body }, opts, defaults));
let getBranchHead;
{
    let refs;
    getBranchHead = (branch) => __awaiter(this, void 0, void 0, function* () {
        if (!refs) {
            refs = yield GET(`${REPO}/git/refs/heads`);
        }
        return refs.find(ref => ref.ref === `refs/heads/${branch}`).object.sha;
    });
}
function createBranch(name) {
    return __awaiter(this, void 0, void 0, function* () {
        const body = {
            ref: `refs/heads/${name}`,
            sha: yield getBranchHead('test')
        };
        const result = yield POST(`${REPO}/git/refs`, body);
        return result;
    });
}
function createPR(title, body, head, base) {
    return __awaiter(this, void 0, void 0, function* () {
        return POST(`${REPO}/pulls`, {
            title,
            body,
            head,
            base
        });
    });
}
function requestReview(pullNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        return POST(`${REPO}/pulls/${pullNumber}/requested_reviewers`, {
            team_reviewers: (prTeamReviewers || "").split(','),
            reviewers: (prReviewers || "").split(','),
        });
    });
}
function noDiff() {
    return __awaiter(this, void 0, void 0, function* () {
        const test = yield getBranchHead("test");
        const master = yield getBranchHead("master");
        return test === master;
    });
}
function createAutoPR() {
    return __awaiter(this, void 0, void 0, function* () {
        if (yield noDiff()) {
            console.log("test and master are identical so no PR will be created");
            return;
        }
        const d = new Date();
        const branchName = "test2master-" + d.toISOString().substr(0, 10);
        yield createBranch(branchName);
        console.log(`branch created: ${branchName}`);
        const prTitle = 'Auto PR ' + branchName.replace('-', ' ');
        const prBody = `
    Make sure all these commits are ready to be merged into master.  
    Feel free to request one or more reviews if you aren't sure.  
    If you _are_ sure then approve and merge.
  `;
        const pr = yield createPR(prTitle, prBody, branchName, 'master');
        console.log(`PR created: ${prTitle}`);
        yield requestReview(pr.number);
        console.log(`review requested`);
        return 'success';
    });
}
createAutoPR()
    .then(console.log)
    .catch((err) => {
    console.error(err);
    process.exit(1);
});
