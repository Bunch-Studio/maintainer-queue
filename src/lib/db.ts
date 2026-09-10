// Supabase returns errors instead of throwing. Writes that must not fail silently go through this.
export const must = <T extends { error: { message: string } | null }>(result: T): T => {
  if (result.error) throw new Error(result.error.message);
  return result;
};
