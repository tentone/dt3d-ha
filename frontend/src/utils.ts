
/**
 * Get a CSS variable, checks in the global space.
 * 
 * @param variable - Variable name.
 * @returns Value of the variable.
 */
export function getCSSVar(variable: string): string {
    // Remove  var() if present
    if (variable.includes('var(') && variable.includes(')')) {
        const varName = variable.substring(variable.indexOf('var(') + 4, variable.indexOf(')')).trim();
        return getComputedStyle(document.body).getPropertyValue(varName);
    }
    return getComputedStyle(document.body).getPropertyValue(variable);
}