function createMemoryRepository(store = new Map()) {
  return {
    async get(ownerKey) {
      const entity = store.get(ownerKey);
      return entity ? { ...entity, etag: `W/"${entity.version}"` } : null;
    },
    async listAll() {
      return [...store.values()].map(entity => ({ ...entity }));
    },
    async insert(entity) {
      if (store.has(entity.rowKey)) {
        const error = new Error('Leaderboard record already exists.');
        error.statusCode = 409;
        throw error;
      }
      store.set(entity.rowKey, { ...entity, version: 1 });
      return { ...entity };
    },
    async replace(entity, etag) {
      const existing = store.get(entity.rowKey);
      if (!existing || etag !== `W/"${existing.version}"`) {
        const error = new Error('Leaderboard record changed concurrently.');
        error.statusCode = existing ? 412 : 404;
        throw error;
      }
      store.set(entity.rowKey, { ...entity, version: existing.version + 1 });
      return { ...entity };
    }
  };
}

module.exports = { createMemoryRepository };
