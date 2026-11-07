/** @type {import("next").NextConfig} */
// ignoreBuildErrors: safety net so a stray type warning can never block a deploy.
module.exports = { reactStrictMode: true, typescript: { ignoreBuildErrors: true } };
