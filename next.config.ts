import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Se o seu arquivo original tinha alguma configuração aqui dentro, pode colar de volta.
  // Se não tinha nada, pode deixar vazio assim mesmo.
};

export default withPWA(nextConfig);