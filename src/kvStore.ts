export const getKv = async <T>(key: Deno.KvKey) => {
  const kv = await Deno.openKv("./kv.db");
  const value = await kv.get(key) as Deno.KvEntryMaybe<T>

  if (!value.value) {
    throw new Error(`No value found for ${key.join('/')}`)
  }

  return value.value
}

export const getKvNull = async <T>(key: Deno.KvKey) => {
  const kv = await Deno.openKv("./kv.db");
  const value = await kv.get(key) as Deno.KvEntryMaybe<T>

  if (!value.value) {
    return null
  }

  return value.value
}
