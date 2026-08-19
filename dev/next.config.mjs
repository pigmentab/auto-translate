import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack is the default bundler in Next.js 16; the webpack extensionAlias
  // block has been removed. TypeScript extension resolution is handled natively.
  serverExternalPackages: [],
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
