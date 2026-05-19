export const getApiBase = () => {
  const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envApiUrl) return envApiUrl.replace(/\/$/, "");
  
  return "";
};

export const apiBase = () => getApiBase();

