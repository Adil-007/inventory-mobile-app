export default ({ config }) => ({
  ...config,
  extra: {
    API_URL: process.env.EXPO_PUBLIC_API_URL || "https://inventory-production-217b.up.railway.app/api",
  },
});
