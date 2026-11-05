/** `/design` existe em dev, CI e previews; em produção responde 404. */
export function isDesignRouteEnabled(vercelEnv: string | undefined = process.env.VERCEL_ENV) {
  return vercelEnv !== 'production';
}
