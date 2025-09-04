export interface DockerHubToken {
  token: string
  expires_in: number
  issued_at: string
}

export interface DockerHubAuth {
  domain: string
  service: string
  scope: string
  offlineToken: string
  clientId: string
  authorization: string
  token: DockerHubToken
}
