# Cara Update Versi (Setiap Rilis Baru)

Setiap kali mau rilis update, bump versi dulu supaya nama file installer ikut berubah:

```bash
# 1. Bump versi di package.json (mis. ke 1.2.0)
sed -i 's/"version": "1.1.0"/"version": "1.2.0"/' package.json
npm install --silent   # sinkronkan package-lock.json

# 2. Commit + push + tag
git add package.json package-lock.json
git commit -m "chore: bump version to 1.2.0"
git push origin main

git tag -a v1.2.0 -m "v1.2.0: <ringkasan update>"
git push origin v1.2.0
```

GitHub Actions otomatis: build exe → buat Release v1.2.0 → lampirkan installer.
