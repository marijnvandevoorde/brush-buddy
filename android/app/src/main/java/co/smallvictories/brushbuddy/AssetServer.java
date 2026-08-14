package co.smallvictories.brushbuddy;

import android.content.res.AssetManager;
import android.webkit.WebResourceResponse;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * Serves the bundled web app out of assets/www under a real https:// origin.
 *
 * A file:// page would work too, but an https origin keeps the app on the same
 * footing as the web build: localStorage (streak, colour scheme, chosen buddy)
 * behaves normally and the browser applies the ordinary secure-origin rules.
 * The host is the reserved androidplatform.net name, which never resolves
 * publicly — combined with the app having no INTERNET permission, nothing here
 * can leave the device.
 */
final class AssetServer {

    static final String AUTHORITY = "appassets.androidplatform.net";
    static final String BASE_URL = "https://" + AUTHORITY + "/";
    private static final String ROOT = "www";

    private static final Map<String, String> MIME_TYPES = new HashMap<>();
    static {
        MIME_TYPES.put("html", "text/html");
        MIME_TYPES.put("css", "text/css");
        MIME_TYPES.put("js", "text/javascript");
        MIME_TYPES.put("json", "application/json");
        MIME_TYPES.put("webmanifest", "application/manifest+json");
        MIME_TYPES.put("svg", "image/svg+xml");
        MIME_TYPES.put("png", "image/png");
        MIME_TYPES.put("jpg", "image/jpeg");
        MIME_TYPES.put("jpeg", "image/jpeg");
        MIME_TYPES.put("webp", "image/webp");
        MIME_TYPES.put("ico", "image/x-icon");
        MIME_TYPES.put("woff2", "font/woff2");
        MIME_TYPES.put("woff", "font/woff");
        MIME_TYPES.put("ttf", "font/ttf");
        MIME_TYPES.put("mp3", "audio/mpeg");
        MIME_TYPES.put("wav", "audio/wav");
        // The finale plays a transparent VP9 clip of the chosen buddy. Without a
        // video/* type the WebView refuses the <source> and the finale is blank.
        MIME_TYPES.put("webm", "video/webm");
        MIME_TYPES.put("mp4", "video/mp4");
    }

    private final AssetManager assets;

    AssetServer(AssetManager assets) {
        this.assets = assets;
    }

    /** @return a response for in-scope requests, or null to let the WebView handle it. */
    WebResourceResponse serve(String scheme, String host, String path) {
        if (!"https".equals(scheme) || !AUTHORITY.equals(host)) return null;

        String relative = normalize(path);
        if (relative == null) return notFound();
        if (relative.isEmpty()) relative = "index.html";

        try {
            InputStream in = assets.open(ROOT + "/" + relative);
            Map<String, String> headers = new HashMap<>();
            // Everything is local, so caching only muddies updates after an app upgrade.
            headers.put("Cache-Control", "no-cache");
            return new WebResourceResponse(mimeOf(relative), "utf-8", 200, "OK", headers, in);
        } catch (IOException e) {
            return notFound();
        }
    }

    /**
     * Strips the leading slash and rejects anything that tries to escape the
     * asset root (".." segments, absolute or backslash paths).
     */
    private static String normalize(String path) {
        if (path == null) return null;
        String p = path.startsWith("/") ? path.substring(1) : path;
        if (p.indexOf('\\') >= 0) return null;
        for (String segment : p.split("/")) {
            if (segment.equals("..")) return null;
        }
        return p;
    }

    private static String mimeOf(String path) {
        int dot = path.lastIndexOf('.');
        if (dot < 0) return "application/octet-stream";
        String type = MIME_TYPES.get(path.substring(dot + 1).toLowerCase());
        return type != null ? type : "application/octet-stream";
    }

    private static WebResourceResponse notFound() {
        return new WebResourceResponse(
                "text/plain", "utf-8", 404, "Not Found",
                Collections.<String, String>emptyMap(),
                new java.io.ByteArrayInputStream(new byte[0]));
    }
}
