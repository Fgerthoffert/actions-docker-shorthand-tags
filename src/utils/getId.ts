/**
 * Returns an id by making the string lowercase and stripping all non alphanumerical characters
 * @param string Any string
 * @returns {string} A string containing only alphanumerical characters
 */
export const getId = (string: string): string => {
  return String(string)
    .replace(/[^a-z0-9+]+/gi, '')
    .toLowerCase()
}
