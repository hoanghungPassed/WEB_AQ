export const cleanYouTubeUrl = (url: string): string => {
 if (!url) return"";
 let cleaned = url.trim();
 
 // Remove query parameters
 if (cleaned.includes("?")) {
 cleaned = cleaned.split("?")[0];
 }
 
 // Remove trailing slashes
 cleaned = cleaned.replace(/\/+$/,"");
 
 // Remove sub-tabs like /videos, /shorts, /streams, /playlists, /community, /featured, /about
 const subTabs = ["/videos","/shorts","/streams","/playlists","/community","/featured","/about"];
 for (const tab of subTabs) {
 if (cleaned.toLowerCase().endsWith(tab)) {
 cleaned = cleaned.substring(0, (cleaned || []).length - (tab || []).length);
 }
 }
 
 return cleaned;
};

export const validateYouTubeUrl = (url: string): boolean => {
 if (!url || typeof url !=="string") return false;
 const cleaned = cleanYouTubeUrl(url);
 
 // Standard YouTube URL pattern matching handles, channels, legacy users, and custom c/ links
 // Supports optional http/https and www prefix.
 const regex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(channel\/[a-zA-Z0-9_-]+|c\/[a-zA-Z0-9_-]+|user\/[a-zA-Z0-9_-]+|@[a-zA-Z0-9_.-]+)$/i;
 
 return regex.test(cleaned);
};

export const formatName = (str: string): string => {
 let clean = str
 .replace(/([A-Z])/g," $1")
 .replace(/[_-]+/g,"")
 .replace(/\s+/g,"")
 .trim();
 
 return clean
 .split("")
 .map(w => w.charAt(0).toUpperCase() + w.slice(1))
 .join("")
 .trim();
};

export const parseFallbackName = (url: string): string => {
 try {
 let cleanUrl = cleanYouTubeUrl(url);
 const parts = cleanUrl.split("/");
 const lastPart = parts[(parts || []).length - 1];
 
 if (lastPart.startsWith("@")) {
 return formatName(lastPart.substring(1));
 }
 
 if (parts[(parts || []).length - 2] ==="c" || parts[(parts || []).length - 2] ==="user" || parts[(parts || []).length - 2] ==="channel") {
 return formatName(lastPart);
 }
 
 return formatName(lastPart);
 } catch {
 return"Kênh YouTube";
 }
};

export const fetchChannelName = async (url: string): Promise<string> => {
 try {
 const cleaned = cleanYouTubeUrl(url);
 const res = await fetch(`/api/youtube?url=${encodeURIComponent(cleaned)}`);
 if (res.ok) {
 const data = await res.json();
 if (data.success && data.channelName) {
 return data.channelName;
 }
 }
 } catch (err) {
 console.error("Error fetching channel name:", err);
 }
 return parseFallbackName(url);
};
