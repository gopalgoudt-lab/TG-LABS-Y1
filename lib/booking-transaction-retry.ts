/** Retry only transactions rolled back by a serialization conflict. */
export async function retrySerializableBooking<T>(create: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await create();
    } catch (error) {
      if (attempt === 2 || !error || typeof error !== 'object' || !('code' in error) || error.code !== 'P2034') {
        throw error;
      }
    }
  }
  throw new Error('Unreachable booking retry state');
}
