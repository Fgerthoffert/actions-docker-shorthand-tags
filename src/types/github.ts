export interface GitHubOrganization {
  id: string
  login: string
  url: string
}

export interface GitHubPackage {
  id: string
  name: string
  package_type: 'npm' | 'maven' | 'rubygems' | 'docker' | 'nuget' | 'container'
  version_count: number
  visibility: 'public' | 'private'
  url: string
  created_at: string
  updated_at: string
  repository: GitHubRepository
}

export interface GitHubPackageVersion {
  id: string
  name: string
  url: string
  created_at: string
  updated_at: string
  metadata: {
    package_type:
      | 'npm'
      | 'maven'
      | 'rubygems'
      | 'docker'
      | 'nuget'
      | 'container'
    container: {
      tags: string[]
    }
  }
}

export interface GitHubRateLimit {
  limit: number
  cost: number
  remaining: number
  resetAt: string | null
}

export interface GitHubRepository {
  name: string
  owner: GitHubOrganization
  url: string
}

export interface GitHubProject {
  id?: string
  title: string
  items?: {
    totalCount: number
  }
}

export interface GitHubMilestone {
  state: string
  title: string
}

export interface GitHubProjectV2Node {
  id: string
  title: string
  items: GitHubProjectCardConnection
}

interface GitHubProjectCardConnection {
  totalCount: number
  edges: GitHubProjectCardEdge[]
  pageInfo: GitHubPageInfo
}

interface GitHubPageInfo {
  hasNextPage: boolean
  endCursor: string | null
}

export interface GitHubProjectCardEdge {
  cursor: string
  node: GitHubProjectCard
}

export interface GitHubProjectCard {
  id: string
  updatedAt: string
  content: GitHubIssueBase | GitHubPullRequestBase | null
  fieldValues: {
    nodes: GitHubProjectV2ItemFieldValue[]
  }
}

export interface GitHubSubIssueEdge {
  cursor: string
  node: GitHubIssue
}

export interface GitHubLabel {
  name: string
}

export interface GitHubIssueBase {
  __typename: 'Issue'
  id: string
  updatedAt: string
  closedAt: string | null
}

export interface GitHubIssue extends GitHubIssueBase {
  title: string
  number: number
  closedAt: string | null
  stateReason: string | null
  url: string
  repository: GitHubRepository
  milestone: GitHubMilestone | null
  labels: {
    nodes: GitHubLabel[]
  }
  projectsV2: {
    nodes: GitHubProject[]
  }
  mergedAt: string | null
  issueType: {
    name: string
  }
  subIssues: {
    totalCount: number
    nodes: GitHubIssue[]
  }
}

export interface GitHubIssueAugmented extends GitHubIssue {
  points?: number
  project?: {
    [key: string]: string
  }
}

export interface GitHubPullRequestBase {
  __typename: 'PullRequest'
  id: string
  updatedAt: string
  closedAt: string | null
}

export interface GitHubPullRequest extends GitHubPullRequestBase {
  title: string
  number: number
  url: string
  repository: GitHubRepository
  milestone: GitHubMilestone | null
  labels: {
    nodes: GitHubLabel[]
  }
  projectsV2: {
    nodes: GitHubProject[]
  }
  mergedAt: string | null
}

export interface GitHubPullRequestAugmented extends GitHubPullRequest {
  points?: number | null
  project?: {
    [key: string]: string
  }
}

// Base interface for all field value types
interface GitHubBaseFieldValue {
  __typename: string
  field: {
    name: string
  }
}

interface GitHubProjectV2ItemFieldDateValue extends GitHubBaseFieldValue {
  __typename: 'ProjectV2ItemFieldDateValue'
  date: string | null
}

interface GitHubProjectV2ItemFieldIterationValue extends GitHubBaseFieldValue {
  __typename: 'ProjectV2ItemFieldIterationValue'
  title: string
}

interface GitHubProjectV2ItemFieldNumberValue extends GitHubBaseFieldValue {
  __typename: 'ProjectV2ItemFieldNumberValue'
  number: number
}

interface GitHubProjectV2ItemFieldSingleSelectValue
  extends GitHubBaseFieldValue {
  __typename: 'ProjectV2ItemFieldSingleSelectValue'
  name: string
}

interface GitHubProjectV2ItemFieldTextValue extends GitHubBaseFieldValue {
  __typename: 'ProjectV2ItemFieldTextValue'
  text: string
}

// Union type for all possible field values
export type GitHubProjectV2ItemFieldValue =
  | GitHubProjectV2ItemFieldDateValue
  | GitHubProjectV2ItemFieldIterationValue
  | GitHubProjectV2ItemFieldNumberValue
  | GitHubProjectV2ItemFieldSingleSelectValue
  | GitHubProjectV2ItemFieldTextValue
