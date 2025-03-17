/**
 * Parse VK Mini App launch parameters from URL
 * @param {string} [search] - URL search string (optional, uses window.location.search by default)
 * @returns {Record<string, string>} Parsed parameters
 */
export const parseLaunchParams = (search?: string): Record<string, string> => {
  if (typeof window === 'undefined') {
    throw new Error('parseLaunchParams is only available in browser environment');
  }
  
  const searchString = search || window.location.search;
  const params = new URLSearchParams(searchString);
  
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  
  return result;
};
