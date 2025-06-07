let kv: Deno.Kv
export const getKv = async () => {
  if (!kv) {
    kv = await Deno.openKv("./kv.db")
  }
  return kv
}

export const get = async <T>(key: Deno.KvKey) => {
  const kv = await getKv();
  const value = await kv.get(key) as Deno.KvEntryMaybe<T>

  if (!value.value) {
    throw new Error(`No value found for ${key.join('/')}`)
  }

  return value.value
}

export const getNull = async <T>(key: Deno.KvKey) => {
  const kv = await getKv();
  const value = await kv.get(key) as Deno.KvEntryMaybe<T>

  if (!value.value) {
    return null
  }

  return value.value
}

