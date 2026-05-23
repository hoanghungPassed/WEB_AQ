export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const targetUrl = url.trim();
    // Validate protocol
    let finalUrl = targetUrl;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = "https://" + finalUrl;
    }

    const res = await fetch(finalUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, channelName: parseFallbackName(targetUrl) });
    }

    const html = await res.text();
    let channelName = "";

    // 1. Try matching og:title
    const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
                         html.match(/<meta\s+content="([^"]+)"\s+property="og:title"/i);
    
    if (ogTitleMatch && ogTitleMatch[1]) {
      channelName = ogTitleMatch[1];
    }

    // 2. Try matching twitter:title if og:title is empty
    if (!channelName) {
      const twitterTitleMatch = html.match(/<meta\s+name="twitter:title"\s+content="([^"]+)"/i) ||
                                html.match(/<meta\s+content="([^"]+)"\s+name="twitter:title"/i);
      if (twitterTitleMatch && twitterTitleMatch[1]) {
        channelName = twitterTitleMatch[1];
      }
    }

    // 3. Try standard title tag
    if (!channelName) {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        channelName = titleMatch[1];
      }
    }

    // 4. Try parsing from ytInitialData window script
    if (!channelName) {
      const initialDataMatch = html.match(/"title":\s*\{\s*"simpleText":\s*"([^"]+)"\s*\}/);
      if (initialDataMatch && initialDataMatch[1]) {
        channelName = initialDataMatch[1];
      }
    }

    // Clean up channel name
    if (channelName) {
      // Decode HTML entities
      channelName = decodeHtmlEntities(channelName);
      // Remove " - YouTube" suffix
      channelName = channelName.replace(/\s*-\s*YouTube/gi, "").trim();
    }

    if (!channelName) {
      channelName = parseFallbackName(targetUrl);
    }

    return NextResponse.json({ success: true, channelName });
  } catch (err) {
    return NextResponse.json({ success: false, channelName: parseFallbackName(url) });
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function parseFallbackName(url: string): string {
  try {
    let cleanUrl = url.trim().replace(/\/$/, "");
    
    // Remove sub-tabs like /videos, /shorts, etc.
    const subTabs = ["/videos", "/shorts", "/streams", "/playlists", "/community", "/featured", "/about"];
    for (const tab of subTabs) {
      if (cleanUrl.toLowerCase().endsWith(tab)) {
        cleanUrl = cleanUrl.substring(0, (cleanUrl || []).length - (tab || []).length);
      }
    }

    const parts = cleanUrl.split("/");
    const lastPart = parts[(parts || []).length - 1];
    
    if (lastPart.startsWith("@")) {
      return formatName(lastPart.substring(1));
    }
    
    if (parts[(parts || []).length - 2] === "c" || parts[(parts || []).length - 2] === "user" || parts[(parts || []).length - 2] === "channel") {
      return formatName(lastPart);
    }
    
    return formatName(lastPart);
  } catch {
    return "Kênh YouTube";
  }
}

function formatName(str: string): string {
  // Convert camelCase or kebab-case or snake_case to Space Words
  let clean = str
    .replace(/([A-Z])/g, " $1") // Add space before capital letters
    .replace(/[_-]+/g, " ")     // Replace underscores and hyphens with spaces
    .replace(/\s+/g, " ")        // Collapse multiple spaces
    .trim();
    
  // Capitalize first letter of each word
  return clean
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .trim();
}
