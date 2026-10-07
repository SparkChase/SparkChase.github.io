# Vendored browser dependencies

`manifest.json` records the pinned upstream URL and SHA-256 of every downloaded/copied asset. License notices are retained in `licenses/` and in upstream file headers. The three iconfont bundles are the site's existing Alibaba iconfont assets; their authorship/usage terms remain unchanged.

Hexo's `scripts/performance.js` emits content-hashed JS/CSS aliases and rewrites HTML references. Relative font URLs still resolve in the same directory. Only hashed JS/CSS paths receive immutable caching in `vercel.json`; mutable application code and search data keep revalidation.

Vue and Element UI downloads are retained as migration/reference assets but no longer referenced by the site: native notifications replace their only direct use in the custom script. They add repository/deployment size, not page requests. No bulk file deletion was performed.

Update deliberately: retrieve the specified upstream version, preserve its license, update the manifest hash, rebuild, and run the browser regression checks. Do not edit minified vendor code by hand.

Twikoo uses the official 1.7.2 distribution, verified against the npm package integrity and the pinned CDN URL. Its Tencent Cloud admin configuration examples are masked upstream. Keep these official files when updating: the previous local bundle contained a complete example Secret ID that triggered GitHub push protection, including in generated content-hashed copies.
