export default defineNuxtPlugin(() => {
  // Polyfill for Promise.withResolvers (Safari < 17.4)
  if (typeof Promise.withResolvers !== 'function') {
    Promise.withResolvers = function <T>() {
      let resolve!: (value: T | PromiseLike<T>) => void
      let reject!: (reason?: any) => void
      const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
      })
      return { promise, resolve, reject }
    }
  }

  // Polyfill for URL.parse (Safari < 18.0)
  if (typeof (URL as any).parse !== 'function') {
    (URL as any).parse = function (url: string | URL, base?: string | URL) {
      try {
        return new URL(url, base)
      } catch {
        return null
      }
    }
  }

  // Polyfill for Object.hasOwn (Safari < 15.4)
  if (typeof Object.hasOwn !== 'function') {
    Object.hasOwn = function (object: any, key: PropertyKey) {
      return Object.prototype.hasOwnProperty.call(object, key)
    }
  }
})
